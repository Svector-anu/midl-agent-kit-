import { useState } from "react";
import { formatEther, parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { STAKE_TOKEN_ADDRESS, STAKE_TOKEN_ABI } from "../lib/contract";
import { useStake } from "../hooks/useStake";
import { TxStatus } from "./TxStatus";

export function StakeForm() {
  const [amount, setAmount] = useState("");
  const { address } = useAccount();

  const { data: tokenBalance } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: STAKE_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { stake, phase, error, btcTxId, finalize, reset } = useStake(() => {
    setAmount("");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    stake(parseUnits(amount, 18));
  };

  const busy = phase !== "idle" && phase !== "error";
  const balance = typeof tokenBalance === "bigint" ? tokenBalance : 0n;

  return (
    <div className="card">
      <h2 className="card__title">Stake</h2>
      {address && (
        <p className="card__description">
          Balance: {formatEther(balance)} STAKE
        </p>
      )}
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__label">
          Amount (STAKE)
          <input
            className="form__input"
            type="number"
            min="0"
            step="any"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy || !address}
          />
        </label>
        <button
          className="btn-primary"
          type="submit"
          disabled={busy || !address || !amount}
        >
          {!address ? "Connect wallet to stake" : "Stake"}
        </button>
      </form>
      {phase !== "idle" && (
        <TxStatus
          phase={phase}
          error={error}
          btcTxId={btcTxId}
          onReset={reset}
          onFinalize={phase === "adding-intention" ? finalize : undefined}
        />
      )}
    </div>
  );
}
