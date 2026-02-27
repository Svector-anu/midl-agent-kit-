import type { ReactNode } from "react";
import { MidlProvider } from "@midl/react";
import { WagmiMidlProvider } from "@midl/executor-react";
import { getEVMFromBitcoinNetwork } from "@midl/executor";
import { regtest } from "@midl/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { midlConfig } from "../lib/midl-config";

const queryClient = new QueryClient();

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

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <MidlProvider config={midlConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiMidlProvider config={wagmiConfigParams}>{children}</WagmiMidlProvider>
      </QueryClientProvider>
    </MidlProvider>
  );
}
