import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AccountsPage from "./pages/AccountsPage";
import CheckInPage from "./pages/CheckInPage";
import HoldingsPage from "./pages/HoldingsPage";
import HealthPage from "./pages/HealthPage";
import LoanAnalyserPage from "./pages/LoanAnalyserPage";
import LoanCalculatorPage from "./pages/LoanCalculatorPage";
import SalaryPage from "./pages/SalaryPage";
import TaxationPage from "./pages/TaxationPage";
import GoalsPage from "./pages/GoalsPage";
import InsurancePage from "./pages/InsurancePage";
import ExpensesPage from "./pages/ExpensesPage";
import OnboardingPage from "./pages/OnboardingPage";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  useTheme(); // initialize theme from localStorage / system preference
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
        <Route path="/checkin" element={<ProtectedRoute><CheckInPage /></ProtectedRoute>} />
        <Route path="/holdings" element={<ProtectedRoute><HoldingsPage /></ProtectedRoute>} />
        <Route path="/health" element={<ProtectedRoute><HealthPage /></ProtectedRoute>} />
        <Route path="/loans" element={<ProtectedRoute><LoanAnalyserPage /></ProtectedRoute>} />
        <Route path="/loan-calculator" element={<ProtectedRoute><LoanCalculatorPage /></ProtectedRoute>} />
        <Route path="/salary" element={<ProtectedRoute><SalaryPage /></ProtectedRoute>} />
        <Route path="/taxation" element={<ProtectedRoute><TaxationPage /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
        <Route path="/insurance" element={<ProtectedRoute><InsurancePage /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
