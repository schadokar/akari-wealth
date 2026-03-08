#!/usr/bin/env python3
"""Seed script: inserts dummy accounts, holdings, and monthly snapshots into perfi.db."""

import sqlite3
import os
import bcrypt

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "perfi-h.db")
MONTHS = ["2026-01", "2026-02", "2026-03"]


def seed(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON")

    # ------------------------------------------------------------------
    # 0. User
    # ------------------------------------------------------------------
    password_hash = bcrypt.hashpw(b"akira@123", bcrypt.gensalt()).decode()
    cur.execute(
        "INSERT OR IGNORE INTO users (username, password_hash) VALUES (?, ?)",
        ("akira", password_hash),
    )
    cur.execute("SELECT id FROM users WHERE username = ?", ("akira",))
    user_id = cur.fetchone()[0]

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
           (user_id, name, category, sub_category, asset_class, institution,
            interest_rate, emi_amount, maturity_date, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        [(user_id, *a) for a in accounts],
    )

    # Fetch IDs by name
    cur.execute(f"SELECT id, name FROM accounts WHERE user_id = ? AND name IN ({','.join('?'*len(accounts))})",
                [user_id] + [a[0] for a in accounts])
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
            user_id, month, total_assets, total_liabilities, net_worth,
            equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount,
        ))

    cur.executemany(
        """INSERT OR IGNORE INTO monthly_summary
           (user_id, month, total_assets, total_liabilities, net_worth,
            equity_amount, debt_amount, commodity_amount, hybrid_amount, cash_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        summaries,
    )

    # ------------------------------------------------------------------
    # 7. Employments
    # ------------------------------------------------------------------
    employments = [
        # (user_id, employee_name, uan, employer_name, employer_location, pf_account, start_date, end_date, employment_type)
        (user_id, "Akira", "101234567890", "TechCorp India Pvt Ltd",    "Bengaluru, Karnataka", "KA/BAN/1234567/000/0000001", "2023-01-10", "2024-12-31", "FTE"),
        (user_id, "Akira", "101234567890", "InnoSoft Solutions Ltd",    "Hyderabad, Telangana", "TS/HYD/9876543/000/0000001", "2025-01-15", None,         "FTE"),
    ]
    cur.executemany(
        """INSERT OR IGNORE INTO employments
           (user_id, employee_name, uan, employer_name, employer_location, pf_account, start_date, end_date, employment_type)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        employments,
    )
    cur.execute("SELECT id, employer_name FROM employments WHERE user_id = ?", (user_id,))
    emp_id = {row[1]: row[0] for row in cur.fetchall()}

    # ------------------------------------------------------------------
    # 8. Payslips  (past employer: 2 months; current employer: 3 months)
    # ------------------------------------------------------------------
    # Past employer — TechCorp India Pvt Ltd — CTC ~₹14 LPA
    # Basic: 35,000 | HRA: 14,000 | Special: 9,583 | EPF: 4,200 | PT: 200 | TDS: 3,500
    past_id = emp_id["TechCorp India Pvt Ltd"]
    past_payslips = [
        # (employment_id, pay_month, basic, hra, conv, med, lta, special, flex, meal, mobile, internet, diff, stat_bonus, perf, adv_bonus, other_earn, epf, vpf, nps, pt, tds, lwf, esi_emp, meal_ded, loan_rec, other_ded, notes)
        (past_id, "2024-11", 35000, 14000, 1600, 1250, 0, 9583, 0, 0, 500, 0, 0, 0, 0, 0, 0, 4200, 0, 0, 200, 3500, 20, 0, 0, 0, 0, None),
        (past_id, "2024-12", 35000, 14000, 1600, 1250, 0, 9583, 0, 0, 500, 0, 0, 0, 0, 0, 0, 4200, 0, 0, 200, 3500, 20, 0, 0, 0, 0, "Year-end month"),
    ]

    # Current employer — InnoSoft Solutions Ltd — CTC ~₹20 LPA
    # Basic: 50,000 | HRA: 20,000 | Conv: 1,600 | Med: 1,250 | Special: 10,983
    # EPF: 1,800 (capped at ₹15k ceiling) | PT: 200 | TDS: 9,800 | Internet: 500 | Mobile: 750
    curr_id = emp_id["InnoSoft Solutions Ltd"]
    curr_payslips = [
        (curr_id, "2026-01", 50000, 20000, 1600, 1250, 0, 10983, 0, 0, 750, 500, 0, 0, 0, 0, 0, 1800, 0, 0, 200, 9800, 20, 0, 0, 0, 0, None),
        (curr_id, "2026-02", 50000, 20000, 1600, 1250, 0, 10983, 0, 0, 750, 500, 0, 0, 5000, 0, 0, 1800, 0, 0, 200, 9800, 20, 0, 0, 0, 0, "Q3 performance pay included"),
        (curr_id, "2026-03", 50000, 20000, 1600, 1250, 3500, 10983, 0, 0, 750, 500, 0, 0, 0, 0, 0, 1800, 0, 0, 200, 9800, 20, 0, 0, 0, 0, "LTA March travel reimbursement"),
    ]

    all_payslips = past_payslips + curr_payslips
    cur.executemany(
        """INSERT OR IGNORE INTO payslips
           (employment_id, pay_month,
            basic_salary, hra, conveyance_allowance, medical_allowance, lta,
            special_allowance, flexible_pay, meal_allowance, mobile_allowance,
            internet_allowance, differential_allowance, statutory_bonus,
            performance_pay, advance_bonus, other_allowance,
            epf, vpf, nps, professional_tax, tds, lwf, esi_employee,
            meal_coupon_deduction, loan_recovery, other_deduction, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        all_payslips,
    )

    # ------------------------------------------------------------------
    # 9. Goals + Mappings
    # ------------------------------------------------------------------
    goals = [
        # (name, target_amount, status, notes)
        ("Emergency Fund",        600000,   "active",   "6 months of expenses in liquid savings"),
        ("Home Loan Prepayment",  2000000,  "active",   "Reduce principal on HDFC Home Loan"),
        ("Retirement Corpus",     50000000, "active",   "Long-term equity + MF wealth building"),
        ("Vacation – Europe",     350000,   "active",   "Europe trip planned for late 2027"),
    ]

    cur.executemany(
        "INSERT OR IGNORE INTO goals (user_id, name, target_amount, status, notes) VALUES (?,?,?,?,?)",
        [(user_id, *g) for g in goals],
    )
    cur.execute("SELECT id, name FROM goals WHERE name IN ({})".format(",".join("?" * len(goals))),
                [g[0] for g in goals])
    goal_id = {row[1]: row[0] for row in cur.fetchall()}

    # Mappings: weights per goal must sum to 1.0
    # asset_table: 'account' or 'holding'
    goal_mappings = [
        # Emergency Fund → 70% HDFC Savings + 30% SBI Savings
        (goal_id["Emergency Fund"], "account", "bank", acc_id["HDFC Savings"], 0.70),
        (goal_id["Emergency Fund"], "account", "bank", acc_id["SBI Savings"],  0.30),

        # Home Loan Prepayment → 60% Zerodha equity + 40% Black MF
        (goal_id["Home Loan Prepayment"], "account", "brokerage", acc_id["Zerodha Stocks"], 0.60),
        (goal_id["Home Loan Prepayment"], "account", "brokerage", acc_id["Black MF"],       0.40),

        # Retirement → 40% Zerodha Stocks + 35% Parag Parikh MF + 25% Mirae ELSS
        (goal_id["Retirement Corpus"], "account", "brokerage",  acc_id["Zerodha Stocks"],                                       0.40),
        (goal_id["Retirement Corpus"], "holding", "mutual_fund", hold_id["Parag Parikh Flexi Cap Fund - Direct Plan - Growth"],  0.35),
        (goal_id["Retirement Corpus"], "holding", "mutual_fund", hold_id["Mirae Asset ELSS Tax Saver Fund - Direct Plan - Growth"], 0.25),

        # Vacation → 50% HDFC Savings + 50% SBI Savings
        (goal_id["Vacation – Europe"], "account", "bank", acc_id["HDFC Savings"], 0.50),
        (goal_id["Vacation – Europe"], "account", "bank", acc_id["SBI Savings"],  0.50),
    ]

    cur.executemany(
        """INSERT OR IGNORE INTO goal_mappings
           (goal_id, asset_table, asset_type, asset_id, allocation_weight)
           VALUES (?,?,?,?,?)""",
        goal_mappings,
    )

    conn.commit()
    print(f"Seeded user 'akira' (id={user_id}), {len(accounts)} accounts, {len(holdings)} holdings, "
          f"{len(all_acc_snapshots)} account snapshots, "
          f"{len(all_hold_snapshots)} holding snapshots, "
          f"{len(all_cc_snapshots)} credit card snapshots, "
          f"{len(summaries)} monthly summaries, "
          f"{len(employments)} employments, {len(all_payslips)} payslips, "
          f"{len(goals)} goals, {len(goal_mappings)} goal mappings.")


if __name__ == "__main__":
    db_path = os.path.abspath(DB_PATH)
    print(f"Connecting to: {db_path}")
    with sqlite3.connect(db_path) as conn:
        seed(conn)
