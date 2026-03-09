import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Shield,
  TrendingUp,
  CreditCard,
  IndianRupee,
  Database,
  Lock,
  ChevronRight,
  PieChart,
  Layers,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

function Navbar() {
  const { dark, toggle } = useTheme();
  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-xl font-bold tracking-tight">
          Akari <span className="text-muted-foreground">明かり</span>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How it works
          </a>
          <a
            href="#about"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </a>
          <a
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Login
          </a>
          <Button size="icon" variant="ghost" onClick={toggle} aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button size="sm">Get Started</Button>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={toggle} aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button size="sm">Get Started</Button>
        </div>
      </div>
    </nav>
  );
}

function MockDashboard() {
  return (
    <div className="relative w-full rounded-2xl border border-border bg-card p-4 shadow-2xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-red-400" />
        <div className="h-3 w-3 rounded-full bg-yellow-400" />
        <div className="h-3 w-3 rounded-full bg-green-400" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Net Worth</p>
          <p className="text-lg font-bold">₹42.6L</p>
          <p className="text-xs text-green-500">+8.3% this month</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">Investments</p>
          <p className="text-lg font-bold">₹38.1L</p>
          <p className="text-xs text-green-500">+12.1% YTD</p>
        </div>
      </div>
      <div className="rounded-lg bg-muted p-3 mb-2">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-muted-foreground">Asset Allocation</p>
          <PieChart className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
          <div className="bg-blue-500" style={{ width: "40%" }} />
          <div className="bg-green-500" style={{ width: "25%" }} />
          <div className="bg-purple-500" style={{ width: "20%" }} />
          <div className="bg-orange-400" style={{ width: "15%" }} />
        </div>
        <div className="flex gap-3 mt-2">
          <span className="text-xs flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />MF 40%</span>
          <span className="text-xs flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Stocks 25%</span>
          <span className="text-xs flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />EPF 20%</span>
          <span className="text-xs flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />NPS 15%</span>
        </div>
      </div>
      <div className="flex gap-2">
        {["SIP", "EPF", "NPS", "Stocks", "MF"].map((tag) => (
          <span key={tag} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{tag}</span>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-5 md:items-center">
        <div className="md:col-span-3">
          <Badge variant="secondary" className="mb-4">Privacy-first · Made for India</Badge>
          <h1 className="text-4xl font-bold tracking-tight leading-tight md:text-6xl">
            Take Control of Your{" "}
            <span className="text-primary">Financial Future</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed md:text-xl">
            Privacy-first personal finance tracking designed for Indian
            investors. Track mutual funds, stocks, EPF, NPS, and more — all in
            one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" className="gap-2">
              Get Started Free <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free &amp; open-source. Your data stays on your device.
          </p>
        </div>
        <div className="md:col-span-2">
          <MockDashboard />
        </div>
      </div>
    </section>
  );
}

function ValueProp() {
  return (
    <section className="border-t border-border py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
          Built for Indian Investors Who Value Privacy
        </h2>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Your financial data stays yours. No cloud syncing. No third-party
          access. Just powerful analytics for your mutual funds, SIPs, stocks,
          NPS, EPF, and cryptocurrency — all running locally on your device.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-500" /> No cloud sync
          </span>
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" /> No third-party access
          </span>
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-green-500" /> Local SQLite storage
          </span>
          <span className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-green-500" /> Built for ₹ markets
          </span>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    badge: "Portfolio",
    icon: <BarChart3 className="h-6 w-6" />,
    headline: "See Your Complete Financial Picture at a Glance",
    description:
      "Track all your investments across asset classes. Monitor your net worth, portfolio composition, and asset allocation in real-time. Understand exactly where your money is working for you.",
    visual: (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <p className="text-xs text-muted-foreground mb-3">Net Worth · March 2026</p>
        <p className="text-3xl font-bold mb-1">₹42,60,000</p>
        <p className="text-sm text-green-500 mb-4">↑ ₹3.2L this month</p>
        <div className="space-y-2">
          {[
            { label: "Mutual Funds", value: "₹17.0L", pct: 40, color: "bg-blue-500" },
            { label: "Stocks", value: "₹10.6L", pct: 25, color: "bg-green-500" },
            { label: "EPF / NPS", value: "₹14.9L", pct: 35, color: "bg-purple-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    badge: "Analytics",
    icon: <TrendingUp className="h-6 w-6" />,
    headline: "Deep Insights Into Your Investment Performance",
    description:
      "Go beyond basic tracking. Analyze gains and losses, identify concentration risks, visualize cashflow patterns, and understand your investment returns with powerful charts built specifically for Indian financial instruments.",
    visual: (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <p className="text-xs text-muted-foreground mb-3">Monthly Net Worth Trend</p>
        <div className="flex items-end gap-1.5 h-28 mb-2">
          {[55, 62, 59, 68, 72, 70, 78, 82, 79, 88, 92, 100].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary/80 transition-all"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Apr '25</span>
          <span>Mar '26</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted p-2">
            <p className="text-xs text-muted-foreground">XIRR</p>
            <p className="text-sm font-bold text-green-500">18.4%</p>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <p className="text-xs text-muted-foreground">Unrealised P&L</p>
            <p className="text-sm font-bold text-green-500">+₹6.2L</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    badge: "Debt",
    icon: <CreditCard className="h-6 w-6" />,
    headline: "Stay on Top of Your Liabilities",
    description:
      "Track credit cards, loans, and EMIs alongside your assets. Monitor payment schedules, analyze debt-to-income ratios, and see your complete financial health score in one unified dashboard.",
    visual: (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg space-y-3">
        <p className="text-xs text-muted-foreground">Liabilities Overview</p>
        {[
          { name: "Home Loan", emi: "₹28,500 / mo", remaining: "₹38.5L", progress: 35 },
          { name: "HDFC CC", emi: "Due: Mar 12", remaining: "₹12,400", progress: 60 },
          { name: "Car Loan", emi: "₹9,200 / mo", remaining: "₹4.1L", progress: 75 },
        ].map((item) => (
          <div key={item.name} className="rounded-lg bg-muted p-3">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.remaining}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{item.emi}</p>
            <div className="h-1.5 w-full rounded-full bg-background">
              <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${item.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    badge: "Privacy",
    icon: <Shield className="h-6 w-6" />,
    headline: "Your Data Never Leaves Your Device",
    description:
      "No cloud accounts. No data sharing. No privacy compromises. Akari runs entirely on your local machine with local database storage. Your financial privacy is non-negotiable.",
    visual: (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <Lock className="h-10 w-10 text-green-500" />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          </div>
          <div>
            <p className="font-semibold">Data stays on your machine</p>
            <p className="text-sm text-muted-foreground mt-1">SQLite · Local filesystem</p>
          </div>
          <div className="w-full space-y-2">
            {["No cloud sync", "No analytics tracking", "No third-party access", "Open source"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
                <span className="text-green-500">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    badge: "India",
    icon: <IndianRupee className="h-6 w-6" />,
    headline: "Designed Specifically for Indian Investors",
    description:
      "Native support for Indian financial instruments: mutual funds, SIPs, NPS, EPF/PF, Indian stocks (NSE/BSE), and cryptocurrency. Track everything in rupees with tax considerations built-in.",
    visual: (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        <p className="text-xs text-muted-foreground mb-3">Supported Instruments</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {["Mutual Funds", "SIP", "NPS T1/T2", "EPF/VPF", "PPF", "SSY", "NSE Stocks", "BSE Stocks", "ETF", "FD/RD", "Crypto"].map((tag) => (
            <span key={tag} className="text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1">{tag}</span>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center rounded-lg bg-muted p-2.5">
            <span className="text-sm">HDFC Midcap Opp Fund</span>
            <span className="text-sm font-medium text-green-500">+24.3%</span>
          </div>
          <div className="flex justify-between items-center rounded-lg bg-muted p-2.5">
            <span className="text-sm">NPS Tier 1 · Equity</span>
            <span className="text-sm font-medium text-green-500">+16.1%</span>
          </div>
          <div className="flex justify-between items-center rounded-lg bg-muted p-2.5">
            <span className="text-sm">EPF Balance</span>
            <span className="text-sm font-medium">₹8,42,300</span>
          </div>
        </div>
      </div>
    ),
  },
];

function FeatureShowcase() {
  return (
    <section id="features" className="border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Everything you need to manage your money
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Powerful tools to track, plan, and grow your wealth.
          </p>
        </div>
        <div className="space-y-24">
          {features.map((feature, index) => (
            <div
              key={feature.badge}
              className={`grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center ${
                index % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="p-2 rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </span>
                  <Badge variant="secondary">{feature.badge}</Badge>
                </div>
                <h3 className="text-xl font-bold tracking-tight md:text-2xl">
                  {feature.headline}
                </h3>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
              <div>{feature.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    number: "01",
    icon: <Layers className="h-6 w-6" />,
    title: "Set Up Your Accounts",
    description:
      "Add your bank accounts, investment accounts, and credit cards. Categorize them by type for better organization and tracking.",
  },
  {
    number: "02",
    icon: <IndianRupee className="h-6 w-6" />,
    title: "Add Your Holdings",
    description:
      "Input your mutual funds, stocks, SIPs, NPS, EPF, and other investments. Update snapshots monthly or as needed.",
  },
  {
    number: "03",
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Track & Analyze",
    description:
      "View comprehensive dashboards, analyze performance, monitor cashflow, and make informed investment decisions.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Get started in minutes
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Three simple steps to take control of your finances.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {step.icon}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-mono text-muted-foreground">{step.number}</span>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const techStack = [
  { label: "Go + Chi", desc: "Backend" },
  { label: "SQLite", desc: "Database" },
  { label: "React + shadcn/ui", desc: "Frontend" },
  { label: "Recharts", desc: "Analytics" },
  { label: "Tailwind CSS", desc: "Styling" },
];

function TechStack() {
  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-muted-foreground">
          Built with modern, reliable technology
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {techStack.map((tech) => (
            <div
              key={tech.label}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-center"
            >
              <p className="text-sm font-medium">{tech.label}</p>
              <p className="text-xs text-muted-foreground">{tech.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-t border-border py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="rounded-3xl bg-primary/5 border border-primary/10 p-12">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Start Tracking Your Finances Today
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Free, open-source, and built with your privacy in mind.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="gap-2">
              Get Started on GitHub <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="about" className="border-t border-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center">
        <div className="text-lg font-bold tracking-tight">
          Akari <span className="text-muted-foreground">明かり</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Illuminate your finances, multiply your wealth.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a
            href="https://github.com/schadokar"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <span>·</span>
          <span>
            Built by{" "}
            <a
              href="https://schadokar.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              Shubham
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <ValueProp />
      <FeatureShowcase />
      <HowItWorks />
      <TechStack />
      <FinalCTA />
      <Footer />
    </div>
  );
}
