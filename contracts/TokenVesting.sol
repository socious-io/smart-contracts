// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/finance/VestingWallet.sol";

contract TokenVesting is VestingWallet, Ownable {
    using SafeERC20 for IERC20;

    address public vestingManager;

    constructor(
        address beneficiaryAddress,
        uint64 startTimestamp,
        uint64 durationSeconds,
        address _vestingManager
    ) VestingWallet(beneficiaryAddress, startTimestamp, durationSeconds) {
        vestingManager = _vestingManager;
    }

    function cancelVesting(address token) external onlyOwner {
        SafeERC20.safeTransfer(
            IERC20(token),
            vestingManager,
            IERC20(token).balanceOf(address(this))
        );
    }
}
