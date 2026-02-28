import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import { STAKING_ADDRESS, STAKING_ABI } from "../lib/contract";
import { useMidlContractWrite } from "./useMidlContractWrite";

export function useClaim(onSuccess?: () => void) {
  const { write, finalize, phase, error, btcTxId, reset } = useMidlContractWrite(onSuccess);

  const claim = useCallback(() => {
    const data = encodeFunctionData({
      abi: STAKING_ABI,
      functionName: "claimRewards",
      args: [],
    });
    write({ to: STAKING_ADDRESS, data });
  }, [write]);

  return { claim, phase, error, btcTxId, finalize, reset };
}
