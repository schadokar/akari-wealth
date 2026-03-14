package usecase

import (
	"context"

	"github.com/perfi/model"
)

func (u *UseCase) CreateExpense(ctx context.Context, e model.Expense) (int64, error) {
	return u.store.InsertExpense(ctx, e)
}

func (u *UseCase) GetExpenseByID(ctx context.Context, id int64) (*model.Expense, error) {
	return u.store.GetExpenseByID(ctx, id)
}

func (u *UseCase) GetExpensesByMonth(ctx context.Context, month string) ([]model.Expense, error) {
	return u.store.GetExpensesByMonth(ctx, month)
}

func (u *UseCase) UpdateExpense(ctx context.Context, id int64, e model.Expense) error {
	return u.store.UpdateExpense(ctx, id, e)
}

func (u *UseCase) DeleteExpense(ctx context.Context, id int64) error {
	return u.store.DeleteExpense(ctx, id)
}

func (u *UseCase) CarryForwardRecurring(ctx context.Context, month string) (int, error) {
	return u.store.CarryForwardRecurring(ctx, month)
}
