import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import AccountsPage from "./pages/AccountsPage";
import CheckInPage from "./pages/CheckInPage";
import HoldingsPage from "./pages/HoldingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/checkin" element={<CheckInPage />} />
        <Route path="/holdings" element={<HoldingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
