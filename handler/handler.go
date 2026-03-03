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
	// Accounts
	CreateAccount(ctx context.Context, req model.CreateAccountRequest) (int64, error)
	GetAccountByID(ctx context.Context, id int64) (*model.Account, error)
	GetAccounts(ctx context.Context, category, assetClass string, isActive *bool) ([]model.Account, error)
	UpdateAccount(ctx context.Context, id int64, req model.UpdateAccountRequest) error
	SoftDeleteAccount(ctx context.Context, id int64) error

	// Holdings
	CreateHolding(ctx context.Context, accountID int64, req model.CreateHoldingRequest) (int64, error)
	GetHoldingByID(ctx context.Context, id int64) (*model.Holding, error)
	GetHoldingsByAccountID(ctx context.Context, accountID int64) ([]model.Holding, error)
	UpdateHolding(ctx context.Context, id int64, req model.UpdateHoldingRequest) error
	SoftDeleteHolding(ctx context.Context, id int64) error

	// Account Snapshots
	BulkUpsertAccountSnapshots(ctx context.Context, reqs []model.AccountSnapshotRequest) error
	GetAccountSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.AccountSnapshot, error)
	GetAccountSnapshotsByMonth(ctx context.Context, month string) ([]model.AccountSnapshot, error)

	// Holding Snapshots
	BulkUpsertHoldingSnapshots(ctx context.Context, reqs []model.HoldingSnapshotRequest) error
	GetHoldingSnapshotsByHoldingID(ctx context.Context, holdingID int64) ([]model.HoldingSnapshot, error)

	// Credit Card Snapshots
	BulkUpsertCreditCardSnapshots(ctx context.Context, reqs []model.CreditCardSnapshotRequest) error
	GetCreditCardSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.CreditCardSnapshot, error)

	// Monthly Summary
	GetMonthlySummary(ctx context.Context, month string) (*model.MonthlySummary, error)
	GetMonthlySummaryRange(ctx context.Context, from, to string) ([]model.MonthlySummary, error)

	// Dashboard
	GetDashboard(ctx context.Context) (*model.DashboardResponse, error)
}

type Handler struct {
	svc Service
}

func New(svc Service) *Handler {
	return &Handler{svc: svc}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) Routes() *chi.Mux {
	r := chi.NewRouter()

	r.Route("/api", func(r chi.Router) {
		// Accounts
		r.Route("/accounts", func(r chi.Router) {
			r.Get("/", h.listAccounts)
			r.Post("/", h.createAccount)
			r.Get("/{id}", h.getAccount)
			r.Put("/{id}", h.updateAccount)
			r.Delete("/{id}", h.deleteAccount)

			// Holdings under account
			r.Get("/{accountId}/holdings", h.listHoldings)
			r.Post("/{accountId}/holdings", h.createHolding)
		})

		// Holdings (direct access)
		r.Route("/holdings", func(r chi.Router) {
			r.Get("/{id}", h.getHolding)
			r.Put("/{id}", h.updateHolding)
			r.Delete("/{id}", h.deleteHolding)
		})

		// Snapshots
		r.Route("/snapshots", func(r chi.Router) {
			// Account snapshots
			r.Post("/accounts", h.bulkUpsertAccountSnapshots)
			r.Get("/accounts/{accountId}", h.getAccountSnapshotHistory)
			r.Get("/month/{month}", h.getAccountSnapshotsByMonth)

			// Holding snapshots
			r.Post("/holdings", h.bulkUpsertHoldingSnapshots)
			r.Get("/holdings/{holdingId}", h.getHoldingSnapshotHistory)

			// Credit card snapshots
			r.Post("/credit-cards", h.bulkUpsertCreditCardSnapshots)
			r.Get("/credit-cards/{accountId}", h.getCreditCardSnapshotHistory)
		})

		// Monthly Summary
		r.Get("/summary", h.getMonthlySummaryRange)
		r.Get("/summary/{month}", h.getMonthlySummary)

		// Dashboard
		r.Get("/dashboard", h.getDashboard)
	})

	return r
}

// --- Account Handlers ---

func (h *Handler) listAccounts(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	assetClass := r.URL.Query().Get("asset_class")
	var isActive *bool
	if v := r.URL.Query().Get("is_active"); v != "" {
		b := v == "true" || v == "1"
		isActive = &b
	}

	accounts, err := h.svc.GetAccounts(r.Context(), category, assetClass, isActive)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := make([]model.AccountResponse, 0, len(accounts))
	for _, a := range accounts {
		resp = append(resp, toAccountResponse(a))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) getLatestAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := h.svc.GetLatestAccounts(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if accounts == nil {
		accounts = []model.Account{}
	}
	writeJSON(w, http.StatusOK, accounts)
}

func (h *Handler) getAccountSummaryByKind(w http.ResponseWriter, r *http.Request) {
	summaries, err := h.svc.GetAccountSummaryByKind(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if summaries == nil {
		summaries = []model.AccountSummaryByKind{}
	}
	writeJSON(w, http.StatusOK, summaries)
}

func (h *Handler) createAccount(w http.ResponseWriter, r *http.Request) {
	var req model.CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := h.svc.CreateAccount(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) getAccount(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	acct, err := h.svc.GetAccountByID(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if acct == nil {
		http.Error(w, "account not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, toAccountResponse(*acct))
}

func (h *Handler) updateAccount(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var req model.UpdateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.UpdateAccount(r.Context(), id, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteAccount(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.svc.SoftDeleteAccount(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Holding Handlers ---

func (h *Handler) listHoldings(w http.ResponseWriter, r *http.Request) {
	accountID, err := parseID(r, "accountId")
	if err != nil {
		http.Error(w, "invalid accountId", http.StatusBadRequest)
		return
	}
	holdings, err := h.svc.GetHoldingsByAccountID(r.Context(), accountID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := make([]model.HoldingResponse, 0, len(holdings))
	for _, hld := range holdings {
		resp = append(resp, toHoldingResponse(hld))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) createHolding(w http.ResponseWriter, r *http.Request) {
	accountID, err := parseID(r, "accountId")
	if err != nil {
		http.Error(w, "invalid accountId", http.StatusBadRequest)
		return
	}
	var req model.CreateHoldingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := h.svc.CreateHolding(r.Context(), accountID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) getHolding(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	hld, err := h.svc.GetHoldingByID(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if hld == nil {
		http.Error(w, "holding not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, toHoldingResponse(*hld))
}

func (h *Handler) updateHolding(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	var req model.UpdateHoldingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.UpdateHolding(r.Context(), id, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteHolding(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.svc.SoftDeleteHolding(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Account Snapshot Handlers ---

func (h *Handler) bulkUpsertAccountSnapshots(w http.ResponseWriter, r *http.Request) {
	var reqs []model.AccountSnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&reqs); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.BulkUpsertAccountSnapshots(r.Context(), reqs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) getAccountSnapshotHistory(w http.ResponseWriter, r *http.Request) {
	accountID, err := parseID(r, "accountId")
	if err != nil {
		http.Error(w, "invalid accountId", http.StatusBadRequest)
		return
	}
	snapshots, err := h.svc.GetAccountSnapshotsByAccountID(r.Context(), accountID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, snapshots)
}

func (h *Handler) getAccountSnapshotsByMonth(w http.ResponseWriter, r *http.Request) {
	month := chi.URLParam(r, "month")
	snapshots, err := h.svc.GetAccountSnapshotsByMonth(r.Context(), month)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, snapshots)
}

// --- Holding Snapshot Handlers ---

func (h *Handler) bulkUpsertHoldingSnapshots(w http.ResponseWriter, r *http.Request) {
	var reqs []model.HoldingSnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&reqs); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.BulkUpsertHoldingSnapshots(r.Context(), reqs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) getHoldingSnapshotHistory(w http.ResponseWriter, r *http.Request) {
	holdingID, err := parseID(r, "holdingId")
	if err != nil {
		http.Error(w, "invalid holdingId", http.StatusBadRequest)
		return
	}
	snapshots, err := h.svc.GetHoldingSnapshotsByHoldingID(r.Context(), holdingID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, snapshots)
}

// --- Credit Card Snapshot Handlers ---

func (h *Handler) bulkUpsertCreditCardSnapshots(w http.ResponseWriter, r *http.Request) {
	var reqs []model.CreditCardSnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&reqs); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.BulkUpsertCreditCardSnapshots(r.Context(), reqs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) getCreditCardSnapshotHistory(w http.ResponseWriter, r *http.Request) {
	accountID, err := parseID(r, "accountId")
	if err != nil {
		http.Error(w, "invalid accountId", http.StatusBadRequest)
		return
	}
	snapshots, err := h.svc.GetCreditCardSnapshotsByAccountID(r.Context(), accountID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, snapshots)
}

// --- Monthly Summary Handlers ---

func (h *Handler) getMonthlySummary(w http.ResponseWriter, r *http.Request) {
	month := chi.URLParam(r, "month")
	summary, err := h.svc.GetMonthlySummary(r.Context(), month)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if summary == nil {
		http.Error(w, "summary not found", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (h *Handler) getMonthlySummaryRange(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" || to == "" {
		http.Error(w, "missing required query parameters: from, to", http.StatusBadRequest)
		return
	}
	summaries, err := h.svc.GetMonthlySummaryRange(r.Context(), from, to)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, summaries)
}

// --- Dashboard Handler ---

func (h *Handler) getDashboard(w http.ResponseWriter, r *http.Request) {
	dashboard, err := h.svc.GetDashboard(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, dashboard)
}

// --- Helpers ---

func parseID(r *http.Request, param string) (int64, error) {
	return strconv.ParseInt(chi.URLParam(r, param), 10, 64)
}

func toAccountResponse(a model.Account) model.AccountResponse {
	return model.AccountResponse{
		ID:           a.ID,
		Name:         a.Name,
		Category:     a.Category,
		SubCategory:  a.SubCategory,
		AssetClass:   a.AssetClass,
		Institution:  a.Institution,
		InterestRate: a.InterestRate,
		EMIAmount:    a.EMIAmount,
		MaturityDate: a.MaturityDate,
		IsActive:     a.IsActive,
		Notes:        a.Notes,
		CreatedAt:    a.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    a.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func toHoldingResponse(h model.Holding) model.HoldingResponse {
	return model.HoldingResponse{
		ID:             h.ID,
		AccountID:      h.AccountID,
		Name:           h.Name,
		InstrumentType: h.InstrumentType,
		AssetClass:     h.AssetClass,
		IsActive:       h.IsActive,
		Notes:          h.Notes,
		CreatedAt:      h.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
