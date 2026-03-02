package repository

import (
	"context"
	"database/sql"

	"github.com/perfi/model"
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) InsertAccount(ctx context.Context, a model.Account) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO accounts (name, entity_type_id, amount) VALUES (?, ?, ?)`,
		a.Name, a.EntityTypeID, a.Amount,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetAccounts(ctx context.Context) ([]model.Account, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, entity_type_id, amount, created_at, updated_at FROM accounts`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []model.Account
	for rows.Next() {
		var a model.Account
		if err := rows.Scan(&a.ID, &a.Name, &a.EntityTypeID, &a.Amount, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	return accounts, rows.Err()
}

func (r *Repository) InsertEntity(ctx context.Context, e model.Entity) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO entities (account_id, symbol, name, meta, type, subtype, invested_amount, current_amount)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		e.AccountID, e.Symbol, e.Name, e.Meta, e.Type, e.Subtype, e.InvestedAmount, e.CurrentAmount,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetEntitiesByAccountID(ctx context.Context, accountID int64) ([]model.Entity, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, account_id, symbol, name, meta, type, subtype, invested_amount, current_amount, created_at, updated_at
		 FROM entities WHERE account_id = ?`, accountID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entities []model.Entity
	for rows.Next() {
		var e model.Entity
		if err := rows.Scan(&e.ID, &e.AccountID, &e.Symbol, &e.Name, &e.Meta, &e.Type, &e.Subtype, &e.InvestedAmount, &e.CurrentAmount, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		entities = append(entities, e)
	}
	return entities, rows.Err()
}

func (r *Repository) GetEntitySummaries(ctx context.Context) ([]model.EntitySummary, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT e.account_id, a.name, SUM(e.invested_amount), SUM(e.current_amount)
		 FROM entities e
		 JOIN accounts a ON a.id = e.account_id
		 GROUP BY e.account_id, a.name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var summaries []model.EntitySummary
	for rows.Next() {
		var s model.EntitySummary
		if err := rows.Scan(&s.AccountID, &s.AccountName, &s.InvestedAmount, &s.CurrentAmount); err != nil {
			return nil, err
		}
		summaries = append(summaries, s)
	}
	return summaries, rows.Err()
}

func (r *Repository) InsertExpense(ctx context.Context, e model.Expense) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO expenses (account_id, category, subcategory, amount, note, expense_date)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		e.AccountID, e.Category, e.Subcategory, e.Amount, e.Note, e.ExpenseDate,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) InsertTransaction(ctx context.Context, t model.Transaction) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO transactions (account_id, entity_id, type, amount, note, transacted_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		t.AccountID, t.EntityID, t.Type, t.Amount, t.Note, t.TransactedAt,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}
