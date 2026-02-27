# social-guestbook-hardhat

Hardhat test harness for `SocialGuestbook.sol`. Runs a local in-process Hardhat network — no external chain or wallet required.

---

## Install

```bash
npm install
```

If you get an `EACCES` error from a stale npm cache entry, use a temp cache instead:

```bash
npm install --cache /tmp/npm-cache-sg
```

To permanently fix the cache permissions (requires your macOS password):

```bash
sudo chmod -R u+w ~/.npm/_cacache
```

---

## Run tests

```bash
npx hardhat test
```

Or via the npm script:

```bash
npm test
```

Expected output: **43 passing**.

---

## EVM version note

`hardhat.config.ts` sets `evmVersion: "paris"`. This matches the MIDL staging chain constraint (no `PUSH0`/`MCOPY` opcodes introduced in Shanghai). It has **no dependency on the `@midl/viem` override** — that override only applies to the frontend dApp (`dapps/social-guestbook/`), not to Hardhat compilation or local tests.

---

## Contract source

`contracts/SocialGuestbook.sol` was **reconstructed from the ABI** in `state/deployment-log.json`. It is not the original deployed bytecode. Tests run against this local reconstruction and verify business logic — they do not verify byte-for-byte parity with the staging deployment at `0xA4D2CbAF027125a967E48e94b1Baa03363981b1c`.

---

## Test suites

| Suite | Tests |
|-------|-------|
| Deployment | 5 |
| registerUser | 5 |
| createPost | 5 |
| likePost | 6 |
| commentOnPost | 7 |
| tipAuthor | 5 |
| deletePost | 4 |
| setPostingFee | 2 |
| withdraw | 3 |
| receive() | 1 |
| **Total** | **43** |
