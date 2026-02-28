import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      viem: "@midl/viem",
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
