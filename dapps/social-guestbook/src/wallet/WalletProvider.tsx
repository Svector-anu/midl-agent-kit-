import type { ReactNode } from "react";
import { MidlProvider } from "@midl/react";
import { WagmiMidlProvider } from "@midl/executor-react";
import { getEVMFromBitcoinNetwork } from "@midl/executor";
import { regtest } from "@midl/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { midlConfig } from "../lib/midl-config";

const queryClient = new QueryClient();

// WagmiMidlProvider.config expects Parameters<typeof createConfig>[0] — the raw options object,
// NOT the result of createConfig(). Pass options directly so WagmiMidlProvider calls createConfig internally.
//
// Transport uses the Vite dev-server proxy (/midl-rpc → https://rpc.staging.midl.xyz).
// Node.js handles the TLS handshake; the browser only talks to localhost (plain HTTP).
// This bypasses ERR_SSL_BAD_RECORD_MAC_ALERT that Chrome throws when the staging server's
// TLS record MAC fails mid-connection.
const midlChain = getEVMFromBitcoinNetwork(regtest);
const wagmiConfigParams = {
  chains: [midlChain] as [typeof midlChain],
  transports: { [midlChain.id]: http("/midl-rpc") },
  multiInjectedProviderDiscovery: false,
  ssr: false,
};

interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Root provider tree for the Social Guestbook dApp.
 *
 * Layer order (outer → inner):
 *   MidlProvider         — Bitcoin wallet context (@midl/react)
 *   QueryClientProvider  — React Query for async state
 *   WagmiMidlProvider    — Wagmi context bridged to MIDL chain (enables useReadContract, usePublicClient)
 */
export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <MidlProvider config={midlConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiMidlProvider config={wagmiConfigParams}>{children}</WagmiMidlProvider>
      </QueryClientProvider>
    </MidlProvider>
  );
}
