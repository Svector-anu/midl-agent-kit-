import type { TxPhase } from "../types/app";

interface TxStatusProps {
  phase: TxPhase;
  error: string | null;
  btcTxId: string | null;
  onReset?: () => void;
  onFinalize?: () => void;
}

const PHASE_LABELS: Record<TxPhase, string> = {
  idle: "",
  "adding-intention": "",
  finalizing: "Approve the PSBT in Xverse...",
  signing: "Signing EVM transaction...",
  broadcasting: "Submitting to MIDL network...",
  "pending-confirm": "Waiting for Bitcoin confirmation...",
  confirmed: "Transaction confirmed!",
  error: "",
};

export function TxStatus({ phase, error, btcTxId, onReset, onFinalize }: TxStatusProps) {
  if (phase === "idle") return null;

  return (
    <div className={`tx-status tx-status--${phase}`}>
      {phase === "error" ? (
        <>
          <span className="tx-status__label">Error: {error}</span>
          {onReset && (
            <button className="tx-status__reset" onClick={onReset}>
              Try again
            </button>
          )}
        </>
      ) : phase === "adding-intention" ? (
        <>
          <span className="tx-status__label">Transaction ready — sign with your wallet</span>
          {onFinalize && (
            <button className="tx-status__finalize" onClick={onFinalize}>
              Sign with Xverse
            </button>
          )}
        </>
      ) : (
        <>
          <span className="tx-status__label">{PHASE_LABELS[phase]}</span>
          {(phase === "pending-confirm" || phase === "confirmed") && btcTxId && (
            <a
              className="tx-status__explorer-link"
              href={`https://mempool.staging.midl.xyz/tx/${btcTxId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View BTC tx
            </a>
          )}
        </>
      )}
    </div>
  );
}
