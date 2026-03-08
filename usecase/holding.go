package usecase

import (
	"context"
	"fmt"

	"github.com/perfi/model"
)

func (u *UseCase) CreateHolding(ctx context.Context, accountID int64, req model.CreateHoldingRequest) (int64, error) {
	acct, err := u.store.GetAccountByID(ctx, accountID)
	if err != nil {
		return 0, err
	}
	if acct == nil {
		return 0, errNotFound("account")
	}
	if acct.Category != model.CategoryBrokerage {
		return 0, fmt.Errorf("holdings can only be created under brokerage accounts")
	}

	h := model.Holding{
		AccountID:      accountID,
		Name:           req.Name,
		InstrumentType: req.InstrumentType,
		AssetClass:     req.AssetClass,
		IsActive:       true,
		Notes:          req.Notes,
	}
	return u.store.InsertHolding(ctx, h)
}

func (u *UseCase) GetHoldingByID(ctx context.Context, id int64) (*model.Holding, error) {
	return u.store.GetHoldingByID(ctx, id)
}

func (u *UseCase) GetAllHoldings(ctx context.Context) ([]model.Holding, error) {
	return u.store.GetAllHoldings(ctx)
}

func (u *UseCase) GetHoldingsByAccountID(ctx context.Context, accountID int64) ([]model.Holding, error) {
	return u.store.GetHoldingsByAccountID(ctx, accountID)
}

func (u *UseCase) UpdateHolding(ctx context.Context, id int64, req model.UpdateHoldingRequest) error {
	existing, err := u.store.GetHoldingByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errNotFound("holding")
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.AssetClass != nil {
		existing.AssetClass = req.AssetClass
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	if req.Notes != nil {
		existing.Notes = req.Notes
	}

	return u.store.UpdateHolding(ctx, id, *existing)
}

func (u *UseCase) SoftDeleteHolding(ctx context.Context, id int64) error {
	return u.store.SoftDeleteHolding(ctx, id)
}
