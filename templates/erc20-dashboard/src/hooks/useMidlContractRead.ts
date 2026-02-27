import { useReadContract } from "wagmi";
import { ERC20_TOKEN_ADDRESS, ERC20_TOKEN_ABI } from "../lib/contract";

/**
 * Thin wrapper around wagmi's useReadContract that auto-injects the
 * contract address and ABI from deployment-log.json via contract.ts.
 *
 * Use this for all read calls in the ERC-20 dashboard instead of calling
 * useReadContract directly — it keeps the deployment binding in one place.
 *
 * Usage:
 *   const { data, isLoading } = useMidlContractRead({ functionName: "balanceOf", args: [address] });
 */
export function useMidlContractRead({
  functionName,
  args,
  query,
}: {
  functionName: string;
  args?: readonly unknown[];
  query?: { enabled?: boolean };
}) {
  return useReadContract({
    address: ERC20_TOKEN_ADDRESS,
    abi: ERC20_TOKEN_ABI,
    functionName,
    args,
    query,
  });
}
