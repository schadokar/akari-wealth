package usecase

import (
	"context"

	"github.com/perfi/model"
)

func (u *UseCase) CreateAccount(ctx context.Context, req model.CreateAccountRequest) (int64, error) {
	a := model.Account{
		Name:         req.Name,
		Category:     req.Category,
		SubCategory:  req.SubCategory,
		AssetClass:   req.AssetClass,
		Institution:  req.Institution,
		InterestRate: req.InterestRate,
		EMIAmount:    req.EMIAmount,
		StartDate:    req.StartDate,
		TenureMonths: req.TenureMonths,
		MaturityDate: req.MaturityDate,
		IsActive:     true,
		Notes:        req.Notes,
	}
	return u.store.InsertAccount(ctx, a)
}

func (u *UseCase) GetAccountByID(ctx context.Context, id int64) (*model.Account, error) {
	return u.store.GetAccountByID(ctx, id)
}

func (u *UseCase) GetAccounts(ctx context.Context, category, assetClass string, isActive *bool) ([]model.Account, error) {
	return u.store.GetAccounts(ctx, category, assetClass, isActive)
}

func (u *UseCase) UpdateAccount(ctx context.Context, id int64, req model.UpdateAccountRequest) error {
	existing, err := u.store.GetAccountByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errNotFound("account")
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.SubCategory != nil {
		existing.SubCategory = req.SubCategory
	}
	if req.AssetClass != nil {
		existing.AssetClass = *req.AssetClass
	}
	if req.Institution != nil {
		existing.Institution = req.Institution
	}
	if req.InterestRate != nil {
		existing.InterestRate = req.InterestRate
	}
	if req.EMIAmount != nil {
		existing.EMIAmount = req.EMIAmount
	}
	if req.StartDate != nil {
		existing.StartDate = req.StartDate
	}
	if req.TenureMonths != nil {
		existing.TenureMonths = req.TenureMonths
	}
	if req.MaturityDate != nil {
		existing.MaturityDate = req.MaturityDate
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	if req.Notes != nil {
		existing.Notes = req.Notes
	}

	return u.store.UpdateAccount(ctx, id, *existing)
}

func (u *UseCase) SoftDeleteAccount(ctx context.Context, id int64) error {
	return u.store.SoftDeleteAccount(ctx, id)
}
