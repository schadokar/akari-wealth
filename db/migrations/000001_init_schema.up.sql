PRAGMA foreign_keys = ON;

-- 1. Unified accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    category        TEXT    NOT NULL CHECK (category IN (
                        'bank', 'brokerage', 'nps_t1', 'nps_t2', 'epf', 'eps',
                        'credit_card', 'loan', 'fd', 'rd', 'ppf', 'ssy', 'cash'
                    )),
    sub_category    TEXT,
    asset_class     TEXT    NOT NULL CHECK (asset_class IN (
                        'equity', 'debt', 'commodity', 'hybrid', 'cash', 'liability', 'asset'
                    )),
    institution     TEXT,
    interest_rate   REAL,
    emi_amount      REAL,
    maturity_date   TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_category ON accounts(category);
CREATE INDEX idx_accounts_asset_class ON accounts(asset_class);

-- 2. Holdings under brokerage accounts
CREATE TABLE IF NOT EXISTS holdings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id      INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    instrument_type TEXT    NOT NULL CHECK (instrument_type IN ('stock', 'etf', 'mutual_fund')),
    asset_class     TEXT    CHECK (asset_class IN ('equity', 'debt', 'commodity', 'hybrid')),
    is_active       INTEGER NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_holdings_account_id ON holdings(account_id);

-- 3. Monthly snapshots for accounts
CREATE TABLE IF NOT EXISTS account_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id      INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    month           TEXT    NOT NULL,
    invested_amount REAL NOT NULL DEFAULT 0,
    current_amount  REAL    NOT NULL,
    is_auto         INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, month)
);

CREATE INDEX idx_account_snapshots_month ON account_snapshots(month);

-- 4. Monthly snapshots for individual holdings
CREATE TABLE IF NOT EXISTS holding_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    holding_id      INTEGER NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
    month           TEXT    NOT NULL,
    invested_amount REAL NOT NULL DEFAULT 0,
    current_amount  REAL    NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(holding_id, month)
);

CREATE INDEX idx_holding_snapshots_month ON holding_snapshots(month);

-- 5. Monthly snapshots for credit cards
CREATE TABLE IF NOT EXISTS credit_card_snapshots (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id          INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    month               TEXT    NOT NULL,
    outstanding_balance REAL    NOT NULL,
    credit_limit        REAL,
    min_due             REAL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, month)
);

CREATE INDEX idx_cc_snapshots_month ON credit_card_snapshots(month);

-- 6. Denormalized monthly summary
CREATE TABLE IF NOT EXISTS monthly_summary (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    month            TEXT    NOT NULL UNIQUE,
    total_assets     REAL    NOT NULL DEFAULT 0,
    total_liabilities REAL   NOT NULL DEFAULT 0,
    net_worth        REAL    NOT NULL DEFAULT 0,
    equity_amount    REAL    NOT NULL DEFAULT 0,
    debt_amount      REAL    NOT NULL DEFAULT 0,
    commodity_amount REAL    NOT NULL DEFAULT 0,
    hybrid_amount    REAL    NOT NULL DEFAULT 0,
    cash_amount      REAL    NOT NULL DEFAULT 0,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financial_instruments (
    id              INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL,
    symbol          TEXT    NOT NULL UNIQUE,
    asset_class     TEXT    NOT NULL,
    instrument_type TEXT    NOT NULL,
    provider        TEXT,
    isin_code       TEXT,
    currency        TEXT    NOT NULL DEFAULT 'INR',
    is_tradable     INTEGER NOT NULL DEFAULT 1 CHECK (is_tradable IN (0, 1)),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_financial_instruments_symbol     ON financial_instruments (symbol);
CREATE INDEX idx_financial_instruments_asset_class ON financial_instruments (asset_class);
