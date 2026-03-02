import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    badge: "Investments",
    title: "Track Investments",
    description:
      "Monitor your mutual funds, stocks, FDs, and more — all in one place with real-time tracking.",
  },
  {
    badge: "Expenses",
    title: "Manage Expenses",
    description:
      "Categorize and track every rupee spent. Stay on top of your monthly budget effortlessly.",
  },
  {
    badge: "Reports",
    title: "Smart Reports",
    description:
      "Get clear, visual reports on your income, expenses, and net worth over time.",
  },
  {
    badge: "Forecast",
    title: "Forecast",
    description:
      "Plan ahead with projections on your savings, investments, and financial goals.",
  },
];

function Navbar() {
  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-xl font-bold tracking-tight">
          Akari <span className="text-muted-foreground">明かり</span>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#about"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            About
          </a>
          <a
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Login
          </a>
          <Button size="sm">Get Started</Button>
        </div>
        <div className="md:hidden">
          <Button size="sm">Get Started</Button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
      <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
        Akari <span className="text-muted-foreground">明かり</span>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground md:text-xl">
        Illuminate your finances, multiply your wealth.
      </p>
      <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
        A personal finance tracker built for Indians. Track investments, manage
        expenses, and get smart reports — all in one clean interface.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Button size="lg">Get Started</Button>
        <Button size="lg" variant="outline">
          View Demo
        </Button>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
          Everything you need to manage your money
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Simple tools to track, plan, and grow your wealth.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  {feature.badge}
                </Badge>
                <CardTitle className="mt-3">{feature.title}</CardTitle>
                <CardDescription className="mt-1">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
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
            className="hover:text-foreground"
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
      <Features />
      <Footer />
    </div>
  );
}
