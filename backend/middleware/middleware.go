package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

// CORS middleware with configurable origins
func CORS(allowedOrigins string) func(http.Handler) http.Handler {
	origins := strings.Split(allowedOrigins, ",")
	originSet := make(map[string]bool, len(origins))
	for _, o := range origins {
		originSet[strings.TrimSpace(o)] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if originSet[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Signature, X-Nonce")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "86400")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Logger middleware
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &statusWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(wrapped, r)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, wrapped.status, time.Since(start))
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (sw *statusWriter) WriteHeader(code int) {
	sw.status = code
	sw.ResponseWriter.WriteHeader(code)
}

// MaxBody limits request body size
func MaxBody(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

// RateLimit — token bucket per IP, 60 requests/minute.
// Uses RemoteAddr by default. Only trusts X-Forwarded-For if TRUSTED_PROXY env is set
// and the request comes from that proxy address.
func RateLimit(next http.Handler) http.Handler {
	type bucket struct {
		tokens    int
		lastReset time.Time
	}

	var (
		mu      sync.Mutex
		buckets = make(map[string]*bucket)
	)

	const (
		maxTokens  = 60
		resetEvery = time.Minute
	)

	trustedProxy := os.Getenv("TRUSTED_PROXY")

	// Cleanup old entries every 5 minutes
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			mu.Lock()
			now := time.Now()
			for ip, b := range buckets {
				if now.Sub(b.lastReset) > 10*time.Minute {
					delete(buckets, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		// Only trust X-Forwarded-For if request comes from the trusted proxy
		if trustedProxy != "" {
			remoteIP := r.RemoteAddr
			if idx := strings.LastIndex(remoteIP, ":"); idx != -1 {
				remoteIP = remoteIP[:idx]
			}
			if remoteIP == trustedProxy {
				if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
					// Use first IP in the chain (original client)
					if idx := strings.Index(xff, ","); idx != -1 {
						ip = strings.TrimSpace(xff[:idx])
					} else {
						ip = strings.TrimSpace(xff)
					}
				}
			}
		}

		// Strip port from RemoteAddr if still using it
		if idx := strings.LastIndex(ip, ":"); idx != -1 {
			ip = ip[:idx]
		}

		mu.Lock()
		b, exists := buckets[ip]
		if !exists {
			b = &bucket{tokens: maxTokens, lastReset: time.Now()}
			buckets[ip] = b
		}

		// Refill tokens
		elapsed := time.Since(b.lastReset)
		if elapsed >= resetEvery {
			b.tokens = maxTokens
			b.lastReset = time.Now()
		}

		if b.tokens <= 0 {
			mu.Unlock()
			w.Header().Set("Retry-After", "60")
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		b.tokens--
		mu.Unlock()

		next.ServeHTTP(w, r)
	})
}
