-- Personal Finance Schema
-- Compatible with SQLite and PostgreSQL
--
-- PostgreSQL differences (two changes only):
--   1. Replace `INTEGER PRIMARY KEY` with `SERIAL PRIMARY KEY`
--   2. Replace `TEXT` on the `meta` column with `JSONB`

CREATE TABLE accounts (
    id         INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    type       TEXT    NOT NULL CHECK (type IN (
                   'BANK','BROKERAGE','WALLET','CASH','CRYPTO',
                   'STOCK','MF','ETF','NPS','EPF','PPF','GOLD',
                   'LOAN','CREDIT_CARD'
               )),
    kind       TEXT    NOT NULL CHECK (kind IN ('ASSET','LIABILITY')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entities (
    id         INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    symbol     TEXT,                          -- ticker / NAV symbol (nullable for cash, gold, etc.)
    name       TEXT    NOT NULL,
    meta       TEXT,                          -- JSON blob; use JSONB on PostgreSQL
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Append-only snapshot log; never update rows, insert new ones.
CREATE TABLE investments (
    id              INTEGER PRIMARY KEY,
    entity_id       INTEGER NOT NULL REFERENCES entities(id),
    invested_amount NUMERIC NOT NULL,
    current_amount  NUMERIC NOT NULL,
    recorded_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
    id           INTEGER PRIMARY KEY,
    account_id   INTEGER REFERENCES accounts(id),  -- nullable; link to CC or bank account
    category     TEXT    NOT NULL,                 -- FOOD, FUEL, UTILITIES, MISC, etc.
    subcategory  TEXT,
    amount       NUMERIC NOT NULL,
    note         TEXT,
    expense_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id            INTEGER PRIMARY KEY,
    account_id    INTEGER NOT NULL REFERENCES accounts(id),
    entity_id     INTEGER REFERENCES entities(id),  -- nullable for pure account-level moves
    type          TEXT    NOT NULL CHECK (type IN (
                      'BUY','SELL','DEPOSIT','WITHDRAWAL','EXPENSE','TRANSFER'
                  )),
    amount        NUMERIC NOT NULL,
    note          TEXT,
    transacted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for time-series queries
CREATE INDEX idx_investments_entity_time  ON investments  (entity_id,  recorded_at);
CREATE INDEX idx_expenses_date            ON expenses     (expense_date);
CREATE INDEX idx_transactions_account_time ON transactions (account_id, transacted_at);
