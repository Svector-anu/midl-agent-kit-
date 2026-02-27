import { createConfig, regtest } from "@midl/core";
import { xverseConnector } from "@midl/connectors";

// Add leatherConnector() to the array for Leather wallet support.
// leatherConnector is useful as a fallback on regtest when Xverse
// has UTXO indexer lag ("Insufficient UTXOs" errors).
export const midlConfig = createConfig({
  networks: [regtest],
  connectors: [xverseConnector()],
  persist: true,
});
