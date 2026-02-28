import { useReadContract } from "wagmi";
import { STAKING_ADDRESS, STAKING_ABI } from "../lib/contract";

/**
 * Thin wrapper around wagmi's useReadContract that auto-injects the
 * contract address and ABI from deployment-log.json via contract.ts.
 *
 * Use this for all read calls in the staking dashboard instead of calling
 * useReadContract directly — it keeps the deployment binding in one place.
 *
 * Usage:
 *   const { data, isLoading } = useMidlContractRead({ functionName: "totalStaked" });
 */
export function useMidlContractRead({
  functionName,
  args,
  query,
}: {
  functionName: string;
  args?: readonly unknown[];
  query?: { enabled?: boolean; refetchInterval?: number };
}) {
  return useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName,
    args,
    query,
  });
}
