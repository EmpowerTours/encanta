package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	chatRateLimit = 2 * time.Second
	maxMsgLen     = 200
)

type Client struct {
	Conn     *websocket.Conn
	RoomID   string
	Wallet   string
	Role     string // "artist" or "audience"
	LastChat time.Time
	mu       sync.Mutex
}

func (c *Client) Send(msg interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Conn.WriteJSON(msg)
}

type Hub struct {
	rooms      map[string][]*Client // room_id -> clients
	mu         sync.RWMutex
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string][]*Client),
		register:   make(chan *Client, 64),
		unregister: make(chan *Client, 64),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.rooms[client.RoomID] = append(h.rooms[client.RoomID], client)
			count := len(h.rooms[client.RoomID])
			h.mu.Unlock()

			h.Broadcast(client.RoomID, map[string]interface{}{
				"type":              "participant_joined",
				"role":              client.Role,
				"wallet":            truncateWallet(client.Wallet),
				"participant_count": count,
			}, client)

		case client := <-h.unregister:
			h.mu.Lock()
			clients := h.rooms[client.RoomID]
			for i, c := range clients {
				if c == client {
					h.rooms[client.RoomID] = append(clients[:i], clients[i+1:]...)
					break
				}
			}
			if len(h.rooms[client.RoomID]) == 0 {
				delete(h.rooms, client.RoomID)
			}
			h.mu.Unlock()
			client.Conn.Close()
		}
	}
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// Broadcast sends a message to all clients in a room except the sender
func (h *Hub) Broadcast(roomID string, msg interface{}, exclude *Client) {
	h.mu.RLock()
	clients := h.rooms[roomID]
	h.mu.RUnlock()

	for _, c := range clients {
		if c != exclude {
			c.Send(msg)
		}
	}
}

// BroadcastAll sends to everyone in a room including sender
func (h *Hub) BroadcastAll(roomID string, msg interface{}) {
	h.mu.RLock()
	clients := h.rooms[roomID]
	h.mu.RUnlock()

	for _, c := range clients {
		c.Send(msg)
	}
}

// HandleMessage processes incoming WebSocket messages
func (h *Hub) HandleMessage(client *Client, raw []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(raw, &msg); err != nil {
		return
	}

	msgType, _ := msg["type"].(string)

	switch msgType {
	case "offer":
		// Only artists can send WebRTC offers
		if client.Role != "artist" {
			client.Send(map[string]interface{}{
				"type":    "error",
				"message": "Solo artistas pueden enviar offers",
			})
			return
		}
		h.Broadcast(client.RoomID, msg, client)

	case "answer", "ice_candidate":
		// WebRTC signaling — relay to other peers
		h.Broadcast(client.RoomID, msg, client)

	case "chat_message":
		h.handleChat(client, msg)

	case "tip":
		h.BroadcastAll(client.RoomID, map[string]interface{}{
			"type":   "tip",
			"from":   truncateWallet(client.Wallet),
			"amount": msg["amount"],
		})

	default:
		log.Printf("ws: unknown message type: %s", msgType)
	}
}

func (h *Hub) handleChat(client *Client, msg map[string]interface{}) {
	now := time.Now()
	if now.Sub(client.LastChat) < chatRateLimit {
		client.Send(map[string]interface{}{
			"type":    "error",
			"message": "Espera 2 segundos entre mensajes",
		})
		return
	}
	client.LastChat = now

	text, _ := msg["text"].(string)
	if len(text) == 0 {
		return
	}
	if len(text) > maxMsgLen {
		text = text[:maxMsgLen]
	}

	h.BroadcastAll(client.RoomID, map[string]interface{}{
		"type":      "chat_message",
		"sender":    truncateWallet(client.Wallet),
		"text":      text,
		"isArtist":  client.Role == "artist",
		"timestamp": now.Unix(),
	})
}

func truncateWallet(w string) string {
	if len(w) > 10 {
		return w[:6] + "..." + w[len(w)-4:]
	}
	return w
}
