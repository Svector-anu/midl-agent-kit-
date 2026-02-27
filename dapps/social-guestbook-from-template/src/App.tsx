import { WalletProvider } from "./wallet/WalletProvider";
import { WalletConnect } from "./components/WalletConnect";

// SCAFFOLD: import and add your feature components here.

export function App() {
  return (
    <WalletProvider>
      <div className="app">
        <header className="app-header">
          <h1 className="app-header__title">
            Social Guestbook
          </h1>
          <WalletConnect />
        </header>
        <main className="app-main">
          {/* SCAFFOLD: add your feature components here */}
        </main>
      </div>
    </WalletProvider>
  );
}
