import { useState, useCallback, useRef, useEffect } from "react";
import {
  useAddTxIntention,
  useFinalizeBTCTransaction,
  useSignIntention,
} from "@midl/executor-react";
import { useAccounts, useWaitForTransaction } from "@midl/react";
import { usePublicClient } from "wagmi";
import type { TxPhase } from "../types/app";

export interface WriteTxParams {
  to: `0x${string}`;
  data: `0x${string}`;
  depositSatoshis?: number;
  valueWei?: bigint;
}

/**
 * MIDL 4-step write flow.
 *
 * finalizeBTCTransaction MUST be called from a direct user click handler —
 * not from a useEffect. Xverse opens its PSBT approval UI as a popup window;
 * browsers block popups not opened during a user gesture.
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

  const txIntentionsRef = useRef(txIntentions);
  useEffect(() => { txIntentionsRef.current = txIntentions; }, [txIntentions]);

  const signIntentionAsyncRef = useRef(signIntentionAsync);
  useEffect(() => { signIntentionAsyncRef.current = signIntentionAsync; }, [signIntentionAsync]);

  const publicClientRef = useRef(publicClient);
  useEffect(() => { publicClientRef.current = publicClient; }, [publicClient]);

  const waitForTransactionRef = useRef(waitForTransaction);
  useEffect(() => { waitForTransactionRef.current = waitForTransaction; }, [waitForTransaction]);

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
