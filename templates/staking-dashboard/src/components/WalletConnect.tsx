import { useAccounts, useConnect, useDisconnect } from "@midl/react";
import { AddressPurpose } from "@midl/core";

export function WalletConnect() {
  const { connectors, connect } = useConnect({
    purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
  });
  const { ordinalsAccount, paymentAccount, isConnected, status } = useAccounts();
  const { disconnect } = useDisconnect();

  if (isConnected && ordinalsAccount) {
    return (
      <div className="wallet-info">
        <div className="wallet-info__row">
          <span className="wallet-info__label">EVM (P2TR)</span>
          <span className="wallet-info__address" title={ordinalsAccount.address}>
            {ordinalsAccount.address.slice(0, 10)}…
          </span>
        </div>
        {paymentAccount && (
          <div className="wallet-info__row">
            <span className="wallet-info__label">BTC (P2WPKH)</span>
            <span className="wallet-info__address" title={paymentAccount.address}>
              {paymentAccount.address.slice(0, 10)}…
            </span>
          </div>
        )}
        <button className="wallet-info__disconnect" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          className="wallet-connect__btn"
          onClick={() => connect({ id: connector.id })}
          disabled={status === "connecting"}
        >
          {status === "connecting" ? "Connecting…" : `Connect ${connector.metadata.name}`}
        </button>
      ))}
    </div>
  );
}
