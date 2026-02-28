import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useStaking } from "../hooks/useStaking";

export function StakingOverview() {
  const { address } = useAccount();
  const { totalStaked, myStaked, myEarned, rewardRate } = useStaking();

  return (
    <div className="card">
      <h2 className="card__title">Staking Overview</h2>
      <dl className="token-info">
        <div className="token-info__row">
          <dt className="token-info__label">Total Staked</dt>
          <dd className="token-info__value">{formatEther(totalStaked)} STAKE</dd>
        </div>
        <div className="token-info__row">
          <dt className="token-info__label">Reward Rate</dt>
          <dd className="token-info__value">
            {Number(formatEther(rewardRate)).toFixed(6)} RTKN/s
          </dd>
        </div>
        <div className={`token-info__row${address ? " token-info__row--highlight" : ""}`}>
          <dt className="token-info__label">Your Staked</dt>
          <dd className="token-info__value">
            {!address ? (
              <span className="staking-overview__disconnected">
                Connect wallet to see your positions
              </span>
            ) : (
              `${formatEther(myStaked)} STAKE`
            )}
          </dd>
        </div>
        <div className={`token-info__row${address ? " token-info__row--highlight" : ""}`}>
          <dt className="token-info__label">Your Earned</dt>
          <dd className="token-info__value">
            {!address ? (
              <span className="staking-overview__disconnected">—</span>
            ) : (
              `${formatEther(myEarned)} RTKN`
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
