import type { ReactNode } from "react";
import { MidlProvider } from "@midl/react";
import { WagmiMidlProvider } from "@midl/executor-react";
import { getEVMFromBitcoinNetwork } from "@midl/executor";
import { regtest } from "@midl/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { midlConfig } from "../lib/midl-config";

const queryClient = new QueryClient();

// WagmiMidlProvider expects raw config params — NOT the result of createConfig().
// It calls createConfig internally. Passing a pre-created config breaks useAccount
// and useReadContract.
//
// Transport uses the Vite dev-server proxy (/midl-rpc → https://rpc.staging.midl.xyz).
// Node.js handles TLS; the browser only talks to localhost (plain HTTP).
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
 * Root provider tree.
 *
 * Layer order (outer → inner) — do not reorder:
 *   MidlProvider         — Bitcoin wallet context (@midl/react)
 *   QueryClientProvider  — React Query for async state
 *   WagmiMidlProvider    — Wagmi context bridged to MIDL chain
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
