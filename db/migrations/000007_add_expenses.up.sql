CREATE TABLE expenses (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month                  TEXT NOT NULL,
    category               TEXT NOT NULL CHECK (category IN (
                               'rent', 'grocery', 'food', 'fuel',
                               'utilities', 'shopping', 'medical',
                               'entertainment', 'subscription', 'travel', 'misc')),
    expense_type           TEXT NOT NULL DEFAULT 'variable'
                               CHECK (expense_type IN ('fixed', 'variable')),
    amount                 REAL NOT NULL,
    description            TEXT,
    payment_method         TEXT NOT NULL DEFAULT 'cash'
                               CHECK (payment_method IN ('cash', 'credit_card', 'upi', 'debit_card')),
    credit_card_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    is_recurring           INTEGER NOT NULL DEFAULT 0,
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_user_id    ON expenses(user_id);
CREATE INDEX idx_expenses_user_month ON expenses(user_id, month);
