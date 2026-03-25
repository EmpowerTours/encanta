package handlers

import (
	"io"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

type purchaseRequest struct {
	Wallet string `json:"wallet"`
}

type likeRequest struct {
	SubscriberWallet string `json:"subscriber_wallet"`
	ContentID        string `json:"content_id"`
	ArtistWallet     string `json:"artist_wallet"`
	EngagementType   string `json:"engagement_type"`
}

func (h *Ctx) UploadContent(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(200 << 20); err != nil {
		Error(w, 413, "Archivo muy grande. Máximo: 200MB")
		return
	}

	artistWallet := strings.ToLower(r.FormValue("artist_wallet"))
	category := SanitizeString(r.FormValue("category"), 50)
	description := SanitizeString(r.FormValue("description"), 500)

	if !ValidateWalletAddress(artistWallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	// Verify wallet signature
	if !h.VerifyWalletAuth(r, artistWallet) {
		Error(w, 401, "Firma de wallet requerida")
		return
	}

	artist, ok := h.DB.Get("artists", artistWallet)
	if !ok {
		Error(w, 404, "Artista no encontrada")
		return
	}
	if s, _ := artist["status"].(string); s != "active" {
		Error(w, 403, "Solo artistas activas pueden subir contenido")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		Error(w, 400, "Archivo requerido")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, 200<<20))
	if err != nil {
		Error(w, 500, "Error leyendo archivo")
		return
	}

	path, err := h.Files.SaveFile(artistWallet, "content", header.Filename, data)
	if err != nil {
		Error(w, 500, "Error guardando archivo")
		return
	}

	isVideo := strings.HasPrefix(header.Header.Get("Content-Type"), "video")

	contentID, err := h.DB.Add("content", map[string]interface{}{
		"artist_wallet": artistWallet,
		"category":      category,
		"description":   description,
		"storage_path":  path,
		"filename":      header.Filename,
		"content_type":  header.Header.Get("Content-Type"),
		"size":          len(data),
		"is_video":      isVideo,
		"status":        "pending",
		"submitted_at":  time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		Error(w, 500, "Error creando registro")
		return
	}

	JSON(w, 200, map[string]string{"status": "ok", "content_id": contentID})
}

func (h *Ctx) GetFeed(w http.ResponseWriter, r *http.Request) {
	all := h.DB.All("content")

	var approved []map[string]interface{}
	for _, c := range all {
		if s, _ := c["status"].(string); s == "approved" {
			approved = append(approved, c)
		}
	}

	// Shuffle
	rand.Shuffle(len(approved), func(i, j int) {
		approved[i], approved[j] = approved[j], approved[i]
	})

	// Limit to 50
	if len(approved) > 50 {
		approved = approved[:50]
	}

	feed := make([]map[string]interface{}, 0, len(approved))
	for _, c := range approved {
		artistWallet, _ := c["artist_wallet"].(string)
		artistName := "Artista"
		if artist, ok := h.DB.Get("artists", artistWallet); ok {
			if name, ok := artist["stage_name"].(string); ok {
				artistName = name
			}
		}
		feed = append(feed, map[string]interface{}{
			"content_id":    c["id"],
			"artist_wallet": artistWallet,
			"artist_name":   artistName,
			"category":      c["category"],
			"price":         0.5,
		})
	}

	JSON(w, 200, feed)
}

func (h *Ctx) PurchaseContent(w http.ResponseWriter, r *http.Request) {
	contentID := r.PathValue("contentId")

	var req purchaseRequest
	if err := ReadJSON(r, &req); err != nil {
		Error(w, 400, "JSON inválido")
		return
	}

	wallet := strings.ToLower(req.Wallet)
	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	// Verify wallet signature
	if !h.VerifyWalletAuth(r, wallet) {
		Error(w, 401, "Firma de wallet requerida")
		return
	}

	content, ok := h.DB.Get("content", contentID)
	if !ok {
		Error(w, 404, "Contenido no encontrado")
		return
	}

	// Check if already owned
	col, _ := h.DB.Get("collections", wallet)
	if col != nil {
		if items, ok := col["items"].([]interface{}); ok {
			for _, item := range items {
				if item == contentID {
					JSON(w, 200, map[string]string{"status": "already_owned"})
					return
				}
			}
		}
	}

	// Add to collection
	if col == nil {
		col = map[string]interface{}{"items": []interface{}{}}
	}
	items, _ := col["items"].([]interface{})
	items = append(items, contentID)
	col["items"] = items
	h.DB.Set("collections", wallet, col)

	// Record engagement
	artistWallet, _ := content["artist_wallet"].(string)
	h.DB.Add("engagement", map[string]interface{}{
		"subscriber_wallet": wallet,
		"content_id":        contentID,
		"artist_wallet":     artistWallet,
		"engagement_type":   "view",
		"timestamp":         time.Now().UTC().Format(time.RFC3339),
		"month":             time.Now().UTC().Format("2006-01"),
	})

	JSON(w, 200, map[string]string{"status": "ok", "message": "Contenido desbloqueado"})
}

func (h *Ctx) GetCollection(w http.ResponseWriter, r *http.Request) {
	wallet := strings.ToLower(r.PathValue("wallet"))
	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	col, _ := h.DB.Get("collections", wallet)
	if col == nil {
		JSON(w, 200, map[string]interface{}{"items": []interface{}{}})
		return
	}

	items, _ := col["items"].([]interface{})
	var result []map[string]interface{}
	for _, id := range items {
		cid, _ := id.(string)
		content, ok := h.DB.Get("content", cid)
		if !ok {
			continue
		}
		artistWallet, _ := content["artist_wallet"].(string)
		artistName := "Artista"
		if artist, ok := h.DB.Get("artists", artistWallet); ok {
			if name, ok := artist["stage_name"].(string); ok {
				artistName = name
			}
		}
		result = append(result, map[string]interface{}{
			"content_id":    cid,
			"artist_wallet": artistWallet,
			"artist_name":   artistName,
			"category":      content["category"],
		})
	}

	if result == nil {
		result = []map[string]interface{}{}
	}
	JSON(w, 200, map[string]interface{}{"items": result})
}

func (h *Ctx) ViewContent(w http.ResponseWriter, r *http.Request) {
	contentID := r.PathValue("contentId")
	wallet := strings.ToLower(r.URL.Query().Get("wallet"))

	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet requerida")
		return
	}

	content, ok := h.DB.Get("content", contentID)
	if !ok {
		Error(w, 404, "Contenido no encontrado")
		return
	}

	// Record view
	artistWallet, _ := content["artist_wallet"].(string)
	h.DB.Add("engagement", map[string]interface{}{
		"subscriber_wallet": wallet,
		"content_id":        contentID,
		"artist_wallet":     artistWallet,
		"engagement_type":   "view",
		"timestamp":         time.Now().UTC().Format(time.RFC3339),
		"month":             time.Now().UTC().Format("2006-01"),
	})

	JSON(w, 200, map[string]interface{}{
		"content_type": content["content_type"],
	})
}

func (h *Ctx) LikeContent(w http.ResponseWriter, r *http.Request) {
	contentID := r.PathValue("contentId")

	var req likeRequest
	if err := ReadJSON(r, &req); err != nil {
		Error(w, 400, "JSON inválido")
		return
	}

	subscriberWallet := strings.ToLower(req.SubscriberWallet)
	if !ValidateWalletAddress(subscriberWallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	// Verify wallet signature
	if !h.VerifyWalletAuth(r, subscriberWallet) {
		Error(w, 401, "Firma de wallet requerida")
		return
	}

	if _, ok := h.DB.Get("content", contentID); !ok {
		Error(w, 404, "Contenido no encontrado")
		return
	}

	// Dedup: check if this wallet already liked this content
	existingLikes := h.DB.Query("engagement", map[string]interface{}{
		"subscriber_wallet": subscriberWallet,
		"content_id":        contentID,
		"engagement_type":   "like",
	})
	if len(existingLikes) > 0 {
		JSON(w, 200, map[string]string{"status": "already_liked"})
		return
	}

	h.DB.Add("engagement", map[string]interface{}{
		"subscriber_wallet": subscriberWallet,
		"content_id":        contentID,
		"artist_wallet":     strings.ToLower(req.ArtistWallet),
		"engagement_type":   "like",
		"timestamp":         time.Now().UTC().Format(time.RFC3339),
		"month":             time.Now().UTC().Format("2006-01"),
	})

	JSON(w, 200, map[string]string{"status": "ok"})
}
