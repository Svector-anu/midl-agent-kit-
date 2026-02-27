# midl-vite-dapp template

Minimal, production-grade scaffold for a MIDL Bitcoin-native EVM dApp. Stripped from the SocialGuestbook reference implementation — all infrastructure kept, all domain logic removed.

## What's included

| File | Purpose |
|------|---------|
| `src/wallet/WalletProvider.tsx` | Root provider tree (MidlProvider → QueryClientProvider → WagmiMidlProvider) |
| `src/lib/midl-config.ts` | MIDL core config (network, connectors) |
| `src/lib/contract.ts` | State-based contract loader from `deployment-log.json` |
| `src/hooks/useMidlContractWrite.ts` | Generic 4-step write flow hook |
| `src/hooks/useDemoHealth.ts` | Checks if the demo contract is live (`eth_getCode`) on mount |
| `src/components/WalletConnect.tsx` | Connect/disconnect UI with P2TR + P2WPKH display |
| `src/components/TxStatus.tsx` | Phase-aware transaction status display |
| `src/components/DemoHealthBanner.tsx` | Warning banner + redeploy guide when testnet resets |
| `src/types/app.ts` | `TxPhase` type |
| `src/styles.css` | Design tokens + reset + base components |

## What's NOT included (add per dApp)

- Contract-specific hooks (e.g. `useCreatePost`, `useRegisterUser`)
- Domain types (e.g. `Post`, `Comment`)
- Feature components (e.g. `GuestbookFeed`, `PostCard`)
- Contract source (`.sol`) — lives in `contracts/`, managed by deploy lifecycle

## Usage

Use the `scaffold-midl-dapp` skill to copy this template into a new dApp:

```
skills/scaffold-midl-dapp/SKILL.md
```

Or copy manually:

```bash
cp -r templates/midl-vite-dapp dapps/my-new-dapp
cd dapps/my-new-dapp
# 1. Update package.json "name"
# 2. Update src/lib/contract.ts CONTRACT_NAME
# 3. Update index.html <title>
# 4. Update src/App.tsx title string
npm install
npm run dev
```

## Demo contract health check

The app checks whether its demo contract is live on staging every time it loads. If the testnet has reset and the contract is gone, a banner appears:

> **Demo contract unavailable — testnet may have reset.**
> [Redeploy demo] [Not now (UI-only preview)]

**"Redeploy demo"** opens a modal with the exact terminal commands to run. Nothing deploys automatically — you stay in control.

**"Not now"** dismisses the banner for the session so you can explore the UI without a live contract.

**After redeploying**, click "Done — reload app". The page reloads, picks up the new address from `state/deployment-log.json`, and the banner disappears.

The deploy command shown in the modal:
```bash
cd dapps/<your-hardhat-project>
npx hardhat deploy --network regtest --tags <ContractName>
```
Requires `MNEMONIC` env var and `@midl/hardhat-deploy` installed in the hardhat project.

## SCAFFOLD markers

Search for `// SCAFFOLD:` comments to find all locations that need customisation.
