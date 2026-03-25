package handlers

import (
	"net/http"
	"strings"
	"time"
)

func (h *Ctx) AdminStats(w http.ResponseWriter, r *http.Request) {
	if !h.IsAdmin(r) {
		Error(w, 403, "No autorizado")
		return
	}

	active := h.DB.Query("artists", map[string]interface{}{"status": "active"})
	pending := h.DB.Query("artists", map[string]interface{}{"status": "pending_verification"})
	subs := h.DB.All("subscribers")

	JSON(w, 200, map[string]interface{}{
		"total_artists":       len(active) + len(pending),
		"active_artists":      len(active),
		"pending_applications": len(pending),
		"total_subscribers":   len(subs),
		"current_month_pool":  0,
		"platform_revenue":    0,
		"verification_budget": 0,
	})
}

func (h *Ctx) AdminPending(w http.ResponseWriter, r *http.Request) {
	if !h.IsAdmin(r) {
		Error(w, 403, "No autorizado")
		return
	}

	pending := h.DB.Query("artists", map[string]interface{}{"status": "pending_verification"})
	if pending == nil {
		pending = []map[string]interface{}{}
	}
	JSON(w, 200, pending)
}

func (h *Ctx) AdminApprove(w http.ResponseWriter, r *http.Request) {
	if !h.IsAdmin(r) {
		Error(w, 403, "No autorizado")
		return
	}

	wallet := strings.ToLower(r.PathValue("wallet"))
	artist, ok := h.DB.Get("artists", wallet)
	if !ok {
		Error(w, 404, "Artista no encontrada")
		return
	}

	if s, _ := artist["status"].(string); s != "pending_verification" {
		Error(w, 400, "Artista no está pendiente")
		return
	}

	h.DB.Update("artists", wallet, map[string]interface{}{
		"status":      "active",
		"approved_at": time.Now().UTC().Format(time.RFC3339),
	})

	JSON(w, 200, map[string]string{"status": "ok", "message": "Artista aprobada"})
}

func (h *Ctx) AdminSuspend(w http.ResponseWriter, r *http.Request) {
	if !h.IsAdmin(r) {
		Error(w, 403, "No autorizado")
		return
	}

	wallet := strings.ToLower(r.PathValue("wallet"))
	artist, ok := h.DB.Get("artists", wallet)
	if !ok {
		Error(w, 404, "Artista no encontrada")
		return
	}

	if s, _ := artist["status"].(string); s != "active" {
		Error(w, 400, "Artista no está activa")
		return
	}

	h.DB.Update("artists", wallet, map[string]interface{}{"status": "suspended"})
	JSON(w, 200, map[string]string{"status": "ok"})
}

func (h *Ctx) AdminReactivate(w http.ResponseWriter, r *http.Request) {
	if !h.IsAdmin(r) {
		Error(w, 403, "No autorizado")
		return
	}

	wallet := strings.ToLower(r.PathValue("wallet"))
	artist, ok := h.DB.Get("artists", wallet)
	if !ok {
		Error(w, 404, "Artista no encontrada")
		return
	}

	if s, _ := artist["status"].(string); s != "suspended" {
		Error(w, 400, "Artista no está suspendida")
		return
	}

	h.DB.Update("artists", wallet, map[string]interface{}{"status": "active"})
	JSON(w, 200, map[string]string{"status": "ok"})
}

func (h *Ctx) AdminVerifyHealth(w http.ResponseWriter, r *http.Request) {
	if !h.IsAdmin(r) {
		Error(w, 403, "No autorizado")
		return
	}

	wallet := strings.ToLower(r.PathValue("wallet"))
	if _, ok := h.DB.Get("artists", wallet); !ok {
		Error(w, 404, "Artista no encontrada")
		return
	}

	sixMonths := time.Now().AddDate(0, 6, 0).Format("2006-01-02")
	h.DB.Update("artists", wallet, map[string]interface{}{
		"health_verified":       true,
		"health_verified_until": sixMonths,
	})

	JSON(w, 200, map[string]string{"status": "ok", "message": "Salud verificada"})
}
