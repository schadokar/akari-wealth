package usecase

import (
	"context"

	"github.com/perfi/model"
)

func (u *UseCase) SearchFinancialInstruments(ctx context.Context, query, instrumentType string, limit int) ([]model.FinancialInstrument, error) {
	return u.store.SearchFinancialInstruments(ctx, query, instrumentType, limit)
}
