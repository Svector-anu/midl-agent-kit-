import { useState } from "react";
import { encodeFunctionData, parseUnits, isAddress } from "viem";
import { ERC20_TOKEN_ADDRESS, ERC20_TOKEN_ABI } from "../lib/contract";
import { useMidlContractWrite } from "../hooks/useMidlContractWrite";
import { TxStatus } from "./TxStatus";

export function ApproveForm() {
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("");

  const { write, finalize, phase, error, btcTxId, reset } = useMidlContractWrite(() => {
    setSpender("");
    setAmount("");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddress(spender) || !amount) return;

    const data = encodeFunctionData({
      abi: ERC20_TOKEN_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, parseUnits(amount, 18)],
    });

    write({ to: ERC20_TOKEN_ADDRESS, data });
  };

  const busy = phase !== "idle" && phase !== "error";

  return (
    <div className="card">
      <h2 className="card__title">Approve</h2>
      <p className="card__description">
        Grant a spender permission to transfer tokens on your behalf.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__label">
          Spender address
          <input
            className="form__input"
            type="text"
            placeholder="0x…"
            value={spender}
            onChange={(e) => setSpender(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="form__label">
          Allowance amount
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
          disabled={busy || !isAddress(spender) || !amount}
        >
          Approve
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
