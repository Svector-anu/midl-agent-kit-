import type { Abi } from "viem";
import deploymentLog from "@state/deployment-log.json";

// SCAFFOLD: replace "MyContract" with your contract name (must match deployment-log.json entry).
const CONTRACT_NAME = "MyContract";

function getContractEntry(name: string) {
  const entry = (
    deploymentLog as { deployments: Array<{ name: string; address: string; abi: unknown }> }
  ).deployments.find((d) => d.name === name);

  if (!entry) {
    throw new Error(
      `Contract "${name}" not found in state/deployment-log.json. ` +
        `Run the deployment lifecycle before starting the dApp.`
    );
  }

  return entry;
}

const contract = getContractEntry(CONTRACT_NAME);

// SCAFFOLD: rename these exports to match your contract.
export const CONTRACT_ADDRESS = contract.address as `0x${string}`;
export const CONTRACT_ABI = contract.abi as Abi;
