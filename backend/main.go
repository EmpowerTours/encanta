package main

import (
	"encanta-api/crypto"
	"encanta-api/handlers"
	"encanta-api/middleware"
	"encanta-api/storage"
	"encanta-api/ws"
	"log"
	"net/http"
	"os"
	"strings"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}

	storageDir := os.Getenv("STORAGE_DIR")
	if storageDir == "" {
		storageDir = "./storage"
	}

	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:3000,http://localhost:3001"
	}

	adminWallet := os.Getenv("ADMIN_WALLET")

	// Parse allowed origins into slice for WebSocket CheckOrigin
	var allowedOrigins []string
	for _, o := range strings.Split(corsOrigins, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	// Initialize core services
	db := storage.NewJsonDB(dataDir)
	fileStore := storage.NewFileStore(storageDir)
	verifier := crypto.NewSigVerifier()
	hub := ws.NewHub()
	go hub.Run()

	// Create handler context
	h := &handlers.Ctx{
		DB:             db,
		Files:          fileStore,
		Verifier:       verifier,
		Hub:            hub,
		AdminWallet:    adminWallet,
		AllowedOrigins: allowedOrigins,
	}

	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		handlers.JSON(w, 200, map[string]string{"platform": "Encanta", "status": "online", "version": "3.0.0"})
	})
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		handlers.JSON(w, 200, map[string]string{"status": "ok"})
	})

	// Artists
	mux.HandleFunc("POST /api/artists/apply", h.ApplyAsArtist)
	mux.HandleFunc("POST /api/artists/audition", h.UploadAudition)
	mux.HandleFunc("GET /api/artists/{wallet}", h.GetArtist)
	mux.HandleFunc("GET /api/artists", h.ListArtists)

	// Tasks
	mux.HandleFunc("GET /api/tasks/{wallet}", h.GetTasks)
	mux.HandleFunc("POST /api/tasks/{wallet}/{taskId}/submit", h.SubmitTask)
	mux.HandleFunc("POST /api/tasks/{wallet}/{taskId}/review", h.ReviewTask)

	// Content
	mux.HandleFunc("POST /api/content/upload", h.UploadContent)
	mux.HandleFunc("GET /api/content/feed", h.GetFeed)
	mux.HandleFunc("POST /api/content/purchase/{contentId}", h.PurchaseContent)
	mux.HandleFunc("GET /api/content/collection/{wallet}", h.GetCollection)
	mux.HandleFunc("GET /api/content/view/{contentId}", h.ViewContent)
	mux.HandleFunc("POST /api/content/like/{contentId}", h.LikeContent)

	// Subscriptions
	mux.HandleFunc("GET /api/subscribe/status/{wallet}", h.CheckSubscription)
	mux.HandleFunc("GET /api/subscribe/referral/{wallet}", h.GetReferral)

	// Live rooms
	mux.HandleFunc("POST /api/live/rooms", h.CreateRoom)
	mux.HandleFunc("GET /api/live/rooms", h.ListRooms)
	mux.HandleFunc("GET /api/live/rooms/{roomId}", h.GetRoom)
	mux.HandleFunc("POST /api/live/rooms/{roomId}/join", h.JoinRoom)
	mux.HandleFunc("DELETE /api/live/rooms/{roomId}", h.CloseRoom)

	// WebSocket
	mux.HandleFunc("GET /ws/live/{roomId}", h.HandleWebSocket)

	// Admin (wallet-gated)
	mux.HandleFunc("GET /api/admin/stats", h.AdminStats)
	mux.HandleFunc("GET /api/admin/pending", h.AdminPending)
	mux.HandleFunc("POST /api/admin/approve/{wallet}", h.AdminApprove)
	mux.HandleFunc("POST /api/admin/suspend/{wallet}", h.AdminSuspend)
	mux.HandleFunc("POST /api/admin/reactivate/{wallet}", h.AdminReactivate)
	mux.HandleFunc("POST /api/admin/verify-health/{wallet}", h.AdminVerifyHealth)

	// Apply middleware
	handler := middleware.CORS(corsOrigins)(
		middleware.RateLimit(
			middleware.Logger(
				middleware.MaxBody(100<<20)( // 100MB max body
					mux,
				),
			),
		),
	)

	log.Printf("Encanta API v3.0.0 starting on :%s", port)
	log.Printf("Data: %s | Storage: %s", dataDir, storageDir)
	if adminWallet != "" {
		log.Printf("Admin wallet: %s...%s", adminWallet[:6], adminWallet[len(adminWallet)-4:])
	}

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
