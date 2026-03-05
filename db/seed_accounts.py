#!/usr/bin/env python3
"""Seed accounts and account_snapshots from Finance - Sheet42.csv"""

import csv
import re
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "perfi-h.db"
CSV_PATH = Path(__file__).parent / "data/Finance - Sheet42.csv"

# CSV category → (db category, asset_class)
CATEGORY_MAP = {
    "Bank":      ("bank",      "cash"),
    "Loan":      ("loan",      "liability"),
    "NPS":       ("nps",       "hybrid"),
    "EPF":       ("epf",       "debt"),
    "PPF":       ("ppf",       "debt"),
    "Brokerage": ("brokerage", "equity"),
}


def parse_amount(value: str) -> float:
    cleaned = re.sub(r"[₹,\s]", "", value.strip())
    return float(cleaned) if cleaned else 0.0


def month_to_iso(month_str: str) -> str:
    """'Mar-2026' → '2026-03'"""
    return datetime.strptime(month_str.strip(), "%b-%Y").strftime("%Y-%m")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        months = [month_to_iso(m) for m in header[2:]]  # skip Category, Accounts cols
        rows = list(reader)

    accounts_inserted = 0
    snapshots_inserted = 0

    for row in rows:
        category_raw = row[0].strip()
        account_name = row[1].strip()
        values = row[2:]

        if category_raw not in CATEGORY_MAP:
            print(f"  Skipping unknown category: {category_raw}")
            continue

        db_category, asset_class = CATEGORY_MAP[category_raw]

        # Insert account (skip if already exists)
        cur.execute(
            "INSERT OR IGNORE INTO accounts (name, category, asset_class) VALUES (?, ?, ?)",
            (account_name, db_category, asset_class),
        )
        if cur.rowcount:
            accounts_inserted += 1

        cur.execute("SELECT id FROM accounts WHERE name = ?", (account_name,))
        account_id = cur.fetchone()[0]

        # Insert monthly snapshots
        for month, val in zip(months, values):
            if not val.strip():
                continue
            current_amount = parse_amount(val)
            cur.execute(
                """
                INSERT OR REPLACE INTO account_snapshots
                    (account_id, month, current_amount, invested_amount)
                VALUES (?, ?, ?, 0)
                """,
                (account_id, month, current_amount),
            )
            if cur.rowcount:
                snapshots_inserted += 1

    conn.commit()

    summaries = recompute_monthly_summaries(cur)
    conn.commit()
    conn.close()

    print(f"Done — {accounts_inserted} accounts, {snapshots_inserted} snapshots inserted, {len(summaries)} monthly summaries computed.")


def recompute_monthly_summaries(cur) -> list:
    """Mirrors the Go recomputeMonthlySummary logic for all months in account_snapshots."""
    cur.execute("SELECT DISTINCT month FROM account_snapshots ORDER BY month")
    months = [row[0] for row in cur.fetchall()]

    for month in months:
        cur.execute(
            """
            SELECT s.current_amount, a.asset_class
            FROM account_snapshots s
            JOIN accounts a ON a.id = s.account_id
            WHERE s.month = ?
            """,
            (month,),
        )
        rows = cur.fetchall()

        total_assets = 0.0
        total_liabilities = 0.0
        dist = {"equity": 0.0, "debt": 0.0, "commodity": 0.0, "hybrid": 0.0, "cash": 0.0}

        for current_amount, asset_class in rows:
            if asset_class == "liability":
                total_liabilities += current_amount
            else:
                total_assets += current_amount
                if asset_class in dist:
                    dist[asset_class] += current_amount

        # Also include credit_card_snapshots liabilities
        cur.execute(
            "SELECT COALESCE(SUM(outstanding_balance), 0) FROM credit_card_snapshots WHERE month = ?",
            (month,),
        )
        total_liabilities += cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO monthly_summary
                (month, total_assets, total_liabilities, net_worth,
                 equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(month) DO UPDATE SET
                total_assets      = excluded.total_assets,
                total_liabilities = excluded.total_liabilities,
                net_worth         = excluded.net_worth,
                equity_amount     = excluded.equity_amount,
                debt_amount       = excluded.debt_amount,
                commodity_amount  = excluded.commodity_amount,
                hybrid_amount     = excluded.hybrid_amount,
                cash_amount       = excluded.cash_amount
            """,
            (
                month,
                total_assets,
                total_liabilities,
                total_assets - total_liabilities,
                dist["equity"],
                dist["debt"],
                dist["commodity"],
                dist["hybrid"],
                dist["cash"],
            ),
        )

    return months


if __name__ == "__main__":
    main()
