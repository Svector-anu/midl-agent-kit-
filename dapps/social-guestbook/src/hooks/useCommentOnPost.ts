import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import { useMidlContractWrite } from "./useMidlContractWrite";
import { SOCIAL_GUESTBOOK_ADDRESS, SOCIAL_GUESTBOOK_ABI } from "../lib/contract";

export function useCommentOnPost(onSuccess?: () => void) {
  const { write, ...rest } = useMidlContractWrite(onSuccess);

  const commentOnPost = useCallback(
    (postId: bigint, text: string) => {
      const data = encodeFunctionData({
        abi: SOCIAL_GUESTBOOK_ABI,
        functionName: "commentOnPost",
        args: [postId, text],
      });

      write({ to: SOCIAL_GUESTBOOK_ADDRESS, data });
    },
    [write]
  );

  return { commentOnPost, ...rest };
}
