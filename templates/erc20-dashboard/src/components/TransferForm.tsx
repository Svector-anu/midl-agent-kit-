import { useState } from "react";
import { encodeFunctionData, parseUnits, isAddress } from "viem";
import { ERC20_TOKEN_ADDRESS, ERC20_TOKEN_ABI } from "../lib/contract";
import { useMidlContractWrite } from "../hooks/useMidlContractWrite";
import { TxStatus } from "./TxStatus";

export function TransferForm() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const { write, finalize, phase, error, btcTxId, reset } = useMidlContractWrite(() => {
    setRecipient("");
    setAmount("");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddress(recipient) || !amount) return;

    const data = encodeFunctionData({
      abi: ERC20_TOKEN_ABI,
      functionName: "transfer",
      args: [recipient as `0x${string}`, parseUnits(amount, 18)],
    });

    write({ to: ERC20_TOKEN_ADDRESS, data });
  };

  const busy = phase !== "idle" && phase !== "error";

  return (
    <div className="card">
      <h2 className="card__title">Transfer</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__label">
          Recipient address
          <input
            className="form__input"
            type="text"
            placeholder="0x…"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="form__label">
          Amount
          <input
            className="form__input"
            type="number"
            min="0"
            step="any"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          className="btn-primary"
          type="submit"
          disabled={busy || !isAddress(recipient) || !amount}
        >
          Transfer
        </button>
      </form>
      <TxStatus
        phase={phase}
        error={error}
        btcTxId={btcTxId}
        onReset={reset}
        onFinalize={finalize}
      />
    </div>
  );
}
