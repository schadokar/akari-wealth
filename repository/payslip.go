package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/perfi/auth"
	"github.com/perfi/model"
)

// --- Employment ---

func (r *Repository) InsertEmployment(ctx context.Context, e model.Employment) (int64, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return 0, err
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO employments (user_id, employee_name, uan, employer_name, employer_location, pf_account, start_date, end_date, employment_type)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, e.EmployeeName, e.UAN, e.EmployerName, e.EmployerLocation, e.PFAccount, e.StartDate, e.EndDate, e.EmploymentType,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetEmploymentByID(ctx context.Context, id int64) (*model.Employment, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var e model.Employment
	err = r.db.QueryRowContext(ctx,
		`SELECT id, user_id, employee_name, uan, employer_name, employer_location, pf_account, start_date, end_date, employment_type
		 FROM employments WHERE id = ? AND user_id = ?`, id, userID,
	).Scan(&e.ID, &e.UserID, &e.EmployeeName, &e.UAN, &e.EmployerName, &e.EmployerLocation, &e.PFAccount, &e.StartDate, &e.EndDate, &e.EmploymentType)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *Repository) GetEmployments(ctx context.Context) ([]model.Employment, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, employee_name, uan, employer_name, employer_location, pf_account, start_date, end_date, employment_type
		 FROM employments WHERE user_id = ? ORDER BY start_date DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Employment
	for rows.Next() {
		var e model.Employment
		if err := rows.Scan(&e.ID, &e.UserID, &e.EmployeeName, &e.UAN, &e.EmployerName, &e.EmployerLocation, &e.PFAccount, &e.StartDate, &e.EndDate, &e.EmploymentType); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func (r *Repository) UpdateEmployment(ctx context.Context, id int64, e model.Employment) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	res, err := r.db.ExecContext(ctx,
		`UPDATE employments SET employee_name = ?, uan = ?, employer_name = ?, employer_location = ?, pf_account = ?, start_date = ?, end_date = ?, employment_type = ?
		 WHERE id = ? AND user_id = ?`,
		e.EmployeeName, e.UAN, e.EmployerName, e.EmployerLocation, e.PFAccount, e.StartDate, e.EndDate, e.EmploymentType, id, userID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("employment not found")
	}
	return nil
}

func (r *Repository) DeleteEmployment(ctx context.Context, id int64) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM employments WHERE id = ? AND user_id = ?`, id, userID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("employment not found")
	}
	return nil
}

// --- Payslip ---

const payslipCols = `p.id, p.employment_id, p.pay_month,
	p.basic_salary, p.hra, p.conveyance_allowance, p.medical_allowance,
	p.lta, p.special_allowance, p.flexible_pay, p.meal_allowance,
	p.mobile_allowance, p.internet_allowance, p.differential_allowance,
	p.statutory_bonus, p.performance_pay, p.advance_bonus, p.other_allowance,
	p.epf, p.vpf, p.nps, p.professional_tax, p.tds, p.lwf,
	p.esi_employee, p.meal_coupon_deduction, p.loan_recovery, p.other_deduction,
	p.notes`

func scanPayslip(dest *model.Payslip, scan func(...any) error) error {
	return scan(
		&dest.ID, &dest.EmploymentID, &dest.PayMonth,
		&dest.BasicSalary, &dest.HRA, &dest.ConveyanceAllowance, &dest.MedicalAllowance,
		&dest.LTA, &dest.SpecialAllowance, &dest.FlexiblePay, &dest.MealAllowance,
		&dest.MobileAllowance, &dest.InternetAllowance, &dest.DifferentialAllowance,
		&dest.StatutoryBonus, &dest.PerformancePay, &dest.AdvanceBonus, &dest.OtherAllowance,
		&dest.EPF, &dest.VPF, &dest.NPS, &dest.ProfessionalTax, &dest.TDS, &dest.LWF,
		&dest.ESIEmployee, &dest.MealCouponDeduction, &dest.LoanRecovery, &dest.OtherDeduction,
		&dest.Notes,
	)
}

func (r *Repository) InsertPayslip(ctx context.Context, p model.Payslip) (int64, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return 0, err
	}
	// verify ownership
	var empUserID int64
	err = r.db.QueryRowContext(ctx, `SELECT user_id FROM employments WHERE id = ?`, p.EmploymentID).Scan(&empUserID)
	if err == sql.ErrNoRows {
		return 0, fmt.Errorf("employment not found")
	}
	if err != nil {
		return 0, err
	}
	if empUserID != userID {
		return 0, fmt.Errorf("employment not found")
	}

	res, err := r.db.ExecContext(ctx,
		`INSERT INTO payslips (employment_id, pay_month,
		 basic_salary, hra, conveyance_allowance, medical_allowance, lta, special_allowance,
		 flexible_pay, meal_allowance, mobile_allowance, internet_allowance, differential_allowance,
		 statutory_bonus, performance_pay, advance_bonus, other_allowance,
		 epf, vpf, nps, professional_tax, tds, lwf, esi_employee, meal_coupon_deduction,
		 loan_recovery, other_deduction, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.EmploymentID, p.PayMonth,
		p.BasicSalary, p.HRA, p.ConveyanceAllowance, p.MedicalAllowance, p.LTA, p.SpecialAllowance,
		p.FlexiblePay, p.MealAllowance, p.MobileAllowance, p.InternetAllowance, p.DifferentialAllowance,
		p.StatutoryBonus, p.PerformancePay, p.AdvanceBonus, p.OtherAllowance,
		p.EPF, p.VPF, p.NPS, p.ProfessionalTax, p.TDS, p.LWF, p.ESIEmployee, p.MealCouponDeduction,
		p.LoanRecovery, p.OtherDeduction, p.Notes,
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) GetPayslipByID(ctx context.Context, id int64) (*model.Payslip, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	var p model.Payslip
	err = scanPayslip(&p, r.db.QueryRowContext(ctx,
		`SELECT `+payslipCols+`
		 FROM payslips p
		 JOIN employments e ON e.id = p.employment_id
		 WHERE p.id = ? AND e.user_id = ?`, id, userID,
	).Scan)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) GetPayslipsByEmploymentID(ctx context.Context, employmentID int64) ([]model.Payslip, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+payslipCols+`
		 FROM payslips p
		 JOIN employments e ON e.id = p.employment_id
		 WHERE p.employment_id = ? AND e.user_id = ?
		 ORDER BY p.pay_month DESC`, employmentID, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Payslip
	for rows.Next() {
		var p model.Payslip
		if err := scanPayslip(&p, rows.Scan); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (r *Repository) GetPayslipsByMonth(ctx context.Context, month string) ([]model.Payslip, error) {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+payslipCols+`
		 FROM payslips p
		 JOIN employments e ON e.id = p.employment_id
		 WHERE p.pay_month = ? AND e.user_id = ?
		 ORDER BY p.id`, month, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.Payslip
	for rows.Next() {
		var p model.Payslip
		if err := scanPayslip(&p, rows.Scan); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (r *Repository) UpdatePayslip(ctx context.Context, id int64, p model.Payslip) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	res, err := r.db.ExecContext(ctx,
		`UPDATE payslips SET pay_month = ?,
		 basic_salary = ?, hra = ?, conveyance_allowance = ?, medical_allowance = ?, lta = ?,
		 special_allowance = ?, flexible_pay = ?, meal_allowance = ?, mobile_allowance = ?,
		 internet_allowance = ?, differential_allowance = ?, statutory_bonus = ?,
		 performance_pay = ?, advance_bonus = ?, other_allowance = ?,
		 epf = ?, vpf = ?, nps = ?, professional_tax = ?, tds = ?, lwf = ?,
		 esi_employee = ?, meal_coupon_deduction = ?, loan_recovery = ?, other_deduction = ?, notes = ?
		 WHERE id = ? AND employment_id IN (SELECT id FROM employments WHERE user_id = ?)`,
		p.PayMonth,
		p.BasicSalary, p.HRA, p.ConveyanceAllowance, p.MedicalAllowance, p.LTA,
		p.SpecialAllowance, p.FlexiblePay, p.MealAllowance, p.MobileAllowance,
		p.InternetAllowance, p.DifferentialAllowance, p.StatutoryBonus,
		p.PerformancePay, p.AdvanceBonus, p.OtherAllowance,
		p.EPF, p.VPF, p.NPS, p.ProfessionalTax, p.TDS, p.LWF,
		p.ESIEmployee, p.MealCouponDeduction, p.LoanRecovery, p.OtherDeduction, p.Notes,
		id, userID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("payslip not found")
	}
	return nil
}

func (r *Repository) DeletePayslip(ctx context.Context, id int64) error {
	userID, err := auth.UserIDFromContext(ctx)
	if err != nil {
		return err
	}
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM payslips WHERE id = ? AND employment_id IN (SELECT id FROM employments WHERE user_id = ?)`,
		id, userID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("payslip not found")
	}
	return nil
}
