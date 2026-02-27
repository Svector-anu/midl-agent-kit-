import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useMidlContractRead } from "../hooks/useMidlContractRead";

export function BalanceView() {
  const { address } = useAccount();

  const { data: name } = useMidlContractRead({ functionName: "name" });
  const { data: symbol } = useMidlContractRead({ functionName: "symbol" });
  const { data: totalSupply } = useMidlContractRead({ functionName: "totalSupply" });
  const { data: balance, isLoading: balanceLoading } = useMidlContractRead({
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const fmt = (raw: unknown) =>
    typeof raw === "bigint" ? formatUnits(raw, 18) : "—";

  return (
    <div className="card">
      <h2 className="card__title">Token Info</h2>
      <dl className="token-info">
        <div className="token-info__row">
          <dt className="token-info__label">Name</dt>
          <dd className="token-info__value">{typeof name === "string" ? name : "—"}</dd>
        </div>
        <div className="token-info__row">
          <dt className="token-info__label">Symbol</dt>
          <dd className="token-info__value">{typeof symbol === "string" ? symbol : "—"}</dd>
        </div>
        <div className="token-info__row">
          <dt className="token-info__label">Total Supply</dt>
          <dd className="token-info__value">{fmt(totalSupply)}</dd>
        </div>
        <div className="token-info__row token-info__row--highlight">
          <dt className="token-info__label">Your Balance</dt>
          <dd className="token-info__value">
            {!address
              ? "Connect wallet to view"
              : balanceLoading
              ? "Loading…"
              : `${fmt(balance)} ${typeof symbol === "string" ? symbol : ""}`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
