package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/perfi/model"
)

func (r *Repository) InsertAccount(ctx context.Context, a model.Account) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO accounts (name, category, sub_category, asset_class, institution, interest_rate, emi_amount, maturity_date, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.Name, a.Category, a.SubCategory, a.AssetClass, a.Institution, a.InterestRate, a.EMIAmount, a.MaturityDate, a.Notes,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetAccountByID(ctx context.Context, id int64) (*model.Account, error) {
	var a model.Account
	var isActive int
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, category, sub_category, asset_class, institution, interest_rate, emi_amount, maturity_date, is_active, notes, created_at, updated_at
		 FROM accounts WHERE id = ?`, id,
	).Scan(&a.ID, &a.Name, &a.Category, &a.SubCategory, &a.AssetClass, &a.Institution, &a.InterestRate, &a.EMIAmount, &a.MaturityDate, &isActive, &a.Notes, &a.CreatedAt, &a.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	a.IsActive = isActive == 1
	return &a, nil
}

func (r *Repository) GetAccounts(ctx context.Context, category, assetClass string, isActive *bool) ([]model.Account, error) {
	query := `SELECT id, name, category, sub_category, asset_class, institution, interest_rate, emi_amount, maturity_date, is_active, notes, created_at, updated_at FROM accounts`
	var conditions []string
	var args []any

	if category != "" {
		conditions = append(conditions, "category = ?")
		args = append(args, category)
	}
	if assetClass != "" {
		conditions = append(conditions, "asset_class = ?")
		args = append(args, assetClass)
	}
	if isActive != nil {
		conditions = append(conditions, "is_active = ?")
		if *isActive {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY category, name"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []model.Account
	for rows.Next() {
		var a model.Account
		var isAct int
		if err := rows.Scan(&a.ID, &a.Name, &a.Category, &a.SubCategory, &a.AssetClass, &a.Institution, &a.InterestRate, &a.EMIAmount, &a.MaturityDate, &isAct, &a.Notes, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		a.IsActive = isAct == 1
		accounts = append(accounts, a)
	}
	return accounts, rows.Err()
}

func (r *Repository) UpdateAccount(ctx context.Context, id int64, a model.Account) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE accounts SET name = ?, sub_category = ?, asset_class = ?, institution = ?, interest_rate = ?, emi_amount = ?, maturity_date = ?, is_active = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ?`,
		a.Name, a.SubCategory, a.AssetClass, a.Institution, a.InterestRate, a.EMIAmount, a.MaturityDate, boolToInt(a.IsActive), a.Notes, id,
	)
	return err
}

func (r *Repository) SoftDeleteAccount(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, id,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("account not found")
	}
	return nil
}

func (r *Repository) GetLoanAccounts(ctx context.Context) ([]model.Account, error) {
	active := true
	return r.GetAccounts(ctx, model.CategoryLoan, "", &active)
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
