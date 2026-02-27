# Social Guestbook dApp — Implementation Reference

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Dependencies](#dependencies)
- [Configuration](#configuration)
  - [MIDL Config](#midl-config)
  - [WalletProvider](#walletprovider)
  - [Vite Configuration](#vite-configuration)
  - [Contract Binding](#contract-binding)
- [Type Definitions](#type-definitions)
- [MIDL SDK Write Flow](#midl-sdk-write-flow)
- [Hooks](#hooks)
  - [useMidlContractWrite](#usemidlcontractwrite)
  - [useCreatePost](#usecreatepost)
  - [useRegisterUser](#useregisteruser)
  - [useLikePost](#uselikepost)
  - [useCommentOnPost](#usecommentonpost)
  - [useTipAuthor](#usetipauthor)
  - [useGuestbookReads](#useguestbookreads)
- [Components](#components)
  - [App](#app)
  - [WalletConnect](#walletconnect)
  - [RegisterUser](#registeruser)
  - [CreatePost](#createpost)
  - [GuestbookFeed](#guestbookfeed)
  - [PostCard](#postcard)
  - [CommentList](#commentlist)
  - [TxStatus](#txstatus)

---

## Architecture Overview

The Social Guestbook is a React dApp that interacts with a Solidity contract deployed on the MIDL network. MIDL is a Bitcoin-native EVM chain where transactions are signed via a Bitcoin wallet (Xverse) using PSBTs (Partially Signed Bitcoin Transactions) rather than a traditional EVM wallet.

The application layer is composed of three distinct concerns:

1. **Bitcoin wallet context** — managed by `@midl/react` (`MidlProvider`), handles wallet connection and account state for both P2TR (Ordinals/EVM identity) and P2WPKH (BTC payment) address types.
2. **EVM read/write context** — managed by `@midl/executor-react` (`WagmiMidlProvider`) layered over Wagmi, enabling standard `useReadContract` calls and the MIDL-specific write transaction flow.
3. **Async state** — managed by `@tanstack/react-query` via `QueryClientProvider`.

The component tree reads contract state directly via Wagmi hooks and writes via the MIDL 4-step write flow, which requires an explicit user gesture (button click) at the PSBT signing step.

```
App
└── WalletProvider
    ├── MidlProvider          (@midl/react)
    ├── QueryClientProvider   (@tanstack/react-query)
    └── WagmiMidlProvider     (@midl/executor-react)
        └── App UI
            ├── WalletConnect
            ├── RegisterUser
            ├── CreatePost
            └── GuestbookFeed
                └── PostCard (×N)
                    └── CommentList
```

---

## Dependencies

| Package | Version | Role |
|---|---|---|
| `@midl/core` | ^3.0.1 | Network config, address types |
| `@midl/react` | ^3.0.1 | `MidlProvider`, `useAccounts`, `useConnect`, `useDisconnect`, `useWaitForTransaction` |
| `@midl/executor` | ^3.0.1 | `satoshisToWei`, `getEVMFromBitcoinNetwork` |
| `@midl/executor-react` | ^3.0.1 | `WagmiMidlProvider`, `useAddTxIntention`, `useFinalizeBTCTransaction`, `useSignIntention` |
| `@midl/connectors` | ^3.0.1 | `xverseConnector` |
| `viem` | `npm:@midl/viem@2.21.39` | Aliased to MIDL's fork; provides `encodeFunctionData`, `http` transport, `sendBTCTransactions` |
| `wagmi` | ^2.13.0 | `useReadContract`, `usePublicClient`, `useAccount` |
| `@tanstack/react-query` | ^5.0.0 | Async state management |
| `react` | ^18.3.1 | UI framework |

`viem` is aliased to `@midl/viem` both in `package.json` overrides and in `vite.config.ts` resolve aliases. This ensures all transitive dependencies (including Wagmi) resolve to the MIDL-patched viem fork, which exposes the `sendBTCTransactions` method on the public client.

---

## Configuration

### MIDL Config

**File:** `src/lib/midl-config.ts`

```ts
import { createConfig, regtest } from "@midl/core";
import { xverseConnector } from "@midl/connectors";

export const midlConfig = createConfig({
  networks: [regtest],
  connectors: [xverseConnector()],
  persist: true,
});
```

Creates the MIDL core config targeting the `regtest` network with Xverse as the sole connector. `persist: true` retores wallet connection across page reloads.

This config is passed to `MidlProvider` in `WalletProvider`. It is separate from the Wagmi config, which is constructed independently inside `WalletProvider`.

---

### WalletProvider

**File:** `src/wallet/WalletProvider.tsx`

The root provider component. Wraps the entire application and establishes all three provider contexts in the required order:

```
MidlProvider → QueryClientProvider → WagmiMidlProvider
```

The Wagmi config is constructed as a plain options object (not via `createConfig`) because `WagmiMidlProvider` expects raw config parameters and calls `createConfig` internally.

The EVM transport targets `/midl-rpc`, a Vite dev-server proxy path that forwards requests to `https://rpc.staging.midl.xyz`. This routes RPC traffic through Node.js rather than the browser, avoiding TLS issues with the staging endpoint.

```ts
const midlChain = getEVMFromBitcoinNetwork(regtest);
const wagmiConfigParams = {
  chains: [midlChain] as [typeof midlChain],
  transports: { [midlChain.id]: http("/midl-rpc") },
  multiInjectedProviderDiscovery: false,
  ssr: false,
};
```

`multiInjectedProviderDiscovery: false` prevents Wagmi from detecting browser-injected EVM wallets (MetaMask, etc.), which are not compatible with the MIDL signing flow.

---

### Vite Configuration

**File:** `vite.config.ts`

Two relevant configurations:

**Resolve alias — viem:**
```ts
resolve: {
  alias: {
    viem: "@midl/viem",
    "@state": path.resolve(__dirname, "../../state"),
  },
},
```

Forces all `import ... from "viem"` statements (in application code and node_modules) to resolve to `@midl/viem`. The `@state` alias resolves to the monorepo-level `state/` directory, enabling `import deploymentLog from "@state/deployment-log.json"`.

**Dev server proxy:**
```ts
server: {
  proxy: {
    "/midl-rpc": {
      target: "https://rpc.staging.midl.xyz",
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/midl-rpc/, ""),
      secure: true,
    },
  },
},
```

All EVM RPC calls from the browser go to `http://localhost:PORT/midl-rpc/...`. Vite strips the `/midl-rpc` prefix and forwards the request to the staging RPC endpoint over HTTPS, with Node.js handling the TLS handshake.

The `fs.allow` setting extends the dev server's file system access to the monorepo root, enabling the `@state` alias to serve files outside the `dapps/social-guestbook/` directory.

---

### Contract Binding

**File:** `src/lib/contract.ts`

```ts
import deploymentLog from "@state/deployment-log.json";

const guestbook = getContractEntry("SocialGuestbook");

export const SOCIAL_GUESTBOOK_ADDRESS = guestbook.address as `0x${string}`;
export const SOCIAL_GUESTBOOK_ABI = guestbook.abi as Abi;
```

Reads the deployed contract address and ABI from `state/deployment-log.json` at the monorepo root. `getContractEntry` searches the `deployments` array by contract name and throws if the entry is absent, failing fast if the deployment lifecycle has not been run.

All hooks import `SOCIAL_GUESTBOOK_ADDRESS` and `SOCIAL_GUESTBOOK_ABI` from this module. There is no hardcoded address anywhere in the application.

---

## Type Definitions

**File:** `src/types/guestbook.ts`

### `Post`

```ts
interface Post {
  id: bigint;
  author: `0x${string}`;
  content: string;
  timestamp: bigint;
  likeCount: bigint;
  exists: boolean;
}
```

Mirrors the tuple returned by the `getPost` contract function. `timestamp` is a Unix epoch in seconds. `exists` is a sentinel field — the contract uses it to distinguish a real post from an uninitialized storage slot.

### `Comment`

```ts
interface Comment {
  author: `0x${string}`;
  text: string;
  timestamp: bigint;
}
```

Mirrors an element of the array returned by `getComments`.

### `UserProfile`

```ts
interface UserProfile {
  username: string;
  exists: boolean;
}
```

Mirrors the tuple returned by `getProfile`. `exists` indicates whether the address has completed registration.

### `TxPhase`

```ts
type TxPhase =
  | "idle"
  | "adding-intention"
  | "finalizing"
  | "signing"
  | "broadcasting"
  | "pending-confirm"
  | "confirmed"
  | "error";
```

Tracks the current stage of a MIDL write transaction. Each phase corresponds to a distinct step in the 4-step write flow. See [MIDL SDK Write Flow](#midl-sdk-write-flow) for the full state machine.

---

## MIDL SDK Write Flow

All contract writes in this application go through a 4-step flow implemented in `useMidlContractWrite`. Understanding this flow is essential for working with any write hook.

### Why the flow exists

MIDL transactions are BTC-anchored: the EVM call is bundled with a Bitcoin PSBT. Xverse must approve the PSBT before the transaction can be broadcast. Xverse opens its PSBT approval UI as a popup window. Browsers block popup windows that are not opened during a direct user gesture (a `click` event), so the PSBT signing step must be triggered from a button's `onClick` handler — never from a `useEffect` or an async callback.

This constraint splits what would otherwise be a single "send transaction" call into two explicit user actions:

1. **Prepare** — encode and queue the EVM call (can happen anywhere, no popup).
2. **Sign** — trigger the Xverse popup (must happen in a button `onClick`).

### Phase state machine

```
idle
  │
  ▼ write() called
adding-intention        ← EVM intention queued via addTxIntention()
  │
  ▼ finalize() called from button onClick
finalizing              ← Xverse PSBT popup open
  │
  ▼ user approves PSBT in Xverse
signing                 ← signIntentionAsync() called for each queued intention
  │
  ▼ all intentions signed
broadcasting            ← publicClient.sendBTCTransactions() called
  │
  ▼ broadcast accepted
pending-confirm         ← waitForTransaction() polling
  │
  ▼ transaction confirmed on-chain
confirmed               ← onSuccess() callback invoked
  │
  ▼ reset() called
idle

(any step) → error      ← exception caught; error message set
```

### Step-by-step

**Step 1 — `write()`**

Calls `addTxIntention({ reset: true, intention: { evmTransaction, deposit } })`. This queues the EVM transaction with the MIDL executor. If a BTC deposit is required (posting fee or tip), `deposit.satoshis` is set here. `reset: true` clears any previously queued intentions.

**Step 2 — `finalize()`**

Must be called from a button `onClick`. Calls `finalizeBTCTransaction()`, which opens the Xverse PSBT approval popup. The result (PSBT + signed BTC transaction hex and ID) is delivered via the `onSuccess` callback of `useFinalizeBTCTransaction`.

**Step 3 — Sign each intention**

Inside `finalizeBTCTransaction`'s `onSuccess`, `signIntentionAsync` is called once per queued intention. It binds the EVM call to the BTC transaction ID, producing a signed EVM transaction.

**Step 4 — Broadcast**

`publicClient.sendBTCTransactions` submits all signed EVM transactions alongside the raw BTC transaction hex to the MIDL network. Once accepted, `waitForTransaction` polls for on-chain confirmation and calls `onSuccess` when complete.

### Stale closure handling

The `onSuccess` callback of `useFinalizeBTCTransaction` is registered once at component mount. To avoid stale closure captures of `txIntentions`, `signIntentionAsync`, `publicClient`, and `waitForTransaction`, each is maintained in a ref that is kept current via `useEffect`:

```ts
const txIntentionsRef = useRef(txIntentions);
useEffect(() => { txIntentionsRef.current = txIntentions; }, [txIntentions]);
```

The callback reads from refs rather than closed-over values.

---

## Hooks

### useMidlContractWrite

**File:** `src/hooks/useMidlContractWrite.ts`

The base write hook. All feature-specific write hooks delegate to this one.

**Signature:**
```ts
function useMidlContractWrite(onSuccess?: () => void): {
  write: (params: WriteTxParams) => void;
  finalize: () => void;
  phase: TxPhase;
  error: string | null;
  btcTxId: string | null;
  reset: () => void;
}
```

**`WriteTxParams`:**
```ts
interface WriteTxParams {
  to: `0x${string}`;       // contract address
  data: `0x${string}`;     // ABI-encoded function call
  depositSatoshis?: number; // BTC deposit amount; omit for zero-value calls
  valueWei?: bigint;        // EVM msg.value; must match depositSatoshis converted via satoshisToWei
}
```

**Returns:**

| Field | Type | Description |
|---|---|---|
| `write` | `(params: WriteTxParams) => void` | Step 1: encodes and queues the EVM intention |
| `finalize` | `() => void` | Step 2: triggers Xverse PSBT popup; call from button `onClick` only |
| `phase` | `TxPhase` | Current transaction phase |
| `error` | `string \| null` | Error message when `phase === "error"` |
| `btcTxId` | `string \| null` | Bitcoin transaction ID; available from `pending-confirm` onward |
| `reset` | `() => void` | Resets phase to `"idle"` and clears error and btcTxId |

**`onSuccess`** is called once when `phase` transitions to `"confirmed"`.

---

### useCreatePost

**File:** `src/hooks/useCreatePost.ts`

Wraps `useMidlContractWrite` for the `createPost` contract function.

**Signature:**
```ts
function useCreatePost(onSuccess?: () => void): {
  createPost: (content: string, postingFeeWei: bigint) => void;
  finalize: () => void;
  phase: TxPhase;
  error: string | null;
  btcTxId: string | null;
  reset: () => void;
}
```

**`createPost(content, postingFeeWei)`**

Encodes `createPost(content)` via `encodeFunctionData`. If `postingFeeWei > 0`, converts to satoshis using the 1 satoshi = 10^10 wei ratio, then uses `satoshisToWei` to set `valueWei` for the EVM `msg.value`. This two-step conversion ensures the satoshi value sent to the BTC deposit and the wei value sent as `msg.value` are consistent with MIDL's canonical unit ratio.

`postingFeeWei` must be read from the contract via `usePostingFee()` before calling.

---

### useRegisterUser

**File:** `src/hooks/useRegisterUser.ts`

Wraps `useMidlContractWrite` for the `registerUser` contract function.

**Signature:**
```ts
function useRegisterUser(onSuccess?: () => void): {
  registerUser: (username: string) => void;
  finalize: () => void;
  phase: TxPhase;
  error: string | null;
  btcTxId: string | null;
  reset: () => void;
}
```

**`registerUser(username)`**

Encodes `registerUser(username)`. No BTC deposit required; `depositSatoshis` and `valueWei` are omitted from the `write` call.

---

### useLikePost

**File:** `src/hooks/useLikePost.ts`

Wraps `useMidlContractWrite` for the `likePost` contract function.

**Signature:**
```ts
function useLikePost(onSuccess?: () => void): {
  likePost: (postId: bigint) => void;
  finalize: () => void;
  phase: TxPhase;
  error: string | null;
  btcTxId: string | null;
  reset: () => void;
}
```

**`likePost(postId)`**

Encodes `likePost(postId)`. No BTC deposit. The contract enforces that each address can like a post at most once; `useHasLiked` is used in the UI to disable the button if the connected address has already liked the post.

---

### useCommentOnPost

**File:** `src/hooks/useCommentOnPost.ts`

Wraps `useMidlContractWrite` for the `commentOnPost` contract function.

**Signature:**
```ts
function useCommentOnPost(onSuccess?: () => void): {
  commentOnPost: (postId: bigint, text: string) => void;
  finalize: () => void;
  phase: TxPhase;
  error: string | null;
  btcTxId: string | null;
  reset: () => void;
}
```

**`commentOnPost(postId, text)`**

Encodes `commentOnPost(postId, text)`. No BTC deposit.

---

### useTipAuthor

**File:** `src/hooks/useTipAuthor.ts`

Wraps `useMidlContractWrite` for the `tipAuthor` contract function.

**Signature:**
```ts
function useTipAuthor(onSuccess?: () => void): {
  tipAuthor: (postId: bigint, tipSatoshis: number) => void;
  finalize: () => void;
  phase: TxPhase;
  error: string | null;
  btcTxId: string | null;
  reset: () => void;
}
```

**`tipAuthor(postId, tipSatoshis)`**

Encodes `tipAuthor(postId)` and sets both `depositSatoshis` and `valueWei` from the caller-supplied `tipSatoshis`. `valueWei` is computed via `satoshisToWei(tipSatoshis)`. The tip amount is determined by the caller; the UI currently passes 1000 satoshis.

---

### useGuestbookReads

**File:** `src/hooks/useGuestbookReads.ts`

Exports six read hooks, each wrapping `useReadContract` from Wagmi. All calls target `SOCIAL_GUESTBOOK_ADDRESS` with `SOCIAL_GUESTBOOK_ABI`.

#### `usePostCount()`

```ts
function usePostCount(): UseReadContractReturnType
```

Reads the `postCount` state variable. Returns the total number of posts as a `bigint`. Post IDs are 1-indexed; valid IDs are in the range `[1, postCount]`.

#### `usePostingFee()`

```ts
function usePostingFee(): UseReadContractReturnType
```

Reads the `postingFee` state variable. Returns the current fee in wei as a `bigint`. Must be read before calling `createPost` to supply the correct fee.

#### `usePost(postId, enabled?)`

```ts
function usePost(postId: bigint, enabled?: boolean): UseReadContractReturnType
```

Calls `getPost(postId)`. Disabled automatically when `postId <= 0n` or when `enabled` is explicitly `false`. Returns a tuple `[id, author, content, timestamp, likeCount, exists]`.

#### `useComments(postId, enabled?)`

```ts
function useComments(postId: bigint, enabled?: boolean): UseReadContractReturnType
```

Calls `getComments(postId)`. Returns an array of `Comment` tuples. Disabled when `postId <= 0n`.

#### `useProfile(address)`

```ts
function useProfile(address: `0x${string}` | undefined): UseReadContractReturnType
```

Calls `getProfile(address)`. Returns a tuple `[username, exists]`. Disabled when `address` is `undefined`. The `exists` field is `true` only after a successful `registerUser` transaction.

#### `useHasLiked(postId, voterAddress)`

```ts
function useHasLiked(
  postId: bigint,
  voterAddress: `0x${string}` | undefined
): UseReadContractReturnType
```

Calls `hasLiked(postId, voterAddress)`. Returns a `boolean`. Disabled when `voterAddress` is `undefined` or `postId <= 0n`.

---

## Components

### App

**File:** `src/App.tsx`

The root component. Renders `WalletProvider` as the outermost wrapper, then lays out the application shell:

- `<header>` — application title and `WalletConnect`
- `<main>` — `RegisterUser`, `CreatePost`, and `GuestbookFeed` in vertical order

No state or logic lives in `App` itself.

---

### WalletConnect

**File:** `src/components/WalletConnect.tsx`

Renders wallet connection controls using `useConnect`, `useDisconnect`, and `useAccounts` from `@midl/react`.

Requests both `AddressPurpose.Ordinals` (P2TR) and `AddressPurpose.Payment` (P2WPKH) on connect. These are distinct Bitcoin address types derived from the same wallet seed:

- **Ordinals / P2TR** — used as the EVM identity for signing contract calls (`ordinalsAccount`)
- **Payment / P2WPKH** — used to pay Bitcoin network fees in `finalizeBTCTransaction` (`paymentAccount`)

**Connected state:** displays truncated versions of both addresses and a Disconnect button.

**Disconnected state:** renders one connect button per configured connector. Button is disabled while `status === "connecting"`.

---

### RegisterUser

**File:** `src/components/RegisterUser.tsx`

Allows a connected wallet to register a username on-chain.

**Reads:**
- `useAccounts()` — determines whether a wallet is connected; renders nothing if not.
- `useProfile(evmAddress)` — reads the current profile for the connected EVM address.

**Writes:** `useRegisterUser` with an `onSuccess` callback that calls `refetch()` and clears the username input.

**Rendering logic:**
- If not connected: renders nothing.
- If `profile[1] === true` (already registered): renders the registered username.
- Otherwise: renders a text input (max 32 characters) and a Register button.

The `isActive` derived value (`phase !== "idle" && phase !== "error" && phase !== "confirmed"`) disables the input and button while a transaction is in progress. `TxStatus` displays the current phase inline.

---

### CreatePost

**File:** `src/components/CreatePost.tsx`

Allows a registered, connected wallet to publish a post.

**Reads:**
- `useAccounts()` — renders nothing if not connected.
- `usePostingFee()` — reads the current fee; displays it in satoshis if non-zero (converted as `Number(postingFeeWei) / 1e10`).
- `useProfile(evmAddress)` — checks `profile[1]` to determine whether the user is registered.

**Writes:** `useCreatePost` with an `onSuccess` callback that clears the textarea.

**Rendering logic:**
- If not connected: renders nothing.
- If registered: renders a textarea (max 500 characters) and a Post button.
- If not registered: renders the textarea with a notice directing the user to register first; Post button is disabled.
- The Post button is disabled while a transaction is in progress, when content is empty, when `postingFeeWei` has not yet loaded, or when the user is not registered.

---

### GuestbookFeed

**File:** `src/components/GuestbookFeed.tsx`

Renders all posts in reverse chronological order (newest first).

**Reads:** `usePostCount()` to determine how many posts exist.

**Rendering logic:**
- Loading state: "Loading posts…"
- Error state: "Failed to load posts."
- Zero posts: "No posts yet. Be the first to write one!"
- Otherwise: generates an array of post IDs from `postCount` down to `1` and renders a `PostCard` for each.

Manages a single piece of state: `expandedPostId` (the ID of the post whose comment section is currently open, or `null`). Passes `isExpanded` and `onToggleExpand` to each `PostCard`; toggling an already-expanded card collapses it.

---

### PostCard

**File:** `src/components/PostCard.tsx`

Renders a single post with like and tip actions, and conditionally renders `CommentList`.

**Props:**
```ts
interface PostCardProps {
  postId: bigint;
  isExpanded: boolean;
  onToggleExpand: () => void;
}
```

**Reads:**
- `usePost(postId)` — fetches the post tuple.
- `useHasLiked(postId, evmAddress)` — determines whether the connected address has already liked this post.

The post tuple is destructured as `[id, author, content, timestamp, likeCount, exists]`. If `exists` is `false`, the component returns `null`.

**Writes:** two independent write operations, each with its own `TxStatus`:
- `useLikePost` — like button calls `likePost(postId)`; disabled if `hasLiked` is true or a like transaction is in progress.
- `useTipAuthor` — tip button calls `tipAuthor(postId, 1000)`; disabled while a tip transaction is in progress.

**`PostCardHeader`** (internal sub-component): renders the author display name and formatted timestamp. Calls `useProfile(author)` and displays the registered username if `profile[1] === true`, otherwise displays a truncated EVM address. Timestamp is formatted via `new Date(Number(timestamp) * 1000).toLocaleString()`.

**Comment section:** `CommentList` is rendered when `isExpanded` is `true`.

---

### CommentList

**File:** `src/components/CommentList.tsx`

Renders all comments on a post and provides a comment submission form for connected wallets.

**Props:**
```ts
interface CommentListProps {
  postId: bigint;
}
```

**Reads:** `useComments(postId)` — fetches the comment array.

**Writes:** `useCommentOnPost` with an `onSuccess` callback that calls `refetch()` and clears the input.

**Rendering logic:**
- If comments exist: renders an unordered list. Each item shows a truncated author address, comment text, and formatted timestamp.
- If no comments: renders "No comments yet."
- If connected: renders a text input (max 280 characters) and a Comment button below the list.
- If not connected: the input form is not rendered.

`isActive` disables the input and button while a transaction is in progress. `TxStatus` renders inline below the button.

---

### TxStatus

**File:** `src/components/TxStatus.tsx`

Stateless display component that reflects the current `TxPhase` to the user.

**Props:**
```ts
interface TxStatusProps {
  phase: TxPhase;
  error: string | null;
  btcTxId: string | null;
  onReset?: () => void;
  onFinalize?: () => void;
}
```

Returns `null` when `phase === "idle"`.

**Phase rendering:**

| Phase | Rendered content |
|---|---|
| `adding-intention` | "Transaction ready — sign with your wallet" + **Sign with Xverse** button (calls `onFinalize`) |
| `finalizing` | "Approve the PSBT in Xverse..." |
| `signing` | "Signing EVM transaction..." |
| `broadcasting` | "Submitting to MIDL network..." |
| `pending-confirm` | "Waiting for Bitcoin confirmation (less than 4 seconds on staging)" + link to mempool explorer |
| `confirmed` | "Transaction confirmed!" + link to mempool explorer |
| `error` | Error message + **Try again** button (calls `onReset`) |

The mempool explorer link targets `https://mempool.staging.midl.xyz/tx/{btcTxId}` and opens in a new tab.

The **Sign with Xverse** button in the `adding-intention` phase is what bridges the two-step write flow: when `TxStatus` renders this button, clicking it calls `onFinalize`, which maps to the `finalize` function from `useMidlContractWrite`. This is the required user gesture that allows the Xverse popup to open.

The root element receives a BEM modifier class `tx-status--{phase}` for phase-specific styling.
