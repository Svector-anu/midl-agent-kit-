// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ERC20Token
 * @notice Minimal ERC-20 with owner-only mint. Used as the MIDL dashboard demo contract.
 * @dev Initial supply is minted to the deployer. All standard ERC-20 operations
 *      (transfer, approve, allowance, transferFrom) are inherited from OZ ERC20.
 */
contract ERC20Token is ERC20, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
