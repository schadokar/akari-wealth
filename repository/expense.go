package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/perfi/auth"
	"github.com/perfi/model"
)

const expenseCols = `e.id, e.month, e.category, e.expense_type, e.amount,
	e.description, e.payment_method, e.credit_card_account_id, e.is_recurring,
	e.created_at, e.updated_at`

func scanExpense(dest *model.Expense, scan func(...any) error) error {
	var isRecurring int
	err := scan(
		&dest.ID, &dest.Month, &dest.Category, &dest.ExpenseType, &dest.Amount,
		&dest.Description, &dest.PaymentMethod, &dest.CreditCardAccountID, &isRecurring,
		&dest.CreatedAt, &dest.UpdatedAt,
	)
	if err != nil {
		return err
	}
	dest.IsRecurring = isRecurring == 1
	return nil
}

func (r *Repository) InsertExpense(ctx context.Context, e model.Expense) (int64, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return 0, err
	}
	isRecurring := 0
	if e.IsRecurring {
		isRecurring = 1
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO expenses (user_id, month, category, expense_type, amount, description, payment_method, credit_card_account_id, is_recurring)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, e.Month, e.Category, e.ExpenseType, e.Amount, e.Description, e.PaymentMethod, e.CreditCardAccountID, isRecurring,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetExpenseByID(ctx context.Context, id int64) (*model.Expense, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var e model.Expense
	err = scanExpense(&e, r.db.QueryRowContext(ctx,
		`SELECT `+expenseCols+`
		 FROM expenses e
		 WHERE e.id = ? AND e.user_id = ?`, id, userID,
	).Scan)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *Repository) GetExpensesByMonth(ctx context.Context, month string) ([]model.Expense, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+expenseCols+`
		 FROM expenses e
		 WHERE e.user_id = ? AND e.month = ?
		 ORDER BY e.category, e.id`, userID, month,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Expense
	for rows.Next() {
		var e model.Expense
		if err := scanExpense(&e, rows.Scan); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func (r *Repository) UpdateExpense(ctx context.Context, id int64, e model.Expense) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	isRecurring := 0
	if e.IsRecurring {
		isRecurring = 1
	}
	res, err := r.db.ExecContext(ctx,
		`UPDATE expenses
		 SET month = ?, category = ?, expense_type = ?, amount = ?, description = ?,
		     payment_method = ?, credit_card_account_id = ?, is_recurring = ?,
		     updated_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND user_id = ?`,
		e.Month, e.Category, e.ExpenseType, e.Amount, e.Description,
		e.PaymentMethod, e.CreditCardAccountID, isRecurring,
		id, userID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("expense not found")
	}
	return nil
}

func (r *Repository) DeleteExpense(ctx context.Context, id int64) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM expenses WHERE id = ? AND user_id = ?`, id, userID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("expense not found")
	}
	return nil
}

// CarryForwardRecurring copies is_recurring=1 expenses from the previous month
// into the given month, but only if the month currently has no expenses.
// Returns the number of rows inserted.
func (r *Repository) CarryForwardRecurring(ctx context.Context, month string) (int, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return 0, err
	}

	// Check if month already has any expenses
	var count int
	err = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM expenses WHERE user_id = ? AND month = ?`, userID, month,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	if count > 0 {
		return 0, nil
	}

	prevMonth := expensePreviousMonth(month)

	res, err := r.db.ExecContext(ctx,
		`INSERT INTO expenses (user_id, month, category, expense_type, amount, description, payment_method, credit_card_account_id, is_recurring)
		 SELECT user_id, ?, category, expense_type, amount, description, payment_method, credit_card_account_id, is_recurring
		 FROM expenses
		 WHERE user_id = ? AND month = ? AND is_recurring = 1`,
		month, userID, prevMonth,
	)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

func expensePreviousMonth(month string) string {
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
