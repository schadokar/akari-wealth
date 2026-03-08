CREATE TABLE IF NOT EXISTS goals (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT    NOT NULL,
    target_amount  REAL    NOT NULL DEFAULT 0,
    status         TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused')),
    priority       INTEGER NOT NULL DEFAULT 0,
    target_date    DATE,
    notes          TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goal_mappings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id           INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

    -- Which table the asset lives in
    asset_table       TEXT    NOT NULL CHECK (asset_table IN ('account', 'holding')),

    -- Type within that table:
    --   account → accounts.category  (e.g. 'bank', 'fd', 'ppf', 'nps', 'epf', 'brokerage', ...)
    --   holding → holdings.instrument_type  (e.g. 'stock', 'etf', 'mutual_fund')
    asset_type        TEXT    NOT NULL,

    asset_id          INTEGER NOT NULL,

    -- Fraction of this asset earmarked for the goal (0 < weight <= 1)
    allocation_weight REAL    NOT NULL CHECK (allocation_weight > 0 AND allocation_weight <= 1),

    UNIQUE (goal_id, asset_table, asset_id)
);

CREATE INDEX idx_goal_mappings_goal_id    ON goal_mappings(goal_id);
CREATE INDEX idx_goal_mappings_asset      ON goal_mappings(asset_table, asset_id);
