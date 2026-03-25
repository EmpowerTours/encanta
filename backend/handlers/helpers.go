package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"encanta-api/crypto"
	"encanta-api/storage"
	"encanta-api/ws"
)

// Ctx holds all handler dependencies
type Ctx struct {
	DB             *storage.JsonDB
	Files          *storage.FileStore
	Verifier       *crypto.SigVerifier
	Hub            *ws.Hub
	AdminWallet    string   // admin wallet address (lowercase)
	AllowedOrigins []string // parsed CORS origins for WebSocket CheckOrigin
}

// JSON sends a JSON response
func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Error sends a JSON error response
func Error(w http.ResponseWriter, status int, msg string) {
	JSON(w, status, map[string]string{"error": msg})
}

// ReadJSON decodes request body into target struct
func ReadJSON(r *http.Request, target interface{}) error {
	defer r.Body.Close()
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // 1MB max for JSON
	if err != nil {
		return err
	}
	return json.Unmarshal(body, target)
}

// VerifyWalletAuth checks the X-Signature and X-Nonce headers against the wallet
// Returns true if the request is authenticated for the given wallet
func (h *Ctx) VerifyWalletAuth(r *http.Request, wallet string) bool {
	sig := r.Header.Get("X-Signature")
	nonce := r.Header.Get("X-Nonce")

	if sig == "" || nonce == "" {
		// Fallback: check Authorization header for token
		auth := r.Header.Get("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			token := strings.TrimPrefix(auth, "Bearer ")
			w, _, valid := h.Verifier.VerifyToken(token)
			return valid && strings.EqualFold(w, wallet)
		}
		return false
	}

	// Verify EIP-191 signature
	message := h.Verifier.GenerateChallenge(wallet, nonce)
	ok, err := h.Verifier.VerifyPersonalSign(message, sig, wallet)
	if err != nil {
		return false
	}
	return ok
}

// IsAdmin checks if the request comes from the admin wallet
func (h *Ctx) IsAdmin(r *http.Request) bool {
	if h.AdminWallet == "" {
		return false
	}

	// Check bearer token
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		token := strings.TrimPrefix(auth, "Bearer ")
		wallet, role, valid := h.Verifier.VerifyToken(token)
		return valid && strings.EqualFold(wallet, h.AdminWallet) && role == "admin"
	}

	// Check signature
	sig := r.Header.Get("X-Signature")
	nonce := r.Header.Get("X-Nonce")
	if sig != "" && nonce != "" {
		message := h.Verifier.GenerateChallenge(h.AdminWallet, nonce)
		ok, _ := h.Verifier.VerifyPersonalSign(message, sig, h.AdminWallet)
		return ok
	}

	return false
}

// ValidateWalletAddress checks if a string looks like a valid Ethereum address
func ValidateWalletAddress(addr string) bool {
	if len(addr) != 42 {
		return false
	}
	if !strings.HasPrefix(addr, "0x") {
		return false
	}
	for _, c := range addr[2:] {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

// SanitizeString trims and limits a string safely using rune slicing for UTF-8 correctness
func SanitizeString(s string, maxLen int) string {
	s = strings.TrimSpace(s)
	runes := []rune(s)
	if len(runes) > maxLen {
		return string(runes[:maxLen])
	}
	return s
}
