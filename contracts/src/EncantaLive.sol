// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EncantaLive
 * @notice Handles instant payments for live video rooms.
 *
 *   Artists create rooms with an entry fee.
 *   Audience pays -> instant split: 45% artist1, 45% artist2, 10% platform.
 *   Tips go 90% to the tipped artist, 10% platform.
 *   No pool, no waiting — artists get paid immediately.
 *
 * Security: Ownable2Step, ReentrancyGuard, Pausable, pull-pattern,
 *           duplicate join prevention, audience cap, artist invitation.
 *
 * Audit: Round 2 complete. All critical/high/medium findings fixed.
 */

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard}       from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable}              from "@openzeppelin/contracts/utils/Pausable.sol";

contract EncantaLive is Ownable2Step, ReentrancyGuard, Pausable {

    // ──────────────────────────────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────────────────────────────

    uint256 public constant PLATFORM_FEE_BPS = 1000;       // 10%
    uint256 public constant BPS_DENOMINATOR  = 10_000;
    uint256 public constant MAX_ROOM_PRICE   = 100 ether;
    uint256 public constant MAX_TIP          = 1000 ether;
    uint256 public constant MIN_ROOM_PRICE   = 0.001 ether; // if non-zero, must be >= this
    uint256 public constant MAX_AUDIENCE     = 10_000;

    // ──────────────────────────────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────────────────────────────

    struct Room {
        address artist1;
        address artist2;
        address invitedArtist2;  // address(0) = open to any verified artist
        uint256 price;
        bool    active;
        uint256 totalCollected;
        uint256 audienceCount;
    }

    mapping(bytes32 => Room) public rooms;
    mapping(bytes32 => mapping(address => bool)) public hasJoined; // dedup audience
    uint256 public roomCount;

    mapping(address => uint256) public artistBalances;
    uint256 public platformPool;

    address public encantaPool;

    // ──────────────────────────────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────────────────────────────

    event RoomCreated(bytes32 indexed roomId, address indexed artist1, uint256 price, address invitedArtist2);
    event ArtistJoined(bytes32 indexed roomId, address indexed artist2);
    event AudienceJoined(bytes32 indexed roomId, address indexed viewer, uint256 paid);
    event Tipped(bytes32 indexed roomId, address indexed from, address indexed artist, uint256 amount);
    event RoomClosed(bytes32 indexed roomId, uint256 totalCollected, uint256 audienceCount);
    event ArtistWithdrew(address indexed artist, uint256 amount);
    event PlatformWithdrew(address indexed to, uint256 amount);
    event EncantaPoolUpdated(address indexed oldPool, address indexed newPool);
    event EmergencyRescue(address indexed to, uint256 amount);

    // ──────────────────────────────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────────────────────────────

    constructor(address _encantaPool) Ownable(msg.sender) {
        require(_encantaPool != address(0), "Invalid pool address");
        encantaPool = _encantaPool;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Internal helpers
    // ──────────────────────────────────────────────────────────────────────

    function _requireVerifiedArtist(address artist) internal view {
        require(encantaPool.code.length > 0, "Pool not a contract");
        (bool success, bytes memory data) = encantaPool.staticcall(
            abi.encodeWithSignature("verifiedArtists(address)", artist)
        );
        require(success && data.length == 32 && abi.decode(data, (bool)), "Not a verified artist");
    }

    function _requireRoomExists(bytes32 roomId) internal view {
        require(rooms[roomId].artist1 != address(0), "Room does not exist");
    }

    function _requireRoomActive(bytes32 roomId) internal view {
        require(rooms[roomId].active, "Room is not active");
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Room lifecycle
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Create a live room. Only verified artists.
    /// @param price Entry fee in MON (0 = free room).
    /// @param invitedArtist2 Specific artist to invite (address(0) = open).
    function createRoom(uint256 price, address invitedArtist2)
        external
        whenNotPaused
        nonReentrant
        returns (bytes32 roomId)
    {
        _requireVerifiedArtist(msg.sender);
        require(price <= MAX_ROOM_PRICE, "Price too high");
        require(price == 0 || price >= MIN_ROOM_PRICE, "Price too low (min 0.001 MON)");

        roomCount++;
        roomId = keccak256(abi.encodePacked(msg.sender, block.timestamp, roomCount, block.prevrandao));

        rooms[roomId] = Room({
            artist1:         msg.sender,
            artist2:         address(0),
            invitedArtist2:  invitedArtist2,
            price:           price,
            active:          true,
            totalCollected:  0,
            audienceCount:   0
        });

        emit RoomCreated(roomId, msg.sender, price, invitedArtist2);
    }

    /// @notice Second artist joins an existing room.
    function joinAsArtist(bytes32 roomId)
        external
        whenNotPaused
        nonReentrant
    {
        _requireRoomExists(roomId);
        _requireRoomActive(roomId);
        _requireVerifiedArtist(msg.sender);

        Room storage room = rooms[roomId];
        require(room.artist2 == address(0), "Room already has 2 artists");
        require(msg.sender != room.artist1, "Already in this room");
        require(
            room.invitedArtist2 == address(0) || room.invitedArtist2 == msg.sender,
            "Not invited to this room"
        );

        room.artist2 = msg.sender;

        emit ArtistJoined(roomId, msg.sender);
    }

    /// @notice Audience member pays entry fee to watch.
    function joinAsAudience(bytes32 roomId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        _requireRoomExists(roomId);
        _requireRoomActive(roomId);

        Room storage room = rooms[roomId];
        require(msg.value == room.price, "Wrong entry fee");
        require(msg.sender != room.artist1 && msg.sender != room.artist2, "Artists dont pay");
        require(!hasJoined[roomId][msg.sender], "Already joined this room");
        require(room.audienceCount < MAX_AUDIENCE, "Room full");

        hasJoined[roomId][msg.sender] = true;
        room.audienceCount++;

        if (msg.value > 0) {
            room.totalCollected += msg.value;
            _splitEntryFee(room, msg.value);
        }

        emit AudienceJoined(roomId, msg.sender, msg.value);
    }

    /// @notice Tip a specific artist in a live room.
    function tip(bytes32 roomId, address artist)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        _requireRoomExists(roomId);
        _requireRoomActive(roomId);

        require(msg.value > 0 && msg.value <= MAX_TIP, "Invalid tip amount");
        require(msg.sender != artist, "Cannot tip yourself");

        Room storage room = rooms[roomId];
        require(artist == room.artist1 || artist == room.artist2, "Not an artist in this room");

        // 90% to artist, 10% platform
        uint256 platformCut = (msg.value * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 artistCut   = msg.value - platformCut;

        artistBalances[artist] += artistCut;
        platformPool += platformCut;

        emit Tipped(roomId, msg.sender, artist, msg.value);
    }

    /// @notice Close a room. Only the creating artist or admin.
    function closeRoom(bytes32 roomId) external {
        _requireRoomExists(roomId);
        _requireRoomActive(roomId);

        Room storage room = rooms[roomId];
        require(msg.sender == room.artist1 || msg.sender == owner(), "Only creator or admin");

        room.active = false;

        emit RoomClosed(roomId, room.totalCollected, room.audienceCount);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Internal: fee splitting
    // ──────────────────────────────────────────────────────────────────────

    function _splitEntryFee(Room storage room, uint256 amount) internal {
        uint256 platformCut = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 artistTotal = amount - platformCut;

        platformPool += platformCut;

        if (room.artist2 != address(0)) {
            uint256 half = artistTotal / 2;
            artistBalances[room.artist1] += half;
            artistBalances[room.artist2] += artistTotal - half; // remainder avoids dust
        } else {
            artistBalances[room.artist1] += artistTotal;
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    //  Withdrawals (pull pattern)
    // ──────────────────────────────────────────────────────────────────────

    /// @notice Artist withdraws accumulated live earnings + tips.
    function withdrawArtist() external nonReentrant {
        // Check frozen status from EncantaPool
        (bool success, bytes memory data) = encantaPool.staticcall(
            abi.encodeWithSignature("frozenArtists(address)", msg.sender)
        );
        require(success && data.length == 32, "Freeze check failed");
        require(!abi.decode(data, (bool)), "Account frozen");

        uint256 amount = artistBalances[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        artistBalances[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");

        emit ArtistWithdrew(msg.sender, amount);
    }

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
    //  Admin
    // ──────────────────────────────────────────────────────────────────────

    function setEncantaPool(address _pool) external onlyOwner {
        require(_pool != address(0), "Zero address");
        require(_pool.code.length > 0, "Not a contract");
        address old = encantaPool;
        encantaPool = _pool;
        emit EncantaPoolUpdated(old, _pool);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Emergency rescue — ONLY drains platform fees, NOT artist balances.
    function emergencyRescue() external onlyOwner whenPaused nonReentrant {
        uint256 rescueAmount = platformPool;
        require(rescueAmount > 0, "Nothing to rescue");

        platformPool = 0;

        (bool ok, ) = payable(owner()).call{value: rescueAmount}("");
        require(ok, "Transfer failed");

        emit EmergencyRescue(owner(), rescueAmount);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  View helpers
    // ──────────────────────────────────────────────────────────────────────

    function getRoom(bytes32 roomId) external view returns (
        address artist1,
        address artist2,
        uint256 price,
        bool    active,
        uint256 totalCollected,
        uint256 audienceCount
    ) {
        Room storage room = rooms[roomId];
        return (room.artist1, room.artist2, room.price, room.active, room.totalCollected, room.audienceCount);
    }

    function getStats() external view returns (
        uint256 _roomCount,
        uint256 _platformPool,
        uint256 _contractBalance
    ) {
        return (roomCount, platformPool, address(this).balance);
    }
}
