import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import { satoshisToWei } from "@midl/executor";
import { useMidlContractWrite } from "./useMidlContractWrite";
import { SOCIAL_GUESTBOOK_ADDRESS, SOCIAL_GUESTBOOK_ABI } from "../lib/contract";

export function useTipAuthor(onSuccess?: () => void) {
  const { write, ...rest } = useMidlContractWrite(onSuccess);

  /**
   * @param postId      ID of the post to tip the author of
   * @param tipSatoshis Amount to tip in satoshis (user-specified)
   */
  const tipAuthor = useCallback(
    (postId: bigint, tipSatoshis: number) => {
      const data = encodeFunctionData({
        abi: SOCIAL_GUESTBOOK_ABI,
        functionName: "tipAuthor",
        args: [postId],
      });

      write({
        to: SOCIAL_GUESTBOOK_ADDRESS,
        data,
        depositSatoshis: tipSatoshis,
        valueWei: satoshisToWei(tipSatoshis),
      });
    },
    [write]
  );

  return { tipAuthor, ...rest };
}
