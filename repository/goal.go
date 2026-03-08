package repository

import (
	"context"
	"database/sql"

	"github.com/perfi/auth"
	"github.com/perfi/model"
)

func (r *Repository) InsertGoal(ctx context.Context, g model.Goal) (int64, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return 0, err
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO goals (user_id, name, target_amount, status, priority, target_date, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID, g.Name, g.TargetAmount, g.Status, g.Priority, g.TargetDate, g.Notes,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetGoalByID(ctx context.Context, id int64) (*model.Goal, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var g model.Goal
	err = r.db.QueryRowContext(ctx,
		`SELECT id, name, target_amount, status, priority, target_date, notes, created_at, updated_at
		 FROM goals WHERE id = ? AND user_id = ?`, id, userID,
	).Scan(&g.ID, &g.Name, &g.TargetAmount, &g.Status, &g.Priority, &g.TargetDate, &g.Notes, &g.CreatedAt, &g.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *Repository) GetGoals(ctx context.Context) ([]model.Goal, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, target_amount, status, priority, target_date, notes, created_at, updated_at
		 FROM goals WHERE user_id = ? ORDER BY target_date ASC, priority ASC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Goal
	for rows.Next() {
		var g model.Goal
		if err := rows.Scan(&g.ID, &g.Name, &g.TargetAmount, &g.Status, &g.Priority, &g.TargetDate, &g.Notes, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, g)
	}
	return list, rows.Err()
}

func (r *Repository) UpdateGoal(ctx context.Context, id int64, g model.Goal) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx,
		`UPDATE goals SET name = ?, target_amount = ?, status = ?, priority = ?, target_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND user_id = ?`,
		g.Name, g.TargetAmount, g.Status, g.Priority, g.TargetDate, g.Notes, id, userID,
	)
	return err
}

func (r *Repository) DeleteGoal(ctx context.Context, id int64) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx,
		`DELETE FROM goals WHERE id = ? AND user_id = ?`, id, userID,
	)
	return err
}

func (r *Repository) InsertGoalMapping(ctx context.Context, m model.GoalMapping) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO goal_mappings (goal_id, asset_table, asset_type, asset_id, allocation_weight)
		 VALUES (?, ?, ?, ?, ?)`,
		m.GoalID, m.AssetTable, m.AssetType, m.AssetID, m.AllocationWeight,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetGoalMappingsByGoalID(ctx context.Context, goalID int64) ([]model.GoalMapping, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, goal_id, asset_table, asset_type, asset_id, allocation_weight
		 FROM goal_mappings WHERE goal_id = ?`, goalID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.GoalMapping
	for rows.Next() {
		var m model.GoalMapping
		if err := rows.Scan(&m.ID, &m.GoalID, &m.AssetTable, &m.AssetType, &m.AssetID, &m.AllocationWeight); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

// GetGoalLatestAmounts returns per-goal weighted current/invested amounts and asset class breakdown
// using the latest snapshot for each account mapped to the goal.
func (r *Repository) GetGoalLatestAmounts(ctx context.Context) (map[int64]map[string][2]float64, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT gm.goal_id, a.asset_class,
		       SUM(s.current_amount * gm.allocation_weight),
		       SUM(COALESCE(s.invested_amount, 0) * gm.allocation_weight)
		FROM goals g
		JOIN goal_mappings gm ON gm.goal_id = g.id AND gm.asset_table = 'account'
		JOIN accounts a ON a.id = gm.asset_id
		JOIN account_snapshots s ON s.account_id = a.id
		JOIN (SELECT account_id, MAX(month) AS max_month FROM account_snapshots GROUP BY account_id) latest
		     ON latest.account_id = s.account_id AND latest.max_month = s.month
		WHERE g.user_id = ?
		GROUP BY gm.goal_id, a.asset_class`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// result: goalID -> assetClass -> [current, invested]
	result := make(map[int64]map[string][2]float64)
	for rows.Next() {
		var goalID int64
		var assetClass string
		var current, invested float64
		if err := rows.Scan(&goalID, &assetClass, &current, &invested); err != nil {
			return nil, err
		}
		if result[goalID] == nil {
			result[goalID] = make(map[string][2]float64)
		}
		result[goalID][assetClass] = [2]float64{current, invested}
	}
	return result, rows.Err()
}

// GetGoalMonthlyHistory returns per-goal monthly weighted current amounts for all account snapshots.
func (r *Repository) GetGoalMonthlyHistory(ctx context.Context) (map[int64][]model.GoalMonthPoint, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT gm.goal_id, s.month, SUM(s.current_amount * gm.allocation_weight)
		FROM goals g
		JOIN goal_mappings gm ON gm.goal_id = g.id AND gm.asset_table = 'account'
		JOIN account_snapshots s ON s.account_id = gm.asset_id
		WHERE g.user_id = ?
		GROUP BY gm.goal_id, s.month
		ORDER BY gm.goal_id, s.month`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int64][]model.GoalMonthPoint)
	for rows.Next() {
		var goalID int64
		var pt model.GoalMonthPoint
		if err := rows.Scan(&goalID, &pt.Month, &pt.Current); err != nil {
			return nil, err
		}
		result[goalID] = append(result[goalID], pt)
	}
	return result, rows.Err()
}

func (r *Repository) ReplaceGoalMappings(ctx context.Context, goalID int64, mappings []model.GoalMapping) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM goal_mappings WHERE goal_id = ?`, goalID); err != nil {
		return err
	}
	for _, m := range mappings {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO goal_mappings (goal_id, asset_table, asset_type, asset_id, allocation_weight)
			 VALUES (?, ?, ?, ?, ?)`,
			goalID, m.AssetTable, m.AssetType, m.AssetID, m.AllocationWeight,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}
