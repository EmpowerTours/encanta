package handlers

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type reviewRequest struct {
	Approved      bool   `json:"approved"`
	RejectionNote string `json:"rejection_note"`
	Reviewer      string `json:"reviewer"`
}

func (h *Ctx) GetTasks(w http.ResponseWriter, r *http.Request) {
	wallet := strings.ToLower(r.PathValue("wallet"))
	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	tasks := h.DB.Query("tasks", map[string]interface{}{"artist_wallet": wallet})
	if tasks == nil {
		tasks = []map[string]interface{}{}
	}
	JSON(w, 200, tasks)
}

func (h *Ctx) SubmitTask(w http.ResponseWriter, r *http.Request) {
	wallet := strings.ToLower(r.PathValue("wallet"))
	taskIDStr := r.PathValue("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil || taskID < 1 || taskID > 6 {
		Error(w, 400, "Task ID inválido")
		return
	}

	if !ValidateWalletAddress(wallet) {
		Error(w, 400, "Wallet inválida")
		return
	}

	// Verify wallet signature
	if !h.VerifyWalletAuth(r, wallet) {
		Error(w, 401, "Firma de wallet requerida")
		return
	}

	docID := fmt.Sprintf("%s_%d", wallet, taskID)
	task, ok := h.DB.Get("tasks", docID)
	if !ok {
		Error(w, 404, "Tarea no encontrada")
		return
	}

	status, _ := task["status"].(string)
	if status != "available" && status != "rejected" {
		Error(w, 400, "Tarea no disponible. Estado: "+status)
		return
	}

	// Parse multipart files
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		Error(w, 413, "Archivos muy grandes")
		return
	}

	files := r.MultipartForm.File["files"]
	var savedFiles []interface{}
	for _, fh := range files {
		f, err := fh.Open()
		if err != nil {
			continue
		}
		data, err := io.ReadAll(io.LimitReader(f, 50<<20))
		f.Close()
		if err != nil {
			continue
		}

		subfolder := fmt.Sprintf("tasks/%d", taskID)
		path, err := h.Files.SaveFile(wallet, subfolder, fh.Filename, data)
		if err != nil {
			continue
		}
		savedFiles = append(savedFiles, map[string]interface{}{
			"filename": fh.Filename,
			"path":     path,
			"size":     len(data),
		})
	}

	h.DB.Update("tasks", docID, map[string]interface{}{
		"status":          "in_review",
		"submitted_at":    time.Now().UTC().Format(time.RFC3339),
		"submitted_files": savedFiles,
		"rejection_note":  "",
	})

	// Unlock next task
	if taskID < 6 {
		nextID := fmt.Sprintf("%s_%d", wallet, taskID+1)
		if nextTask, ok := h.DB.Get("tasks", nextID); ok {
			if s, _ := nextTask["status"].(string); s == "locked" {
				h.DB.Update("tasks", nextID, map[string]interface{}{"status": "available"})
			}
		}
	}

	JSON(w, 200, map[string]string{"status": "ok", "message": "Tarea enviada para revisión"})
}

func (h *Ctx) ReviewTask(w http.ResponseWriter, r *http.Request) {
	// Admin-only
	if !h.IsAdmin(r) {
		Error(w, 403, "No autorizado")
		return
	}

	wallet := strings.ToLower(r.PathValue("wallet"))
	taskIDStr := r.PathValue("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		Error(w, 400, "Task ID inválido")
		return
	}

	var req reviewRequest
	if err := ReadJSON(r, &req); err != nil {
		Error(w, 400, "JSON inválido")
		return
	}

	docID := fmt.Sprintf("%s_%d", wallet, taskID)
	task, ok := h.DB.Get("tasks", docID)
	if !ok {
		Error(w, 404, "Tarea no encontrada")
		return
	}

	if s, _ := task["status"].(string); s != "in_review" {
		Error(w, 400, "Tarea no está en revisión")
		return
	}

	newStatus := "rejected"
	if req.Approved {
		newStatus = "approved"
	}

	note := ""
	if !req.Approved {
		note = SanitizeString(req.RejectionNote, 500)
	}

	h.DB.Update("tasks", docID, map[string]interface{}{
		"status":         newStatus,
		"reviewed_at":    time.Now().UTC().Format(time.RFC3339),
		"reviewed_by":    SanitizeString(req.Reviewer, 100),
		"rejection_note": note,
	})

	JSON(w, 200, map[string]interface{}{
		"status":      "ok",
		"task_status": newStatus,
	})
}
