CREATE TABLE IF NOT EXISTS employments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users (id),
    employee_name TEXT NOT NULL,
    uan TEXT, -- Universal Account Number, stays same across employers
    employer_name TEXT NOT NULL,
    employer_location TEXT,
    pf_account TEXT, -- changes per employer
    start_date TEXT NOT NULL,
    end_date TEXT, -- NULL = current employer
    employment_type TEXT NOT NULL DEFAULT 'FTE'
);

CREATE TABLE IF NOT EXISTS payslips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- MANDATORY: foreign key to the employment record
    employment_id INTEGER NOT NULL REFERENCES employments (id),
    -- MANDATORY: billing period in 'YYYY-MM' format e.g. '2025-03'
    pay_month TEXT NOT NULL,
    -- ─────────────────────────────────────────────────────────
    -- EARNINGS
    -- ─────────────────────────────────────────────────────────
    -- MANDATORY: every salary structure must have a basic component
    basic_salary REAL NOT NULL DEFAULT 0,
    -- OPTIONAL: not all companies split out HRA; some roll it into special allowance
    hra REAL NULL DEFAULT 0,
    -- OPTIONAL: company-specific; not present in all structures
    conveyance_allowance REAL NULL DEFAULT 0,
    -- OPTIONAL: company-specific; not present in all structures
    medical_allowance REAL NULL DEFAULT 0,
    -- OPTIONAL: annual benefit, often shows as 0 in non-travel months
    lta REAL NULL DEFAULT 0,
    -- OPTIONAL: balancing/catch-all; present in most but not all structures
    special_allowance REAL NULL DEFAULT 0,
    -- OPTIONAL: only companies that offer a cafeteria/FBP plan
    flexible_pay REAL NULL DEFAULT 0,
    -- OPTIONAL: only if company provides Sodexo/meal vouchers
    meal_allowance REAL NULL DEFAULT 0,
    -- OPTIONAL: company-specific reimbursement policy
    mobile_allowance REAL NULL DEFAULT 0,
    -- OPTIONAL: company-specific reimbursement policy; became common post-WFH
    internet_allowance REAL NULL DEFAULT 0,
    -- OPTIONAL: grade/market differential; uncommon, specific to certain structures
    differential_allowance REAL NULL DEFAULT 0,
    -- OPTIONAL: statutory only for employees with gross salary ≤ ₹21,000/month
    statutory_bonus REAL NULL DEFAULT 0,
    -- OPTIONAL: KPI-linked; not all roles or companies have variable pay
    performance_pay REAL NULL DEFAULT 0,
    -- OPTIONAL: company-specific practice; not governed by any act
    advance_bonus REAL NULL DEFAULT 0,
    -- OPTIONAL: catch-all; should only be used when no specific column fits
    other_allowance REAL NULL DEFAULT 0,
    -- ─────────────────────────────────────────────────────────
    -- DEDUCTIONS
    -- ─────────────────────────────────────────────────────────
    -- MANDATORY: statutory for all eligible employees (Basic ≤ ₹15,000 threshold);
    --            most employers apply it universally regardless
    epf REAL NOT NULL DEFAULT 0,
    -- OPTIONAL: purely voluntary; employee opt-in only
    vpf REAL NULL DEFAULT 0,
    -- OPTIONAL: only if employee has opted into NPS scheme
    nps REAL NULL DEFAULT 0,
    -- MANDATORY: statutory deduction; 0 is valid for states that don't levy it
    --            (e.g. Delhi has no PT), but the field must always be present
    professional_tax REAL NOT NULL DEFAULT 0,
    -- MANDATORY: applicable to all employees; 0 is valid if income is below tax slab
    tds REAL NOT NULL DEFAULT 0,
    -- OPTIONAL: state-specific; not applicable in all states (e.g. absent in Delhi)
    lwf REAL NULL DEFAULT 0,
    -- OPTIONAL: only applicable if gross salary ≤ ₹21,000/month
    esi_employee REAL NULL DEFAULT 0,
    -- OPTIONAL: only present when meal allowance is paid as vouchers/in-kind;
    --           offsets the meal_allowance earning (net take-home impact = zero)
    meal_coupon_deduction REAL NULL DEFAULT 0,
    -- OPTIONAL: only when employee has an active salary advance or company loan
    loan_recovery REAL NULL DEFAULT 0,
    -- OPTIONAL: catch-all; use only when no specific column fits
    other_deduction REAL NULL DEFAULT 0,
    -- OPTIONAL: free-text remarks e.g. 'LOP 2 days', 'arrear from Oct included'
    notes TEXT NULL,
    -- BUG FIX: was referencing 'period' which doesn't exist; column is 'pay_month'
    UNIQUE (employment_id, pay_month)
);

CREATE INDEX idx_employments_user_id ON employments (user_id);

CREATE INDEX idx_payslips_employment_id ON payslips (employment_id);
