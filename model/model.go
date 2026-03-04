package model

import "time"

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

// --- DB Models ---

type Account struct {
	ID           int64     `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Category     string    `json:"category" db:"category"`
	SubCategory  *string   `json:"sub_category" db:"sub_category"`
	AssetClass   string    `json:"asset_class" db:"asset_class"`
	Institution  *string   `json:"institution" db:"institution"`
	InterestRate *float64  `json:"interest_rate" db:"interest_rate"`
	EMIAmount    *float64  `json:"emi_amount" db:"emi_amount"`
	MaturityDate *string   `json:"maturity_date" db:"maturity_date"`
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
