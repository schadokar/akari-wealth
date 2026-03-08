package repository

import (
	"context"
	"database/sql"

	"github.com/perfi/auth"
	"github.com/perfi/model"
)

func (r *Repository) InsertInsurance(ctx context.Context, ins model.Insurance) (int64, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return 0, err
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO insurances
		 (user_id, policy_type, insurer, policy_number, sum_assured, premium_amount,
		  premium_frequency, start_date, end_date, maturity_date, nominees,
		  is_employer_provided, is_active, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
		userID, ins.PolicyType, ins.Insurer, ins.PolicyNumber, ins.SumAssured, ins.PremiumAmount,
		ins.PremiumFrequency, ins.StartDate, ins.EndDate, ins.MaturityDate, ins.Nominees,
		boolToInt(ins.IsEmployerProvided), ins.Notes,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetInsuranceByID(ctx context.Context, id int64) (*model.Insurance, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var ins model.Insurance
	var isEmployerProvided, isActive int
	err = r.db.QueryRowContext(ctx,
		`SELECT id, policy_type, insurer, policy_number, sum_assured, premium_amount,
		        premium_frequency, start_date, end_date, maturity_date, nominees,
		        is_employer_provided, is_active, notes, created_at, updated_at
		 FROM insurances WHERE id = ? AND user_id = ?`, id, userID,
	).Scan(
		&ins.ID, &ins.PolicyType, &ins.Insurer, &ins.PolicyNumber, &ins.SumAssured, &ins.PremiumAmount,
		&ins.PremiumFrequency, &ins.StartDate, &ins.EndDate, &ins.MaturityDate, &ins.Nominees,
		&isEmployerProvided, &isActive, &ins.Notes, &ins.CreatedAt, &ins.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	ins.IsEmployerProvided = isEmployerProvided == 1
	ins.IsActive = isActive == 1
	return &ins, nil
}

func (r *Repository) GetInsurances(ctx context.Context) ([]model.Insurance, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, policy_type, insurer, policy_number, sum_assured, premium_amount,
		        premium_frequency, start_date, end_date, maturity_date, nominees,
		        is_employer_provided, is_active, notes, created_at, updated_at
		 FROM insurances WHERE user_id = ? ORDER BY policy_type, insurer`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Insurance
	for rows.Next() {
		var ins model.Insurance
		var isEmployerProvided, isActive int
		if err := rows.Scan(
			&ins.ID, &ins.PolicyType, &ins.Insurer, &ins.PolicyNumber, &ins.SumAssured, &ins.PremiumAmount,
			&ins.PremiumFrequency, &ins.StartDate, &ins.EndDate, &ins.MaturityDate, &ins.Nominees,
			&isEmployerProvided, &isActive, &ins.Notes, &ins.CreatedAt, &ins.UpdatedAt,
		); err != nil {
			return nil, err
		}
		ins.IsEmployerProvided = isEmployerProvided == 1
		ins.IsActive = isActive == 1
		list = append(list, ins)
	}
	return list, rows.Err()
}

func (r *Repository) UpdateInsurance(ctx context.Context, id int64, ins model.Insurance) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx,
		`UPDATE insurances SET policy_type = ?, insurer = ?, policy_number = ?, sum_assured = ?,
		        premium_amount = ?, premium_frequency = ?, start_date = ?, end_date = ?,
		        maturity_date = ?, nominees = ?, is_employer_provided = ?, is_active = ?,
		        notes = ?, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND user_id = ?`,
		ins.PolicyType, ins.Insurer, ins.PolicyNumber, ins.SumAssured,
		ins.PremiumAmount, ins.PremiumFrequency, ins.StartDate, ins.EndDate,
		ins.MaturityDate, ins.Nominees, boolToInt(ins.IsEmployerProvided), boolToInt(ins.IsActive),
		ins.Notes, id, userID,
	)
	return err
}

func (r *Repository) DeleteInsurance(ctx context.Context, id int64) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx,
		`DELETE FROM insurances WHERE id = ? AND user_id = ?`, id, userID,
	)
	return err
}
