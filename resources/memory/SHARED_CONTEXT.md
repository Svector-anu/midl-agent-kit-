# SharedContext — Optional Memory Layer for the MIDL Agent Kit

## What it is

SharedContext is a local-first memory layer for LLM agents, exposed as an MCP server. It lets developers and agents persist decisions across sessions — which template was chosen, MIDL-specific gotchas that were hit, deploy patterns that worked — without re-explaining everything from scratch each time. Data is stored locally and can optionally be synced, but the local store is always the primary source.

## Why it helps with this kit

Working with MIDL involves a set of recurring concepts that trip agents up if they start fresh every session:

- **Template choice** — remembering why `staking-dashboard` was picked over `erc20-dashboard` for a given project, so future sessions don't re-litigate it.
- **Project decisions** — contract addresses in use, which capabilities are enabled, feature flags agreed upon.
- **MIDL execution patterns** — the 4-step write flow (`addTxIntention → finalizeBTCTransaction → signIntention → sendBTCTransactions`), the `@midl/viem` override requirement, the staging RPC, OZ v4 vs v5 constraints. These are non-obvious and costly to rediscover.
- **Known quirks and fixes** — e.g. wagmi must be pinned to an exact version, `viem` alias must not appear in `vite.config.ts`, `deploy.dependencies` causes nonce collisions on MIDL.

## Safety and precedence rules

**SharedContext is advisory only.** It never overrides file-based state.

The canonical sources of truth for this kit are, in order:

1. `state/deployment-log.json` — contract addresses, ABI, verification status
2. `state/demo-contracts.json` — demo health (active / funded / rateSet)
3. `state/erc-compatibility.json` — which EVM capabilities are enabled

An agent must always read those files directly. A SharedContext fact that contradicts them is stale and should be ignored.

**Never store in SharedContext:**
- Mnemonics, private keys, or seed phrases
- API keys or private RPC URLs
- Addresses that aren't already in `deployment-log.json`

**Good things to store:**
- `"we used template staking-dashboard for project X and enabled erc20+staking capabilities"`
- `"preferred stack: vite + wagmi 2.13.0 pinned, @midl/viem override in package.json only"`
- `"known quirk: OZ v5 uses mcopy opcode — use OZ v4 on MIDL staging (paris EVM)"`
- `"deploy pattern: midl.deploy() → midl.execute() → midl.get() — three separate calls, no dependencies array"`

## Using SharedContext with the MIDL Agent Kit

Assumes SharedContext is already installed and configured as an MCP server in your client (Claude Code, Cursor, etc.).

**At the start of a session:**
```
recall_context(topic="midl-agent-kit project decisions")
recall_context(topic="midl gotchas deployment patterns")
```
Then verify any addresses or statuses against `state/deployment-log.json` before acting on them.

**At the end of a session:**
Store 1–3 key learnings or decisions, tagged with the repo name:
```
store_fact(key="midl-agent-kit:template-choice", value="staking-dashboard, erc20+staking caps", tags=["midl-agent-kit", "template"])
store_fact(key="midl-agent-kit:wagmi-pin", value="pin wagmi to exact 2.13.0 — newer breaks @midl/viem", tags=["midl-agent-kit", "gotcha"])
```

This is optional. The kit works fine without it. But if your client supports MCP, enabling SharedContext eliminates the most common agent ramp-up cost on MIDL projects.
