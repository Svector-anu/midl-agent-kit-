import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useStaking } from "../hooks/useStaking";
import { useClaim } from "../hooks/useClaim";
import { TxStatus } from "./TxStatus";

export function ClaimRewards() {
  const { address } = useAccount();
  const { myEarned } = useStaking();
  const { claim, phase, error, btcTxId, finalize, reset } = useClaim();

  const busy = phase !== "idle" && phase !== "error";

  return (
    <div className="card">
      <h2 className="card__title">Claim Rewards</h2>
      <p className="card__description">
        {!address
          ? "Connect wallet to view your rewards"
          : "Accumulated rewards available to claim."}
      </p>
      {address && (
        <p className="claim-rewards__amount">{formatEther(myEarned)} RTKN</p>
      )}
      <button
        className="btn-primary"
        onClick={claim}
        disabled={busy || !address || myEarned === 0n}
      >
        {!address ? "Connect wallet to claim" : "Claim Rewards"}
      </button>
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
