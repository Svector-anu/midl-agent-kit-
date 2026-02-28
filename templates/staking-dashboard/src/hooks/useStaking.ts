import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { STAKING_ADDRESS, STAKING_ABI } from "../lib/contract";

export interface StakingData {
  totalStaked: bigint;
  myStaked: bigint;
  myEarned: bigint;
  rewardRate: bigint;
}

export function useStaking(): StakingData {
  const { address } = useAccount();

  const { data: totalStaked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "totalStaked",
    query: { refetchInterval: 15_000 },
  });

  const { data: myStaked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "stakedBalance",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: myEarned } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "earned",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: rewardRate } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "rewardRate",
    query: { refetchInterval: 15_000 },
  });

  return {
    totalStaked: typeof totalStaked === "bigint" ? totalStaked : 0n,
    myStaked: typeof myStaked === "bigint" ? myStaked : 0n,
    myEarned: typeof myEarned === "bigint" ? myEarned : 0n,
    rewardRate: typeof rewardRate === "bigint" ? rewardRate : 0n,
  };
}
