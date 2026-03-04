#!/usr/bin/env python3
"""Seed script: inserts dummy accounts, holdings, and monthly snapshots into perfi.db."""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "perfi.db")
MONTHS = ["2026-01", "2026-02", "2026-03"]


def seed(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON")

    # ------------------------------------------------------------------
    # 1. Accounts
    # ------------------------------------------------------------------
    accounts = [
        # (name, category, sub_category, asset_class, institution, interest_rate, emi_amount, maturity_date, notes)
        ("HDFC Savings",   "bank",       "savings",  "cash",      "HDFC Bank",  3.5,  None, None, "Primary salary account"),
        ("SBI Savings",    "bank",       "savings",  "cash",      "SBI",        2.7,  None, None, "Secondary savings account"),
        ("Zerodha Stocks", "brokerage",  "stocks",   "equity",    "Zerodha",    None, None, None, "Direct equity portfolio"),
        ("Black MF",       "brokerage",  "mf",       "equity",    "Black",      None, None, None, "Mutual fund portfolio via Black"),
        ("HDFC Home Loan", "loan",       "home_loan","liability", "HDFC Bank",  8.75, 45000, "2040-06-01", "Home loan - primary property"),
        ("SBI Home Loan",  "loan",       "home_loan","liability", "SBI",        8.50, 38000, "2038-03-01", "Home loan - second property"),
        ("HDFC UPI CC",    "credit_card", None,      "liability", "HDFC Bank",  None, None,  None,         "HDFC UPI credit card"),
        ("HDFC Swiggy CC", "credit_card", None,      "liability", "HDFC Bank",  None, None,  None,         "HDFC Swiggy co-branded credit card"),
        ("ICICI CC",       "credit_card", None,      "liability", "ICICI Bank", None, None,  None,         "ICICI credit card"),
    ]

    cur.executemany(
        """INSERT OR IGNORE INTO accounts
           (name, category, sub_category, asset_class, institution,
            interest_rate, emi_amount, maturity_date, notes)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        accounts,
    )

    # Fetch IDs by name
    cur.execute(f"SELECT id, name FROM accounts WHERE name IN ({','.join('?'*len(accounts))})",
                [a[0] for a in accounts])
    acc_id = {row[1]: row[0] for row in cur.fetchall()}

    # ------------------------------------------------------------------
    # 2. Holdings under brokerage accounts
    # ------------------------------------------------------------------
    holdings = [
        # Zerodha — stocks (instrument_type='stock', asset_class='equity')
        (acc_id["Zerodha Stocks"], "Reliance Industries Limited", "stock", "equity"),
        (acc_id["Zerodha Stocks"], "Infosys Limited",             "stock", "equity"),
        (acc_id["Zerodha Stocks"], "Tata Consultancy Services Limited", "stock", "equity"),
        (acc_id["Zerodha Stocks"], "HDFC Bank Limited",           "stock", "equity"),
        # Black — mutual funds (instrument_type='mutual_fund')
        (acc_id["Black MF"], "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", "mutual_fund", "equity"),
        (acc_id["Black MF"], "Mirae Asset ELSS Tax Saver Fund - Direct Plan - Growth", "mutual_fund", "equity"),
        (acc_id["Black MF"], "Axis Flexi Cap Fund - Direct Plan - Growth", "mutual_fund", "equity"),
    ]

    cur.executemany(
        """INSERT OR IGNORE INTO holdings (account_id, name, instrument_type, asset_class)
           VALUES (?,?,?,?)""",
        holdings,
    )

    # Fetch holding IDs by name
    holding_names = [h[1] for h in holdings]
    placeholders = ",".join("?" * len(holding_names))
    cur.execute(f"SELECT id, name FROM holdings WHERE name IN ({placeholders})", holding_names)
    hold_id = {row[1]: row[0] for row in cur.fetchall()}

    # ------------------------------------------------------------------
    # 3. Account snapshots (bank + loan) — 3 months
    # ------------------------------------------------------------------
    # Bank snapshots: invested = deposited principal (not tracked for savings), current = balance
    bank_data = {
        "HDFC Savings": [(185000, 185000), (192000, 192000), (198500, 198500)],
        "SBI Savings":  [(94000, 94000),  (97500, 97500),  (101200, 101200)],
    }
    # Brokerage account-level snapshots (total of all holdings)
    brokerage_data = {
        "Zerodha Stocks": [(450000, 512000), (450000, 535000), (450000, 549000)],
        "Black MF":       [(300000, 348000), (315000, 361000), (330000, 375000)],
    }
    # Loan snapshots: outstanding balance (negative net-worth contribution)
    # invested_amount = original loan, current_amount = outstanding
    loan_data = {
        "HDFC Home Loan": [(5400000, 4980000), (5400000, 4935000), (5400000, 4890000)],
        "SBI Home Loan":  [(3800000, 3650000), (3800000, 3612000), (3800000, 3574000)],
    }

    all_acc_snapshots = []
    for acc_name, monthly in {**bank_data, **brokerage_data, **loan_data}.items():
        for month, (invested, current) in zip(MONTHS, monthly):
            all_acc_snapshots.append((acc_id[acc_name], month, invested, current))

    cur.executemany(
        """INSERT OR IGNORE INTO account_snapshots
           (account_id, month, invested_amount, current_amount)
           VALUES (?,?,?,?)""",
        all_acc_snapshots,
    )

    # ------------------------------------------------------------------
    # 4. Holding snapshots — 3 months
    # ------------------------------------------------------------------
    holding_snapshot_data = {
        "Reliance Industries Limited":                              [(80000, 94000),  (80000, 97500),  (80000, 99000)],
        "Infosys Limited":                                          [(120000, 138000),(120000, 143000),(120000, 147000)],
        "Tata Consultancy Services Limited":                        [(150000, 172000),(150000, 179000),(150000, 184000)],
        "HDFC Bank Limited":                                        [(100000, 108000),(100000, 115500),(100000, 119000)],
        "Parag Parikh Flexi Cap Fund - Direct Plan - Growth":       [(120000, 140000),(130000, 149000),(140000, 159000)],
        "Mirae Asset ELSS Tax Saver Fund - Direct Plan - Growth":   [(100000, 116000),(105000, 124000),(110000, 131000)],
        "Axis Flexi Cap Fund - Direct Plan - Growth":               [(80000,  92000), (80000,  88000), (80000,  85000)],
    }

    all_hold_snapshots = []
    for name, monthly in holding_snapshot_data.items():
        hid = hold_id.get(name)
        if hid is None:
            continue
        for month, (invested, current) in zip(MONTHS, monthly):
            all_hold_snapshots.append((hid, month, invested, current))

    cur.executemany(
        """INSERT OR IGNORE INTO holding_snapshots
           (holding_id, month, invested_amount, current_amount)
           VALUES (?,?,?,?)""",
        all_hold_snapshots,
    )

    # ------------------------------------------------------------------
    # 5. Credit card snapshots — 3 months
    # ------------------------------------------------------------------
    # (account_id, month, outstanding_balance, credit_limit, min_due)
    cc_data = {
        "HDFC UPI CC":    [(8500,  100000, 425),  (12300, 100000, 615),  (6800,  100000, 340)],
        "HDFC Swiggy CC": [(4200,   50000, 210),  (6700,  50000,  335),  (3100,  50000,  155)],
        "ICICI CC":       [(15000, 200000, 750),  (22500, 200000, 1125), (9800,  200000, 490)],
    }

    all_cc_snapshots = []
    for acc_name, monthly in cc_data.items():
        for month, (outstanding, limit, min_due) in zip(MONTHS, monthly):
            all_cc_snapshots.append((acc_id[acc_name], month, outstanding, limit, min_due))

    cur.executemany(
        """INSERT OR IGNORE INTO credit_card_snapshots
           (account_id, month, outstanding_balance, credit_limit, min_due)
           VALUES (?,?,?,?,?)""",
        all_cc_snapshots,
    )

    # ------------------------------------------------------------------
    # 6. Monthly summary (denormalized roll-up)
    # ------------------------------------------------------------------
    summaries = []
    for i, month in enumerate(MONTHS):
        hdfc_bank   = bank_data["HDFC Savings"][i][1]
        sbi_bank    = bank_data["SBI Savings"][i][1]
        zerodha     = brokerage_data["Zerodha Stocks"][i][1]
        black_mf    = brokerage_data["Black MF"][i][1]
        hdfc_loan   = loan_data["HDFC Home Loan"][i][1]
        sbi_loan    = loan_data["SBI Home Loan"][i][1]
        cc_total    = sum(cc_data[cc][i][0] for cc in cc_data)

        total_assets      = hdfc_bank + sbi_bank + zerodha + black_mf
        total_liabilities = hdfc_loan + sbi_loan + cc_total
        net_worth         = total_assets - total_liabilities
        equity_amount     = zerodha + black_mf
        debt_amount       = 0.0
        commodity_amount  = 0.0
        hybrid_amount     = 0.0
        cash_amount       = hdfc_bank + sbi_bank

        summaries.append((
            month, total_assets, total_liabilities, net_worth,
            equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount,
        ))

    cur.executemany(
        """INSERT OR IGNORE INTO monthly_summary
           (month, total_assets, total_liabilities, net_worth,
            equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        summaries,
    )

    conn.commit()
    print(f"Seeded {len(accounts)} accounts, {len(holdings)} holdings, "
          f"{len(all_acc_snapshots)} account snapshots, "
          f"{len(all_hold_snapshots)} holding snapshots, "
          f"{len(all_cc_snapshots)} credit card snapshots, "
          f"{len(summaries)} monthly summaries.")


if __name__ == "__main__":
    db_path = os.path.abspath(DB_PATH)
    print(f"Connecting to: {db_path}")
    with sqlite3.connect(db_path) as conn:
        seed(conn)
