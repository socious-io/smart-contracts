// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract MockUSDC is ERC20 {

    constructor() ERC20("USD Coin", "USDC") {}

    function mint(address _account, uint256 _ammount) public {
        _mint(_account, _ammount);
    }

}