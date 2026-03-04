package usecase

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/perfi/model"
)

func (u *UseCase) BulkUpsertAccountSnapshots(ctx context.Context, reqs []model.AccountSnapshotRequest) error {
	for _, req := range reqs {
		s := model.AccountSnapshot{
			AccountID:      req.AccountID,
			Month:          req.Month,
			InvestedAmount: req.InvestedAmount,
			CurrentAmount:  req.CurrentAmount,
			Notes:          req.Notes,
		}
		if _, err := u.store.UpsertAccountSnapshot(ctx, s); err != nil {
			return fmt.Errorf("account %d month %s: %w", req.AccountID, req.Month, err)
		}
	}

	// Auto-generate loan snapshots for the month(s)
	months := uniqueMonths(reqs)
	for _, month := range months {
		if err := u.autoGenerateLoanSnapshots(ctx, month); err != nil {
			return err
		}
		if err := u.recomputeMonthlySummary(ctx, month); err != nil {
			return err
		}
	}
	return nil
}

func (u *UseCase) GetAccountSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.AccountSnapshot, error) {
	return u.store.GetAccountSnapshotsByAccountID(ctx, accountID)
}

func (u *UseCase) GetAccountSnapshotsByMonth(ctx context.Context, month string) ([]model.AccountSnapshot, error) {
	return u.store.GetAccountSnapshotsByMonth(ctx, month)
}

func (u *UseCase) GetLatestAccountSnapshotPerAccount(ctx context.Context) (map[int64]model.AccountSnapshotAmounts, error) {
	return u.store.GetLatestAccountSnapshotPerAccount(ctx)
}

func (u *UseCase) BulkUpsertHoldingSnapshots(ctx context.Context, reqs []model.HoldingSnapshotRequest) error {
	months := make(map[string]bool)
	for _, req := range reqs {
		s := model.HoldingSnapshot{
			HoldingID:      req.HoldingID,
			Month:          req.Month,
			InvestedAmount: req.InvestedAmount,
			CurrentAmount:  req.CurrentAmount,
		}
		if _, err := u.store.UpsertHoldingSnapshot(ctx, s); err != nil {
			return fmt.Errorf("holding %d month %s: %w", req.HoldingID, req.Month, err)
		}
		months[req.Month] = true
	}

	for month := range months {
		if err := u.recomputeMonthlySummary(ctx, month); err != nil {
			return err
		}
	}
	return nil
}

func (u *UseCase) GetHoldingSnapshotsByHoldingID(ctx context.Context, holdingID int64) ([]model.HoldingSnapshot, error) {
	return u.store.GetHoldingSnapshotsByHoldingID(ctx, holdingID)
}

func (u *UseCase) BulkUpsertCreditCardSnapshots(ctx context.Context, reqs []model.CreditCardSnapshotRequest) error {
	months := make(map[string]bool)
	for _, req := range reqs {
		s := model.CreditCardSnapshot{
			AccountID:          req.AccountID,
			Month:              req.Month,
			OutstandingBalance: req.OutstandingBalance,
			CreditLimit:        req.CreditLimit,
			MinDue:             req.MinDue,
		}
		if _, err := u.store.UpsertCreditCardSnapshot(ctx, s); err != nil {
			return fmt.Errorf("credit card %d month %s: %w", req.AccountID, req.Month, err)
		}
		months[req.Month] = true
	}

	for month := range months {
		if err := u.recomputeMonthlySummary(ctx, month); err != nil {
			return err
		}
	}
	return nil
}

func (u *UseCase) GetCreditCardSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.CreditCardSnapshot, error) {
	return u.store.GetCreditCardSnapshotsByAccountID(ctx, accountID)
}

func (u *UseCase) GetLatestCreditCardSnapshotPerAccount(ctx context.Context) (map[int64]float64, error) {
	return u.store.GetLatestCreditCardSnapshotPerAccount(ctx)
}

// autoGenerateLoanSnapshots creates next-month snapshots for loan accounts:
// new_balance = previous_balance - emi_amount
func (u *UseCase) autoGenerateLoanSnapshots(ctx context.Context, month string) error {
	loans, err := u.store.GetLoanAccounts(ctx)
	if err != nil {
		return err
	}

	for _, loan := range loans {
		if loan.EMIAmount == nil {
			continue
		}

		// Check if a manual snapshot already exists for this month
		existing, err := u.store.GetAccountSnapshotByAccountAndMonth(ctx, loan.ID, month)
		if err != nil {
			return err
		}
		if existing != nil && !existing.IsAuto {
			continue // don't overwrite manual entries
		}

		// Get previous month snapshot
		prevMonth := previousMonth(month)
		prev, err := u.store.GetAccountSnapshotByAccountAndMonth(ctx, loan.ID, prevMonth)
		if err != nil {
			return err
		}
		if prev == nil {
			continue // no previous data to base calculation on
		}

		newBalance := prev.CurrentAmount - *loan.EMIAmount
		s := model.AccountSnapshot{
			AccountID:     loan.ID,
			Month:         month,
			CurrentAmount: newBalance,
			IsAuto:        true,
		}
		if _, err := u.store.UpsertAccountSnapshot(ctx, s); err != nil {
			return err
		}
	}
	return nil
}

// recomputeMonthlySummary aggregates all snapshots for a month and upserts the summary
func (u *UseCase) recomputeMonthlySummary(ctx context.Context, month string) error {
	accountSnapshots, err := u.store.GetAccountSnapshotsByMonth(ctx, month)
	if err != nil {
		return err
	}

	var totalAssets, totalLiabilities float64
	assetDist := map[string]float64{
		model.AssetClassEquity:    0,
		model.AssetClassDebt:      0,
		model.AssetClassCommodity: 0,
		model.AssetClassHybrid:    0,
		model.AssetClassCash:      0,
	}

	for _, snap := range accountSnapshots {
		acct, err := u.store.GetAccountByID(ctx, snap.AccountID)
		if err != nil || acct == nil {
			continue
		}

		if acct.AssetClass == model.AssetClassLiability {
			totalLiabilities += snap.CurrentAmount
		} else {
			totalAssets += snap.CurrentAmount
			// Check if this account has holdings with specific asset classes
			holdings, err := u.store.GetHoldingsByAccountID(ctx, acct.ID)
			if err != nil {
				return err
			}

			if len(holdings) > 0 {
				// Sum holding snapshots by their asset class
				for _, h := range holdings {
					hSnap, err := u.store.GetHoldingSnapshotsByHoldingID(ctx, h.ID)
					if err != nil {
						return err
					}
					for _, hs := range hSnap {
						if hs.Month != month {
							continue
						}
						ac := acct.AssetClass
						if h.AssetClass != nil {
							ac = *h.AssetClass
						}
						assetDist[ac] += hs.CurrentAmount
					}
				}
			} else {
				assetDist[acct.AssetClass] += snap.CurrentAmount
			}
		}
	}

	// Add credit card liabilities
	ccSnapshots, err := u.store.GetCreditCardSnapshotsByMonth(ctx, month)
	if err != nil {
		return err
	}
	for _, cc := range ccSnapshots {
		totalLiabilities += cc.OutstandingBalance
	}

	summary := model.MonthlySummary{
		Month:            month,
		TotalAssets:      totalAssets,
		TotalLiabilities: totalLiabilities,
		NetWorth:         totalAssets - totalLiabilities,
		EquityAmount:     assetDist[model.AssetClassEquity],
		DebtAmount:       assetDist[model.AssetClassDebt],
		CommodityAmount:  assetDist[model.AssetClassCommodity],
		HybridAmount:     assetDist[model.AssetClassHybrid],
		CashAmount:       assetDist[model.AssetClassCash],
	}
	return u.store.UpsertMonthlySummary(ctx, summary)
}

func uniqueMonths(reqs []model.AccountSnapshotRequest) []string {
	seen := make(map[string]bool)
	var months []string
	for _, r := range reqs {
		if !seen[r.Month] {
			seen[r.Month] = true
			months = append(months, r.Month)
		}
	}
	return months
}

// previousMonth returns the month before the given "YYYY-MM" string
func previousMonth(month string) string {
	parts := strings.SplitN(month, "-", 2)
	if len(parts) != 2 {
		return month
	}
	y, _ := strconv.Atoi(parts[0])
	m, _ := strconv.Atoi(parts[1])
	m--
	if m < 1 {
		m = 12
		y--
	}
	return fmt.Sprintf("%04d-%02d", y, m)
}
