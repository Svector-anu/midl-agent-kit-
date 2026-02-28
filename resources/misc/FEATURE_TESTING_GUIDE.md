# MIDL MCP Server - Feature Testing Guide

Complete guide to testing all MCP server features on **MIDL Staging Network**.

**Last Updated:** 2026-02-05
**Network:** Staging (regtest)
**Verified Contracts:** 5
**Success Rate:** 100%

---

## Quick Reference: All Available Tools

### 📝 Contract Operations
1. `deploy-contract-source` - Compile and deploy Solidity contracts
2. `call-contract` - Call functions on deployed contracts
3. `verify-contract` - Verify contract source code on Blockscout (use Hardhat for 100% success)
4. `prepare-contract-deploy` - Manual contract deployment (advanced)

### 💰 Bitcoin Wallet Operations
5. `get-wallet-balance` - Check BTC balance
6. `prepare-btc-transfer` - Create unsigned PSBT for transfers
7. `broadcast-transaction` - Broadcast signed transactions
8. `estimate-btc-transfer-fee` - Estimate transaction costs

### 🔍 Blockchain Information
9. `get-address-transactions` - View transaction history
10. `get-blockchain-info` - Network status and info
11. `decode-psbt` - Inspect PSBT details
12. `validate-bitcoin-address` - Validate address format

---

## Network Configuration

### MIDL Staging Network

| Resource | URL |
|----------|-----|
| **EVM RPC** | https://rpc.staging.midl.xyz |
| **Blockscout** | https://blockscout.staging.midl.xyz |
| **Mempool** | https://mempool.staging.midl.xyz |
| **Chain ID** | 15001 (0x3a99) |
| **Bitcoin Network** | Regtest |

### Performance Expectations

| Operation | Time |
|-----------|------|
| **Balance check** | <1 second |
| **Contract deployment** | 1-2 minutes |
| **Contract call (write)** | 10-15 minutes |
| **Contract call (read)** | Instant |
| **Transaction history** | 1-3 seconds |
| **PSBT operations** | <1 second |
| **Verification (Hardhat)** | ~30 seconds |


---

## Test 1: Get Wallet Balance

### Ask Claude Desktop:
```
What's my BTC balance on MIDL staging?
```

### Expected Response:
```
Balance for bcrt1q69qwavpyqlsktfqg5j77d4cuw000vqs3yymvd3:
2.24986127 BTC (224,986,127 satoshis)
```

### What it tests:
- Connection to wallet
- Balance fetching
- Network connection

### Verification:
Check on Mempool: https://mempool.staging.midl.xyz/address/bcrt1q69qwavpyqlsktfqg5j77d4cuw000vqs3yymvd3

---

## Test 2: Validate Bitcoin Address

### Ask Claude Desktop:
```
Is this a valid Bitcoin address: bcrt1q69qwavpyqlsktfqg5j77d4cuw000vqs3yymvd3
```

### Expected Response:
```
✅ Valid Bitcoin address
Network: regtest
Address type: P2WPKH (Native SegWit)
```

### What it tests:
- Address validation
- Network detection
- Format parsing

---

## Test 3: Get Blockchain Info

### Ask Claude Desktop:
```
What's the current MIDL staging blockchain status?
```

### Expected Response:
```
Blockchain Information:
Network: regtest (staging)
Current Block Height: 330,XXX
Chain: regtest
Difficulty: 0.00
```

### What it tests:
- Network connection
- Blockchain state
- RPC connectivity

---

## Test 4: View Transaction History

### Ask Claude Desktop:
```
Show me my recent transactions on MIDL staging
```

### Expected Response:
```
Transaction History for bcrt1q69qwavpyqlsktfqg5j77d4cuw000vqs3yymvd3:

Recent Transactions:
1. TxID: 33828e18db1bc8fc834c22f1ee6345509e3a3decb91f8b5bd8bdaec2a901ecaa
   Amount: -0.00000XXX BTC (contract deployment)
   Confirmations: XX

2. TxID: ...
   ...
```

### What it tests:
- Transaction history fetching
- Transaction formatting
- Mempool API connection

### Verification:
Check on Mempool: https://mempool.staging.midl.xyz

---

## Test 5: Estimate Transfer Fee

### Ask Claude Desktop:
```
How much would it cost to send 0.001 BTC to bcrt1q7dzudvh8jfvkeqgxjw88mf3dqws000jrvkmvdr on staging?
```

### Expected Response:
```
Estimated Fee: XXX satoshis (0.0000XXXX BTC)
Fee Rate: XX sat/vB
Inputs: X
Outputs: 2 (1 recipient + 1 change)
Total Input: XXXX satoshis
Total Output: XXXX satoshis
```

### What it tests:
- Fee estimation
- UTXO selection
- Transaction building

---

## Test 6: Prepare BTC Transfer (Don't Broadcast!)

### Ask Claude Desktop:
```
Prepare a transfer of 10000 satoshis to bcrt1q7dzudvh8jfvkeqgxjw88mf3dqws000jrvkmvdr (don't broadcast)
```

### Expected Response:
```
PSBT Prepared successfully.

PSBT (Base64):
cHNidP8BAF4CAAAA...

Transaction ID: ...

Please use 'decode-psbt' to verify details before signing.
```

### What it tests:
- PSBT creation
- Transaction building
- UTXO management

⚠️ **Important:** This creates an unsigned transaction. Don't broadcast test transactions!

---

## Test 7: Decode PSBT

### Ask Claude Desktop:
```
Decode this PSBT: [paste PSBT from Test 6]
```

### Expected Response:
```
PSBT Details:

Inputs:
  - Address: bcrt1q69qwavpyqlsktfqg5j77d4cuw000vqs3yymvd3
    Amount: XXXX satoshis

Outputs:
  - Address: bcrt1q7dzudvh8jfvkeqgxjw88mf3dqws000jrvkmvdr
    Amount: 10000 satoshis
  - Address: bcrt1q... (change)
    Amount: XXXX satoshis

Fee: XXX satoshis
Fee Rate: XX sat/vB
```

### What it tests:
- PSBT parsing
- Transaction inspection
- Fee calculation

---

## Test 8: Deploy Simple Contract

### Ask Claude Desktop:
```
Deploy this contract to MIDL staging:

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleStorage {
    uint256 public value;

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}
```

### Expected Response:
```
✅ Contract deployed successfully!

Contract Name: SimpleStorage
Contract Address: 0x...

📋 To verify this contract (Recommended Method):

1. Save the contract source code to a file
2. Change pragma to: pragma solidity 0.8.28;
3. Run verification with Hardhat:

   cd midl-example
   npx hardhat compile --force
   npx hardhat verify --network regtest 0x...

This method has a 100% success rate!

View on Blockscout: https://blockscout.staging.midl.xyz/address/0x...
View BTC tx: https://mempool.staging.midl.xyz/tx/...
```

### What it tests:
- Solidity compilation
- Contract deployment
- BTC anchoring
- Transaction submission

### ⏱️ Time:
- Deployment: 1-2 minutes
- Confirmation: Included in deployment time

---

## Test 9: Verify Deployed Contract (Hardhat Method - 100% Success)

### In Terminal:

1. **Save contract** to `midl-example/contracts/SimpleStorage.sol`

2. **Update pragma** to `0.8.28`:
   ```solidity
   pragma solidity 0.8.28;
   ```

3. **Verify:**
   ```bash
   cd midl-example
   npx hardhat compile --force
   npx hardhat verify --network regtest 0x...
   ```

### Expected Response:
```bash
Successfully verified contract SimpleStorage on the block explorer.
https://blockscout.staging.midl.xyz/address/0x...#code
```

### What it tests:
- Hardhat integration
- Blockscout verification
- Compiler matching
- Source code submission

### ✅ Success Rate:
**100%** (5/5 contracts verified using this method)

---

## Test 10: Call Contract Function (Read - Instant)

### Ask Claude Desktop:
```
Call getValue() on contract 0x... on staging
```

### Expected Response:
```
The current value is: 0
```

### What it tests:
- Contract interaction
- Read operations
- ABI encoding

### ⏱️ Time:
**Instant** (free, no transaction needed)

---

## Test 11: Call Contract Function (Write - Slow)

### Ask Claude Desktop:
```
Call setValue(42) on contract 0x... on staging
```

### Expected Response:
```
✅ Contract call executed successfully!

Contract: 0x...
Function: setValue
BTC Transaction ID: ...
EVM Transaction Hash: 0x...

⏳ Transaction submitted to staging network.
Confirmation takes ~10-15 minutes. Check Blockscout for real-time status.

View on Blockscout: https://blockscout.staging.midl.xyz/tx/0x...
```

### What it tests:
- Contract interaction
- Write operations
- Transaction submission
- BTC anchoring

### ⏱️ Time:
**10-15 minutes** for confirmation (normal on staging!)

### Verification After 15 Minutes:
```
Call getValue() on contract 0x...
```
**Expected:** `The current value is: 42` ✅

---

## Test 12: Deploy Contract with OpenZeppelin

### Ask Claude Desktop:
```
Deploy this ERC20 token to MIDL staging:

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
}
```

### Expected Response:
```
✅ Contract deployed successfully!

Contract Name: MyToken
Contract Address: 0x...

📋 To verify this contract (Recommended Method):
[verification instructions]

View on Blockscout: https://blockscout.staging.midl.xyz/address/0x...
```

### What it tests:
- Import resolution
- OpenZeppelin support
- Constructor with arguments
- Complex contracts

### ⏱️ Time:
1-2 minutes for deployment

---

## Test 13: Deploy Complex Contract (Counter with Events)

### Ask Claude Desktop:
```
Deploy this Counter contract to MIDL staging:

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Counter {
    uint256 public count;
    address public owner;

    event Incremented(uint256 newCount);
    event Decremented(uint256 newCount);
    event Reset(address indexed by);

    constructor() {
        owner = msg.sender;
        count = 0;
    }

    function increment() public {
        count += 1;
        emit Incremented(count);
    }

    function decrement() public {
        require(count > 0, "Count cannot be negative");
        count -= 1;
        emit Decremented(count);
    }

    function reset() public {
        require(msg.sender == owner, "Only owner can reset");
        count = 0;
        emit Reset(msg.sender);
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}
```

### Expected Response:
```
✅ Contract deployed successfully!

Contract Name: Counter
Contract Address: 0x04989BF4B06230D0F6538376Bd262f821EdA84D4

[verification instructions]

View on Blockscout: https://blockscout.staging.midl.xyz/address/0x04989BF4B06230D0F6538376Bd262f821EdA84D4
```

### What it tests:
- Complex types (events, modifiers)
- Access control
- Multiple functions
- Constructor logic

### Real Deployed Example:
✅ **Counter**: [`0x04989BF4B06230D0F6538376Bd262f821EdA84D4`](https://blockscout.staging.midl.xyz/address/0x04989BF4B06230D0F6538376Bd262f821EdA84D4#code)
- Deployed: ✅
- Verified: ✅ (via Hardhat)
- Status: Fully functional

---

## Verified Contracts on Staging (Proof of Success)

### All Successfully Deployed and Verified

| Contract | Address | Method | Status |
|----------|---------|--------|--------|
| **Counter** | [`0x04989BF4B06230D0F6538376Bd262f821EdA84D4`](https://blockscout.staging.midl.xyz/address/0x04989BF4B06230D0F6538376Bd262f821EdA84D4#code) | MCP + Hardhat | ✅ Verified |
| **SimpleTest** | [`0xde6c29923d7BB9FDbcDfEC54E7e726894B982593`](https://blockscout.staging.midl.xyz/address/0xde6c29923d7BB9FDbcDfEC54E7e726894B982593#code) | Hardhat | ✅ Verified |
| **MessageBoard** | [`0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580`](https://blockscout.staging.midl.xyz/address/0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580#code) | Hardhat | ✅ Verified |
| **CollateralERC20** | [`0xca0daeff9cB8DED3EEF075Df62aDBb1522479639`](https://blockscout.staging.midl.xyz/address/0xca0daeff9cB8DED3EEF075Df62aDBb1522479639#code) | Hardhat | ✅ Verified |
| **RuneERC20** | [`0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed`](https://blockscout.staging.midl.xyz/address/0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed#code) | Hardhat | ✅ Verified |

**Total Verified:** 5 contracts
**Verification Success Rate:** 100%
**Verification Method:** Hardhat (proven reliable)

---

## Testing Checklist

Copy this checklist when testing:

```markdown
### Basic Operations
- [ ] Test 1: Get wallet balance
- [ ] Test 2: Validate Bitcoin address
- [ ] Test 3: Get blockchain info
- [ ] Test 4: View transaction history
- [ ] Test 5: Estimate transfer fee
- [ ] Test 6: Prepare BTC transfer (no broadcast)
- [ ] Test 7: Decode PSBT

### Contract Operations
- [ ] Test 8: Deploy simple contract (SimpleStorage)
- [ ] Test 9: Verify deployed contract (Hardhat)
- [ ] Test 10: Call contract (read - instant)
- [ ] Test 11: Call contract (write - 10-15 min)
- [ ] Test 12: Deploy with OpenZeppelin imports
- [ ] Test 13: Deploy complex contract (Counter)

### Advanced Testing
- [ ] Verify all contracts show green checkmark on Blockscout
- [ ] Check transaction history on Mempool
- [ ] Test contract interactions after verification
- [ ] Confirm events are emitted correctly
```

---

## Expected Results Summary

### All Tests Should:

✅ Return responses within expected timeframes:
- Reads: Instant
- Deployments: 1-2 minutes
- Writes: 10-15 minutes
- Queries: <3 seconds

✅ Show clear success/error messages

✅ Provide transaction IDs and explorer links

✅ Handle errors gracefully

✅ Use **staging** Blockscout URLs (not regtest!)

### Performance Benchmarks (Staging):

| Operation | Expected Time |
|-----------|---------------|
| Balance check | <1 second |
| Address validation | <1 second |
| Blockchain info | 1-3 seconds |
| Transaction history | 1-3 seconds |
| Fee estimation | <1 second |
| PSBT creation | <1 second |
| PSBT decoding | <1 second |
| **Contract deployment** | **1-2 minutes** |
| **Contract write call** | **10-15 minutes** |
| **Contract read call** | **Instant** |
| **Verification (Hardhat)** | **~30 seconds** |

---

## Common Issues and Solutions

### Issue: "No account connected"
**Solution:** Check `MIDL_MNEMONIC` in `claude_desktop_config.json`

### Issue: "Insufficient funds"
**Solution:**
1. Check balance on Mempool
2. Request testnet BTC from team
3. Verify you're using staging network

### Issue: "Contract verification failed via MCP"
**Solution:**
Use Hardhat verification instead (100% success rate):
```bash
cd midl-example
npx hardhat compile --force
npx hardhat verify --network regtest 0x...
```

### Issue: "Transaction hanging for 10+ minutes"
**Solution:**
This is **NORMAL** on staging! Write operations take 10-15 minutes. Be patient and check Blockscout for status.

### Issue: "Wrong Blockscout URL (regtest instead of staging)"
**Solution:**
MCP should now return staging URLs. If not:
1. Rebuild MCP: `npm run build`
2. Restart Claude Desktop (Cmd+Q, then reopen)

### Issue: "Network error"
**Solution:**
1. Check RPC is accessible: `curl https://rpc.staging.midl.xyz`
2. Verify Claude Desktop MCP is connected (hammer icon)
3. Check `claude_desktop_config.json` has correct configuration

---

## Testing Best Practices

### 1. Test in Order
Complete tests 1-7 (non-contract operations) before testing contracts. This ensures basic connectivity works.

### 2. Be Patient on Staging
- Deployments: 1-2 minutes (reasonable)
- Write calls: 10-15 minutes (**be very patient!**)
- Don't retry - wait for confirmation

### 3. Always Verify with Hardhat
- MCP deployment = Fast and easy
- Hardhat verification = Reliable (100% success)
- This is the proven workflow

### 4. Document Everything
- Save contract addresses
- Note transaction times
- Record any errors
- Check Blockscout for confirmation

### 5. Use Staging Blockscout
All URLs should be:
- ✅ `https://blockscout.staging.midl.xyz/...`
- ❌ NOT `https://blockscout.regtest.midl.xyz/...`

---

## Next Steps

After completing all tests:

1. ✅ **Document Results**
   - Note any failures or unexpected behavior
   - Record actual timing vs expected timing
   - Screenshot verified contracts

2. ✅ **Build Real Applications**
   - Use Counter contract as template
   - Deploy your own contracts
   - Test complex interactions

3. ✅ **Share Your Experience**
   - Report issues or improvements
   - Contribute examples
   - Help others with testing

4. ⚠️ **Before Mainnet**
   - Test thoroughly on staging
   - Verify all functionality
   - Understand timing expectations
   - Have backup plans for long confirmation times

---

## Success Criteria

### You've successfully tested MCP when:

- [x] All 13 tests pass
- [x] Contracts deploy within 2 minutes
- [x] Contracts verify via Hardhat (100% success)
- [x] Write operations complete (even if 10-15 min)
- [x] Read operations are instant
- [x] All Blockscout links use staging URLs
- [x] Transaction history is visible
- [x] Events are emitted correctly

### Your MCP is Production-Ready when:

- [x] No errors on basic operations (tests 1-7)
- [x] Contracts deploy reliably
- [x] Verification workflow is clear
- [x] Users understand timing expectations
- [x] Documentation is complete
- [x] Examples work as documented

---

## Resources

### Documentation
- **Example Deployment:** `EXAMPLE_DEPLOYMENT.md`
- **Verification Guide:** `CONTRACT_VERIFICATION_GUIDE.md`
- **Deployment Guide:** `MIDL_DEPLOYMENT_GUIDE.md`
- **MCP Setup:** `DEPLOY_AND_INTERACT.md`

### Network Links
- **Staging Blockscout:** https://blockscout.staging.midl.xyz
- **Staging Mempool:** https://mempool.staging.midl.xyz
- **Staging RPC:** https://rpc.staging.midl.xyz

### Support
- Check documentation first
- Review verified contracts for examples
- Test on staging before mainnet

---

**Happy Testing!** 🚀

**Last Updated:** 2026-02-05
**Network:** MIDL Staging
**Verified Contracts:** 5/5 (100%)
**Recommended Workflow:** MCP Deploy → Hardhat Verify
