package repository

import (
	"context"
	"database/sql"

	"github.com/perfi/auth"
	"github.com/perfi/model"
)

func (r *Repository) UpsertMonthlySummary(ctx context.Context, s model.MonthlySummary) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO monthly_summary (user_id, month, total_assets, total_liabilities, net_worth, equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(user_id, month) DO UPDATE SET
		   total_assets = excluded.total_assets,
		   total_liabilities = excluded.total_liabilities,
		   net_worth = excluded.net_worth,
		   equity_amount = excluded.equity_amount,
		   debt_amount = excluded.debt_amount,
		   commodity_amount = excluded.commodity_amount,
		   hybrid_amount = excluded.hybrid_amount,
		   cash_amount = excluded.cash_amount`,
		userID, s.Month, s.TotalAssets, s.TotalLiabilities, s.NetWorth, s.EquityAmount, s.DebtAmount, s.CommodityAmount, s.HybridAmount, s.CashAmount,
	)
	return err
}

func (r *Repository) GetMonthlySummaryByMonth(ctx context.Context, month string) (*model.MonthlySummary, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var s model.MonthlySummary
	err = r.db.QueryRowContext(ctx,
		`SELECT id, month, total_assets, total_liabilities, net_worth, equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount, created_at
		 FROM monthly_summary WHERE month = ? AND user_id = ?`, month, userID,
	).Scan(&s.ID, &s.Month, &s.TotalAssets, &s.TotalLiabilities, &s.NetWorth, &s.EquityAmount, &s.DebtAmount, &s.CommodityAmount, &s.HybridAmount, &s.CashAmount, &s.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) GetMonthlySummaryRange(ctx context.Context, from, to string) ([]model.MonthlySummary, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, month, total_assets, total_liabilities, net_worth, equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount, created_at
		 FROM monthly_summary WHERE month >= ? AND month <= ? AND user_id = ? ORDER BY month`, from, to, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []model.MonthlySummary
	for rows.Next() {
		var s model.MonthlySummary
		if err := rows.Scan(&s.ID, &s.Month, &s.TotalAssets, &s.TotalLiabilities, &s.NetWorth, &s.EquityAmount, &s.DebtAmount, &s.CommodityAmount, &s.HybridAmount, &s.CashAmount, &s.CreatedAt); err != nil {
			return nil, err
		}
		summaries = append(summaries, s)
	}
	return summaries, rows.Err()
}

func (r *Repository) GetLatestMonthlySummary(ctx context.Context) (*model.MonthlySummary, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var s model.MonthlySummary
	err = r.db.QueryRowContext(ctx,
		`SELECT id, month, total_assets, total_liabilities, net_worth, equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount, created_at
		 FROM monthly_summary WHERE user_id = ? ORDER BY month DESC LIMIT 1`, userID,
	).Scan(&s.ID, &s.Month, &s.TotalAssets, &s.TotalLiabilities, &s.NetWorth, &s.EquityAmount, &s.DebtAmount, &s.CommodityAmount, &s.HybridAmount, &s.CashAmount, &s.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}
