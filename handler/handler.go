package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/perfi/model"
)

type Service interface {
	CreateAccount(ctx context.Context, a model.Account) (int64, error)
	GetAccounts(ctx context.Context) ([]model.Account, error)
	CreateEntity(ctx context.Context, e model.Entity) (int64, error)
	GetEntitiesByAccountID(ctx context.Context, accountID int64) ([]model.Entity, error)
	GetEntitySummaries(ctx context.Context) ([]model.EntitySummary, error)
	LogExpense(ctx context.Context, e model.Expense) (int64, error)
	RecordTransaction(ctx context.Context, t model.Transaction) (int64, error)
}

type Handler struct {
	svc Service
}

func New(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Routes() *chi.Mux {
	r := chi.NewRouter()
	r.Route("/accounts", func(r chi.Router) {
		r.Get("/", h.getAccounts)
		r.Post("/", h.createAccount)
	})
	r.Route("/entities", func(r chi.Router) {
		r.Get("/", h.getEntities)
		r.Post("/", h.createEntity)
		r.Get("/aggregate", h.getEntitySummaries)
	})
	r.Post("/expenses", h.logExpense)
	r.Post("/transactions", h.recordTransaction)
	return r
}

func (h *Handler) getAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := h.svc.GetAccounts(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, accounts)
}

func (h *Handler) createAccount(w http.ResponseWriter, r *http.Request) {
	var a model.Account
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := h.svc.CreateAccount(r.Context(), a)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) getEntities(w http.ResponseWriter, r *http.Request) {
	accountIDStr := r.URL.Query().Get("account_id")
	if accountIDStr == "" {
		http.Error(w, "missing required query parameter: account_id", http.StatusBadRequest)
		return
	}
	accountID, err := strconv.ParseInt(accountIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid account_id", http.StatusBadRequest)
		return
	}
	entities, err := h.svc.GetEntitiesByAccountID(r.Context(), accountID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, entities)
}

func (h *Handler) getEntitySummaries(w http.ResponseWriter, r *http.Request) {
	groupBy := r.URL.Query().Get("groupby")
	if groupBy == "" {
		http.Error(w, "missing required query parameter: groupby", http.StatusBadRequest)
		return
	}
	switch groupBy {
	case "account":
		summaries, err := h.svc.GetEntitySummaries(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, summaries)
	default:
		http.Error(w, "unsupported groupby value: "+groupBy, http.StatusBadRequest)
	}
}

func (h *Handler) createEntity(w http.ResponseWriter, r *http.Request) {
	var e model.Entity
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := h.svc.CreateEntity(r.Context(), e)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) logExpense(w http.ResponseWriter, r *http.Request) {
	var e model.Expense
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := h.svc.LogExpense(r.Context(), e)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) recordTransaction(w http.ResponseWriter, r *http.Request) {
	var t model.Transaction
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := h.svc.RecordTransaction(r.Context(), t)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
