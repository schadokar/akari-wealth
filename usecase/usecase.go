package usecase

import (
	"context"

	"github.com/perfi/model"
)

type Store interface {
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
	GetHoldingsByAccountID(ctx context.Context, accountID int64) ([]model.Holding, error)
	UpdateHolding(ctx context.Context, id int64, h model.Holding) error
	SoftDeleteHolding(ctx context.Context, id int64) error

	// Account Snapshots
	UpsertAccountSnapshot(ctx context.Context, s model.AccountSnapshot) (int64, error)
	GetAccountSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.AccountSnapshot, error)
	GetAccountSnapshotsByMonth(ctx context.Context, month string) ([]model.AccountSnapshot, error)
	GetAccountSnapshotByAccountAndMonth(ctx context.Context, accountID int64, month string) (*model.AccountSnapshot, error)

	// Holding Snapshots
	UpsertHoldingSnapshot(ctx context.Context, s model.HoldingSnapshot) (int64, error)
	GetHoldingSnapshotsByHoldingID(ctx context.Context, holdingID int64) ([]model.HoldingSnapshot, error)

	// Credit Card Snapshots
	UpsertCreditCardSnapshot(ctx context.Context, s model.CreditCardSnapshot) (int64, error)
	GetCreditCardSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.CreditCardSnapshot, error)
	GetCreditCardSnapshotsByMonth(ctx context.Context, month string) ([]model.CreditCardSnapshot, error)

	// Monthly Summary
	UpsertMonthlySummary(ctx context.Context, s model.MonthlySummary) error
	GetMonthlySummaryByMonth(ctx context.Context, month string) (*model.MonthlySummary, error)
	GetMonthlySummaryRange(ctx context.Context, from, to string) ([]model.MonthlySummary, error)
	GetLatestMonthlySummary(ctx context.Context) (*model.MonthlySummary, error)
}

type UseCase struct {
	store Store
}

func New(store Store) *UseCase {
	return &UseCase{store: store}
}
