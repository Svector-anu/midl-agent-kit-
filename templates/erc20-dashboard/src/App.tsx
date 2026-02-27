import { useState } from "react";
import { WalletProvider } from "./wallet/WalletProvider";
import { WalletConnect } from "./components/WalletConnect";
import { DemoHealthBanner } from "./components/DemoHealthBanner";
import { BalanceView } from "./components/BalanceView";
import { TransferForm } from "./components/TransferForm";
import { ApproveForm } from "./components/ApproveForm";
import { MintForm } from "./components/MintForm";

type Tab = "balance" | "transfer" | "approve" | "mint";

const TABS: { id: Tab; label: string }[] = [
  { id: "balance", label: "Balance" },
  { id: "transfer", label: "Transfer" },
  { id: "approve", label: "Approve" },
  { id: "mint", label: "Mint" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("balance");

  return (
    <WalletProvider>
      <div className="app">
        <DemoHealthBanner />
        <header className="app-header">
          <h1 className="app-header__title">ERC-20 Dashboard</h1>
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
          {tab === "balance" && <BalanceView />}
          {tab === "transfer" && <TransferForm />}
          {tab === "approve" && <ApproveForm />}
          {tab === "mint" && <MintForm />}
        </main>
      </div>
    </WalletProvider>
  );
}
