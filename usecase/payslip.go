package usecase

import (
	"context"
	"regexp"
	"strings"

	"github.com/perfi/model"
)

var (
	dateRe     = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
	payMonthRe = regexp.MustCompile(`^\d{4}-\d{2}$`)
)

// --- Employment ---

func (u *UseCase) CreateEmployment(ctx context.Context, req model.CreateEmploymentRequest) (int64, error) {
	if strings.TrimSpace(req.EmployeeName) == "" {
		return 0, errValidation("employee_name is required")
	}
	if strings.TrimSpace(req.EmployerName) == "" {
		return 0, errValidation("employer_name is required")
	}
	if strings.TrimSpace(req.StartDate) == "" {
		return 0, errValidation("start_date is required")
	}
	if !dateRe.MatchString(req.StartDate) {
		return 0, errValidation("start_date must be in YYYY-MM-DD format")
	}
	if req.EndDate != nil && !dateRe.MatchString(*req.EndDate) {
		return 0, errValidation("end_date must be in YYYY-MM-DD format")
	}

	empType := strings.TrimSpace(req.EmploymentType)
	if empType == "" {
		empType = "FTE"
	}

	return u.store.InsertEmployment(ctx, model.Employment{
		EmployeeName:     strings.TrimSpace(req.EmployeeName),
		UAN:              req.UAN,
		EmployerName:     strings.TrimSpace(req.EmployerName),
		EmployerLocation: req.EmployerLocation,
		PFAccount:        req.PFAccount,
		StartDate:        req.StartDate,
		EndDate:          req.EndDate,
		EmploymentType:   empType,
	})
}

func (u *UseCase) GetEmploymentByID(ctx context.Context, id int64) (*model.Employment, error) {
	e, err := u.store.GetEmploymentByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, errNotFound("employment")
	}
	return e, nil
}

func (u *UseCase) GetEmployments(ctx context.Context) ([]model.Employment, error) {
	list, err := u.store.GetEmployments(ctx)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []model.Employment{}
	}
	return list, nil
}

func (u *UseCase) UpdateEmployment(ctx context.Context, id int64, req model.UpdateEmploymentRequest) error {
	existing, err := u.store.GetEmploymentByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errNotFound("employment")
	}

	if req.EmployeeName != nil {
		if strings.TrimSpace(*req.EmployeeName) == "" {
			return errValidation("employee_name cannot be empty")
		}
		existing.EmployeeName = strings.TrimSpace(*req.EmployeeName)
	}
	if req.UAN != nil {
		existing.UAN = req.UAN
	}
	if req.EmployerName != nil {
		if strings.TrimSpace(*req.EmployerName) == "" {
			return errValidation("employer_name cannot be empty")
		}
		existing.EmployerName = strings.TrimSpace(*req.EmployerName)
	}
	if req.EmployerLocation != nil {
		existing.EmployerLocation = req.EmployerLocation
	}
	if req.PFAccount != nil {
		existing.PFAccount = req.PFAccount
	}
	if req.StartDate != nil {
		if !dateRe.MatchString(*req.StartDate) {
			return errValidation("start_date must be in YYYY-MM-DD format")
		}
		existing.StartDate = *req.StartDate
	}
	if req.EndDate != nil {
		if *req.EndDate != "" && !dateRe.MatchString(*req.EndDate) {
			return errValidation("end_date must be in YYYY-MM-DD format")
		}
		existing.EndDate = req.EndDate
	}
	if req.EmploymentType != nil {
		existing.EmploymentType = *req.EmploymentType
	}

	return u.store.UpdateEmployment(ctx, id, *existing)
}

func (u *UseCase) DeleteEmployment(ctx context.Context, id int64) error {
	existing, err := u.store.GetEmploymentByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errNotFound("employment")
	}
	return u.store.DeleteEmployment(ctx, id)
}

// --- Payslip ---

func (u *UseCase) CreatePayslip(ctx context.Context, employmentID int64, req model.CreatePayslipRequest) (int64, error) {
	if strings.TrimSpace(req.PayMonth) == "" {
		return 0, errValidation("pay_month is required")
	}
	if !payMonthRe.MatchString(req.PayMonth) {
		return 0, errValidation("pay_month must be in YYYY-MM format")
	}
	if req.BasicSalary < 0 {
		return 0, errValidation("basic_salary must be non-negative")
	}
	if req.EPF < 0 {
		return 0, errValidation("epf must be non-negative")
	}
	if req.ProfessionalTax < 0 {
		return 0, errValidation("professional_tax must be non-negative")
	}
	if req.TDS < 0 {
		return 0, errValidation("tds must be non-negative")
	}

	return u.store.InsertPayslip(ctx, model.Payslip{
		EmploymentID:          employmentID,
		PayMonth:              req.PayMonth,
		BasicSalary:           req.BasicSalary,
		HRA:                   req.HRA,
		ConveyanceAllowance:   req.ConveyanceAllowance,
		MedicalAllowance:      req.MedicalAllowance,
		LTA:                   req.LTA,
		SpecialAllowance:      req.SpecialAllowance,
		FlexiblePay:           req.FlexiblePay,
		MealAllowance:         req.MealAllowance,
		MobileAllowance:       req.MobileAllowance,
		InternetAllowance:     req.InternetAllowance,
		DifferentialAllowance: req.DifferentialAllowance,
		StatutoryBonus:        req.StatutoryBonus,
		PerformancePay:        req.PerformancePay,
		AdvanceBonus:          req.AdvanceBonus,
		OtherAllowance:        req.OtherAllowance,
		EPF:                   req.EPF,
		VPF:                   req.VPF,
		NPS:                   req.NPS,
		ProfessionalTax:       req.ProfessionalTax,
		TDS:                   req.TDS,
		LWF:                   req.LWF,
		ESIEmployee:           req.ESIEmployee,
		MealCouponDeduction:   req.MealCouponDeduction,
		LoanRecovery:          req.LoanRecovery,
		OtherDeduction:        req.OtherDeduction,
		Notes:                 req.Notes,
	})
}

func (u *UseCase) GetPayslipByID(ctx context.Context, id int64) (*model.Payslip, error) {
	p, err := u.store.GetPayslipByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, errNotFound("payslip")
	}
	return p, nil
}

func (u *UseCase) GetPayslipsByEmploymentID(ctx context.Context, employmentID int64) ([]model.Payslip, error) {
	list, err := u.store.GetPayslipsByEmploymentID(ctx, employmentID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []model.Payslip{}
	}
	return list, nil
}

func (u *UseCase) UpdatePayslip(ctx context.Context, id int64, req model.UpdatePayslipRequest) error {
	existing, err := u.store.GetPayslipByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errNotFound("payslip")
	}

	if req.PayMonth != nil {
		if !payMonthRe.MatchString(*req.PayMonth) {
			return errValidation("pay_month must be in YYYY-MM format")
		}
		existing.PayMonth = *req.PayMonth
	}
	if req.BasicSalary != nil {
		if *req.BasicSalary < 0 {
			return errValidation("basic_salary must be non-negative")
		}
		existing.BasicSalary = *req.BasicSalary
	}
	if req.HRA != nil {
		existing.HRA = req.HRA
	}
	if req.ConveyanceAllowance != nil {
		existing.ConveyanceAllowance = req.ConveyanceAllowance
	}
	if req.MedicalAllowance != nil {
		existing.MedicalAllowance = req.MedicalAllowance
	}
	if req.LTA != nil {
		existing.LTA = req.LTA
	}
	if req.SpecialAllowance != nil {
		existing.SpecialAllowance = req.SpecialAllowance
	}
	if req.FlexiblePay != nil {
		existing.FlexiblePay = req.FlexiblePay
	}
	if req.MealAllowance != nil {
		existing.MealAllowance = req.MealAllowance
	}
	if req.MobileAllowance != nil {
		existing.MobileAllowance = req.MobileAllowance
	}
	if req.InternetAllowance != nil {
		existing.InternetAllowance = req.InternetAllowance
	}
	if req.DifferentialAllowance != nil {
		existing.DifferentialAllowance = req.DifferentialAllowance
	}
	if req.StatutoryBonus != nil {
		existing.StatutoryBonus = req.StatutoryBonus
	}
	if req.PerformancePay != nil {
		existing.PerformancePay = req.PerformancePay
	}
	if req.AdvanceBonus != nil {
		existing.AdvanceBonus = req.AdvanceBonus
	}
	if req.OtherAllowance != nil {
		existing.OtherAllowance = req.OtherAllowance
	}
	if req.EPF != nil {
		if *req.EPF < 0 {
			return errValidation("epf must be non-negative")
		}
		existing.EPF = *req.EPF
	}
	if req.VPF != nil {
		existing.VPF = req.VPF
	}
	if req.NPS != nil {
		existing.NPS = req.NPS
	}
	if req.ProfessionalTax != nil {
		if *req.ProfessionalTax < 0 {
			return errValidation("professional_tax must be non-negative")
		}
		existing.ProfessionalTax = *req.ProfessionalTax
	}
	if req.TDS != nil {
		if *req.TDS < 0 {
			return errValidation("tds must be non-negative")
		}
		existing.TDS = *req.TDS
	}
	if req.LWF != nil {
		existing.LWF = req.LWF
	}
	if req.ESIEmployee != nil {
		existing.ESIEmployee = req.ESIEmployee
	}
	if req.MealCouponDeduction != nil {
		existing.MealCouponDeduction = req.MealCouponDeduction
	}
	if req.LoanRecovery != nil {
		existing.LoanRecovery = req.LoanRecovery
	}
	if req.OtherDeduction != nil {
		existing.OtherDeduction = req.OtherDeduction
	}
	if req.Notes != nil {
		existing.Notes = req.Notes
	}

	return u.store.UpdatePayslip(ctx, id, *existing)
}

func (u *UseCase) DeletePayslip(ctx context.Context, id int64) error {
	existing, err := u.store.GetPayslipByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return errNotFound("payslip")
	}
	return u.store.DeletePayslip(ctx, id)
}
