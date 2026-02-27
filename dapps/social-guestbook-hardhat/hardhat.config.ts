import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "paris",
      // Deployed without optimizer — keep disabled for bytecode parity
      optimizer: {
        enabled: false,
      },
    },
  },
  networks: {
    hardhat: {},
    regtest: {
      url: "https://rpc.staging.midl.xyz",
      chainId: 15001,
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
