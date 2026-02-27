import { useState } from "react";
import { encodeFunctionData, parseUnits, isAddress } from "viem";
import { useAccount } from "wagmi";
import { ERC20_TOKEN_ADDRESS, ERC20_TOKEN_ABI } from "../lib/contract";
import { useMidlContractRead } from "../hooks/useMidlContractRead";
import { useMidlContractWrite } from "../hooks/useMidlContractWrite";
import { TxStatus } from "./TxStatus";

export function MintForm() {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const { data: owner } = useMidlContractRead({ functionName: "owner" });
  const isOwner =
    !!address &&
    typeof owner === "string" &&
    owner.toLowerCase() === address.toLowerCase();

  const { write, finalize, phase, error, btcTxId, reset } = useMidlContractWrite(() => {
    setRecipient("");
    setAmount("");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddress(recipient) || !amount) return;

    const data = encodeFunctionData({
      abi: ERC20_TOKEN_ABI,
      functionName: "mint",
      args: [recipient as `0x${string}`, parseUnits(amount, 18)],
    });

    write({ to: ERC20_TOKEN_ADDRESS, data });
  };

  const busy = phase !== "idle" && phase !== "error";

  if (!address) {
    return (
      <div className="card">
        <h2 className="card__title">Mint</h2>
        <p className="card__description">Connect your wallet to access the mint function.</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="card">
        <h2 className="card__title">Mint</h2>
        <p className="card__description card__description--muted">
          Owner-only function. Your connected address is not the contract owner.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card__title">Mint</h2>
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
          Mint
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
