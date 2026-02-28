import { HardhatUserConfig } from "hardhat/config";
import "@midl/hardhat-deploy";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import { MaestroSymphonyProvider, MempoolSpaceProvider } from "@midl/core";
import { midlRegtest } from "@midl/executor";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, ".env") });

const mnemonic =
  process.env.MNEMONIC ||
  "test test test test test test test test test test test junk";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {},
    regtest: {
      url: "https://rpc.staging.midl.xyz",
      chainId: midlRegtest.id,
      accounts: {
        mnemonic,
        path: "m/86'/1'/0'/0/0",
      },
    },
  },
  midl: {
    networks: {
      regtest: {
        mnemonic,
        confirmationsRequired: 1,
        btcConfirmationsRequired: 1,
        hardhatNetwork: "regtest",
        network: {
          explorerUrl: "https://mempool.staging.midl.xyz",
          id: "regtest",
          network: "regtest",
        },
        providerFactory: () =>
          new MempoolSpaceProvider({
            regtest: "https://mempool.staging.midl.xyz",
          }),
        runesProviderFactory: () =>
          new MaestroSymphonyProvider({
            regtest: "https://runes.staging.midl.xyz",
          }),
      },
    },
  },
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "paris",
      optimizer: { enabled: false },
    },
  },
  etherscan: {
    apiKey: { regtest: "no-api-key-needed" },
    customChains: [
      {
        network: "regtest",
        chainId: 15001,
        urls: {
          apiURL: "https://blockscout.staging.midl.xyz/api",
          browserURL: "https://blockscout.staging.midl.xyz",
        },
      },
    ],
  },
  sourcify: { enabled: false },
};

export default config;
