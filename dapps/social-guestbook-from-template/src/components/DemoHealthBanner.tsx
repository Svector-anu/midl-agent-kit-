import { useState } from "react";
import deploymentLog from "@state/deployment-log.json";
import { SOCIAL_GUESTBOOK_ADDRESS } from "../lib/contract";
import { useDemoHealth } from "../hooks/useDemoHealth";

type DeployEntry = { name: string; address: string; testHarnessPath?: string };

const deployEntry = (deploymentLog as { deployments: DeployEntry[] }).deployments.find(
  (d) => d.address.toLowerCase() === SOCIAL_GUESTBOOK_ADDRESS.toLowerCase(),
);
const contractName = deployEntry?.name ?? "YourContract";
const harnessPath = deployEntry?.testHarnessPath ?? "dapps/<your-hardhat-project>";

export function DemoHealthBanner() {
  const { status, dismiss } = useDemoHealth();
  const [showModal, setShowModal] = useState(false);

  if (status === "checking" || status === "healthy" || status === "dismissed") return null;

  if (showModal) {
    return (
      <div className="demo-banner__overlay" role="alertdialog" aria-modal="true" aria-label="Redeploy demo contract">
        <div className="demo-banner__modal">
          <p className="demo-banner__modal-title">Redeploy demo contract</p>

          <p className="demo-banner__label">1. Deploy</p>
          <pre className="demo-banner__cmd">{`cd ${harnessPath}\nnpx hardhat deploy --network regtest --tags ${contractName}`}</pre>

          <p className="demo-banner__label">2. Verify (recommended)</p>
          <pre className="demo-banner__cmd">{`npx hardhat verify --network regtest <NEW_ADDRESS>`}</pre>

          <p className="demo-banner__note">
            Takes 30s–2 min. The deploy script updates{" "}
            <code>state/deployment-log.json</code> and{" "}
            <code>state/demo-contracts.json</code> automatically.
          </p>

          <div className="demo-banner__actions">
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Done — reload app
            </button>
            <button className="btn-ghost" onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-banner" role="alert">
      <span className="demo-banner__icon" aria-hidden="true">⚠</span>
      <p className="demo-banner__text">Demo contract unavailable — testnet may have reset.</p>
      <div className="demo-banner__actions">
        <button className="btn-primary demo-banner__btn" onClick={() => setShowModal(true)}>
          Redeploy demo
        </button>
        <button className="btn-ghost demo-banner__btn" onClick={dismiss}>
          Not now (UI-only preview)
        </button>
      </div>
    </div>
  );
}
