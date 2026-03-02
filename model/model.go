package model

import "time"

type Account struct {
	ID           int64
	Name         string
	EntityTypeID int64
	Amount       float64
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Entity struct {
	ID             int64
	AccountID      int64
	Symbol         string
	Name           string
	Meta           string // JSON blob
	Type           string // EQUITY | DEBT | COMMODITY
	Subtype        string // MF | Stock | Gold | Silver
	InvestedAmount float64
	CurrentAmount  float64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type EntitySummary struct {
	AccountID      int64   `json:"account_id"`
	AccountName    string  `json:"account_name"`
	InvestedAmount float64 `json:"invested_amount"`
	CurrentAmount  float64 `json:"current_amount"`
}

type Expense struct {
	ID          int64
	AccountID   *int64 // nullable
	Category    string
	Subcategory string
	Amount      float64
	Note        string
	ExpenseDate time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type FinancialInstrument struct {
	ID             int64
	Name           string
	Symbol         string
	AssetClass     string
	InstrumentType string
	Provider       string
	Currency       string
	IsTradable     bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type Transaction struct {
	ID           int64
	AccountID    int64
	EntityID     *int64 // nullable
	Type         string // DEBIT | CREDIT | BUY | SELL | DEPOSIT | WITHDRAWAL | EXPENSE | TRANSFER
	Amount       float64
	Note         string
	TransactedAt time.Time
	CreatedAt    time.Time
}
