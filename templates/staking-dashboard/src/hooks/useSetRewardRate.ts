import { useCallback } from "react";
import { encodeFunctionData, parseUnits } from "viem";
import { STAKING_ADDRESS, STAKING_ABI } from "../lib/contract";
import { useMidlContractWrite } from "./useMidlContractWrite";

const SECS_PER_DAY = 86_400n;

export function useSetRewardRate(onSuccess?: () => void) {
  const { write, finalize, phase, error, btcTxId, evmTxHash, reset } =
    useMidlContractWrite(onSuccess);

  // rtkPerDay is a human-readable decimal string, e.g. "1440"
  const setRate = useCallback(
    (rtkPerDay: string) => {
      const rateWei = parseUnits(rtkPerDay, 18) / SECS_PER_DAY;
      const data = encodeFunctionData({
        abi: STAKING_ABI,
        functionName: "setRewardRate",
        args: [rateWei],
      });
      write({ to: STAKING_ADDRESS, data });
    },
    [write]
  );

  return { setRate, phase, error, btcTxId, evmTxHash, finalize, reset };
}
