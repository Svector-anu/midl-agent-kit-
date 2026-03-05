import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// porto (transitive wagmi dep) imports viem/experimental/erc7821 which does not
// exist in @midl/viem@2.21.39. We never use the porto connector, so stub it out.
const stubMissingViemExport = {
  name: "stub-viem-experimental-erc7821",
  enforce: "pre" as const,
  resolveId(id: string) {
    if (id === "viem/experimental/erc7821") return "\0viem-erc7821-stub";
    return null;
  },
  load(id: string) {
    if (id === "\0viem-erc7821-stub") return "export const encodeExecuteData = () => { throw new Error('erc7821 not supported'); }; export const getExecuteError = () => null;";
    return null;
  },
};

export default defineConfig({
  plugins: [react(), stubMissingViemExport],
  resolve: {
    alias: {
      "@state": path.resolve(__dirname, "../../state"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "../..")],
    },
    proxy: {
      "/midl-rpc": {
        target: "https://rpc.staging.midl.xyz",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/midl-rpc/, ""),
        secure: true,
      },
    },
  },
});
