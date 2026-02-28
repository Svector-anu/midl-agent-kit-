# Troubleshoot

## Boot Sequence

1. Read `<REPO_ROOT>/capabilities.json`
2. Read `<REPO_ROOT>/MIDDLEWARE.md`

> Preflight not required here — you are already past the implementation stage.

---

## Purpose

Systematic debugging runbook. Match symptom → root cause → fix. Do not attempt multiple fixes simultaneously.

---

## General Protocol

1. Match symptom to the error index below
2. Apply the listed fix
3. Re-run — make NO other changes simultaneously
4. If the same fix fails twice, re-read the relevant skill's SKILL.md from scratch
5. After 3 consecutive failures → STOP and ask human

---

## Error Index

---

### E1 — `execution reverted: Must be registered`

**Where:** `eth_estimateGasMulti` during `addTxIntention`

**Root cause:** `from: ordinalsAccount.address` passed to `addTxIntention`. MIDL derives a different EVM address from the Bitcoin P2TR string (`bcrt1p...`) than `useAccount()` returns from wagmi. The contract's `isRegistered` check passes for the wagmi address (registered), but the transaction executes from the MIDL-derived address (not registered).

**Fix:**

```ts
// WRONG
addTxIntention({ intention: { evmTransaction: { to, data } }, from: ordinalsAccount.address });

// CORRECT — omit `from` entirely
addTxIntention({ reset: true, intention: { evmTransaction: { to, data } } });
```

**Reference:** `project_context.md` §17 Lesson 1

---

### E2 — Xverse popup never appears / write flow stalls silently

**Where:** After `addTxIntention` completes — wallet UI never opens

**Root cause:** `finalizeBTCTransaction()` called inside `useEffect`. Browsers block popup windows not triggered by a direct user gesture.

**Fix:**

```tsx
// WRONG
useEffect(() => {
  if (txIntentions.length > 0) finalizeBTCTransaction();
}, [txIntentions.length]);

// CORRECT — expose finalize() from the hook, call from button onClick
const { write, finalize, phase } = useMidlContractWrite();

{phase === "adding-intention" && (
  <button onClick={finalize}>Sign with Xverse</button>
)}
```

**Reference:** `project_context.md` §17 Lesson 2

---

### E3 — `useAccount()` / `useReadContract()` / `usePublicClient()` returns undefined or wrong chain

**Where:** wagmi hooks inside MIDL dApp

**Root cause:** `WagmiMidlProvider` received a pre-created `createConfig()` result as a prop. It auto-configures internally for chainId 15001 and takes no props.

**Fix:**

```tsx
// WRONG
<WagmiMidlProvider config={midlConfig}>...</WagmiMidlProvider>

// CORRECT
<MidlProvider config={midlConfig}>
  <QueryClientProvider client={queryClient}>
    <WagmiMidlProvider>  {/* no props */}
      {children}
    </WagmiMidlProvider>
  </QueryClientProvider>
</MidlProvider>
```

**Reference:** `project_context.md` §17 Lesson 3

---

### E4 — Gas estimation hangs or fails silently

**Where:** Any contract write operation

**Root cause:** Standard `viem` installed — missing `estimateGasMulti`. MIDL requires `@midl/viem@2.21.39`.

**Fix:**

```json
{
  "dependencies": { "viem": "npm:@midl/viem@2.21.39" },
  "pnpm": { "overrides": { "viem": "npm:@midl/viem@2.21.39" } }
}
```

Then reinstall: `pnpm install`

---

### E5 — `Cannot finalize BTC transaction without intentions`

**Where:** `finalizeBTCTransaction()` call

**Root cause:** `finalizeBTCTransaction` called in the same synchronous render cycle as `addTxIntention`. The context dispatch hasn't populated `txIntentions` yet.

**Fix:** `finalizeBTCTransaction` must run in a subsequent render cycle. The pattern: `addTxIntention` sets `phase = "adding-intention"`, then the user clicks a button which calls `finalize()` → `finalizeBTCTransaction()`.

---

### E6 — Xverse UTXO indexer fails / PSBT build fails

**Where:** PSBT construction via Xverse on regtest

**Root cause:** Xverse UTXO indexer can lag behind on regtest — UTXOs not yet indexed.

**Fix:** Switch to Leather connector for regtest testing. Xverse remains primary for staging/mainnet.

---

### E7 — Contract verification fails on Blockscout

**Where:** `npx hardhat verify --network regtest <ADDRESS>`

**Root cause (most common):** Compiler settings mismatch between deploy and verify.

**Fix checklist:**

- [ ] `pragma solidity 0.8.24;` — exact, not `^`
- [ ] `evmVersion: "paris"` in `hardhat.config.ts`
- [ ] `optimizer: { enabled: true, runs: 200 }`
- [ ] `sourcify: { enabled: false }` in `hardhat.config.ts`
- [ ] Verify immediately after deploy — settings drift if delayed
- [ ] Constructor args passed correctly to verify command

---

### E8 — Deploy hangs for > 15 minutes

**Where:** `hre.midl.deploy()` or `hre.midl.execute()`

**Expected timing:** 30s–2min for deployment, 8–15min for write operations.

**If > 15 min:**

1. Check staging Bitcoin mempool: `https://mempool.staging.midl.xyz`
2. Confirm PSBT was signed and broadcast
3. Check staging RPC: `https://rpc.staging.midl.xyz` — confirm chain is producing blocks
4. Do NOT kill the process and retry without confirming the first tx failed

---

### E9 — `ERR_UNSUPPORTED_DIR_IMPORT` importing `@midl/*` in Node.js

**Where:** Node.js test scripts using ESM (`import`)

**Root cause:** `@midl/*` packages ship CJS builds. ESM `.mjs` imports fail on directory imports.

**Fix:** Use `.cjs` extension with `require()`:

```js
const { createConfig, regtest } = require("@midl/core");
const { keyPairConnector } = require("@midl/node");
```

---

### E10 — `async/await` on synchronous `write()`

**Where:** Consumer hooks calling `await write(...)`

**Root cause:** `write()` from `useMidlContractWrite` returns `void`, not a Promise.

**Fix:** Remove `async/await` from the caller:

```ts
// WRONG
const myAction = async () => { await write({ to, data }); };

// CORRECT
const myAction = () => { write({ to, data }); };
```
