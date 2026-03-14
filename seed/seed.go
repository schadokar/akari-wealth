package seed

import (
	"context"
	"log"

	"github.com/perfi/auth"
	"github.com/perfi/model"
	"github.com/perfi/usecase"
)

func ptr[T any](v T) *T { return &v }

var months = []string{
	"2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09",
	"2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
}

// Run seeds a demo user with realistic dummy data if DEMO_USER and DEMO_PASS
// env vars are set and the user does not already exist.
func Run(ctx context.Context, uc *usecase.UseCase, store usecase.Store) {
	demoUser := "dummy"
	demoPass := "dummy@123"

	existing, _ := store.GetUserByUsername(ctx, demoUser)
	if existing != nil {
		// Check if accounts already seeded
		ctx = auth.WithUserID(ctx, existing.ID)
		accts, _ := store.GetAccounts(ctx, "", "", nil)
		if len(accts) > 0 {
			log.Printf("seed: demo user %q already has data, skipping", demoUser)
			return
		}
		log.Printf("seed: demo user %q exists but has no data, re-seeding...", demoUser)
	} else {
		if _, err := uc.Register(ctx, demoUser, demoPass); err != nil {
			log.Printf("seed: register demo user: %v", err)
			return
		}
	}

	u, _ := store.GetUserByUsername(ctx, demoUser)
	if u == nil {
		log.Printf("seed: failed to find created demo user")
		return
	}

	ctx = auth.WithUserID(ctx, u.ID)
	log.Printf("seed: created demo user %q (id=%d), seeding data...", demoUser, u.ID)

	// --- Accounts ---
	emi := 35000.0

	hdfcID, err := store.InsertAccount(ctx, model.Account{
		Name: "HDFC Savings", Category: "bank", AssetClass: "cash",
		Institution: ptr("HDFC Bank"), IsActive: true,
	})
	if err != nil {
		log.Printf("seed: insert account error: %v", err)
		return
	}

	sbiID, err := store.InsertAccount(ctx, model.Account{
		Name: "SBI Savings", Category: "bank", AssetClass: "cash",
		Institution: ptr("SBI Bank"), IsActive: true,
	})
	if err != nil {
		log.Printf("seed: insert account error: %v", err)
		return
	}

	zerodhaID, _ := store.InsertAccount(ctx, model.Account{
		Name: "Zerodha", Category: "brokerage", AssetClass: "equity",
		Institution: ptr("Zerodha Broking Ltd"), IsActive: true,
	})
	zerdhaCoinID, _ := store.InsertAccount(ctx, model.Account{
		Name: "Zerodha Coin", Category: "brokerage", AssetClass: "equity",
		Institution: ptr("Zerodha Broking Ltd"), IsActive: true,
	})
	epfID, _ := store.InsertAccount(ctx, model.Account{
		Name: "EPFO", Category: "epf", AssetClass: "debt", IsActive: true,
	})
	npsID, _ := store.InsertAccount(ctx, model.Account{
		Name: "NPS Tier 1", Category: "nps", AssetClass: "hybrid",
		Institution: ptr("HDFC Pension Fund"), IsActive: true,
	})
	ppfID, _ := store.InsertAccount(ctx, model.Account{
		Name: "PPF", Category: "ppf", AssetClass: "debt",
		Institution: ptr("SBI"), IsActive: true,
	})
	homeLoanID, _ := store.InsertAccount(ctx, model.Account{
		Name: "SBI Home Loan", Category: "loan", AssetClass: "liability",
		Institution: ptr("State Bank of India"), InterestRate: ptr(8.5),
		EMIAmount: &emi, StartDate: ptr("2022-01"), TenureMonths: ptr(240), IsActive: true,
	})
	hdfcCCID, _ := store.InsertAccount(ctx, model.Account{
		Name: "HDFC Credit Card", Category: "credit_card", AssetClass: "liability",
		Institution: ptr("HDFC Bank"), IsActive: true,
	})
	fdID, _ := store.InsertAccount(ctx, model.Account{
		Name: "HDFC FD", Category: "fd", AssetClass: "debt",
		Institution: ptr("HDFC Bank"), IsActive: true,
	})
	carEMI := 14500.0
	carLoanID, _ := store.InsertAccount(ctx, model.Account{
		Name: "Car Loan", Category: "loan", AssetClass: "liability",
		Institution: ptr("HDFC Bank"), InterestRate: ptr(9.0),
		EMIAmount: &carEMI, StartDate: ptr("2023-10"), TenureMonths: ptr(60), IsActive: true,
	})
	liquidFundID, _ := store.InsertAccount(ctx, model.Account{
		Name: "Liquid Fund", Category: "brokerage", AssetClass: "debt",
		Institution: ptr("Zerodha Coin"), IsActive: true,
	})

	// --- Holdings under Zerodha Coin ---
	midcapID, _ := store.InsertHolding(ctx, model.Holding{
		AccountID: zerdhaCoinID, Name: "HDFC Midcap Opp Dir Growth",
		InstrumentType: "mutual_fund", AssetClass: ptr("hybrid"), IsActive: true,
	})
	niftyID, _ := store.InsertHolding(ctx, model.Holding{
		AccountID: zerodhaID, Name: "Nippon Nifty 50 BeES ETF",
		InstrumentType: "etf", AssetClass: ptr("equity"), IsActive: true,
	})
	relianceID, _ := store.InsertHolding(ctx, model.Holding{
		AccountID: zerodhaID, Name: "Reliance Industries Ltd",
		InstrumentType: "stock", AssetClass: ptr("equity"), IsActive: true,
	})

	// --- Monthly snapshot data (Apr 2025 – Mar 2026) ---
	// Person earns ₹1.5L/month gross; 40L home loan started Jan 2022 @ 8.5% / 20yr (EMI ₹35k)
	// Loan balance ≈ ₹37L by Apr 2025 (39 months in), decreasing ~₹35k/month in seed
	hdfcSavings := []float64{50000, 120000, 10000, 180000, 90000, 220000, 110000, 160000, 270000, 190000, 230000, 310000}
	fdValues := []float64{200000, 201000, 202000, 203000, 204000, 205000, 206000, 207000, 208000, 209000, 210000, 211000}
	sbiSavings := []float64{80000, 65000, 90000, 75000, 85000, 110000, 70000, 95000, 120000, 90000, 105000, 140000}
	epfValues := []float64{475000, 490000, 505000, 520000, 535000, 550000, 565000, 580000, 595000, 610000, 625000, 640000}
	npsValues := []float64{165000, 181000, 197000, 214000, 231000, 248000, 266000, 284000, 303000, 322000, 342000, 362000}
	ppfValues := []float64{160000, 173000, 186000, 199000, 212000, 225000, 238000, 251000, 264000, 277000, 290000, 303000}
	carLoanBal := []float64{520000, 508000, 496000, 484000, 472000, 460000, 448000, 436000, 424000, 412000, 400000, 388000}
	loanBal := []float64{3700000, 3665000, 3630000, 3595000, 3560000, 3525000, 3490000, 3455000, 3420000, 3385000, 3350000, 3315000}

	midcapInv := 400000.0
	midcapCur := []float64{450000, 465000, 478000, 492000, 510000, 525000, 540000, 560000, 575000, 588000, 595000, 610000}
	niftyInv := 300000.0
	niftyCur := []float64{315000, 322000, 318000, 328000, 337000, 330000, 342000, 348000, 339000, 358000, 367000, 376000}
	relInv := 150000.0
	relCur := []float64{158000, 162000, 155000, 166000, 174000, 170000, 179000, 183000, 177000, 191000, 194000, 201000}

	liquidFundValues := []float64{80000, 95000, 108000, 122000, 134000, 145000, 155000, 163000, 170000, 178000, 185000, 192000}

	ccOutstanding := []float64{22000, 15000, 35000, 10000, 45000, 28000, 18000, 50000, 24000, 38000, 12000, 32000}
	creditLimit := 300000.0

	zerodhaInv := niftyInv + relInv

	for i, month := range months {
		zerodhaTotal := niftyCur[i] + relCur[i]

		if err := uc.BulkUpsertAccountSnapshots(ctx, []model.AccountSnapshotRequest{
			{AccountID: hdfcID, Month: month, CurrentAmount: hdfcSavings[i], InvestedAmount: ptr(hdfcSavings[i])},
			{AccountID: sbiID, Month: month, CurrentAmount: sbiSavings[i], InvestedAmount: ptr(sbiSavings[i])},
			{AccountID: zerodhaID, Month: month, CurrentAmount: zerodhaTotal, InvestedAmount: ptr(zerodhaInv)},
			{AccountID: zerdhaCoinID, Month: month, CurrentAmount: midcapCur[i], InvestedAmount: ptr(midcapInv)},
			{AccountID: epfID, Month: month, CurrentAmount: epfValues[i], InvestedAmount: ptr(epfValues[i])},
			{AccountID: npsID, Month: month, CurrentAmount: npsValues[i], InvestedAmount: ptr(npsValues[i])},
			{AccountID: ppfID, Month: month, CurrentAmount: ppfValues[i], InvestedAmount: ptr(ppfValues[i])},
			{AccountID: homeLoanID, Month: month, CurrentAmount: loanBal[i], InvestedAmount: ptr(loanBal[i])},
			{AccountID: carLoanID, Month: month, CurrentAmount: carLoanBal[i], InvestedAmount: ptr(carLoanBal[i])},
			{AccountID: fdID, Month: month, CurrentAmount: fdValues[i], InvestedAmount: ptr(200000.0)},
			{AccountID: liquidFundID, Month: month, CurrentAmount: liquidFundValues[i], InvestedAmount: ptr(liquidFundValues[i])},
		}); err != nil {
			log.Printf("seed: account snapshots %s: %v", month, err)
		}

		if err := uc.BulkUpsertHoldingSnapshots(ctx, []model.HoldingSnapshotRequest{
			{HoldingID: midcapID, Month: month, CurrentAmount: midcapCur[i], InvestedAmount: ptr(midcapInv)},
			{HoldingID: niftyID, Month: month, CurrentAmount: niftyCur[i], InvestedAmount: ptr(niftyInv)},
			{HoldingID: relianceID, Month: month, CurrentAmount: relCur[i], InvestedAmount: ptr(relInv)},
		}); err != nil {
			log.Printf("seed: holding snapshots %s: %v", month, err)
		}

		if err := uc.BulkUpsertCreditCardSnapshots(ctx, []model.CreditCardSnapshotRequest{
			{AccountID: hdfcCCID, Month: month, OutstandingBalance: ccOutstanding[i], CreditLimit: &creditLimit},
		}); err != nil {
			log.Printf("seed: cc snapshots %s: %v", month, err)
		}
	}

	log.Printf("seed: demo data seeded (%d months)", len(months))

	// --- Goals ---
	goals := []model.CreateGoalRequest{
		{
			Name: "Emergency Fund", TargetAmount: 600000, Priority: 1,
			TargetDate: ptr("2026-12"),
			Notes:      ptr("6 months of expenses. Target ₹6L across FD + Liquid Fund."),
			Mappings: []model.GoalMappingInput{
				{AssetTable: model.AssetTableAccount, AssetType: "fd", AssetID: fdID, AllocationWeight: 0.5},
				{AssetTable: model.AssetTableAccount, AssetType: "brokerage", AssetID: liquidFundID, AllocationWeight: 0.5},
			},
		},
		{
			Name: "Retirement Corpus", TargetAmount: 20000000, Priority: 2,
			TargetDate: ptr("2045-12"),
			Notes:      ptr("Target ₹2Cr across EPF, NPS, PPF by age ~55."),
			Mappings: []model.GoalMappingInput{
				{AssetTable: model.AssetTableAccount, AssetType: "epf", AssetID: epfID, AllocationWeight: 0.4},
				{AssetTable: model.AssetTableAccount, AssetType: "nps", AssetID: npsID, AllocationWeight: 0.3},
				{AssetTable: model.AssetTableAccount, AssetType: "ppf", AssetID: ppfID, AllocationWeight: 0.3},
			},
		},
		{
			Name: "Equity Portfolio Growth", TargetAmount: 2000000, Priority: 3,
			TargetDate: ptr("2028-12"),
			Notes:      ptr("Grow equity portfolio to ₹20L via stocks, ETFs, and mutual funds."),
			Mappings: []model.GoalMappingInput{
				{AssetTable: model.AssetTableAccount, AssetType: "brokerage", AssetID: zerodhaID, AllocationWeight: 0.5},
				{AssetTable: model.AssetTableAccount, AssetType: "brokerage", AssetID: zerdhaCoinID, AllocationWeight: 0.5},
			},
		},
		{
			Name: "Car Loan Closure", TargetAmount: 388000, Priority: 4,
			TargetDate: ptr("2027-10"),
			Notes:      ptr("Pay off HDFC Car Loan early. ₹3.88L outstanding @ 9%."),
		},
		{
			Name: "Home Loan Prepayment", TargetAmount: 3315000, Priority: 5,
			TargetDate: ptr("2035-01"),
			Notes:      ptr("Prepay SBI Home Loan by 2035 vs original 2042 tenure. Saves ~7yr interest."),
		},
	}
	for _, g := range goals {
		if _, err := uc.CreateGoal(ctx, g); err != nil {
			log.Printf("seed: create goal %q: %v", g.Name, err)
		}
	}
	log.Printf("seed: %d goals seeded", len(goals))

	// --- Employment & Payslips (₹18L CTC) ---
	// Monthly gross: ₹1,50,000 | Net: ₹1,30,575
	empID, err := uc.CreateEmployment(ctx, model.CreateEmploymentRequest{
		EmployeeName:     "Jarvis Allen",
		EmployerName:     "TechCorp India Pvt Ltd",
		EmployerLocation: ptr("Bengaluru, KA"),
		StartDate:        "2024-04-01",
		EmploymentType:   "FTE",
		UAN:              ptr("100987654321"),
		PFAccount:        ptr("KN/BNG/0123456/000/0001234"),
	})
	if err != nil {
		log.Printf("seed: create employment: %v", err)
		return
	}

	for _, month := range months {
		_, err := uc.CreatePayslip(ctx, empID, model.CreatePayslipRequest{
			PayMonth:            month,
			BasicSalary:         60000,
			HRA:                 ptr(30000.0),
			SpecialAllowance:    ptr(35000.0),
			LTA:                 ptr(5000.0),
			ConveyanceAllowance: ptr(1600.0),
			MealAllowance:       ptr(2200.0),
			MobileAllowance:     ptr(500.0),
			InternetAllowance:   ptr(500.0),
			FlexiblePay:         ptr(15200.0),
			EPF:                 7200,
			ProfessionalTax:     200,
			TDS:                 12000,
			LWF:                 ptr(25.0),
		})
		if err != nil {
			log.Printf("seed: create payslip %s: %v", month, err)
		}
	}
	log.Printf("seed: employment + %d payslips seeded", len(months))

	// --- Expenses ---
	foodAmounts := []float64{8500, 9200, 7800, 10500, 9000, 11000, 8200, 9800, 12000, 8900, 10200, 11500}
	entertainAmounts := []float64{1500, 2200, 800, 3000, 1800, 2500, 1200, 2800, 1600, 2100, 900, 2400}

	for i, month := range months {
		// Fixed recurring: Rent
		if _, err := uc.CreateExpense(ctx, model.Expense{
			Month: month, Category: "rent", ExpenseType: "fixed",
			Amount: 18000, Description: ptr("Monthly rent"), PaymentMethod: "upi", IsRecurring: true,
		}); err != nil {
			log.Printf("seed: expense rent %s: %v", month, err)
		}
		// Fixed recurring: Fuel
		if _, err := uc.CreateExpense(ctx, model.Expense{
			Month: month, Category: "fuel", ExpenseType: "fixed",
			Amount: 2000, Description: ptr("Fuel"), PaymentMethod: "upi", IsRecurring: true,
		}); err != nil {
			log.Printf("seed: expense fuel %s: %v", month, err)
		}
		// Fixed recurring: Mobile
		if _, err := uc.CreateExpense(ctx, model.Expense{
			Month: month, Category: "subscription", ExpenseType: "fixed",
			Amount: 500, Description: ptr("Mobile recharge"), PaymentMethod: "upi", IsRecurring: true,
		}); err != nil {
			log.Printf("seed: expense mobile %s: %v", month, err)
		}
		// OTT: yearly, billed in April
		if month == "2025-04" {
			if _, err := uc.CreateExpense(ctx, model.Expense{
				Month: month, Category: "subscription", ExpenseType: "fixed",
				Amount: 5000, Description: ptr("OTT annual subscription"), PaymentMethod: "credit_card", IsRecurring: false,
			}); err != nil {
				log.Printf("seed: expense ott %s: %v", month, err)
			}
		}
		// Variable: Food
		if _, err := uc.CreateExpense(ctx, model.Expense{
			Month: month, Category: "food", ExpenseType: "variable",
			Amount: foodAmounts[i], Description: ptr("Food & dining"), PaymentMethod: "upi", IsRecurring: false,
		}); err != nil {
			log.Printf("seed: expense food %s: %v", month, err)
		}
		// Variable: Entertainment
		if _, err := uc.CreateExpense(ctx, model.Expense{
			Month: month, Category: "entertainment", ExpenseType: "variable",
			Amount: entertainAmounts[i], Description: ptr("Entertainment"), PaymentMethod: "credit_card", IsRecurring: false,
		}); err != nil {
			log.Printf("seed: expense entertainment %s: %v", month, err)
		}
	}
	log.Printf("seed: expenses seeded (%d months)", len(months))
}
