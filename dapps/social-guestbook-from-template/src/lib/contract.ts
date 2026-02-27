import type { Abi } from "viem";
import deploymentLog from "@state/deployment-log.json";

const CONTRACT_NAME = "SocialGuestbook";

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

export const SOCIAL_GUESTBOOK_ADDRESS = contract.address as `0x${string}`;
export const SOCIAL_GUESTBOOK_ABI = contract.abi as Abi;
