package usecase

import (
	"context"

	"github.com/perfi/model"
)

type Store interface {
	// Users
	InsertUser(ctx context.Context, u model.User) (int64, error)
	GetUserByUsername(ctx context.Context, username string) (*model.User, error)

	// Accounts
	InsertAccount(ctx context.Context, a model.Account) (int64, error)
	GetAccountByID(ctx context.Context, id int64) (*model.Account, error)
	GetAccounts(ctx context.Context, category, assetClass string, isActive *bool) ([]model.Account, error)
	UpdateAccount(ctx context.Context, id int64, a model.Account) error
	SoftDeleteAccount(ctx context.Context, id int64) error
	GetLoanAccounts(ctx context.Context) ([]model.Account, error)

	// Holdings
	InsertHolding(ctx context.Context, h model.Holding) (int64, error)
	GetHoldingByID(ctx context.Context, id int64) (*model.Holding, error)
	GetAllHoldings(ctx context.Context) ([]model.Holding, error)
	GetHoldingsByAccountID(ctx context.Context, accountID int64) ([]model.Holding, error)
	UpdateHolding(ctx context.Context, id int64, h model.Holding) error
	SoftDeleteHolding(ctx context.Context, id int64) error

	// Account Snapshots
	UpsertAccountSnapshot(ctx context.Context, s model.AccountSnapshot) (int64, error)
	GetAccountSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.AccountSnapshot, error)
	GetAccountSnapshotsByMonth(ctx context.Context, month string) ([]model.AccountSnapshot, error)
	GetAccountSnapshotByAccountAndMonth(ctx context.Context, accountID int64, month string) (*model.AccountSnapshot, error)
	GetLatestAccountSnapshotPerAccount(ctx context.Context) (map[int64]model.AccountSnapshotAmounts, error)

	// Holding Snapshots
	UpsertHoldingSnapshot(ctx context.Context, s model.HoldingSnapshot) (int64, error)
	GetHoldingSnapshotsByHoldingID(ctx context.Context, holdingID int64) ([]model.HoldingSnapshot, error)

	// Credit Card Snapshots
	UpsertCreditCardSnapshot(ctx context.Context, s model.CreditCardSnapshot) (int64, error)
	GetCreditCardSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.CreditCardSnapshot, error)
	GetCreditCardSnapshotsByMonth(ctx context.Context, month string) ([]model.CreditCardSnapshot, error)
	GetLatestCreditCardSnapshotPerAccount(ctx context.Context) (map[int64]float64, error)

	// Financial Instruments
	SearchFinancialInstruments(ctx context.Context, query, instrumentType string, limit int) ([]model.FinancialInstrument, error)

	// Monthly Summary
	UpsertMonthlySummary(ctx context.Context, s model.MonthlySummary) error
	GetMonthlySummaryByMonth(ctx context.Context, month string) (*model.MonthlySummary, error)
	GetMonthlySummaryRange(ctx context.Context, from, to string) ([]model.MonthlySummary, error)
	GetLatestMonthlySummary(ctx context.Context) (*model.MonthlySummary, error)

	// Employments
	InsertEmployment(ctx context.Context, e model.Employment) (int64, error)
	GetEmploymentByID(ctx context.Context, id int64) (*model.Employment, error)
	GetEmployments(ctx context.Context) ([]model.Employment, error)
	UpdateEmployment(ctx context.Context, id int64, e model.Employment) error
	DeleteEmployment(ctx context.Context, id int64) error

	// Payslips
	InsertPayslip(ctx context.Context, p model.Payslip) (int64, error)
	GetPayslipByID(ctx context.Context, id int64) (*model.Payslip, error)
	GetPayslipsByEmploymentID(ctx context.Context, employmentID int64) ([]model.Payslip, error)
	UpdatePayslip(ctx context.Context, id int64, p model.Payslip) error
	DeletePayslip(ctx context.Context, id int64) error

	// Insurances
	InsertInsurance(ctx context.Context, ins model.Insurance) (int64, error)
	GetInsuranceByID(ctx context.Context, id int64) (*model.Insurance, error)
	GetInsurances(ctx context.Context) ([]model.Insurance, error)
	UpdateInsurance(ctx context.Context, id int64, ins model.Insurance) error
	DeleteInsurance(ctx context.Context, id int64) error

	// Goals
	InsertGoal(ctx context.Context, g model.Goal) (int64, error)
	GetGoalByID(ctx context.Context, id int64) (*model.Goal, error)
	GetGoals(ctx context.Context) ([]model.Goal, error)
	UpdateGoal(ctx context.Context, id int64, g model.Goal) error
	DeleteGoal(ctx context.Context, id int64) error
	InsertGoalMapping(ctx context.Context, m model.GoalMapping) (int64, error)
	GetGoalMappingsByGoalID(ctx context.Context, goalID int64) ([]model.GoalMapping, error)
	ReplaceGoalMappings(ctx context.Context, goalID int64, mappings []model.GoalMapping) error
	GetGoalLatestAmounts(ctx context.Context) (map[int64]map[string][2]float64, error)
	GetGoalMonthlyHistory(ctx context.Context) (map[int64][]model.GoalMonthPoint, error)
	GetGoalSuggestions(ctx context.Context) ([]model.GoalSuggestion, error)
}

type UseCase struct {
	store Store
}

func New(store Store) *UseCase {
	return &UseCase{store: store}
}
