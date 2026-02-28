import { useCallback } from "react";
import { encodeFunctionData } from "viem";
import { STAKING_ADDRESS, STAKING_ABI } from "../lib/contract";
import { useMidlContractWrite } from "./useMidlContractWrite";

export function useStake(onSuccess?: () => void) {
  const { write, finalize, phase, error, btcTxId, reset } = useMidlContractWrite(onSuccess);

  const stake = useCallback(
    (amount: bigint) => {
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "stake",
        args: [amount],
      });
      write({ to: STAKING_ADDRESS, data });
    },
    [write]
  );

  return { stake, phase, error, btcTxId, finalize, reset };
}
