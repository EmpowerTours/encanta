package handlers

import (
	"encanta-api/ws"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

type createRoomReq struct {
	Wallet string  `json:"wallet"`
	Title  string  `json:"title"`
	Price  float64 `json:"price"`
}

type joinRoomReq struct {
	Wallet string `json:"wallet"`
}

func (h *Ctx) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var req createRoomReq
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

	artist, ok := h.DB.Get("artists", wallet)
	if !ok {
		Error(w, 403, "Solo artistas verificadas pueden crear salas")
		return
	}
	if s, _ := artist["status"].(string); s != "active" {
		Error(w, 403, "Solo artistas activas pueden crear salas")
		return
	}

	title := SanitizeString(req.Title, 100)
	if len(title) < 2 {
		Error(w, 400, "Título muy corto")
		return
	}

	price := req.Price
	if price < 0 {
		price = 0
	}
	if price > 100 {
		price = 100
	}

	stageName, _ := artist["stage_name"].(string)
	roomID, err := h.DB.Add("rooms", map[string]interface{}{
		"title":          title,
		"artist1_wallet": wallet,
		"artist1_name":   stageName,
		"artist2_wallet": nil,
		"artist2_name":   nil,
		"status":         "waiting",
		"audience_count": 0,
		"price":          price,
		"created_at":     time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		Error(w, 500, "Error creando sala")
		return
	}

	JSON(w, 200, map[string]interface{}{"room_id": roomID, "status": "ok"})
}

func (h *Ctx) ListRooms(w http.ResponseWriter, r *http.Request) {
	all := h.DB.All("rooms")
	var active []map[string]interface{}
	for _, room := range all {
		if s, _ := room["status"].(string); s == "waiting" || s == "live" {
			active = append(active, room)
		}
	}
	if active == nil {
		active = []map[string]interface{}{}
	}
	JSON(w, 200, active)
}

func (h *Ctx) GetRoom(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("roomId")
	room, ok := h.DB.Get("rooms", roomID)
	if !ok {
		Error(w, 404, "Sala no encontrada")
		return
	}
	room["id"] = roomID
	JSON(w, 200, room)
}

func (h *Ctx) JoinRoom(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("roomId")

	var req joinRoomReq
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

	room, ok := h.DB.Get("rooms", roomID)
	if !ok {
		Error(w, 404, "Sala no encontrada")
		return
	}
	if s, _ := room["status"].(string); s == "ended" {
		Error(w, 400, "Esta sala ya terminó")
		return
	}

	// Check if joining as artist2
	artist, _ := h.DB.Get("artists", wallet)
	if artist != nil {
		if s, _ := artist["status"].(string); s == "active" {
			if room["artist2_wallet"] == nil {
				stageName, _ := artist["stage_name"].(string)
				h.DB.Update("rooms", roomID, map[string]interface{}{
					"artist2_wallet": wallet,
					"artist2_name":   stageName,
					"status":         "live",
				})

				// Generate cryptographic token
				token := h.Verifier.GenerateToken(wallet, "artist", 4*time.Hour)
				JSON(w, 200, map[string]interface{}{"token": token, "role": "artist"})
				return
			}
		}
	}

	// Joining as audience
	price, _ := room["price"].(float64)
	if price > 0 {
		// Record payment (in production: verify on-chain tx)
		h.DB.Add("live_payments", map[string]interface{}{
			"room_id":        roomID,
			"wallet":         wallet,
			"amount":         price,
			"artist1_wallet": room["artist1_wallet"],
			"artist2_wallet": room["artist2_wallet"],
			"timestamp":      time.Now().UTC().Format(time.RFC3339),
		})
	}

	count, _ := room["audience_count"].(float64)
	h.DB.Update("rooms", roomID, map[string]interface{}{"audience_count": count + 1})

	token := h.Verifier.GenerateToken(wallet, "audience", 4*time.Hour)
	JSON(w, 200, map[string]interface{}{"token": token, "role": "audience"})
}

func (h *Ctx) CloseRoom(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("roomId")

	room, ok := h.DB.Get("rooms", roomID)
	if !ok {
		Error(w, 404, "Sala no encontrada")
		return
	}

	// Only the creating artist (artist1) or admin can close
	artist1Wallet, _ := room["artist1_wallet"].(string)
	isArtist1 := h.VerifyWalletAuth(r, artist1Wallet)
	isAdmin := h.IsAdmin(r)
	if !isArtist1 && !isAdmin {
		Error(w, 403, "Solo el artista creador o admin puede cerrar la sala")
		return
	}

	h.DB.Update("rooms", roomID, map[string]interface{}{"status": "ended"})
	JSON(w, 200, map[string]string{"status": "ok", "message": "Sala cerrada"})
}

func (h *Ctx) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("roomId")
	token := r.URL.Query().Get("token")

	// Verify token
	wallet, role, valid := h.Verifier.VerifyToken(token)
	if !valid {
		http.Error(w, "Token inválido", http.StatusUnauthorized)
		return
	}

	// Build upgrader with origin check against allowed origins
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true // allow non-browser clients
			}
			for _, allowed := range h.AllowedOrigins {
				if origin == allowed {
					return true
				}
			}
			return false
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	// Limit WebSocket message size to 4KB
	conn.SetReadLimit(4096)

	client := &ws.Client{
		Conn:   conn,
		RoomID: roomID,
		Wallet: wallet,
		Role:   role,
	}

	h.Hub.Register(client)

	// Read loop
	defer h.Hub.Unregister(client)
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		h.Hub.HandleMessage(client, msg)
	}
}
