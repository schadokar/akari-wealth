package model

import (
	"errors"
	"time"
)

var (
	ErrNotFound         = errors.New("not found")
	ErrValidation       = errors.New("validation error")
	ErrWeightNotHundred = errors.New("allocation weights must sum to 100%")
)

// Account category constants
const (
	CategoryBank       = "bank"
	CategoryBrokerage  = "brokerage"
	CategoryNPST1      = "nps_t1"
	CategoryNPST2      = "nps_t2"
	CategoryEPF        = "epf"
	CategoryEPS        = "eps"
	CategoryCreditCard = "credit_card"
	CategoryLoan       = "loan"
	CategoryFD         = "fd"
	CategoryRD         = "rd"
	CategoryPPF        = "ppf"
	CategorySSY        = "ssy"
	CategoryCash       = "cash"
)

// Asset class constants
const (
	AssetClassEquity    = "equity"
	AssetClassDebt      = "debt"
	AssetClassCommodity = "commodity"
	AssetClassHybrid    = "hybrid"
	AssetClassCash      = "cash"
	AssetClassLiability = "liability"
)

// Instrument type constants
const (
	InstrumentStock      = "stock"
	InstrumentETF        = "etf"
	InstrumentMutualFund = "mutual_fund"
)

// Insurance policy type constants
const (
	InsuranceTypeHealth          = "health"
	InsuranceTypeTermLife        = "term_life"
	InsuranceTypeCriticalIllness = "critical_illness"
	InsuranceTypeDisability      = "disability"
	InsuranceTypeVehicle         = "vehicle"
	InsuranceTypeHome            = "home"
	InsuranceTypeOther           = "other"
)

// Premium frequency constants
const (
	PremiumFreqMonthly   = "monthly"
	PremiumFreqQuarterly = "quarterly"
	PremiumFreqAnnual    = "annual"
)

// Goal constants
const (
	GoalStatusActive   = "active"
	GoalStatusAchieved = "achieved"
	GoalStatusPaused   = "paused"

	AssetTableAccount = "account"
	AssetTableHolding = "holding"
)

// --- Auth DTOs ---

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type RegisterResponse struct {
	Token string `json:"token"`
}

// --- DB Models ---

type User struct {
	ID           int64     `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Account struct {
	ID           int64     `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Category     string    `json:"category" db:"category"`
	SubCategory  *string   `json:"sub_category" db:"sub_category"`
	AssetClass   string    `json:"asset_class" db:"asset_class"`
	Institution  *string   `json:"institution" db:"institution"`
	InterestRate  *float64  `json:"interest_rate" db:"interest_rate"`
	EMIAmount     *float64  `json:"emi_amount" db:"emi_amount"`
	StartDate     *string   `json:"start_date" db:"start_date"`
	TenureMonths  *int      `json:"tenure_months" db:"tenure_months"`
	MaturityDate  *string   `json:"maturity_date" db:"maturity_date"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	Notes        *string   `json:"notes" db:"notes"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type Holding struct {
	ID             int64     `json:"id" db:"id"`
	AccountID      int64     `json:"account_id" db:"account_id"`
	Name           string    `json:"name" db:"name"`
	InstrumentType string    `json:"instrument_type" db:"instrument_type"`
	AssetClass     *string   `json:"asset_class" db:"asset_class"`
	IsActive       bool      `json:"is_active" db:"is_active"`
	Notes          *string   `json:"notes" db:"notes"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type AccountSnapshot struct {
	ID             int64     `json:"id" db:"id"`
	AccountID      int64     `json:"account_id" db:"account_id"`
	Month          string    `json:"month" db:"month"`
	InvestedAmount *float64  `json:"invested_amount" db:"invested_amount"`
	CurrentAmount  float64   `json:"current_amount" db:"current_amount"`
	IsAuto         bool      `json:"is_auto" db:"is_auto"`
	Notes          *string   `json:"notes" db:"notes"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type HoldingSnapshot struct {
	ID             int64     `json:"id" db:"id"`
	HoldingID      int64     `json:"holding_id" db:"holding_id"`
	Month          string    `json:"month" db:"month"`
	InvestedAmount *float64  `json:"invested_amount" db:"invested_amount"`
	CurrentAmount  float64   `json:"current_amount" db:"current_amount"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type CreditCardSnapshot struct {
	ID                 int64     `json:"id" db:"id"`
	AccountID          int64     `json:"account_id" db:"account_id"`
	Month              string    `json:"month" db:"month"`
	OutstandingBalance float64   `json:"outstanding_balance" db:"outstanding_balance"`
	CreditLimit        *float64  `json:"credit_limit" db:"credit_limit"`
	MinDue             *float64  `json:"min_due" db:"min_due"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
}

type MonthlySummary struct {
	ID               int64     `json:"id" db:"id"`
	Month            string    `json:"month" db:"month"`
	TotalAssets      float64   `json:"total_assets" db:"total_assets"`
	TotalLiabilities float64   `json:"total_liabilities" db:"total_liabilities"`
	NetWorth         float64   `json:"net_worth" db:"net_worth"`
	EquityAmount     float64   `json:"equity_amount" db:"equity_amount"`
	DebtAmount       float64   `json:"debt_amount" db:"debt_amount"`
	CommodityAmount  float64   `json:"commodity_amount" db:"commodity_amount"`
	HybridAmount     float64   `json:"hybrid_amount" db:"hybrid_amount"`
	CashAmount       float64   `json:"cash_amount" db:"cash_amount"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

type AccountSnapshotAmounts struct {
	CurrentAmount  float64 `json:"current_amount"`
	InvestedAmount float64 `json:"invested_amount"`
}

// --- Request DTOs ---

type CreateAccountRequest struct {
	Name         string   `json:"name"`
	Category     string   `json:"category"`
	SubCategory  *string  `json:"sub_category"`
	AssetClass   string   `json:"asset_class"`
	Institution  *string  `json:"institution"`
	InterestRate *float64 `json:"interest_rate"`
	EMIAmount    *float64 `json:"emi_amount"`
	StartDate    *string  `json:"start_date"`
	TenureMonths *int     `json:"tenure_months"`
	MaturityDate *string  `json:"maturity_date"`
	Notes        *string  `json:"notes"`
}

type UpdateAccountRequest struct {
	Name         *string  `json:"name"`
	SubCategory  *string  `json:"sub_category"`
	AssetClass   *string  `json:"asset_class"`
	Institution  *string  `json:"institution"`
	InterestRate *float64 `json:"interest_rate"`
	EMIAmount    *float64 `json:"emi_amount"`
	StartDate    *string  `json:"start_date"`
	TenureMonths *int     `json:"tenure_months"`
	MaturityDate *string  `json:"maturity_date"`
	IsActive     *bool    `json:"is_active"`
	Notes        *string  `json:"notes"`
}

type CreateHoldingRequest struct {
	Name           string  `json:"name"`
	InstrumentType string  `json:"instrument_type"`
	AssetClass     *string `json:"asset_class"`
	Notes          *string `json:"notes"`
}

type UpdateHoldingRequest struct {
	Name       *string `json:"name"`
	AssetClass *string `json:"asset_class"`
	IsActive   *bool   `json:"is_active"`
	Notes      *string `json:"notes"`
}

type AccountSnapshotRequest struct {
	AccountID      int64    `json:"account_id"`
	Month          string   `json:"month"`
	InvestedAmount *float64 `json:"invested_amount"`
	CurrentAmount  float64  `json:"current_amount"`
	Notes          *string  `json:"notes"`
}

type HoldingSnapshotRequest struct {
	HoldingID      int64    `json:"holding_id"`
	Month          string   `json:"month"`
	InvestedAmount *float64 `json:"invested_amount"`
	CurrentAmount  float64  `json:"current_amount"`
}

type CreditCardSnapshotRequest struct {
	AccountID          int64    `json:"account_id"`
	Month              string   `json:"month"`
	OutstandingBalance float64  `json:"outstanding_balance"`
	CreditLimit        *float64 `json:"credit_limit"`
	MinDue             *float64 `json:"min_due"`
}

// --- Response DTOs ---

type AccountResponse struct {
	ID             int64    `json:"id"`
	Name           string   `json:"name"`
	Category       string   `json:"category"`
	SubCategory    *string  `json:"sub_category,omitempty"`
	AssetClass     string   `json:"asset_class"`
	Institution    *string  `json:"institution,omitempty"`
	InterestRate   *float64 `json:"interest_rate,omitempty"`
	EMIAmount      *float64 `json:"emi_amount,omitempty"`
	StartDate      *string  `json:"start_date,omitempty"`
	TenureMonths   *int     `json:"tenure_months,omitempty"`
	MaturityDate   *string  `json:"maturity_date,omitempty"`
	IsActive       bool     `json:"is_active"`
	Notes          *string  `json:"notes,omitempty"`
	CurrentAmount  *float64 `json:"current_amount,omitempty"`
	InvestedAmount *float64 `json:"invested_amount,omitempty"`
}

type HoldingResponse struct {
	ID             int64   `json:"id"`
	AccountID      int64   `json:"account_id"`
	Name           string  `json:"name"`
	InstrumentType string  `json:"instrument_type"`
	AssetClass     *string `json:"asset_class,omitempty"`
	IsActive       bool    `json:"is_active"`
	Notes          *string `json:"notes,omitempty"`
	CreatedAt      string  `json:"created_at"`
}

type FinancialInstrument struct {
	ID             int64   `json:"id" db:"id"`
	Name           string  `json:"name" db:"name"`
	Symbol         string  `json:"symbol" db:"symbol"`
	AssetClass     string  `json:"asset_class" db:"asset_class"`
	InstrumentType string  `json:"instrument_type" db:"instrument_type"`
	Provider       *string `json:"provider,omitempty" db:"provider"`
	ISINCode       *string `json:"isin_code,omitempty" db:"isin_code"`
}

type DashboardResponse struct {
	NetWorth          float64               `json:"net_worth"`
	TotalAssets       float64               `json:"total_assets"`
	TotalLiabilities  float64               `json:"total_liabilities"`
	AssetDistribution map[string]float64    `json:"asset_distribution"`
	MonthOverMonth    *MonthOverMonthChange `json:"month_over_month,omitempty"`
}

type MonthOverMonthChange struct {
	PreviousNetWorth float64 `json:"previous_net_worth"`
	Change           float64 `json:"change"`
	ChangePercent    float64 `json:"change_percent"`
}

// --- Goal DB Models ---

type Goal struct {
	ID           int64     `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	TargetAmount float64   `json:"target_amount" db:"target_amount"`
	Status       string    `json:"status" db:"status"`
	Priority     int       `json:"priority" db:"priority"`
	TargetDate   *string   `json:"target_date,omitempty" db:"target_date"`
	Notes        *string   `json:"notes,omitempty" db:"notes"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type GoalMapping struct {
	ID               int64   `json:"id" db:"id"`
	GoalID           int64   `json:"goal_id" db:"goal_id"`
	AssetTable       string  `json:"asset_table" db:"asset_table"`
	AssetType        string  `json:"asset_type" db:"asset_type"`
	AssetID          int64   `json:"asset_id" db:"asset_id"`
	AllocationWeight float64 `json:"allocation_weight" db:"allocation_weight"`
}

// --- Goal Request / Response DTOs ---

type GoalMappingInput struct {
	AssetTable       string  `json:"asset_table"`
	AssetType        string  `json:"asset_type"`
	AssetID          int64   `json:"asset_id"`
	AllocationWeight float64 `json:"allocation_weight"`
}

type CreateGoalRequest struct {
	Name         string             `json:"name"`
	TargetAmount float64            `json:"target_amount"`
	Priority     int                `json:"priority"`
	TargetDate   *string            `json:"target_date"`
	Notes        *string            `json:"notes"`
	Mappings     []GoalMappingInput `json:"mappings"`
}

type UpdateGoalRequest struct {
	Name         *string  `json:"name"`
	TargetAmount *float64 `json:"target_amount"`
	Status       *string  `json:"status"`
	Priority     *int     `json:"priority"`
	TargetDate   *string  `json:"target_date"`
	Notes        *string  `json:"notes"`
}

type GoalResponse struct {
	ID           int64         `json:"id"`
	Name         string        `json:"name"`
	TargetAmount float64       `json:"target_amount"`
	Status       string        `json:"status"`
	Priority     int           `json:"priority"`
	TargetDate   *string       `json:"target_date,omitempty"`
	Notes        *string       `json:"notes,omitempty"`
	Mappings     []GoalMapping `json:"mappings"`
	CreatedAt    string        `json:"created_at"`
	UpdatedAt    string        `json:"updated_at"`
}

// --- Goal Analytics ---

type GoalMonthPoint struct {
	Month   string  `json:"month"`
	Current float64 `json:"current"`
}

type GoalAnalyticsEntry struct {
	GoalID         int64              `json:"goal_id"`
	CurrentAmount  float64            `json:"current_amount"`
	InvestedAmount float64            `json:"invested_amount"`
	UnrealizedGain float64            `json:"unrealized_gain"`
	ReturnPct      float64            `json:"return_pct"`
	AssetBreakdown map[string]float64 `json:"asset_breakdown"`
	MonthlyHistory []GoalMonthPoint   `json:"monthly_history"`
	GoalAgeMonths  int                `json:"goal_age_months"`
	EstMonthsLeft  *int               `json:"est_months_left,omitempty"`
}

// --- Employment & Payslip DB Models ---

type Employment struct {
	ID               int64   `json:"id" db:"id"`
	UserID           int64   `json:"user_id" db:"user_id"`
	EmployeeName     string  `json:"employee_name" db:"employee_name"`
	UAN              *string `json:"uan,omitempty" db:"uan"`
	EmployerName     string  `json:"employer_name" db:"employer_name"`
	EmployerLocation *string `json:"employer_location,omitempty" db:"employer_location"`
	PFAccount        *string `json:"pf_account,omitempty" db:"pf_account"`
	StartDate        string  `json:"start_date" db:"start_date"`
	EndDate          *string `json:"end_date,omitempty" db:"end_date"`
	EmploymentType   string  `json:"employment_type" db:"employment_type"`
}

type Payslip struct {
	ID                    int64    `json:"id" db:"id"`
	EmploymentID          int64    `json:"employment_id" db:"employment_id"`
	PayMonth              string   `json:"pay_month" db:"pay_month"`
	BasicSalary           float64  `json:"basic_salary" db:"basic_salary"`
	HRA                   *float64 `json:"hra,omitempty" db:"hra"`
	ConveyanceAllowance   *float64 `json:"conveyance_allowance,omitempty" db:"conveyance_allowance"`
	MedicalAllowance      *float64 `json:"medical_allowance,omitempty" db:"medical_allowance"`
	LTA                   *float64 `json:"lta,omitempty" db:"lta"`
	SpecialAllowance      *float64 `json:"special_allowance,omitempty" db:"special_allowance"`
	FlexiblePay           *float64 `json:"flexible_pay,omitempty" db:"flexible_pay"`
	MealAllowance         *float64 `json:"meal_allowance,omitempty" db:"meal_allowance"`
	MobileAllowance       *float64 `json:"mobile_allowance,omitempty" db:"mobile_allowance"`
	InternetAllowance     *float64 `json:"internet_allowance,omitempty" db:"internet_allowance"`
	DifferentialAllowance *float64 `json:"differential_allowance,omitempty" db:"differential_allowance"`
	StatutoryBonus        *float64 `json:"statutory_bonus,omitempty" db:"statutory_bonus"`
	PerformancePay        *float64 `json:"performance_pay,omitempty" db:"performance_pay"`
	AdvanceBonus          *float64 `json:"advance_bonus,omitempty" db:"advance_bonus"`
	OtherAllowance        *float64 `json:"other_allowance,omitempty" db:"other_allowance"`
	EPF                   float64  `json:"epf" db:"epf"`
	VPF                   *float64 `json:"vpf,omitempty" db:"vpf"`
	NPS                   *float64 `json:"nps,omitempty" db:"nps"`
	ProfessionalTax       float64  `json:"professional_tax" db:"professional_tax"`
	TDS                   float64  `json:"tds" db:"tds"`
	LWF                   *float64 `json:"lwf,omitempty" db:"lwf"`
	ESIEmployee           *float64 `json:"esi_employee,omitempty" db:"esi_employee"`
	MealCouponDeduction   *float64 `json:"meal_coupon_deduction,omitempty" db:"meal_coupon_deduction"`
	LoanRecovery          *float64 `json:"loan_recovery,omitempty" db:"loan_recovery"`
	OtherDeduction        *float64 `json:"other_deduction,omitempty" db:"other_deduction"`
	Notes                 *string  `json:"notes,omitempty" db:"notes"`
}

// --- Employment & Payslip Request DTOs ---

type CreateEmploymentRequest struct {
	EmployeeName     string  `json:"employee_name"`
	UAN              *string `json:"uan"`
	EmployerName     string  `json:"employer_name"`
	EmployerLocation *string `json:"employer_location"`
	PFAccount        *string `json:"pf_account"`
	StartDate        string  `json:"start_date"`
	EndDate          *string `json:"end_date"`
	EmploymentType   string  `json:"employment_type"`
}

type UpdateEmploymentRequest struct {
	EmployeeName     *string `json:"employee_name"`
	UAN              *string `json:"uan"`
	EmployerName     *string `json:"employer_name"`
	EmployerLocation *string `json:"employer_location"`
	PFAccount        *string `json:"pf_account"`
	StartDate        *string `json:"start_date"`
	EndDate          *string `json:"end_date"`
	EmploymentType   *string `json:"employment_type"`
}

type CreatePayslipRequest struct {
	PayMonth              string   `json:"pay_month"`
	BasicSalary           float64  `json:"basic_salary"`
	HRA                   *float64 `json:"hra"`
	ConveyanceAllowance   *float64 `json:"conveyance_allowance"`
	MedicalAllowance      *float64 `json:"medical_allowance"`
	LTA                   *float64 `json:"lta"`
	SpecialAllowance      *float64 `json:"special_allowance"`
	FlexiblePay           *float64 `json:"flexible_pay"`
	MealAllowance         *float64 `json:"meal_allowance"`
	MobileAllowance       *float64 `json:"mobile_allowance"`
	InternetAllowance     *float64 `json:"internet_allowance"`
	DifferentialAllowance *float64 `json:"differential_allowance"`
	StatutoryBonus        *float64 `json:"statutory_bonus"`
	PerformancePay        *float64 `json:"performance_pay"`
	AdvanceBonus          *float64 `json:"advance_bonus"`
	OtherAllowance        *float64 `json:"other_allowance"`
	EPF                   float64  `json:"epf"`
	VPF                   *float64 `json:"vpf"`
	NPS                   *float64 `json:"nps"`
	ProfessionalTax       float64  `json:"professional_tax"`
	TDS                   float64  `json:"tds"`
	LWF                   *float64 `json:"lwf"`
	ESIEmployee           *float64 `json:"esi_employee"`
	MealCouponDeduction   *float64 `json:"meal_coupon_deduction"`
	LoanRecovery          *float64 `json:"loan_recovery"`
	OtherDeduction        *float64 `json:"other_deduction"`
	Notes                 *string  `json:"notes"`
}

type UpdatePayslipRequest struct {
	PayMonth              *string  `json:"pay_month"`
	BasicSalary           *float64 `json:"basic_salary"`
	HRA                   *float64 `json:"hra"`
	ConveyanceAllowance   *float64 `json:"conveyance_allowance"`
	MedicalAllowance      *float64 `json:"medical_allowance"`
	LTA                   *float64 `json:"lta"`
	SpecialAllowance      *float64 `json:"special_allowance"`
	FlexiblePay           *float64 `json:"flexible_pay"`
	MealAllowance         *float64 `json:"meal_allowance"`
	MobileAllowance       *float64 `json:"mobile_allowance"`
	InternetAllowance     *float64 `json:"internet_allowance"`
	DifferentialAllowance *float64 `json:"differential_allowance"`
	StatutoryBonus        *float64 `json:"statutory_bonus"`
	PerformancePay        *float64 `json:"performance_pay"`
	AdvanceBonus          *float64 `json:"advance_bonus"`
	OtherAllowance        *float64 `json:"other_allowance"`
	EPF                   *float64 `json:"epf"`
	VPF                   *float64 `json:"vpf"`
	NPS                   *float64 `json:"nps"`
	ProfessionalTax       *float64 `json:"professional_tax"`
	TDS                   *float64 `json:"tds"`
	LWF                   *float64 `json:"lwf"`
	ESIEmployee           *float64 `json:"esi_employee"`
	MealCouponDeduction   *float64 `json:"meal_coupon_deduction"`
	LoanRecovery          *float64 `json:"loan_recovery"`
	OtherDeduction        *float64 `json:"other_deduction"`
	Notes                 *string  `json:"notes"`
}

// --- Insurance DB Model ---

type Insurance struct {
	ID                 int64     `json:"id" db:"id"`
	PolicyType         string    `json:"policy_type" db:"policy_type"`
	Insurer            string    `json:"insurer" db:"insurer"`
	PolicyNumber       *string   `json:"policy_number,omitempty" db:"policy_number"`
	SumAssured         float64   `json:"sum_assured" db:"sum_assured"`
	PremiumAmount      float64   `json:"premium_amount" db:"premium_amount"`
	PremiumFrequency   string    `json:"premium_frequency" db:"premium_frequency"`
	StartDate          string    `json:"start_date" db:"start_date"`
	EndDate            *string   `json:"end_date,omitempty" db:"end_date"`
	MaturityDate       *string   `json:"maturity_date,omitempty" db:"maturity_date"`
	Nominees           *string   `json:"nominees,omitempty" db:"nominees"`
	IsEmployerProvided bool      `json:"is_employer_provided" db:"is_employer_provided"`
	IsActive           bool      `json:"is_active" db:"is_active"`
	Notes              *string   `json:"notes,omitempty" db:"notes"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time `json:"updated_at" db:"updated_at"`
}

// --- Insurance Request DTOs ---

type CreateInsuranceRequest struct {
	PolicyType         string  `json:"policy_type"`
	Insurer            string  `json:"insurer"`
	PolicyNumber       *string `json:"policy_number"`
	SumAssured         float64 `json:"sum_assured"`
	PremiumAmount      float64 `json:"premium_amount"`
	PremiumFrequency   string  `json:"premium_frequency"`
	StartDate          string  `json:"start_date"`
	EndDate            *string `json:"end_date"`
	MaturityDate       *string `json:"maturity_date"`
	Nominees           *string `json:"nominees"`
	IsEmployerProvided bool    `json:"is_employer_provided"`
	Notes              *string `json:"notes"`
}

type UpdateInsuranceRequest struct {
	PolicyType         *string  `json:"policy_type"`
	Insurer            *string  `json:"insurer"`
	PolicyNumber       *string  `json:"policy_number"`
	SumAssured         *float64 `json:"sum_assured"`
	PremiumAmount      *float64 `json:"premium_amount"`
	PremiumFrequency   *string  `json:"premium_frequency"`
	StartDate          *string  `json:"start_date"`
	EndDate            *string  `json:"end_date"`
	MaturityDate       *string  `json:"maturity_date"`
	Nominees           *string  `json:"nominees"`
	IsEmployerProvided *bool    `json:"is_employer_provided"`
	IsActive           *bool    `json:"is_active"`
	Notes              *string  `json:"notes"`
}
