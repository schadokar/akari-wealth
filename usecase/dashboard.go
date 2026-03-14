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

		// Expense summary (requires previous month data)
		expSummary, err := u.computeExpenseSummary(ctx, latest.Month, prevMonth, latest.CashAmount, prev.CashAmount)
		if err != nil {
			return nil, err
		}
		resp.ExpenseSummary = expSummary
	}

	return resp, nil
}

func (u *UseCase) computeExpenseSummary(ctx context.Context, month, prevMonth string, cashCurrent, cashPrev float64) (*model.ExpenseSummary, error) {
	// Net take-home from payslips for this month
	payslips, err := u.store.GetPayslipsByMonth(ctx, month)
	if err != nil {
		return nil, err
	}
	var netTakeHome float64
	for _, p := range payslips {
		netTakeHome += payslipNetTakeHome(p)
	}
	hasPayslip := len(payslips) > 0

	// New investment contributions = ΔInvestedAmount on non-cash, non-liability accounts
	currentSnaps, err := u.store.GetAccountSnapshotsByMonth(ctx, month)
	if err != nil {
		return nil, err
	}
	prevSnaps, err := u.store.GetAccountSnapshotsByMonth(ctx, prevMonth)
	if err != nil {
		return nil, err
	}

	prevInvested := make(map[int64]float64, len(prevSnaps))
	prevBalance := make(map[int64]float64, len(prevSnaps))
	for _, s := range prevSnaps {
		if s.InvestedAmount != nil {
			prevInvested[s.AccountID] = *s.InvestedAmount
		}
		prevBalance[s.AccountID] = s.CurrentAmount
	}

	var newInvestments, emiPaid float64
	for _, s := range currentSnaps {
		acc, err := u.store.GetAccountByID(ctx, s.AccountID)
		if err != nil || acc == nil {
			continue
		}
		switch {
		case acc.AssetClass == model.AssetClassLiability && acc.Category == model.CategoryLoan:
			// EMI = loan balance reduction this month
			reduction := prevBalance[s.AccountID] - s.CurrentAmount
			if reduction > 0 {
				emiPaid += reduction
			}
		case acc.AssetClass != model.AssetClassCash && acc.AssetClass != model.AssetClassLiability:
			// New investment contributions (principal delta, not market gains)
			if s.InvestedAmount != nil {
				delta := *s.InvestedAmount - prevInvested[s.AccountID]
				if delta > 0 {
					newInvestments += delta
				}
			}
		}
	}

	// CC outstanding balance as spending proxy
	ccSnaps, err := u.store.GetCreditCardSnapshotsByMonth(ctx, month)
	if err != nil {
		return nil, err
	}
	var ccOutstanding float64
	for _, cc := range ccSnaps {
		ccOutstanding += cc.OutstandingBalance
	}

	// cash_delta: positive = cash grew (you saved), negative = cash shrank (you spent from savings)
	cashDelta := cashCurrent - cashPrev

	summary := &model.ExpenseSummary{
		Month:          month,
		NetTakeHome:    netTakeHome,
		CashDelta:      cashDelta,
		NewInvestments: newInvestments,
		EMIPaid:        emiPaid,
		CCOutstanding:  ccOutstanding,
		HasPayslip:     hasPayslip,
	}

	if hasPayslip {
		estimated := netTakeHome - cashDelta - newInvestments
		summary.EstimatedExpenses = &estimated
	}

	return summary, nil
}

// payslipNetTakeHome computes gross earnings minus all deductions for a payslip.
func payslipNetTakeHome(p model.Payslip) float64 {
	gross := p.BasicSalary +
		derefF(p.HRA) +
		derefF(p.ConveyanceAllowance) +
		derefF(p.MedicalAllowance) +
		derefF(p.LTA) +
		derefF(p.SpecialAllowance) +
		derefF(p.FlexiblePay) +
		derefF(p.MealAllowance) +
		derefF(p.MobileAllowance) +
		derefF(p.InternetAllowance) +
		derefF(p.DifferentialAllowance) +
		derefF(p.StatutoryBonus) +
		derefF(p.PerformancePay) +
		derefF(p.AdvanceBonus) +
		derefF(p.OtherAllowance)

	deductions := p.EPF +
		p.ProfessionalTax +
		p.TDS +
		derefF(p.VPF) +
		derefF(p.NPS) +
		derefF(p.LWF) +
		derefF(p.ESIEmployee) +
		derefF(p.MealCouponDeduction) +
		derefF(p.LoanRecovery) +
		derefF(p.OtherDeduction)

	return gross - deductions
}

func derefF(v *float64) float64 {
	if v == nil {
		return 0
	}
	return *v
}

func (u *UseCase) GetMonthlySummary(ctx context.Context, month string) (*model.MonthlySummary, error) {
	return u.store.GetMonthlySummaryByMonth(ctx, month)
}

func (u *UseCase) GetMonthlySummaryRange(ctx context.Context, from, to string) ([]model.MonthlySummary, error) {
	return u.store.GetMonthlySummaryRange(ctx, from, to)
}
