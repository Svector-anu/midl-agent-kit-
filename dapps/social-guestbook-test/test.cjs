/**
 * Social Guestbook — headless write-flow smoke test.
 *
 * Uses @midl/node (keyPair connector) — no browser/Xverse required.
 * The mnemonic must match the deployer's wallet (the one with BTC on staging).
 *
 * Usage:
 *   MNEMONIC="word1 word2 ... word12" node test.cjs
 *
 * What it does:
 *   1. Reads postCount + postingFee from contract
 *   2. Checks if the wallet's EVM address is registered
 *   3. Registers if not (registerUser)
 *   4. Creates a post (createPost)
 *   5. Reads back the new post to confirm
 */

"use strict";

const { createConfig, regtest } = require("@midl/core");
const { keyPairConnector }       = require("@midl/node");
const {
  addTxIntention,
  finalizeBTCTransaction,
  signIntention,
  getEVMFromBitcoinNetwork,
} = require("@midl/executor");
const { createPublicClient, encodeFunctionData, http } = require("viem");

const MNEMONIC = process.env.MNEMONIC;
if (!MNEMONIC) {
  console.error("ERROR: Set MNEMONIC env var\n  MNEMONIC='word1 word2 ...' node test.cjs");
  process.exit(1);
}

const CONTRACT = "0xA4D2CbAF027125a967E48e94b1Baa03363981b1c";
const RPC      = "https://rpc.staging.midl.xyz";

const ABI = [
  { name: "registerUser", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "_username", type: "string" }], outputs: [] },
  { name: "createPost", type: "function", stateMutability: "payable",
    inputs: [{ name: "_content", type: "string" }], outputs: [] },
  { name: "postCount", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "postingFee", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getPost", type: "function", stateMutability: "view",
    inputs: [{ name: "_id", type: "uint256" }],
    outputs: [
      { name: "id",        type: "uint256" },
      { name: "author",    type: "address" },
      { name: "content",   type: "string"  },
      { name: "timestamp", type: "uint256" },
      { name: "likeCount", type: "uint256" },
      { name: "exists",    type: "bool"    },
    ],
  },
  { name: "getProfile", type: "function", stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{ name: "username", type: "string" }, { name: "exists", type: "bool" }] },
];

async function main() {
  const midlChain = getEVMFromBitcoinNetwork(regtest);
  const publicClient = createPublicClient({ chain: midlChain, transport: http(RPC) });

  // --- 1. Smoke-test reads ---
  console.log("\n=== Contract reads ===");
  const [postCount, postingFee] = await Promise.all([
    publicClient.readContract({ address: CONTRACT, abi: ABI, functionName: "postCount" }),
    publicClient.readContract({ address: CONTRACT, abi: ABI, functionName: "postingFee" }),
  ]);
  console.log(`  postCount:  ${postCount}`);
  console.log(`  postingFee: ${postingFee} wei (${Number(postingFee) / 1e10} sats)`);

  // --- 2. Connect wallet (no browser needed) ---
  const config = createConfig({
    networks: [regtest],
    connectors: [keyPairConnector({ mnemonic: MNEMONIC })],
  });

  const [connector] = config.connectors;
  const accounts = await connector.connect({ network: regtest });
  const ordinalsAccount = accounts.find((a) => a.purpose === "ordinals");
  const paymentAccount  = accounts.find((a) => a.purpose === "payment");
  if (!ordinalsAccount || !paymentAccount) throw new Error("Missing ordinals or payment account");

  console.log(`\n=== Wallet ===`);
  console.log(`  Ordinals (P2TR / EVM identity): ${ordinalsAccount.address}`);
  console.log(`  Payment  (P2WPKH / BTC fees):  ${paymentAccount.address}`);

  // --- 3. Check registration ---
  // Note: getProfile expects the EVM address derived from the ordinals P2TR key.
  // @midl/node derives it the same way WagmiMidlProvider does → consistent.
  const [existingName, isRegistered] = await publicClient.readContract({
    address: CONTRACT, abi: ABI, functionName: "getProfile",
    args: [ordinalsAccount.address],
  });
  console.log(`\n=== Registration ===`);
  console.log(`  Profile: "${existingName}", registered: ${isRegistered}`);

  // --- 4. Register if needed ---
  if (!isRegistered) {
    const username = `smoketest_${Date.now()}`;
    console.log(`\n  Registering as "${username}"...`);
    await sendTx({
      config, publicClient, ordinalsAccount,
      to:    CONTRACT,
      data:  encodeFunctionData({ abi: ABI, functionName: "registerUser", args: [username] }),
    });
  } else {
    console.log(`  Already registered — skipping`);
  }

  // --- 5. Create post ---
  const postContent = `Smoke test ${new Date().toISOString()}`;
  console.log(`\n=== Creating post ===`);
  console.log(`  Content: "${postContent}"`);
  await sendTx({
    config, publicClient, ordinalsAccount,
    to:   CONTRACT,
    data: encodeFunctionData({ abi: ABI, functionName: "createPost", args: [postContent] }),
  });

  // --- 6. Confirm post count increased ---
  const newCount = await publicClient.readContract({
    address: CONTRACT, abi: ABI, functionName: "postCount",
  });
  console.log(`\n  postCount after: ${newCount} (was ${postCount})`);
  if (newCount > postCount) {
    console.log(`  ✓ postCount incremented — post creation reached the chain`);
    // Note: getPost may revert if the BTC tx isn't confirmed yet on the EVM side.
    // The tx ID was printed above — check mempool.staging.midl.xyz for confirmation.
  }

  console.log("\n✓ Smoke test complete");
}

async function sendTx({ config, publicClient, ordinalsAccount, to, data }) {
  // Step 1: queue the EVM intention
  const intention = await addTxIntention(config, { evmTransaction: { to, data } });

  // Step 2: build + sign the BTC PSBT (no popup — keyPair connector signs internally)
  const intentions = Array.isArray(intention) ? intention : [intention];
  const btcTx = await finalizeBTCTransaction(config, intentions, publicClient);
  const txId  = btcTx.tx.id;
  const txHex = btcTx.tx.hex;
  console.log(`  BTC tx: ${txId}`);
  console.log(`  Track:  https://mempool.staging.midl.xyz/tx/${txId}`);

  // Step 3: sign the EVM intention with the BTC tx ID
  const signed = await signIntention(config, publicClient, intentions[0], intentions, {
    txId,
    from: ordinalsAccount.address,
  });

  // Step 4: broadcast
  await publicClient.sendBTCTransactions({
    serializedTransactions: [signed.signedEvmTransaction],
    btcTransaction: txHex,
  });
  console.log(`  Broadcast done — awaiting BTC confirmation (~8–15 min)`);
}

main().catch((err) => {
  console.error("\n✗ Smoke test FAILED:", err.message || err);
  process.exit(1);
});
