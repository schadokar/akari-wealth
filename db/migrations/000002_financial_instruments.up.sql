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
