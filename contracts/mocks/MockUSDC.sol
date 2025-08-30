// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing purposes
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals = 6;

    constructor() ERC20("Mock USDC", "mUSDC") Ownable() {}

    /**
     * @dev Mint tokens to an address (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Override decimals to match USDC (6 decimals)
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
