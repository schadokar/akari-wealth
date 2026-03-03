package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/perfi/model"
)

func (r *Repository) InsertHolding(ctx context.Context, h model.Holding) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO holdings (account_id, name, instrument_type, asset_class, notes)
		 VALUES (?, ?, ?, ?, ?)`,
		h.AccountID, h.Name, h.InstrumentType, h.AssetClass, h.Notes,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetHoldingByID(ctx context.Context, id int64) (*model.Holding, error) {
	var h model.Holding
	var isActive int
	err := r.db.QueryRowContext(ctx,
		`SELECT id, account_id, name, instrument_type, asset_class, is_active, notes, created_at
		 FROM holdings WHERE id = ?`, id,
	).Scan(&h.ID, &h.AccountID, &h.Name, &h.InstrumentType, &h.AssetClass, &isActive, &h.Notes, &h.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	h.IsActive = isActive == 1
	return &h, nil
}

func (r *Repository) GetHoldingsByAccountID(ctx context.Context, accountID int64) ([]model.Holding, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, account_id, name, instrument_type, asset_class, is_active, notes, created_at
		 FROM holdings WHERE account_id = ? ORDER BY name`, accountID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var holdings []model.Holding
	for rows.Next() {
		var h model.Holding
		var isActive int
		if err := rows.Scan(&h.ID, &h.AccountID, &h.Name, &h.InstrumentType, &h.AssetClass, &isActive, &h.Notes, &h.CreatedAt); err != nil {
			return nil, err
		}
		h.IsActive = isActive == 1
		holdings = append(holdings, h)
	}
	return holdings, rows.Err()
}

func (r *Repository) UpdateHolding(ctx context.Context, id int64, h model.Holding) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE holdings SET name = ?, asset_class = ?, is_active = ?, notes = ?
		 WHERE id = ?`,
		h.Name, h.AssetClass, boolToInt(h.IsActive), h.Notes, id,
	)
	return err
}

func (r *Repository) SoftDeleteHolding(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE holdings SET is_active = 0 WHERE id = ?`, id,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("holding not found")
	}
	return nil
}
