package usecase

import (
	"context"

	"github.com/perfi/model"
)

func (u *UseCase) CreateInsurance(ctx context.Context, req model.CreateInsuranceRequest) (int64, error) {
	return u.store.InsertInsurance(ctx, model.Insurance{
		PolicyType:         req.PolicyType,
		Insurer:            req.Insurer,
		PolicyNumber:       req.PolicyNumber,
		SumAssured:         req.SumAssured,
		PremiumAmount:      req.PremiumAmount,
		PremiumFrequency:   req.PremiumFrequency,
		StartDate:          req.StartDate,
		EndDate:            req.EndDate,
		MaturityDate:       req.MaturityDate,
		Nominees:           req.Nominees,
		IsEmployerProvided: req.IsEmployerProvided,
		IsActive:           true,
		Notes:              req.Notes,
	})
}

func (u *UseCase) GetInsuranceByID(ctx context.Context, id int64) (*model.Insurance, error) {
	return u.store.GetInsuranceByID(ctx, id)
}

func (u *UseCase) GetInsurances(ctx context.Context) ([]model.Insurance, error) {
	return u.store.GetInsurances(ctx)
}

func (u *UseCase) UpdateInsurance(ctx context.Context, id int64, req model.UpdateInsuranceRequest) error {
	ins, err := u.store.GetInsuranceByID(ctx, id)
	if err != nil {
		return err
	}
	if ins == nil {
		return model.ErrNotFound
	}
	if req.PolicyType != nil {
		ins.PolicyType = *req.PolicyType
	}
	if req.Insurer != nil {
		ins.Insurer = *req.Insurer
	}
	if req.PolicyNumber != nil {
		ins.PolicyNumber = req.PolicyNumber
	}
	if req.SumAssured != nil {
		ins.SumAssured = *req.SumAssured
	}
	if req.PremiumAmount != nil {
		ins.PremiumAmount = *req.PremiumAmount
	}
	if req.PremiumFrequency != nil {
		ins.PremiumFrequency = *req.PremiumFrequency
	}
	if req.StartDate != nil {
		ins.StartDate = *req.StartDate
	}
	if req.EndDate != nil {
		ins.EndDate = req.EndDate
	}
	if req.MaturityDate != nil {
		ins.MaturityDate = req.MaturityDate
	}
	if req.Nominees != nil {
		ins.Nominees = req.Nominees
	}
	if req.IsEmployerProvided != nil {
		ins.IsEmployerProvided = *req.IsEmployerProvided
	}
	if req.IsActive != nil {
		ins.IsActive = *req.IsActive
	}
	if req.Notes != nil {
		ins.Notes = req.Notes
	}
	return u.store.UpdateInsurance(ctx, id, *ins)
}

func (u *UseCase) DeleteInsurance(ctx context.Context, id int64) error {
	return u.store.DeleteInsurance(ctx, id)
}
