# MIDL Universal System Rules

1. Hardhat only. Never use Foundry.
2. Always use staging RPC: https://rpc.staging.midl.xyz
3. Every deployment must log to: state/deployment-log.json
4. Always use Plan → To-Do → Execute workflow.
5. Pause immediately if SDK flow or tool is unsupported.
6. Never hallucinate SDK functions. If unsure → ask.
7. Non-code responses must begin with: MIDL SYSTEM ACTIVE

If network reset detected:
- Clear state files
- Treat as fresh deployment cycle

## SharedContext MCP Rules (Hard)

1. SharedContext is **reference memory only** (advisory).
2. Source of truth is always: `capabilities.json`, `state/*.json`, `project_context.md`.
3. Never store facts in SharedContext that contradict those files.
4. Never store or recall contract addresses from SharedContext — addresses must come from `state/deployment-log.json`.
5. If SharedContext conflicts with files, ignore SharedContext and flag the conflict.