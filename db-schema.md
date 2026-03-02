# Requirement

A minimal personal finance database for an individual Indian.

The user can hold multiple assets across: bank accounts, physical cash, gold (commodity), stocks, mutual funds, ETFs, NPS (Tier 1 & Tier 2), EPF, PPF, and crypto. Liabilities include credit cards and loans. All asset/liability types can have multiple instances (e.g., multiple home loans, credit cards, brokerage accounts).

Expenses can be granular (per category) or consolidated (e.g., a credit card bill as a single expense covering food, fuel, and miscellaneous spend across separate cards).

All tables include timestamps to support time-series reporting and graphs.

---

# Tables

## entity_types
Shared lookup table for account and entity classifications.
- `id`
- `category` — ACCOUNT | ENTITY
- `name` — BANK | BROKERAGE | WALLET | CASH | CRYPTO | NPS | EPF | PPF | GOLD | LOAN | CREDIT_CARD | EQUITY | DEBT | COMMODITY
- `kind` — ASSET | LIABILITY

## accounts
Represents a financial account or holding vehicle (where assets are held).
- `id`
- `name`
- `entity_type_id` → entity_types.id (category=ACCOUNT)
- `amount`
- `created_at`
- `updated_at`

## entities
Represents individual instruments or products within an account.
- `id`
- `account_id` → accounts.id
- `symbol` — ticker or identifier (e.g., INFY, NIFTY50, NPS-SBI-E)
- `name` — display name
- `meta` — JSON for instrument-specific fields (NAV, price, units, interest rate, etc.)
- `type` — EQUITY | DEBT | COMMODITY
- `subtype` — MF | STOCK | GOLD | SILVER
- `invested_amount`
- `current_amount`
- `created_at`
- `updated_at`

## expenses
Records spending, either itemised or consolidated.
- `id`
- `account_id` → accounts.id (nullable; links to credit card or bank account)
- `category` — e.g., FOOD, FUEL, UTILITIES, MISC
- `subcategory`
- `amount`
- `note`
- `expense_date`
- `created_at`
- `updated_at`

## transactions
Audit log of all financial movements.
- `id`
- `account_id` → accounts.id
- `entity_id` → entities.id (nullable)
- `type` — BUY | SELL | DEPOSIT | WITHDRAWAL | EXPENSE | TRANSFER
- `amount`
- `note`
- `transacted_at`
- `created_at`
