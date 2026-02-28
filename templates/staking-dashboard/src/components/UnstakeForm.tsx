import { useState } from "react";
import { formatEther, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useStaking } from "../hooks/useStaking";
import { useUnstake } from "../hooks/useUnstake";
import { TxStatus } from "./TxStatus";

export function UnstakeForm() {
  const [amount, setAmount] = useState("");
  const { address } = useAccount();
  const { myStaked } = useStaking();

  const { unstake, phase, error, btcTxId, finalize, reset } = useUnstake(() => {
    setAmount("");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    unstake(parseUnits(amount, 18));
  };

  const busy = phase !== "idle" && phase !== "error";

  return (
    <div className="card">
      <h2 className="card__title">Unstake</h2>
      {address && (
        <p className="card__description">
          Staked: {formatEther(myStaked)} STAKE
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
          {!address ? "Connect wallet to unstake" : "Unstake"}
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
