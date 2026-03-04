package repository

import (
	"context"

	"github.com/perfi/model"
)

func (r *Repository) UpsertAccountSnapshot(ctx context.Context, s model.AccountSnapshot) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO account_snapshots (account_id, month, invested_amount, current_amount, is_auto, notes)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(account_id, month) DO UPDATE SET
		   invested_amount = excluded.invested_amount,
		   current_amount = excluded.current_amount,
		   is_auto = excluded.is_auto,
		   notes = excluded.notes`,
		s.AccountID, s.Month, s.InvestedAmount, s.CurrentAmount, boolToInt(s.IsAuto), s.Notes,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetAccountSnapshotsByAccountID(ctx context.Context, accountID int64) ([]model.AccountSnapshot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, account_id, month, invested_amount, current_amount, is_auto, notes, created_at
		 FROM account_snapshots WHERE account_id = ? ORDER BY month DESC`, accountID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []model.AccountSnapshot
	for rows.Next() {
		var s model.AccountSnapshot
		var isAuto int
		if err := rows.Scan(&s.ID, &s.AccountID, &s.Month, &s.InvestedAmount, &s.CurrentAmount, &isAuto, &s.Notes, &s.CreatedAt); err != nil {
			return nil, err
		}
		s.IsAuto = isAuto == 1
		snapshots = append(snapshots, s)
	}
	return snapshots, rows.Err()
}

func (r *Repository) GetAccountSnapshotsByMonth(ctx context.Context, month string) ([]model.AccountSnapshot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, account_id, month, invested_amount, current_amount, is_auto, notes, created_at
		 FROM account_snapshots WHERE month = ?`, month,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []model.AccountSnapshot
	for rows.Next() {
		var s model.AccountSnapshot
		var isAuto int
		if err := rows.Scan(&s.ID, &s.AccountID, &s.Month, &s.InvestedAmount, &s.CurrentAmount, &isAuto, &s.Notes, &s.CreatedAt); err != nil {
			return nil, err
		}
		s.IsAuto = isAuto == 1
		snapshots = append(snapshots, s)
	}
	return snapshots, rows.Err()
}

func (r *Repository) GetLatestAccountSnapshotPerAccount(ctx context.Context) (map[int64]model.AccountSnapshotAmounts, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT s.account_id, s.current_amount, s.invested_amount
		 FROM account_snapshots s
		 INNER JOIN (
		   SELECT account_id, MAX(month) AS max_month FROM account_snapshots GROUP BY account_id
		 ) m ON s.account_id = m.account_id AND s.month = m.max_month`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int64]model.AccountSnapshotAmounts)
	for rows.Next() {
		var accountID int64
		var amounts model.AccountSnapshotAmounts
		if err := rows.Scan(&accountID, &amounts.CurrentAmount, &amounts.InvestedAmount); err != nil {
			return nil, err
		}
		result[accountID] = amounts
	}
	return result, rows.Err()
}

func (r *Repository) GetAccountSnapshotByAccountAndMonth(ctx context.Context, accountID int64, month string) (*model.AccountSnapshot, error) {
	var s model.AccountSnapshot
	var isAuto int
	err := r.db.QueryRowContext(ctx,
		`SELECT id, account_id, month, invested_amount, current_amount, is_auto, notes, created_at
		 FROM account_snapshots WHERE account_id = ? AND month = ?`, accountID, month,
	).Scan(&s.ID, &s.AccountID, &s.Month, &s.InvestedAmount, &s.CurrentAmount, &isAuto, &s.Notes, &s.CreatedAt)
	if err != nil {
		return nil, nil
	}
	s.IsAuto = isAuto == 1
	return &s, nil
}
