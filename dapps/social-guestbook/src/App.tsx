import { WalletProvider } from "./wallet/WalletProvider";
import { WalletConnect } from "./components/WalletConnect";
import { RegisterUser } from "./components/RegisterUser";
import { CreatePost } from "./components/CreatePost";
import { GuestbookFeed } from "./components/GuestbookFeed";

export function App() {
  return (
    <WalletProvider>
      <div className="app">
        <header className="app-header">
          <h1>Social Guestbook</h1>
          <WalletConnect />
        </header>
        <main className="app-main">
          <RegisterUser />
          <CreatePost />
          <GuestbookFeed />
        </main>
      </div>
    </WalletProvider>
  );
}
