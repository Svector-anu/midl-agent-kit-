import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import { useMidlContractWrite } from "./useMidlContractWrite";
import { SOCIAL_GUESTBOOK_ADDRESS, SOCIAL_GUESTBOOK_ABI } from "../lib/contract";

export function useRegisterUser(onSuccess?: () => void) {
  const { write, ...rest } = useMidlContractWrite(onSuccess);

  const registerUser = useCallback(
    (username: string) => {
      const data = encodeFunctionData({
        abi: SOCIAL_GUESTBOOK_ABI,
        functionName: "registerUser",
        args: [username],
      });

      write({ to: SOCIAL_GUESTBOOK_ADDRESS, data });
    },
    [write]
  );

  return { registerUser, ...rest };
}
