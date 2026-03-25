// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EncantaPool
 * @notice Core subscription + revenue pool for the Encanta platform.
 *
 *   Subscribers pay MON/month -> 90% artist pool, 10% platform.
 *   Swipe-reveal purchases also enter the pool.
 *   Weekly distribution sends artist shares based on off-chain engagement data.
 *   Artists withdraw on their own schedule (pull pattern).
 *
 * Security: Ownable2Step, ReentrancyGuard, Pausable, pull-pattern withdrawals,
 *           distribution timelock, duplicate-artist check, max-cap on subscription,
 *           emergency rescue only drains unallocated funds.
 *
 * Audit: Round 2 complete. All critical/high/medium findings fixed.
 */

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard}       from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable}              from "@openzeppelin/contracts/utils/Pausable.sol";

contract EncantaPool is Ownable2Step, ReentrancyGuard, Pausable {

    // ──────────────────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────────────────

    uint256 public constant PLATFORM_FEE_BPS        = 1000;          // 10%
    uint256 public constant BPS_DENOMINATOR          = 10_000;
    uint256 public constant MAX_SUBSCRIPTION         = 500 ether;     // hard cap
    uint256 public constant MIN_DISTRIBUTION_INTERVAL = 6 days;
    uint256 public constant MAX_ARTISTS_PER_DIST     = 200;           // gas safety
    uint256 public constant REVEAL_PRICE             = 0.5 ether;
    uint256 public constant REFERRAL_DAYS            = 7;
    uint256 public constant MAX_ARTIST_SHARE_BPS     = 2500;          // deprecated: use maxArtistShareBps

    // ──────────────────────────────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────────────────────────────

    uint256 public subscriptionPrice;
    uint256 public lastDistributionTime;
    uint256 public maxArtistShareBps = 5000; // configurable cap, default 50%

    struct Subscriber {
        uint256 expiry;
        address referredBy;
    }
    mapping(address => Subscriber) public subscribers;
    uint256 public totalSubscribers;

    mapping(address => uint256) public artistBalances;
    mapping(address => bool)    public verifiedArtists;
    mapping(address => bool)    public frozenArtists;
    uint256 public totalArtists;

    uint256 public artistPool;
    uint256 public platformPool;

    // ──────────────────────────────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────────────────────────────

    event Subscribed(address indexed subscriber, uint256 expiry, address indexed referrer);
    event SubscriptionRenewed(address indexed subscriber, uint256 newExpiry);
    event ContentRevealed(address indexed buyer, bytes32 indexed contentId, uint256 price);
    event Distributed(uint256 indexed week, uint256 totalAmount, uint256 artistCount);
    event ArtistWithdrew(address indexed artist, uint256 amount);
    event PlatformWithdrew(address indexed to, uint256 amount);
    event ArtistVerified(address indexed artist);
    event ArtistRemoved(address indexed artist);
    event ArtistFrozen(address indexed artist);
    event ArtistUnfrozen(address indexed artist);
    event SubscriptionPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event EmergencyRescue(address indexed to, uint256 amount);
    event DirectDeposit(address indexed sender, uint256 amount);

    // ──────────────────────────────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────────────────────────────

    constructor(uint256 _subscriptionPrice) Ownable(msg.sender) {
        require(_subscriptionPrice > 0 && _subscriptionPrice <= MAX_SUBSCRIPTION, "Invalid price");
        subscriptionPrice = _subscriptionPrice;
        lastDistributionTime = block.timestamp;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Subscriber functions
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Subscribe or renew. Sends exactly `subscriptionPrice` MON.
    /// @param referrer Optional referrer wallet (address(0) if none).
    function subscribe(address referrer) external payable whenNotPaused nonReentrant {
        require(msg.value == subscriptionPrice, "Wrong amount");
        require(referrer != msg.sender, "Cannot refer yourself");

        Subscriber storage sub = subscribers[msg.sender];
        bool isFirstTime = sub.expiry == 0; // never subscribed before

        // Calculate new expiry (extend if already active)
        uint256 base = sub.expiry > block.timestamp ? sub.expiry : block.timestamp;
        sub.expiry = base + 30 days;

        if (isFirstTime) {
            totalSubscribers++;

            // Referral: only for genuinely first-time subscribers
            if (referrer != address(0)) {
                sub.referredBy = referrer;
                Subscriber storage ref = subscribers[referrer];
                if (ref.expiry > block.timestamp) {
                    ref.expiry += REFERRAL_DAYS * 1 days;
                }
            }

            emit Subscribed(msg.sender, sub.expiry, referrer);
        } else {
            emit SubscriptionRenewed(msg.sender, sub.expiry);
        }

        // Split: 90% artist pool, 10% platform
        uint256 platformCut = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 artistCut   = msg.value - platformCut;

        platformPool += platformCut;
        artistPool   += artistCut;
    }

    /// @notice Check if a wallet has an active subscription.
    function isActive(address wallet) external view returns (bool) {
        return subscribers[wallet].expiry > block.timestamp;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Content reveal (swipe-up purchase)
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Pay to reveal a blurred content piece in the swipe feed.
    /// @param contentId Off-chain content identifier.
    function revealContent(bytes32 contentId) external payable whenNotPaused nonReentrant {
        require(msg.value == REVEAL_PRICE, "Wrong amount");
        require(subscribers[msg.sender].expiry > block.timestamp, "Not subscribed");

        uint256 platformCut = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 artistCut   = msg.value - platformCut;

        platformPool += platformCut;
        artistPool   += artistCut;

        emit ContentRevealed(msg.sender, contentId, msg.value);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Weekly distribution (admin-triggered)
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Distribute the artist pool based on off-chain engagement data.
    ///         Called weekly by admin/keeper. Amounts must sum to <= artistPool.
    /// @param artists  Array of artist addresses to pay.
    /// @param amounts  Corresponding MON amounts (wei).
    function distribute(
        address[] calldata artists,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(artists.length == amounts.length, "Length mismatch");
        require(artists.length > 0, "Empty distribution");
        require(artists.length <= MAX_ARTISTS_PER_DIST, "Too many artists");
        require(
            block.timestamp >= lastDistributionTime + MIN_DISTRIBUTION_INTERVAL,
            "Too soon - wait 6 days between distributions"
        );

        uint256 totalPayout;
        for (uint256 i; i < artists.length; ++i) {
            require(artists[i] != address(0), "Zero address");
            require(verifiedArtists[artists[i]], "Not a verified artist");
            require(amounts[i] > 0, "Zero amount");

            // Check for duplicate addresses
            for (uint256 j; j < i; ++j) {
                require(artists[j] != artists[i], "Duplicate artist");
            }

            totalPayout += amounts[i];
        }

        require(totalPayout <= artistPool, "Exceeds pool balance");

        // Cap per-artist share at 25% of total distribution
        for (uint256 i; i < artists.length; ++i) {
            require(
                amounts[i] * BPS_DENOMINATOR <= totalPayout * maxArtistShareBps,
                "Single artist share too high"
            );
        }

        // Credit artist balances (pull pattern)
        for (uint256 i; i < artists.length; ++i) {
            artistBalances[artists[i]] += amounts[i];
        }

        artistPool -= totalPayout;
        lastDistributionTime = block.timestamp;

        emit Distributed(block.timestamp / 1 weeks, totalPayout, artists.length);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Artist withdrawal (pull pattern)
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Artist withdraws their accumulated earnings.
    function withdrawArtist() external nonReentrant {
        require(!frozenArtists[msg.sender], "Account frozen");
        uint256 amount = artistBalances[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        artistBalances[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");

        emit ArtistWithdrew(msg.sender, amount);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Platform withdrawal
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Owner withdraws accumulated platform fees.
    function withdrawPlatform(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Zero address");
        uint256 amount = platformPool;
        require(amount > 0, "Nothing to withdraw");

        platformPool = 0;

        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "Transfer failed");

        emit PlatformWithdrew(to, amount);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Artist management
    // ──────────────────────────────────────────────────────────────────────

    function verifyArtist(address artist) external onlyOwner {
        require(artist != address(0), "Zero address");
        require(!verifiedArtists[artist], "Already verified");

        verifiedArtists[artist] = true;
        totalArtists++;

        emit ArtistVerified(artist);
    }

    function verifyArtistBatch(address[] calldata artists) external onlyOwner {
        require(artists.length <= MAX_ARTISTS_PER_DIST, "Too many");
        for (uint256 i; i < artists.length; ++i) {
            require(artists[i] != address(0), "Zero address");
            if (!verifiedArtists[artists[i]]) {
                verifiedArtists[artists[i]] = true;
                totalArtists++;
                emit ArtistVerified(artists[i]);
            }
        }
    }

    /// @notice Remove an artist. They can still withdraw existing balance (unless frozen).
    function removeArtist(address artist) external onlyOwner {
        require(verifiedArtists[artist], "Not verified");

        verifiedArtists[artist] = false;
        totalArtists--;

        if (frozenArtists[artist]) {
            frozenArtists[artist] = false;
            emit ArtistUnfrozen(artist);
        }

        emit ArtistRemoved(artist);
    }

    /// @notice Freeze a bad actor's withdrawals.
    function freezeArtist(address artist) external onlyOwner {
        frozenArtists[artist] = true;
        emit ArtistFrozen(artist);
    }

    /// @notice Unfreeze an artist.
    function unfreezeArtist(address artist) external onlyOwner {
        frozenArtists[artist] = false;
        emit ArtistUnfrozen(artist);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Admin controls
    // ──────────────────────────────────────────────────────────────────────

    function setSubscriptionPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0 && newPrice <= MAX_SUBSCRIPTION, "Invalid price");
        uint256 old = subscriptionPrice;
        subscriptionPrice = newPrice;
        emit SubscriptionPriceUpdated(old, newPrice);
    }

    function setMaxArtistShareBps(uint256 newCap) external onlyOwner {
        require(newCap >= 1000 && newCap <= BPS_DENOMINATOR, "Invalid cap: 10-100%");
        maxArtistShareBps = newCap;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ──────────────────────────────────────────────────────────────────────
    //  Emergency — ONLY rescues unallocated funds (platform + undistributed pool)
    //  DOES NOT touch artist balances. Cannot rug artists.
    // ──────────────────────────────────────────────────────────────────────

    function emergencyRescue() external onlyOwner whenPaused nonReentrant {
        uint256 rescueAmount = platformPool + artistPool;
        require(rescueAmount > 0, "Nothing to rescue");

        platformPool = 0;
        artistPool = 0;

        (bool ok, ) = payable(owner()).call{value: rescueAmount}("");
        require(ok, "Transfer failed");

        emit EmergencyRescue(owner(), rescueAmount);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  View helpers
    // ──────────────────────────────────────────────────────────────────────

    function getSubscription(address wallet) external view returns (
        bool active,
        uint256 expiry,
        address referredBy
    ) {
        Subscriber storage sub = subscribers[wallet];
        return (sub.expiry > block.timestamp, sub.expiry, sub.referredBy);
    }

    function getPoolStats() external view returns (
        uint256 _artistPool,
        uint256 _platformPool,
        uint256 _totalSubscribers,
        uint256 _totalArtists,
        uint256 _lastDistribution,
        uint256 _contractBalance
    ) {
        return (artistPool, platformPool, totalSubscribers, totalArtists, lastDistributionTime, address(this).balance);
    }

    function timeUntilNextDistribution() external view returns (uint256) {
        uint256 next = lastDistributionTime + MIN_DISTRIBUTION_INTERVAL;
        if (block.timestamp >= next) return 0;
        return next - block.timestamp;
    }

    /// @notice Accept direct MON transfers — goes to pool with 90/10 split.
    receive() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Zero value");
        uint256 platformCut = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        platformPool += platformCut;
        artistPool   += msg.value - platformCut;
        emit DirectDeposit(msg.sender, msg.value);
    }
}
