import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Belt-and-suspenders alongside npm overrides — ensures viem resolves to @midl/viem
      viem: "@midl/viem",
      // Allows `import ... from "@state/deployment-log.json"` to resolve to the shared state dir.
      // Adjust the relative path if the dApp is nested more than two levels from the monorepo root.
      "@state": path.resolve(__dirname, "../../state"),
    },
  },
  server: {
    fs: {
      // Allow the dev server to serve files from the monorepo root (needed for @state imports)
      allow: [path.resolve(__dirname, "../..")],
    },
    proxy: {
      // Proxy EVM RPC calls through Node.js to avoid ERR_SSL_BAD_RECORD_MAC_ALERT in Chrome.
      "/midl-rpc": {
        target: "https://rpc.staging.midl.xyz",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/midl-rpc/, ""),
        secure: true,
      },
    },
  },
});
