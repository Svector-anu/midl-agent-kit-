# Social Guestbook — Architecture

## Provider tree

```
<WalletProvider>                          wallet/WalletProvider.tsx
  <MidlProvider config={midlConfig}>      Bitcoin wallet context (@midl/react)
    <QueryClientProvider>                 Async state (@tanstack/react-query)
      <WagmiMidlProvider config={...}>    EVM read/write context (@midl/executor-react)
        <App />
          <WalletConnect />
          <RegisterUser />
          <CreatePost />
          <GuestbookFeed />
            <PostCard /> ×N
              <CommentList />
      </WagmiMidlProvider>
    </QueryClientProvider>
  </MidlProvider>
</WalletProvider>
```

**Order is mandatory.** `WagmiMidlProvider` must be inside `QueryClientProvider`, which must be inside `MidlProvider`.

### Why three separate providers

| Provider | Owns | Notes |
|----------|------|-------|
| `MidlProvider` | Bitcoin wallet connection, P2TR/P2WPKH accounts, PSBT lifecycle | Takes `midlConfig` (from `createConfig`) |
| `QueryClientProvider` | All React Query state, caching, invalidation | `WagmiMidlProvider` hooks require this above them |
| `WagmiMidlProvider` | Wagmi config auto-created for MIDL chain (chainId 15001) | Takes raw config params — NOT `createConfig()` result |

`WagmiMidlProvider` constructs its own `createConfig` internally. Passing a pre-created config object causes a type mismatch that breaks `useAccount`, `useReadContract`, and `usePublicClient`.

---

## Write flow state machine

```
                        write() called
idle ──────────────────────────────────► adding-intention
                                              │
                              finalize()      │  ← MUST be button onClick
                              (user gesture)  │
                                              ▼
                                         finalizing  ──── Xverse popup open
                                              │
                              user approves   │
                              PSBT in Xverse  │
                                              ▼
                                          signing  ──── signIntentionAsync × N
                                              │
                                              ▼
                                        broadcasting ─── sendBTCTransactions
                                              │
                                              ▼
                                      pending-confirm ── waitForTransaction polling
                                              │
                                              ▼
                                          confirmed  ──── onSuccess() callback
                                              │
                                       reset() called
                                              │
                                              ▼
                                            idle

             (any step) ──── exception ────► error
                                              │
                                       reset() called
                                              ▼
                                            idle
```

### Implementation: `useMidlContractWrite`

```
src/hooks/useMidlContractWrite.ts
```

All feature-specific write hooks (`useRegisterUser`, `useCreatePost`, `useLikePost`, etc.) delegate to this single hook. It owns the full state machine.

**Stale closure pattern:** `finalizeBTCTransaction`'s `onSuccess` is registered once at mount. It reads `txIntentions`, `signIntentionAsync`, `publicClient`, and `waitForTransaction` from refs rather than closed-over values, so they're always current when the callback fires.

---

## Contract binding

```
src/lib/contract.ts
```

Reads address + ABI from `state/deployment-log.json` via the `@state` Vite alias. Throws at startup if the contract name is absent — fails fast instead of silently calling `0x0000…`.

```ts
import deploymentLog from "@state/deployment-log.json";
// → resolves to ../../state/deployment-log.json (monorepo root)
```

**Never hardcode the address.** The alias is configured in `vite.config.ts`:

```ts
"@state": path.resolve(__dirname, "../../state")
```

---

## RPC transport

`vite.config.ts` proxies `/midl-rpc` → `https://rpc.staging.midl.xyz` through Node.js. The browser talks to `localhost` (plain HTTP); Node.js handles the TLS handshake to staging. This prevents `ERR_SSL_BAD_RECORD_MAC_ALERT` in Chrome.

`WalletProvider` configures the Wagmi transport as `http("/midl-rpc")`, so all `useReadContract` and public client calls go through the proxy.

---

## Known pitfalls

### 1. `from` in `addTxIntention`

**Never** pass `from: ordinalsAccount.address`. MIDL derives a different EVM address from the P2TR string than `useAccount()` returns. The contract checks `msg.sender`, which is the MIDL-derived address, not the wagmi address — causing "Must be registered" reverts even for registered users.

```ts
// WRONG
addTxIntention({ intention: { evmTransaction: { to, data } }, from: ordinalsAccount.address });

// CORRECT — omit `from` entirely
addTxIntention({ reset: true, intention: { evmTransaction: { to, data } } });
```

### 2. `finalizeBTCTransaction` in `useEffect`

Xverse opens its signing UI as a browser popup. Browsers block popups not triggered by a direct user gesture. `finalizeBTCTransaction()` called from `useEffect` silently stalls — no popup, no error.

**Always** expose `finalize` from `useMidlContractWrite` and call it from a `button onClick`.

### 3. `WagmiMidlProvider` receives `createConfig()` result

`WagmiMidlProvider` expects raw config params and calls `createConfig` internally. Passing a pre-created config object causes a type error and breaks all Wagmi hooks.

### 4. Xverse UTXO indexer lag on regtest

Xverse's UTXO indexer sometimes lags on regtest, causing "Insufficient UTXOs" errors even when the wallet has funds. Use Leather as a fallback (add `leatherConnector()` to `midl-config.ts`).

### 5. Floating pragma causes bytecode mismatch on verification

`pragma solidity ^0.8.24` resolves to whatever solc is installed on the deploy machine. If that's not 0.8.24, verification fails because the locally compiled bytecode differs from on-chain. Always use an exact pragma (`pragma solidity 0.8.28;`) matching `hardhat.config.ts`'s `version` field.
