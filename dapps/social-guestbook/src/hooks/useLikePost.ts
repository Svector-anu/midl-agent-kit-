import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import { useMidlContractWrite } from "./useMidlContractWrite";
import { SOCIAL_GUESTBOOK_ADDRESS, SOCIAL_GUESTBOOK_ABI } from "../lib/contract";

export function useLikePost(onSuccess?: () => void) {
  const { write, ...rest } = useMidlContractWrite(onSuccess);

  const likePost = useCallback(
    (postId: bigint) => {
      const data = encodeFunctionData({
        abi: SOCIAL_GUESTBOOK_ABI,
        functionName: "likePost",
        args: [postId],
      });

      write({ to: SOCIAL_GUESTBOOK_ADDRESS, data });
    },
    [write]
  );

  return { likePost, ...rest };
}
