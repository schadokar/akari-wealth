package usecase

import (
	"context"

	"github.com/perfi/model"
)

func (u *UseCase) GetDashboard(ctx context.Context) (*model.DashboardResponse, error) {
	latest, err := u.store.GetLatestMonthlySummary(ctx)
	if err != nil {
		return nil, err
	}

	if latest == nil {
		return &model.DashboardResponse{
			AssetDistribution: map[string]float64{},
		}, nil
	}

	resp := &model.DashboardResponse{
		NetWorth:         latest.NetWorth,
		TotalAssets:      latest.TotalAssets,
		TotalLiabilities: latest.TotalLiabilities,
		AssetDistribution: map[string]float64{
			"equity":    latest.EquityAmount,
			"debt":      latest.DebtAmount,
			"commodity": latest.CommodityAmount,
			"hybrid":    latest.HybridAmount,
			"cash":      latest.CashAmount,
		},
	}

	// Month-over-month change
	prevMonth := previousMonth(latest.Month)
	prev, err := u.store.GetMonthlySummaryByMonth(ctx, prevMonth)
	if err != nil {
		return nil, err
	}
	if prev != nil {
		change := latest.NetWorth - prev.NetWorth
		var pct float64
		if prev.NetWorth != 0 {
			pct = (change / prev.NetWorth) * 100
		}
		resp.MonthOverMonth = &model.MonthOverMonthChange{
			PreviousNetWorth: prev.NetWorth,
			Change:           change,
			ChangePercent:    pct,
		}
	}

	return resp, nil
}

func (u *UseCase) GetMonthlySummary(ctx context.Context, month string) (*model.MonthlySummary, error) {
	return u.store.GetMonthlySummaryByMonth(ctx, month)
}

func (u *UseCase) GetMonthlySummaryRange(ctx context.Context, from, to string) ([]model.MonthlySummary, error) {
	return u.store.GetMonthlySummaryRange(ctx, from, to)
}
