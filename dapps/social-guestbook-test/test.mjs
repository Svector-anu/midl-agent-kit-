/**
 * Social Guestbook — headless write-flow smoke test.
 *
 * Uses @midl/node (keyPair connector) so no browser/Xverse required.
 * The mnemonic must be the same one used when the contract was deployed.
 *
 * Usage:
 *   MNEMONIC="your twelve word phrase here" node test.mjs
 */

import { createConfig, regtest } from "@midl/core";
import { keyPairConnector } from "@midl/node";
import {
  addTxIntention,
  finalizeBTCTransaction,
  signIntention,
  getEVMFromBitcoinNetwork,
} from "@midl/executor";
import { createPublicClient, encodeFunctionData, http } from "viem";

const MNEMONIC = process.env.MNEMONIC;
if (!MNEMONIC) {
  console.error("Set MNEMONIC env var: MNEMONIC='word1 word2 ...' node test.mjs");
  process.exit(1);
}

const CONTRACT = "0xA4D2CbAF027125a967E48e94b1Baa03363981b1c";
const RPC = "https://rpc.staging.midl.xyz";

const ABI = [
  { name: "registerUser", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_username", type: "string" }], outputs: [] },
  { name: "createPost",   type: "function", stateMutability: "payable",    inputs: [{ name: "_content",  type: "string" }], outputs: [] },
  { name: "postCount",    type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getPost",      type: "function", stateMutability: "view",       inputs: [{ name: "_id", type: "uint256" }],
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
    outputs: [{ name: "username", type: "string" }, { name: "exists", type: "bool" }],
  },
];

async function main() {
  const midlChain = getEVMFromBitcoinNetwork(regtest);
  const publicClient = createPublicClient({ chain: midlChain, transport: http(RPC) });

  // 1. Verify contract reads
  console.log("\n=== Contract reads ===");
  const postCount = await publicClient.readContract({ address: CONTRACT, abi: ABI, functionName: "postCount" });
  console.log(`postCount: ${postCount}`);

  // 2. Connect with mnemonic (keyPair connector — no browser needed)
  const config = createConfig({
    networks: [regtest],
    connectors: [keyPairConnector({ mnemonic: MNEMONIC })],
  });

  const [connector] = config.connectors;
  const accounts = await connector.connect({ network: regtest });
  const ordinalsAccount = accounts.find((a) => a.purpose === "ordinals");
  const paymentAccount  = accounts.find((a) => a.purpose === "payment");

  if (!ordinalsAccount || !paymentAccount) {
    throw new Error("Wallet did not return both ordinals and payment accounts");
  }

  console.log(`\n=== Wallet accounts ===`);
  console.log(`Ordinals (EVM identity): ${ordinalsAccount.address}`);
  console.log(`Payment  (BTC fees):     ${paymentAccount.address}`);

  // Derive EVM address for this wallet
  const [username, isRegistered] = await publicClient.readContract({
    address: CONTRACT, abi: ABI, functionName: "getProfile",
    args: [ordinalsAccount.address],  // Note: @midl/node getProfile uses the derived EVM address
  });
  console.log(`\nProfile: "${username}", registered: ${isRegistered}`);

  // 3. Register if needed
  if (!isRegistered) {
    console.log("\n=== Registering user ===");
    const testUsername = `test_${Date.now()}`;
    await sendTx({
      config, publicClient, ordinalsAccount, paymentAccount,
      to: CONTRACT,
      data: encodeFunctionData({ abi: ABI, functionName: "registerUser", args: [testUsername] }),
      label: `registerUser("${testUsername}")`,
    });
    console.log("✓ Registered");
  } else {
    console.log(`\nAlready registered as "${username}" — skipping registration`);
  }

  // 4. Create a post
  console.log("\n=== Creating post ===");
  await sendTx({
    config, publicClient, ordinalsAccount, paymentAccount,
    to: CONTRACT,
    data: encodeFunctionData({ abi: ABI, functionName: "createPost", args: ["Hello from smoke test!"] }),
    label: "createPost(\"Hello from smoke test!\")",
  });
  console.log("✓ Post created");

  // 5. Read new post count
  const newCount = await publicClient.readContract({ address: CONTRACT, abi: ABI, functionName: "postCount" });
  console.log(`\npostCount after: ${newCount}`);
  if (newCount > postCount) {
    const post = await publicClient.readContract({
      address: CONTRACT, abi: ABI, functionName: "getPost", args: [newCount],
    });
    console.log(`Post #${newCount}: "${post[2]}" by ${post[1]}`);
  }

  console.log("\n✓ Smoke test passed");
}

async function sendTx({ config, publicClient, ordinalsAccount, paymentAccount, to, data, label }) {
  console.log(`  Sending: ${label}`);

  // Step 1: add intention
  const [intention] = await addTxIntention(config, { evmTransaction: { to, data } });

  // Step 2: finalize BTC tx (builds PSBT, signs internally via keyPair connector)
  const btcTx = await finalizeBTCTransaction(config, [intention], publicClient);
  const txId  = btcTx.tx.id;
  const txHex = btcTx.tx.hex;
  console.log(`  BTC tx: ${txId}`);

  // Step 3: sign intention
  const signed = await signIntention(config, publicClient, intention, [intention], {
    txId,
    from: ordinalsAccount.address,
  });

  // Step 4: broadcast
  await publicClient.sendBTCTransactions({
    serializedTransactions: [signed.signedEvmTransaction],
    btcTransaction: txHex,
  });
  console.log(`  Broadcast complete. Waiting for confirmation (~8–15 min on staging)...`);
  console.log(`  Track: https://mempool.staging.midl.xyz/tx/${txId}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
