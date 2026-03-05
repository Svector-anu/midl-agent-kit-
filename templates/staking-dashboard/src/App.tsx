import { useState } from "react";
import { WalletProvider } from "./wallet/WalletProvider";
import { WalletConnect } from "./components/WalletConnect";
import { DemoHealthBanner } from "./components/DemoHealthBanner";
import { AdminCommandsModal } from "./components/AdminCommandsModal";
import { StakingOverview } from "./components/StakingOverview";
import { StakeForm } from "./components/StakeForm";
import { UnstakeForm } from "./components/UnstakeForm";
import { ClaimRewards } from "./components/ClaimRewards";

type Tab = "overview" | "stake-unstake" | "claim";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "stake-unstake", label: "Stake / Unstake" },
  { id: "claim", label: "Claim" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <WalletProvider>
      <div className="app">
        <DemoHealthBanner />
        <header className="app-header">
          <h1 className="app-header__title">Staking Dashboard</h1>
          <AdminCommandsModal />
          <WalletConnect />
        </header>
        <main className="app-main">
          <nav className="tabs" aria-label="Dashboard sections">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`tab${tab === id ? " tab--active" : ""}`}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === "overview" && <StakingOverview />}
          {tab === "stake-unstake" && (
            <div className="stake-grid">
              <StakeForm />
              <UnstakeForm />
            </div>
          )}
          {tab === "claim" && <ClaimRewards />}
        </main>
      </div>
    </WalletProvider>
  );
}
