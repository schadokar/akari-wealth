PRAGMA foreign_keys = OFF;

-- Restore monthly_summary with UNIQUE(month)
CREATE TABLE monthly_summary_old (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    month             TEXT    NOT NULL UNIQUE,
    total_assets      REAL    NOT NULL DEFAULT 0,
    total_liabilities REAL    NOT NULL DEFAULT 0,
    net_worth         REAL    NOT NULL DEFAULT 0,
    equity_amount     REAL    NOT NULL DEFAULT 0,
    debt_amount       REAL    NOT NULL DEFAULT 0,
    commodity_amount  REAL    NOT NULL DEFAULT 0,
    hybrid_amount     REAL    NOT NULL DEFAULT 0,
    cash_amount       REAL    NOT NULL DEFAULT 0,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO monthly_summary_old
    SELECT id, month, total_assets, total_liabilities, net_worth,
           equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount, created_at
    FROM monthly_summary;

DROP TABLE monthly_summary;
ALTER TABLE monthly_summary_old RENAME TO monthly_summary;

-- Restore accounts with UNIQUE(name)
CREATE TABLE accounts_old (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
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
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO accounts_old
    SELECT id, name, category, sub_category, asset_class, institution,
           interest_rate, emi_amount, start_date, tenure_months, maturity_date,
           is_active, notes, created_at, updated_at
    FROM accounts;

DROP TABLE accounts;
ALTER TABLE accounts_old RENAME TO accounts;

CREATE INDEX idx_accounts_category   ON accounts(category);
CREATE INDEX idx_accounts_asset_class ON accounts(asset_class);

DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;
