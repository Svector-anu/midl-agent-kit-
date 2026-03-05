import { useAccount } from "wagmi";
import { useAccounts } from "@midl/react";
import { formatEther } from "viem";
import { useStaking } from "../hooks/useStaking";
import { useClaim } from "../hooks/useClaim";
import { TxStatus } from "./TxStatus";

export function ClaimRewards() {
  const { address } = useAccount();
  const { isConnected } = useAccounts();
  const { myEarned } = useStaking();

  // MIDL reconnects instantly on refresh but wagmi EVM address syncs async.
  // During that gap, myEarned query is disabled and returns 0n.
  // We distinguish "truly zero" (address loaded, earned = 0) from "still loading".
  const earnedLoading = isConnected && !address;
  const { claim, phase, error, btcTxId, evmTxHash, finalize, reset } = useClaim();

  const busy = phase !== "idle" && phase !== "error";

  return (
    <div className="card">
      <h2 className="card__title">Claim Rewards</h2>
      <p className="card__description">
        {!isConnected
          ? "Connect wallet to view your rewards"
          : "Accumulated rewards available to claim."}
      </p>
      {address && (
        <p className="claim-rewards__amount">{formatEther(myEarned)} RTKN</p>
      )}
      <button
        className="btn-primary"
        onClick={claim}
        disabled={busy || !isConnected || earnedLoading || (!!address && myEarned === 0n)}
      >
        {!isConnected
          ? "Connect wallet to claim"
          : earnedLoading
          ? "Loading…"
          : "Claim Rewards"}
      </button>
      {phase !== "idle" && (
        <TxStatus
          phase={phase}
          error={error}
          btcTxId={btcTxId}
          evmTxHash={evmTxHash}
          onReset={reset}
          onFinalize={phase === "adding-intention" ? finalize : undefined}
        />
      )}
    </div>
  );
}
