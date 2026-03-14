package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/perfi/auth"
	"github.com/perfi/model"
)

type Service interface {
	// Auth
	Login(ctx context.Context, username, password string) (string, error)
	Register(ctx context.Context, username, password string) (string, error)

	// Accounts
	CreateAccount(ctx context.Context, req model.CreateAccountRequest) (int64, error)
	GetAccountByID(ctx context.Context, id int64) (*model.Account, error)
	GetAccounts(ctx context.Context, category, assetClass string, isActive *bool) ([]model.Account, error)
	UpdateAccount(ctx context.Context, id int64, req model.UpdateAccountRequest) error
	SoftDeleteAccount(ctx context.Context, id int64) error

	// Holdings
	CreateHolding(ctx context.Context, accountID int64, req model.CreateHoldingRequest) (int64, error)
	GetHoldingByID(ctx context.Context, id int64) (*model.Holding, error)
	GetAllHoldings(ctx context.Context) ([]model.Holding, error)
	GetHoldingsByAccountID(ctx context.Context, accountID int64) ([]model.Holding, error)
	UpdateHolding(ctx context.Context, id int64, req model.UpdateHoldingRequest) error
	SoftDeleteHolding(ctx context.Context, id int64) error

	// Account Snapshots
	BulkUpsertAccountSnapshots(ctx context.Context, reqs []model.AccountSnapshotRequest) error
	GetAccountSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.AccountSnapshot, error)
	GetAccountSnapshotsByMonth(ctx context.Context, month string) ([]model.AccountSnapshot, error)
	GetLatestAccountSnapshotPerAccount(ctx context.Context) (map[int64]model.AccountSnapshotAmounts, error)

	// Holding Snapshots
	BulkUpsertHoldingSnapshots(ctx context.Context, reqs []model.HoldingSnapshotRequest) error
	GetHoldingSnapshotsByHoldingID(ctx context.Context, holdingID int64) ([]model.HoldingSnapshot, error)

	// Credit Card Snapshots
	BulkUpsertCreditCardSnapshots(ctx context.Context, reqs []model.CreditCardSnapshotRequest) error
	GetCreditCardSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.CreditCardSnapshot, error)
	GetLatestCreditCardSnapshotPerAccount(ctx context.Context) (map[int64]float64, error)

	// Financial Instruments
	SearchFinancialInstruments(ctx context.Context, query, instrumentType string, limit int) ([]model.FinancialInstrument, error)

	// Monthly Summary
	GetMonthlySummary(ctx context.Context, month string) (*model.MonthlySummary, error)
	GetMonthlySummaryRange(ctx context.Context, from, to string) ([]model.MonthlySummary, error)

	// Dashboard
	GetDashboard(ctx context.Context) (*model.DashboardResponse, error)

	// Employments
	CreateEmployment(ctx context.Context, req model.CreateEmploymentRequest) (int64, error)
	GetEmploymentByID(ctx context.Context, id int64) (*model.Employment, error)
	GetEmployments(ctx context.Context) ([]model.Employment, error)
	UpdateEmployment(ctx context.Context, id int64, req model.UpdateEmploymentRequest) error
	DeleteEmployment(ctx context.Context, id int64) error

	// Payslips
	CreatePayslip(ctx context.Context, employmentID int64, req model.CreatePayslipRequest) (int64, error)
	GetPayslipByID(ctx context.Context, id int64) (*model.Payslip, error)
	GetPayslipsByEmploymentID(ctx context.Context, employmentID int64) ([]model.Payslip, error)
	UpdatePayslip(ctx context.Context, id int64, req model.UpdatePayslipRequest) error
	DeletePayslip(ctx context.Context, id int64) error

	// Insurances
	CreateInsurance(ctx context.Context, req model.CreateInsuranceRequest) (int64, error)
	GetInsuranceByID(ctx context.Context, id int64) (*model.Insurance, error)
	GetInsurances(ctx context.Context) ([]model.Insurance, error)
	UpdateInsurance(ctx context.Context, id int64, req model.UpdateInsuranceRequest) error
	DeleteInsurance(ctx context.Context, id int64) error

	// Expenses
	CreateExpense(ctx context.Context, e model.Expense) (int64, error)
	GetExpenseByID(ctx context.Context, id int64) (*model.Expense, error)
	GetExpensesByMonth(ctx context.Context, month string) ([]model.Expense, error)
	UpdateExpense(ctx context.Context, id int64, e model.Expense) error
	DeleteExpense(ctx context.Context, id int64) error
	CarryForwardRecurring(ctx context.Context, month string) (int, error)

	// Goals
	CreateGoal(ctx context.Context, req model.CreateGoalRequest) (int64, error)
	GetGoalByID(ctx context.Context, id int64) (*model.GoalResponse, error)
	GetGoals(ctx context.Context) ([]model.GoalResponse, error)
	UpdateGoal(ctx context.Context, id int64, req model.UpdateGoalRequest) error
	DeleteGoal(ctx context.Context, id int64) error
	UpdateGoalMappings(ctx context.Context, goalID int64, mappings []model.GoalMappingInput) error
	GetGoalAnalytics(ctx context.Context) ([]model.GoalAnalyticsEntry, error)
	GetGoalSuggestions(ctx context.Context) ([]model.GoalSuggestion, error)
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
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func jwtMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		userID, err := auth.VerifyToken(token)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := auth.WithUserID(r.Context(), userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *Handler) Routes() *chi.Mux {
	r := chi.NewRouter()
	r.Use(cors)

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	r.Route("/api", func(r chi.Router) {
		// Public auth routes
		r.Post("/auth/login", h.login)
		r.Post("/auth/register", h.register)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(jwtMiddleware)

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
				r.Get("/", h.listAllHoldings)
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

			// Financial Instruments
			r.Get("/instruments/search", h.searchInstruments)

			// Monthly Summary
			r.Get("/summary", h.getMonthlySummaryRange)
			r.Get("/summary/{month}", h.getMonthlySummary)

			// Dashboard
			r.Get("/dashboard", h.getDashboard)

			// Employments
			r.Route("/employments", func(r chi.Router) {
				r.Get("/", h.listEmployments)
				r.Post("/", h.createEmployment)
				r.Get("/{id}", h.getEmployment)
				r.Put("/{id}", h.updateEmployment)
				r.Delete("/{id}", h.deleteEmployment)

				// Payslips under employment
				r.Get("/{employmentId}/payslips", h.listPayslips)
				r.Post("/{employmentId}/payslips", h.createPayslip)
			})

			// Payslips (direct access)
			r.Route("/payslips", func(r chi.Router) {
				r.Get("/{id}", h.getPayslip)
				r.Put("/{id}", h.updatePayslip)
				r.Delete("/{id}", h.deletePayslip)
			})

			// Goals
			r.Route("/goals", func(r chi.Router) {
				r.Get("/", h.listGoals)
				r.Post("/", h.createGoal)
				r.Get("/analytics", h.getGoalAnalytics)
				r.Get("/suggestions", h.getGoalSuggestions)
				r.Get("/{id}", h.getGoal)
				r.Put("/{id}", h.updateGoal)
				r.Delete("/{id}", h.deleteGoal)
				r.Put("/{id}/mappings", h.updateGoalMappings)
			})

			// Insurances
			r.Route("/insurances", func(r chi.Router) {
				r.Get("/", h.listInsurances)
				r.Post("/", h.createInsurance)
				r.Get("/{id}", h.getInsurance)
				r.Put("/{id}", h.updateInsurance)
				r.Delete("/{id}", h.deleteInsurance)
			})

			// Expenses
			r.Route("/expenses", func(r chi.Router) {
				r.Get("/", h.listExpenses)
				r.Post("/", h.createExpense)
				r.Post("/carry-forward", h.carryForwardExpenses)
				r.Put("/{id}", h.updateExpense)
				r.Delete("/{id}", h.deleteExpense)
			})
		})
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

	latestAmounts, err := h.svc.GetLatestAccountSnapshotPerAccount(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ccAmounts, err := h.svc.GetLatestCreditCardSnapshotPerAccount(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := make([]model.AccountResponse, 0, len(accounts))
	for _, a := range accounts {
		ar := toAccountResponse(a)
		if amt, ok := latestAmounts[a.ID]; ok {
			ar.CurrentAmount = &amt.CurrentAmount
			ar.InvestedAmount = &amt.InvestedAmount
		} else if amt, ok := ccAmounts[a.ID]; ok {
			ar.CurrentAmount = &amt
		}
		resp = append(resp, ar)
	}
	writeJSON(w, http.StatusOK, resp)
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

func (h *Handler) listAllHoldings(w http.ResponseWriter, r *http.Request) {
	holdings, err := h.svc.GetAllHoldings(r.Context())
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

// --- Financial Instrument Handlers ---

func (h *Handler) searchInstruments(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	assetClass := r.URL.Query().Get("asset_class")
	if len(q) < 4 || assetClass == "" {
		writeJSON(w, http.StatusOK, []model.FinancialInstrument{})
		return
	}
	results, err := h.svc.SearchFinancialInstruments(r.Context(), q, assetClass, 10)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if results == nil {
		results = []model.FinancialInstrument{}
	}
	writeJSON(w, http.StatusOK, results)
}

// --- Auth Handlers ---

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	token, err := h.svc.Login(r.Context(), req.Username, req.Password)
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	writeJSON(w, http.StatusOK, model.LoginResponse{Token: token})
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	token, err := h.svc.Register(r.Context(), req.Username, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, model.RegisterResponse{Token: token})
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
		StartDate:    a.StartDate,
		TenureMonths: a.TenureMonths,
		MaturityDate: a.MaturityDate,
		IsActive:     a.IsActive,
		Notes:        a.Notes,
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

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	if errors.Is(err, model.ErrNotFound) {
		status = http.StatusNotFound
	} else if errors.Is(err, model.ErrValidation) {
		status = http.StatusBadRequest
	}
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

// --- Employment Handlers ---

func (h *Handler) listEmployments(w http.ResponseWriter, r *http.Request) {
	list, err := h.svc.GetEmployments(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *Handler) createEmployment(w http.ResponseWriter, r *http.Request) {
	var req model.CreateEmploymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	id, err := h.svc.CreateEmployment(r.Context(), req)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) getEmployment(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	emp, err := h.svc.GetEmploymentByID(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, emp)
}

func (h *Handler) updateEmployment(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	var req model.UpdateEmploymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if err := h.svc.UpdateEmployment(r.Context(), id, req); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteEmployment(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	if err := h.svc.DeleteEmployment(r.Context(), id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Payslip Handlers ---

func (h *Handler) listPayslips(w http.ResponseWriter, r *http.Request) {
	employmentID, err := parseID(r, "employmentId")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid employmentId"})
		return
	}
	list, err := h.svc.GetPayslipsByEmploymentID(r.Context(), employmentID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *Handler) createPayslip(w http.ResponseWriter, r *http.Request) {
	employmentID, err := parseID(r, "employmentId")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid employmentId"})
		return
	}
	var req model.CreatePayslipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	id, err := h.svc.CreatePayslip(r.Context(), employmentID, req)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) getPayslip(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	p, err := h.svc.GetPayslipByID(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) updatePayslip(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	var req model.UpdatePayslipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if err := h.svc.UpdatePayslip(r.Context(), id, req); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deletePayslip(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	if err := h.svc.DeletePayslip(r.Context(), id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Goal Handlers ---

func (h *Handler) listGoals(w http.ResponseWriter, r *http.Request) {
	goals, err := h.svc.GetGoals(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, goals)
}

func (h *Handler) createGoal(w http.ResponseWriter, r *http.Request) {
	var req model.CreateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	id, err := h.svc.CreateGoal(r.Context(), req)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) getGoal(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	goal, err := h.svc.GetGoalByID(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}
	if goal == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "goal not found"})
		return
	}
	writeJSON(w, http.StatusOK, goal)
}

func (h *Handler) updateGoal(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	var req model.UpdateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if err := h.svc.UpdateGoal(r.Context(), id, req); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteGoal(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	if err := h.svc.DeleteGoal(r.Context(), id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) getGoalSuggestions(w http.ResponseWriter, r *http.Request) {
	suggestions, err := h.svc.GetGoalSuggestions(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	if suggestions == nil {
		suggestions = []model.GoalSuggestion{}
	}
	writeJSON(w, http.StatusOK, suggestions)
}

func (h *Handler) getGoalAnalytics(w http.ResponseWriter, r *http.Request) {
	analytics, err := h.svc.GetGoalAnalytics(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, analytics)
}

func (h *Handler) updateGoalMappings(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	var mappings []model.GoalMappingInput
	if err := json.NewDecoder(r.Body).Decode(&mappings); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if err := h.svc.UpdateGoalMappings(r.Context(), id, mappings); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Insurance Handlers ---

func (h *Handler) listInsurances(w http.ResponseWriter, r *http.Request) {
	insurances, err := h.svc.GetInsurances(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, insurances)
}

func (h *Handler) createInsurance(w http.ResponseWriter, r *http.Request) {
	var req model.CreateInsuranceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	id, err := h.svc.CreateInsurance(r.Context(), req)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) getInsurance(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	ins, err := h.svc.GetInsuranceByID(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}
	if ins == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "insurance not found"})
		return
	}
	writeJSON(w, http.StatusOK, ins)
}

func (h *Handler) updateInsurance(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	var req model.UpdateInsuranceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if err := h.svc.UpdateInsurance(r.Context(), id, req); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteInsurance(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	if err := h.svc.DeleteInsurance(r.Context(), id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Expense Handlers ---

func (h *Handler) listExpenses(w http.ResponseWriter, r *http.Request) {
	month := r.URL.Query().Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	expenses, err := h.svc.GetExpensesByMonth(r.Context(), month)
	if err != nil {
		writeError(w, err)
		return
	}
	if expenses == nil {
		expenses = []model.Expense{}
	}
	writeJSON(w, http.StatusOK, expenses)
}

func (h *Handler) createExpense(w http.ResponseWriter, r *http.Request) {
	var e model.Expense
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	id, err := h.svc.CreateExpense(r.Context(), e)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]int64{"id": id})
}

func (h *Handler) carryForwardExpenses(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Month string `json:"month"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Month == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "month required"})
		return
	}
	n, err := h.svc.CarryForwardRecurring(r.Context(), req.Month)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"copied": n})
}

func (h *Handler) updateExpense(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	var e model.Expense
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	if err := h.svc.UpdateExpense(r.Context(), id, e); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteExpense(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r, "id")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	if err := h.svc.DeleteExpense(r.Context(), id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
