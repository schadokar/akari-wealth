CREATE TABLE insurances (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    policy_type          TEXT NOT NULL CHECK (policy_type IN (
                             'health', 'term_life', 'critical_illness',
                             'disability', 'vehicle', 'home', 'other')),
    insurer              TEXT NOT NULL,
    policy_number        TEXT,
    sum_assured          REAL NOT NULL,
    premium_amount       REAL NOT NULL,
    premium_frequency    TEXT NOT NULL DEFAULT 'annual'
                             CHECK (premium_frequency IN ('monthly', 'quarterly', 'annual')),
    start_date           TEXT NOT NULL,
    end_date             TEXT,
    maturity_date        TEXT,
    nominees             TEXT,
    is_employer_provided INTEGER NOT NULL DEFAULT 0,
    is_active            INTEGER NOT NULL DEFAULT 1,
    notes                TEXT,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insurances_user_id ON insurances(user_id);
CREATE INDEX idx_insurances_policy_type ON insurances(policy_type);
