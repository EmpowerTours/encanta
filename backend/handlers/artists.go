package handlers

import (
	"io"
	"net/http"
	"strings"
	"time"
)

type applyRequest struct {
	WalletAddress string   `json:"wallet_address"`
	StageName     string   `json:"stage_name"`
	Bio           string   `json:"bio"`
	Categories    []string `json:"categories"`
	HardLimits    string   `json:"hard_limits"`
	Referrer      string   `json:"referrer"`
}

var taskDefs = []struct {
	ID    int
	Title string
	Desc  string
	Reqs  []string
	Pay   float64
}{
	{1, "Prueba de Identidad", "Escribe tu nombre artístico en tu cuerpo y toma una foto faceless.", []string{"Nombre artístico visible", "Del cuello para abajo", "1 foto mínimo"}, 1},
	{2, "Set Faceless Lencería", "3 fotos faceless en lencería o traje de baño.", []string{"3 fotos mínimo", "Diferentes ángulos", "Faceless", "Buena iluminación"}, 2},
	{3, "Set Faceless Topless", "2 fotos faceless topless con manos cubriendo pecho.", []string{"2 fotos mínimo", "Manos cubriendo pecho", "Faceless"}, 2},
	{4, "Fotos Faceless Cuerpo", "2 fotos de cuerpo en cualquier estilo.", []string{"2 fotos mínimo", "Cualquier estilo", "Faceless"}, 2},
	{5, "Video Intro Faceless", "Video de 15s diciendo tu nombre artístico.", []string{"15 segundos mínimo", "Di tu nombre", "Faceless", "Audio claro"}, 3},
	{6, "Entrevista en Persona", "Trae ID y resultados de salud.", []string{"ID oficial", "Resultados ETS (30 días)", "Firmar consentimiento"}, 5},
}

func (h *Ctx) ApplyAsArtist(w http.ResponseWriter, r *http.Request) {
	var req applyRequest
	if err := ReadJSON(r, &req); err != nil {
		Error(w, 400, "JSON inválido")
		return
	}

	// Validate
	wallet := strings.ToLower(req.WalletAddress)
	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	// Verify wallet signature
	if !h.VerifyWalletAuth(r, wallet) {
		Error(w, 401, "Firma de wallet requerida")
		return
	}

	stageName := SanitizeString(req.StageName, 30)
	if len(stageName) < 2 {
		Error(w, 400, "Nombre artístico muy corto")
		return
	}

	bio := SanitizeString(req.Bio, 500)
	if len(bio) < 10 {
		Error(w, 400, "Bio muy corta")
		return
	}

	if len(req.Categories) == 0 {
		Error(w, 400, "Selecciona al menos una categoría")
		return
	}

	// Check if already applied
	if _, exists := h.DB.Get("artists", wallet); exists {
		Error(w, 400, "Ya has aplicado")
		return
	}

	// Create artist record
	h.DB.Set("artists", wallet, map[string]interface{}{
		"wallet_address":        wallet,
		"stage_name":            stageName,
		"bio":                   bio,
		"categories":            req.Categories,
		"hard_limits":           SanitizeString(req.HardLimits, 1000),
		"referrer":              req.Referrer,
		"status":                "pending_verification",
		"applied_at":            time.Now().UTC().Format(time.RFC3339),
		"approved_at":           nil,
		"total_earned":          0,
		"withdrawable":          0,
		"referral_count":        0,
		"health_verified":       false,
		"health_verified_until": nil,
		"audition_uploaded":     false,
	})

	// Create verification tasks
	for _, td := range taskDefs {
		status := "locked"
		if td.ID == 1 {
			status = "available"
		}
		taskID := wallet + "_" + itoa(td.ID)
		h.DB.Set("tasks", taskID, map[string]interface{}{
			"artist_wallet":  wallet,
			"task_id":        td.ID,
			"title":          td.Title,
			"description":    td.Desc,
			"requirements":   td.Reqs,
			"payout":         td.Pay,
			"status":         status,
			"submitted_at":   nil,
			"reviewed_at":    nil,
			"reviewed_by":    nil,
			"rejection_note": "",
			"submitted_files": []interface{}{},
		})
	}

	JSON(w, 200, map[string]string{"status": "ok", "message": "Solicitud recibida"})
}

func (h *Ctx) UploadAudition(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(100 << 20); err != nil { // 100MB
		Error(w, 413, "Archivo muy grande. Máximo: 100MB")
		return
	}

	wallet := strings.ToLower(r.FormValue("wallet"))
	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	// Verify wallet signature
	if !h.VerifyWalletAuth(r, wallet) {
		Error(w, 401, "Firma de wallet requerida")
		return
	}

	// Check artist exists
	if _, exists := h.DB.Get("artists", wallet); !exists {
		Error(w, 404, "Artista no encontrada — aplica primero")
		return
	}

	file, _, err := r.FormFile("video")
	if err != nil {
		Error(w, 400, "Video requerido")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, 100<<20))
	if err != nil {
		Error(w, 500, "Error leyendo video")
		return
	}

	if _, err := h.Files.SaveRaw(wallet, "auditions", "audition.webm", data); err != nil {
		Error(w, 500, "Error guardando video")
		return
	}

	h.DB.Update("artists", wallet, map[string]interface{}{"audition_uploaded": true})

	JSON(w, 200, map[string]string{"status": "ok", "message": "Video de audición recibido"})
}

func (h *Ctx) GetArtist(w http.ResponseWriter, r *http.Request) {
	wallet := strings.ToLower(r.PathValue("wallet"))
	artist, ok := h.DB.Get("artists", wallet)
	if !ok {
		Error(w, 404, "Artista no encontrada")
		return
	}

	// Strip private fields unless requester is the artist themselves or admin
	isOwner := h.VerifyWalletAuth(r, wallet)
	isAdmin := h.IsAdmin(r)
	if !isOwner && !isAdmin {
		delete(artist, "hard_limits")
		delete(artist, "referrer")
	}

	JSON(w, 200, artist)
}

func (h *Ctx) ListArtists(w http.ResponseWriter, r *http.Request) {
	artists := h.DB.Query("artists", map[string]interface{}{"status": "active"})
	if artists == nil {
		artists = []map[string]interface{}{}
	}

	// Always strip private fields from list view
	for _, artist := range artists {
		delete(artist, "hard_limits")
		delete(artist, "referrer")
	}

	JSON(w, 200, artists)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
