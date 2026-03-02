package usecase

import (
	"context"

	"github.com/perfi/model"
)

type Store interface {
	InsertAccount(ctx context.Context, a model.Account) (int64, error)
	GetAccounts(ctx context.Context) ([]model.Account, error)
	InsertEntity(ctx context.Context, e model.Entity) (int64, error)
	GetEntitiesByAccountID(ctx context.Context, accountID int64) ([]model.Entity, error)
	GetEntitySummaries(ctx context.Context) ([]model.EntitySummary, error)
	InsertExpense(ctx context.Context, e model.Expense) (int64, error)
	InsertTransaction(ctx context.Context, t model.Transaction) (int64, error)
}

type UseCase struct {
	store Store
}

func New(store Store) *UseCase {
	return &UseCase{store: store}
}

func (u *UseCase) CreateAccount(ctx context.Context, a model.Account) (int64, error) {
	return u.store.InsertAccount(ctx, a)
}

func (u *UseCase) GetAccounts(ctx context.Context) ([]model.Account, error) {
	return u.store.GetAccounts(ctx)
}

func (u *UseCase) CreateEntity(ctx context.Context, e model.Entity) (int64, error) {
	return u.store.InsertEntity(ctx, e)
}

func (u *UseCase) GetEntitiesByAccountID(ctx context.Context, accountID int64) ([]model.Entity, error) {
	return u.store.GetEntitiesByAccountID(ctx, accountID)
}

func (u *UseCase) GetEntitySummaries(ctx context.Context) ([]model.EntitySummary, error) {
	return u.store.GetEntitySummaries(ctx)
}

func (u *UseCase) LogExpense(ctx context.Context, e model.Expense) (int64, error) {
	return u.store.InsertExpense(ctx, e)
}

func (u *UseCase) RecordTransaction(ctx context.Context, t model.Transaction) (int64, error) {
	return u.store.InsertTransaction(ctx, t)
}
