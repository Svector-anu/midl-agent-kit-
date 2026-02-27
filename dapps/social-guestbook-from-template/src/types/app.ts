/**
 * Tracks the current phase of a MIDL 4-step write transaction.
 *
 * idle              → no write in progress
 * adding-intention  → building the EVM call intention
 * finalizing        → wallet popup open (PSBT signing)
 * signing           → signing the EVM intention with BTC tx ID
 * broadcasting      → submitting to network via sendBTCTransactions
 * pending-confirm   → waiting for Bitcoin confirmation
 * confirmed         → transaction mined and confirmed
 * error             → write failed; see `error` field
 */
export type TxPhase =
  | "idle"
  | "adding-intention"
  | "finalizing"
  | "signing"
  | "broadcasting"
  | "pending-confirm"
  | "confirmed"
  | "error";
