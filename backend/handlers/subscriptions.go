package handlers

import (
	"fmt"
	"net/http"
	"strings"
)

func (h *Ctx) CheckSubscription(w http.ResponseWriter, r *http.Request) {
	wallet := strings.ToLower(r.PathValue("wallet"))
	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	sub, ok := h.DB.Get("subscribers", wallet)
	if !ok {
		JSON(w, 200, map[string]interface{}{
			"active":         false,
			"expiry":         nil,
			"referral_count": 0,
		})
		return
	}

	JSON(w, 200, map[string]interface{}{
		"active":         true,
		"expiry":         sub["expiry"],
		"referral_count": sub["referral_count"],
		"referred_by":    sub["referred_by"],
	})
}

func (h *Ctx) GetReferral(w http.ResponseWriter, r *http.Request) {
	wallet := strings.ToLower(r.PathValue("wallet"))
	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	referralCount := 0
	if sub, ok := h.DB.Get("subscribers", wallet); ok {
		if count, ok := sub["referral_count"].(float64); ok {
			referralCount = int(count)
		}
	}

	short := wallet
	if len(wallet) > 14 {
		short = wallet[:10] + "..." + wallet[len(wallet)-4:]
	}

	JSON(w, 200, map[string]interface{}{
		"wallet":         wallet,
		"referral_code":  wallet,
		"referral_count": referralCount,
		"share_text":     fmt.Sprintf("Únete a Encanta — contenido faceless premium. Usa mi código: %s", short),
	})
}
