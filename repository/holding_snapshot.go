package repository

import (
	"context"

	"github.com/perfi/model"
)

func (r *Repository) UpsertHoldingSnapshot(ctx context.Context, s model.HoldingSnapshot) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO holding_snapshots (holding_id, month, invested_amount, current_amount)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(holding_id, month) DO UPDATE SET
		   invested_amount = excluded.invested_amount,
		   current_amount = excluded.current_amount`,
		s.HoldingID, s.Month, s.InvestedAmount, s.CurrentAmount,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetHoldingSnapshotsByHoldingID(ctx context.Context, holdingID int64) ([]model.HoldingSnapshot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, holding_id, month, invested_amount, current_amount, created_at
		 FROM holding_snapshots WHERE holding_id = ? ORDER BY month DESC`, holdingID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []model.HoldingSnapshot
	for rows.Next() {
		var s model.HoldingSnapshot
		if err := rows.Scan(&s.ID, &s.HoldingID, &s.Month, &s.InvestedAmount, &s.CurrentAmount, &s.CreatedAt); err != nil {
			return nil, err
		}
		snapshots = append(snapshots, s)
	}
	return snapshots, rows.Err()
}
