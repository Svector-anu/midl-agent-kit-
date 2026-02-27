# MIDL Preflight Gate

**MANDATORY hard gate. Run BEFORE implementing any MIDL wallet connection, transaction flow, contract deployment, or SDK integration.**

---

## Trigger Conditions

Run this preflight when ANY of the following appear in the user's request:

| Signal | Examples |
|--------|---------|
| Wallet connection | Xverse, Leather, `useConnect`, `useAccounts`, connect wallet |
| Transaction flow | `addTxIntention`, `finalizeBTCTransaction`, `signIntention`, write contract |
| Contract deployment | Hardhat deploy, `hre.midl.deploy`, `@midl/hardhat-deploy` |
| SDK integration | Any `@midl/*` package, executor, connectors |
| Contract verification | Blockscout, verify, `hardhat verify` |

---

## Step 1: Read SDK + Deployment Skills (BOTH — before any code)

**MANDATORY FIRST ACTION.** Before reading any codebase or writing any plan, read ALL of:

```
/midl-sdk
skills/deploy-contracts/SKILL.md
```

Read `deploy-contracts/SKILL.md` in full **before writing a single line of `.sol`**. That skill defines the exact compiler version, optimizer settings, and evmVersion that must be locked in across three places simultaneously:

| Where | What to set |
|-------|-------------|
| `pragma solidity X.Y.Z;` in `.sol` | Exact version — never `^` |
| `hardhat.config.ts` → `version` | Same exact version |
| `deployment-log.json` → `solcVersion` | Same exact version |

> **Root cause of the solc 0.8.28 pragma-drift bug (Feb 2026):** Contract was written with `pragma solidity ^0.8.24`. Deploy machine had solc 0.8.28 installed. Hardhat resolved the float pragma to 0.8.28. Verification failed because local compilation used 0.8.24. Fix required probing optimizer settings (disabled vs enabled) before bytecode matched. Lost: one full verification cycle.
>
> **Prevention:** Read deploy-contracts before writing. Set exact pragma. Confirm optimizer setting from the skill — do not assume `enabled: true, runs: 200`.

Do NOT proceed until both skills have been read in full.

---

## Step 2: Verify Three Known Failure Patterns

Confirm you will NOT repeat these. Each was a real production bug.

---

### Failure A — `from` in `addTxIntention`

**Root cause:** Passing `from: ordinalsAccount.address` (a Bitcoin P2TR string like `bcrt1p...`) causes MIDL to derive a *different* EVM address than `useAccount()` returns. The registration check passes (wagmi address is registered), but the transaction executes from the unregistered MIDL-derived address.

**Error:** `execution reverted: Must be registered` during `eth_estimateGasMulti`

**WRONG:**
```ts
addTxIntention({
  intention: { evmTransaction: { to, data } },
  from: ordinalsAccount.address,  // ❌ causes EVM address mismatch
});
```

**CORRECT:**
```ts
addTxIntention({
  reset: true,
  intention: { evmTransaction: { to, data } },
  // NO `from` field — MIDL uses the wagmi-connected EVM address
});
```

---

### Failure B — `finalizeBTCTransaction` in `useEffect`

**Root cause:** Xverse opens its PSBT signing UI in a popup window. Browsers block popups not triggered by a direct user gesture (button click). Calling `finalizeBTCTransaction()` inside `useEffect` means the wallet UI never appears — the write flow silently stalls.

**WRONG:**
```ts
useEffect(() => {
  if (txIntentions.length > 0) {
    finalizeBTCTransaction();  // ❌ browser blocks popup — no user gesture
  }
}, [txIntentions.length]);
```

**CORRECT:**
```ts
// useMidlContractWrite exposes `finalize` — call it only from a button onClick
const { write, finalize, phase } = useMidlContractWrite();

// In the component:
{phase === "adding-intention" && (
  <button onClick={finalize}>Sign with Xverse</button>
)}
```

---

### Failure C — `WagmiMidlProvider` receives `createConfig()` result

**Root cause:** `WagmiMidlProvider` sets up its own internal wagmi config tied to the MIDL chain (15001). It does NOT accept a pre-created `createConfig()` result — passing one causes a type mismatch and breaks `useAccount()`, `useReadContract()`, and `usePublicClient()`.

**WRONG:**
```tsx
const midlConfig = createConfig({ networks: [regtest], connectors: [...] });

<WagmiMidlProvider config={midlConfig}>  {/* ❌ type mismatch */}
  {children}
</WagmiMidlProvider>
```

**CORRECT:**
```tsx
// midlConfig is used by MidlProvider only.
// WagmiMidlProvider takes NO props — it auto-configures for chainId 15001.
<MidlProvider config={midlConfig}>
  <QueryClientProvider client={queryClient}>
    <WagmiMidlProvider>  {/* ← no config prop */}
      {children}
    </WagmiMidlProvider>
  </QueryClientProvider>
</MidlProvider>
```

---

## Step 3: Environment Checklist

Confirm before any write flow implementation:

- [ ] `viem` overridden to `npm:@midl/viem@2.21.39` in **both** `dependencies` and `pnpm.overrides`
- [ ] RPC is `https://rpc.staging.midl.xyz` — never a local regtest RPC
- [ ] Provider tree: `MidlProvider → QueryClientProvider → WagmiMidlProvider`
- [ ] Payable function: if yes, confirm `satoshisToWei(sats)` for `value`, `depositSatoshis` for MIDL deposit
- [ ] Wallet under test: Xverse (primary), Leather (fallback for regtest UTXO issues)

---

## Step 4: State Your Plan

Before writing code, state explicitly:

1. Which SDK functions will be called (from the skill docs — exact names)
2. Which of the three failure patterns is relevant, and how you will avoid it
3. Whether the function is payable and how value/deposit will be handled
4. Which phase/state transitions the UI must expose (esp. `adding-intention` → user gesture)

---

## Step 5: Implement

Only after completing Steps 1–4, proceed using `/rigorous-coding`.

---

## Preflight Completion Header

When this skill completes, begin your implementation response with:

```
MIDL PREFLIGHT: COMPLETE
SDK read: ✓
Failure A (from in addTxIntention): RELEVANT | NOT RELEVANT
Failure B (finalize in useEffect):  RELEVANT | NOT RELEVANT
Failure C (WagmiMidlProvider config): RELEVANT | NOT RELEVANT
Environment: ✓ | MISSING: [item]
```
### SharedContext usage (PLAN only)
- Recall “known pitfalls” and “last known good templates” relevant to the task.
- Do NOT use SharedContext for deterministic state (addresses, deployments, feature flags).
- If recalled info conflicts with files, files win and conflict must be flagged.