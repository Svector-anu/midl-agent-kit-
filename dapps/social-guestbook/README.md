# Social Guestbook

MIDL dApp reference implementation. Bitcoin-native EVM social contract: register, post, like, comment, tip — all transactions signed via Xverse PSBT flow.

**Contract:** `0xA4D2CbAF027125a967E48e94b1Baa03363981b1c` (MIDL staging, chainId 15001)
**Verified:** https://blockscout.staging.midl.xyz/address/0xA4D2CbAF027125a967E48e94b1Baa03363981b1c?tab=contract

---

## Prerequisites

- Node 18+
- [Xverse wallet](https://www.xverse.app/) browser extension (Chrome/Brave)
- Xverse wallet funded with regtest BTC (ask MIDL team for testnet faucet)
- Contract deployed and address present in `state/deployment-log.json`

---

## Install & run

```bash
cd dapps/social-guestbook
npm install
npm run dev
```

Dev server starts at `http://localhost:5173`. The Vite proxy forwards all `/midl-rpc` requests to `https://rpc.staging.midl.xyz` — no manual RPC config needed.

---

## Transaction phases

Every write (register, post, like, comment, tip) goes through 6 explicit phases:

| Phase | What's happening | User action |
|-------|-----------------|-------------|
| `adding-intention` | EVM call encoded + queued with MIDL executor | Click **Sign with Xverse** |
| `finalizing` | Xverse popup open — PSBT approval UI | Approve in Xverse |
| `signing` | `signIntentionAsync` binds EVM call to BTC tx ID | — |
| `broadcasting` | `sendBTCTransactions` submits to MIDL network | — |
| `pending-confirm` | Waiting for Bitcoin block confirmation | — |
| `confirmed` | Transaction mined; `onSuccess` callback fires | — |

`TxStatus` renders the current phase inline next to each action button.

> **Why two clicks?** Xverse opens its signing UI as a popup window. Browsers block popups not triggered by a direct user gesture. `finalizeBTCTransaction()` must be called from a `button onClick` — never from a `useEffect`.

---

## Wallet notes

### Two addresses, one wallet

Xverse exposes two Bitcoin address types from the same seed:

| Type | Purpose in MIDL | Field |
|------|----------------|-------|
| P2TR (`bcrt1p…`) | EVM identity — signs contract calls | `ordinalsAccount` |
| P2WPKH (`bcrt1q…`) | BTC fee payment — used in PSBT | `paymentAccount` |

Both are requested on connect via `AddressPurpose.Ordinals` + `AddressPurpose.Payment`. **Never pass the P2TR address as `from` in `addTxIntention`** — MIDL derives a different EVM address from it than `useAccount()` returns, causing "Must be registered" reverts.

### Leather wallet

Leather can be used as a fallback. On regtest, Xverse sometimes has UTXO indexer lag that causes "Insufficient UTXOs" errors. Switch to Leather if that happens. Add `leatherConnector()` to `midl-config.ts`.

---

## Contract address

Address is never hardcoded. It's read from `state/deployment-log.json` via the `@state` alias:

```ts
import deploymentLog from "@state/deployment-log.json";
```

If you see `Contract "SocialGuestbook" not found in deployment-log.json` — the contract hasn't been deployed yet. Run the deploy lifecycle first (`skills/deploy-contracts/SKILL.md`).
