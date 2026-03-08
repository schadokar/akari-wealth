PRAGMA foreign_keys = OFF;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Recreate accounts with UNIQUE(user_id, name) instead of UNIQUE(name)
CREATE TABLE accounts_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id),
    name            TEXT    NOT NULL,
    category        TEXT    NOT NULL CHECK (category IN (
                        'bank', 'brokerage', 'nps', 'nps', 'epf', 'eps',
                        'credit_card', 'loan', 'fd', 'rd', 'ppf', 'ssy', 'cash'
                    )),
    sub_category    TEXT,
    asset_class     TEXT    NOT NULL CHECK (asset_class IN (
                        'equity', 'debt', 'commodity', 'hybrid', 'cash', 'liability', 'asset'
                    )),
    institution     TEXT,
    interest_rate   REAL,
    emi_amount      REAL,
    start_date      TEXT,
    tenure_months   INTEGER,
    maturity_date   TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

INSERT INTO accounts_new
    SELECT id, NULL, name, category, sub_category, asset_class, institution,
           interest_rate, emi_amount, start_date, tenure_months, maturity_date,
           is_active, notes, created_at, updated_at
    FROM accounts;

DROP TABLE accounts;
ALTER TABLE accounts_new RENAME TO accounts;

CREATE INDEX idx_accounts_category  ON accounts(category);
CREATE INDEX idx_accounts_asset_class ON accounts(asset_class);
CREATE INDEX idx_accounts_user_id   ON accounts(user_id);

-- 3. Recreate monthly_summary with UNIQUE(user_id, month) instead of UNIQUE(month)
CREATE TABLE monthly_summary_new (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER REFERENCES users(id),
    month             TEXT    NOT NULL,
    total_assets      REAL    NOT NULL DEFAULT 0,
    total_liabilities REAL    NOT NULL DEFAULT 0,
    net_worth         REAL    NOT NULL DEFAULT 0,
    equity_amount     REAL    NOT NULL DEFAULT 0,
    debt_amount       REAL    NOT NULL DEFAULT 0,
    commodity_amount  REAL    NOT NULL DEFAULT 0,
    hybrid_amount     REAL    NOT NULL DEFAULT 0,
    cash_amount       REAL    NOT NULL DEFAULT 0,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month)
);

INSERT INTO monthly_summary_new
    SELECT id, NULL, month, total_assets, total_liabilities, net_worth,
           equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount, created_at
    FROM monthly_summary;

DROP TABLE monthly_summary;
ALTER TABLE monthly_summary_new RENAME TO monthly_summary;

PRAGMA foreign_keys = ON;
