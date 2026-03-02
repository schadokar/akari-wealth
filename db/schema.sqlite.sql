-- Personal Finance Schema — SQLite
PRAGMA foreign_keys = ON;

CREATE TABLE entity_types (
    id       INTEGER PRIMARY KEY,
    category TEXT    NOT NULL CHECK (category IN ('ACCOUNT','ENTITY', 'ENTITY_SUBTYPE')),
    name     TEXT    NOT NULL CHECK (name IN (
                 'BANK','BROKERAGE','WALLET','CASH','CRYPTO',
                 'NPS','EPF','PPF','GOLD','LOAN','CREDIT_CARD',
                 'EQUITY','DEBT','COMMODITY', 'SILVER', 'OIL'
             )),
    kind     TEXT    NOT NULL CHECK (kind IN ('ASSET','LIABILITY')),
    UNIQUE (category, name)
);

CREATE TABLE accounts (
    id             INTEGER PRIMARY KEY,
    name           TEXT    NOT NULL,
    entity_type_id INTEGER NOT NULL REFERENCES entity_types(id),
    amount          NUMERIC NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entities (
    id         INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    symbol     TEXT,
    name       TEXT    NOT NULL,
    meta       TEXT,                          -- JSON stored as text
    type       TEXT    NOT NULL CHECK (type IN ('EQUITY','DEBT','COMMODITY')),
    subtype    TEXT    CHECK (subtype IN ('MF','Stock','Gold','Silver')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    account_id   INTEGER REFERENCES accounts(id),
    category     TEXT    NOT NULL,
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
    entity_id     INTEGER REFERENCES entities(id),
    type          TEXT    NOT NULL CHECK (type IN (
                      'BUY','SELL','DEPOSIT','WITHDRAWAL','EXPENSE','TRANSFER'
                  )),
    amount        NUMERIC NOT NULL,
    note          TEXT,
    transacted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_investments_entity_time   ON investments  (entity_id,  recorded_at);
CREATE INDEX idx_expenses_date             ON expenses     (expense_date);
CREATE INDEX idx_transactions_account_time ON transactions (account_id, transacted_at);
