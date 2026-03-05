package spa

import (
	"io/fs"
	"net/http"
	"os"
	"path"
)

type Handler struct {
	staticFS   fs.FS
	fileServer http.Handler
}

func NewHandler(staticFS fs.FS) *Handler {
	return &Handler{
		staticFS:   staticFS,
		fileServer: http.FileServer(http.FS(staticFS)),
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Try to serve the file directly
	p := path.Clean(r.URL.Path)
	if p == "/" {
		p = "index.html"
	} else {
		p = p[1:] // strip leading /
	}

	if _, err := fs.Stat(h.staticFS, p); err == nil {
		h.fileServer.ServeHTTP(w, r)
		return
	}

	// Fall back to index.html for SPA routing
	index, err := fs.ReadFile(h.staticFS, "index.html")
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(index)
}

// DevHandler serves from a directory on disk (for development)
func DevHandler(dir string) http.Handler {
	return &devHandler{dir: dir}
}

type devHandler struct {
	dir string
}

func (h *devHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p := path.Join(h.dir, path.Clean(r.URL.Path))
	if _, err := os.Stat(p); err != nil {
		// Serve index.html for SPA routes
		http.ServeFile(w, r, path.Join(h.dir, "index.html"))
		return
	}
	http.ServeFile(w, r, p)
}
