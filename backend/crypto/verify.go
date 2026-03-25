package crypto

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	gocrypto "github.com/ethereum/go-ethereum/crypto"
)

// SigVerifier handles EIP-191 personal_sign verification and token generation
type SigVerifier struct {
	tokenSecret []byte
}

func NewSigVerifier() *SigVerifier {
	secret := make([]byte, 32)
	rand.Read(secret)
	return &SigVerifier{tokenSecret: secret}
}

// VerifyPersonalSign verifies an EIP-191 personal_sign signature.
// message: the original message that was signed
// signature: hex-encoded signature (with 0x prefix)
// expectedAddr: the wallet address that should have signed
func (v *SigVerifier) VerifyPersonalSign(message string, signature string, expectedAddr string) (bool, error) {
	sig, err := hex.DecodeString(strings.TrimPrefix(signature, "0x"))
	if err != nil {
		return false, fmt.Errorf("invalid signature hex: %w", err)
	}

	if len(sig) != 65 {
		return false, fmt.Errorf("signature must be 65 bytes, got %d", len(sig))
	}

	// Fix recovery ID (v) — MetaMask returns 27/28, we need 0/1
	if sig[64] >= 27 {
		sig[64] -= 27
	}

	// EIP-191 prefixed hash
	prefixed := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)
	hash := gocrypto.Keccak256([]byte(prefixed))

	// Recover public key from signature
	pubKey, err := gocrypto.SigToPub(hash, sig)
	if err != nil {
		return false, fmt.Errorf("signature recovery failed: %w", err)
	}

	recoveredAddr := gocrypto.PubkeyToAddress(*pubKey)
	expected := common.HexToAddress(expectedAddr)

	return recoveredAddr == expected, nil
}

// GenerateNonce creates a random nonce for signing challenges
func (v *SigVerifier) GenerateNonce() string {
	nonce := make([]byte, 16)
	rand.Read(nonce)
	return hex.EncodeToString(nonce)
}

// GenerateChallenge creates a deterministic human-readable signing message.
// No timestamp — the same wallet+nonce always produces the same challenge,
// so the message is identical at sign time and verify time.
func (v *SigVerifier) GenerateChallenge(wallet string, nonce string) string {
	return fmt.Sprintf(
		"Encanta Authentication\nWallet: %s\nNonce: %s",
		strings.ToLower(wallet), nonce,
	)
}

// GenerateToken creates an HMAC-signed access token for authenticated sessions
func (v *SigVerifier) GenerateToken(wallet string, role string, expiresIn time.Duration) string {
	expiry := time.Now().Add(expiresIn).Unix()
	payload := fmt.Sprintf("%s:%s:%d", strings.ToLower(wallet), role, expiry)

	mac := hmac.New(sha256.New, v.tokenSecret)
	mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))

	return fmt.Sprintf("%s.%s", payload, sig)
}

// VerifyToken validates an HMAC-signed access token, returns (wallet, role, valid)
func (v *SigVerifier) VerifyToken(token string) (string, string, bool) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return "", "", false
	}

	payload := parts[0]
	sig := parts[1]

	// Verify HMAC — use full hash, not truncated
	mac := hmac.New(sha256.New, v.tokenSecret)
	mac.Write([]byte(payload))
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return "", "", false
	}

	// Parse payload
	fields := strings.SplitN(payload, ":", 3)
	if len(fields) != 3 {
		return "", "", false
	}

	wallet := fields[0]
	role := fields[1]
	expiry := new(big.Int)
	expiry.SetString(fields[2], 10)

	if time.Now().Unix() > expiry.Int64() {
		return "", "", false
	}

	return wallet, role, true
}

// HashFileContent returns a SHA-256 hash of file content
func HashFileContent(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}
