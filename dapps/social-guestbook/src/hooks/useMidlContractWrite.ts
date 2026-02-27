import { useState, useCallback, useRef, useEffect } from "react";
import {
  useAddTxIntention,
  useFinalizeBTCTransaction,
  useSignIntention,
} from "@midl/executor-react";
import { useAccounts, useWaitForTransaction } from "@midl/react";
import { usePublicClient } from "wagmi";
import type { TxPhase } from "../types/guestbook";

interface WriteTxParams {
  to: `0x${string}`;
  data: `0x${string}`;
  depositSatoshis?: number;
  valueWei?: bigint;
}

/**
 * MIDL 4-step write flow.
 *
 * Per the SDK pattern, finalizeBTCTransaction MUST be called from a direct user
 * click handler — not from a useEffect. Xverse opens its PSBT approval UI as a
 * popup window; browsers block popup windows that aren't opened during a user
 * gesture. Wallet connect works (button click) but effect-triggered signing
 * doesn't (no user gesture → popup blocked → sats-connect hangs forever).
 *
 * Flow:
 *   write()  → addTxIntention() → phase = "adding-intention"
 *   finalize() [called by user clicking "Sign with Xverse" button]
 *            → finalizeBTCTransaction() → Xverse popup → onSuccess
 *            → signIntentionAsync × N → sendBTCTransactions
 */
export function useMidlContractWrite(onSuccess?: () => void) {
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [btcTxId, setBtcTxId] = useState<string | null>(null);

  const { ordinalsAccount, paymentAccount } = useAccounts();
  const { addTxIntention, txIntentions } = useAddTxIntention();
  const { signIntentionAsync } = useSignIntention();
  const publicClient = usePublicClient();

  const { waitForTransaction } = useWaitForTransaction({
    mutation: {
      onSuccess: () => {
        setPhase("confirmed");
        onSuccess?.();
      },
    },
  });

  // Always-current refs — read inside async callbacks without stale closures.
  const txIntentionsRef = useRef(txIntentions);
  useEffect(() => { txIntentionsRef.current = txIntentions; }, [txIntentions]);

  const signIntentionAsyncRef = useRef(signIntentionAsync);
  useEffect(() => { signIntentionAsyncRef.current = signIntentionAsync; }, [signIntentionAsync]);

  const publicClientRef = useRef(publicClient);
  useEffect(() => { publicClientRef.current = publicClient; }, [publicClient]);

  const waitForTransactionRef = useRef(waitForTransaction);
  useEffect(() => { waitForTransactionRef.current = waitForTransaction; }, [waitForTransaction]);

  // Steps 3+4 handled in onSuccess — receives result directly, no stale closures.
  const { finalizeBTCTransaction } = useFinalizeBTCTransaction({
    mutation: {
      onSuccess: async (result) => {
        const txId = result.tx.id;
        const txHex = result.tx.hex;

        setPhase("signing");
        try {
          for (const intention of txIntentionsRef.current) {
            await signIntentionAsyncRef.current({ intention, txId });
          }

          setPhase("broadcasting");

          await publicClientRef.current?.sendBTCTransactions({
            serializedTransactions: txIntentionsRef.current.map(
              (it) => it.signedEvmTransaction as `0x${string}`
            ),
            btcTransaction: txHex,
          });

          setBtcTxId(txId);
          setPhase("pending-confirm");
          waitForTransactionRef.current({ txId });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Transaction failed");
          setPhase("error");
        }
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Wallet signing failed");
        setPhase("error");
      },
    },
  });

  // Step 1: encode and queue the EVM transaction intention.
  const write = useCallback(
    ({ to, data, depositSatoshis, valueWei }: WriteTxParams) => {
      if (!ordinalsAccount || !paymentAccount) {
        setError("Wallet not connected. Connect Xverse before writing.");
        return;
      }

      setError(null);
      setBtcTxId(null);
      setPhase("adding-intention");

      addTxIntention({
        reset: true,
        intention: {
          evmTransaction: {
            to,
            data,
            ...(valueWei !== undefined ? { value: valueWei } : {}),
          },
          ...(depositSatoshis !== undefined
            ? { deposit: { satoshis: depositSatoshis, runes: [] } }
            : {}),
        },
      });
    },
    [ordinalsAccount, paymentAccount, addTxIntention]
  );

  // Step 2: MUST be called from a user click handler (button onClick).
  // Xverse opens a popup window for PSBT approval — browsers block windows
  // not opened during a user gesture (e.g. from useEffect).
  const finalize = useCallback(() => {
    setPhase("finalizing");
    finalizeBTCTransaction();
  }, [finalizeBTCTransaction]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setBtcTxId(null);
  }, []);

  return { write, finalize, phase, error, btcTxId, reset };
}
