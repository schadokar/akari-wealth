package repository

import (
	"context"

	"github.com/perfi/model"
)

func (r *Repository) UpsertCreditCardSnapshot(ctx context.Context, s model.CreditCardSnapshot) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO credit_card_snapshots (account_id, month, outstanding_balance, credit_limit, min_due)
		 VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT(account_id, month) DO UPDATE SET
		   outstanding_balance = excluded.outstanding_balance,
		   credit_limit = excluded.credit_limit,
		   min_due = excluded.min_due`,
		s.AccountID, s.Month, s.OutstandingBalance, s.CreditLimit, s.MinDue,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetCreditCardSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.CreditCardSnapshot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, account_id, month, outstanding_balance, credit_limit, min_due, created_at
		 FROM credit_card_snapshots WHERE account_id = ? ORDER BY month DESC`, accountID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []model.CreditCardSnapshot
	for rows.Next() {
		var s model.CreditCardSnapshot
		if err := rows.Scan(&s.ID, &s.AccountID, &s.Month, &s.OutstandingBalance, &s.CreditLimit, &s.MinDue, &s.CreatedAt); err != nil {
			return nil, err
		}
		snapshots = append(snapshots, s)
	}
	return snapshots, rows.Err()
}

func (r *Repository) GetLatestCreditCardSnapshotPerAccount(ctx context.Context) (map[int64]float64, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT s.account_id, s.outstanding_balance
		 FROM credit_card_snapshots s
		 INNER JOIN (
		   SELECT account_id, MAX(month) AS max_month FROM credit_card_snapshots GROUP BY account_id
		 ) m ON s.account_id = m.account_id AND s.month = m.max_month`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int64]float64)
	for rows.Next() {
		var accountID int64
		var balance float64
		if err := rows.Scan(&accountID, &balance); err != nil {
			return nil, err
		}
		result[accountID] = balance
	}
	return result, rows.Err()
}

func (r *Repository) GetCreditCardSnapshotsByMonth(ctx context.Context, month string) ([]model.CreditCardSnapshot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, account_id, month, outstanding_balance, credit_limit, min_due, created_at
		 FROM credit_card_snapshots WHERE month = ?`, month,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []model.CreditCardSnapshot
	for rows.Next() {
		var s model.CreditCardSnapshot
		if err := rows.Scan(&s.ID, &s.AccountID, &s.Month, &s.OutstandingBalance, &s.CreditLimit, &s.MinDue, &s.CreatedAt); err != nil {
			return nil, err
		}
		snapshots = append(snapshots, s)
	}
	return snapshots, rows.Err()
}
