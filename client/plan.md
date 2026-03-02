Here's your step-by-step instruction prompt:

---

**Akari – Step-by-Step Build Instructions**

I am building the frontend for **Akari** (明かり), a personal finance tracker. Tagline: *"Illuminate your finances, multiply your wealth."*

**Tech Stack:**
- React + TypeScript + Vite
- shadcn/ui + Tailwind CSS
- React Router v6
- TanStack Query + Axios
- Zustand
- react-hook-form + zod

**Design:** Clean, minimal, dark mode default, INR (₹) currency, Indian numbering system.

---

## Step 1 — Landing Page

Build a landing page at route `/`.

**Sections:**
1. **Navbar** — Logo (Akari + 明かり), nav links (Features, About, Login), CTA button "Get Started"
2. **Hero** — App name, tagline, short description, two buttons: "Get Started" and "View Demo"
3. **Features** — 3 or 4 cards: Track Investments, Manage Expenses, Smart Reports, Forecast
4. **Footer** — Logo, tagline, GitHub link, built by Shubham with link to schadokar.dev

**Rules:**
- Use shadcn `Button`, `Card`, `Badge` components
- No animations, keep it static and clean
- Dark mode compatible
- Mobile responsive

**Deliver:** Single `LandingPage.tsx` with all sections as sub-components inside the same file.

---

## Step 2 — Dashboard *(unlock after Step 1 is done)*

Build dashboard at route `/dashboard`.

**Layout:**
- Sidebar with shadcn `Sidebar` component — links: Dashboard, Investments, Expenses, Earnings, Reports, Settings
- Top navbar — page title, user avatar, dark mode toggle

**Content:**
- KPI row — Total Portfolio, Total Earnings, Total Expenses, Net Worth — each as a `KPICard` showing value in ₹ and a trend badge
- Accounts section — card for each account (Savings, Mutual Funds, Stocks, Fixed Deposit) showing current value
- Total bar at the bottom of accounts — sum of all account values
- Recent Transactions table — last 5 entries with columns: Date, Type, Category, Amount

**Rules:**
- All values hardcoded as mock data for now (realistic Indian values — SIPs, FDs, salary)
- Use shadcn `Card`, `Table`, `Badge`, `Separator`
- Use shadcn charts `AreaChart` for a small portfolio trend at top
- Format all currency with `formatINR()` utility

**Deliver:** `DashboardPage.tsx` + `Sidebar.tsx` + `KPICard.tsx` + `formatINR.ts`

---

## Step 3 — Add Investment Form *(unlock after Step 2 is done)*

Build a slide-in form using shadcn `Sheet` triggered from the Investments page.

**Form Fields:**
- Investment Name (text)
- Type (select) — Mutual Fund, Stock, FD, PPF, Gold, Crypto, Other
- Amount Invested (number, ₹)
- Current Value (number, ₹)
- Start Date (date picker)
- Notes (textarea, optional)

**Rules:**
- Use `react-hook-form` + `zod` for validation
- Use shadcn `Form`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`
- On submit — `console.log` the data for now (no API yet)
- Show a shadcn `Toast` on successful submit: *"Investment added successfully"*
- Reset form after submit
- Validate: Name required, Amount > 0, Current Value > 0, Start Date required

**Deliver:** `AddInvestmentSheet.tsx` + `investmentSchema.ts` + wired into `InvestmentsPage.tsx` with an "Add Investment" button

---

**General Rules across all steps:**
- Never use `any` in TypeScript
- Never modify files inside `components/ui/`
- Use Tailwind + shadcn color tokens only — no hardcoded colors
- Each step builds on top of the previous — don't break what's already built
- When I say *"next step"*, move to the next one

---

**Start with Step 1. Build only Step 1 until I say "next step".**