import { useCallback } from "react";
import { encodeFunctionData, maxUint256 } from "viem";
import { STAKE_TOKEN_ADDRESS, STAKE_TOKEN_ABI, STAKING_ADDRESS } from "../lib/contract";
import { useMidlContractWrite } from "./useMidlContractWrite";

export function useApprove(onSuccess?: () => void) {
  const { write, finalize, phase, error, btcTxId, evmTxHash, reset } = useMidlContractWrite(onSuccess);

  const approve = useCallback(
    (_amount: bigint) => {
      // Approve max so the user never has to re-approve for future stakes
      const data = encodeFunctionData({
        abi: STAKE_TOKEN_ABI,
        functionName: "approve",
        args: [STAKING_ADDRESS, maxUint256],
      });
      write({ to: STAKE_TOKEN_ADDRESS, data });
    },
    [write]
  );

  return { approve, phase, error, btcTxId, evmTxHash, finalize, reset };
}
