import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import { satoshisToWei } from "@midl/executor";
import { useMidlContractWrite } from "./useMidlContractWrite";
import { SOCIAL_GUESTBOOK_ADDRESS, SOCIAL_GUESTBOOK_ABI } from "../lib/contract";

/**
 * Converts wei (EVM) to satoshis (BTC).
 * MIDL: 1 satoshi = 10^10 wei (1 BTC = 10^8 sats = 1 ETH = 10^18 wei).
 * Verify this ratio against satoshisToWei during integration testing.
 */
function weiToSatoshis(wei: bigint): number {
  return Number(wei / 10_000_000_000n);
}

export function useCreatePost(onSuccess?: () => void) {
  const { write, ...rest } = useMidlContractWrite(onSuccess);

  /**
   * @param content     Post text content
   * @param postingFeeWei  postingFee value returned by the contract (in wei).
   *                       Read via usePostingFee() before calling.
   */
  const createPost = useCallback(
    (content: string, postingFeeWei: bigint) => {
      const data = encodeFunctionData({
        abi: SOCIAL_GUESTBOOK_ABI,
        functionName: "createPost",
        args: [content],
      });

      const depositSatoshis =
        postingFeeWei > 0n ? weiToSatoshis(postingFeeWei) : undefined;

      // satoshisToWei is the canonical MIDL conversion — use it to set msg.value
      const valueWei =
        depositSatoshis !== undefined ? satoshisToWei(depositSatoshis) : undefined;

      write({
        to: SOCIAL_GUESTBOOK_ADDRESS,
        data,
        depositSatoshis,
        valueWei,
      });
    },
    [write]
  );

  return { createPost, ...rest };
}
