// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IThank.sol";

import "./StakingRewards.sol";

contract Thank is ERC20, IThank, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Maximum Total Supply
    uint256 public maxCap;

    StakingRewards stakingRewards;

    event Minted(address indexed to, uint256 amount);

    constructor() ERC20("Thank", "THANK") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        // 100 Billion tokens
        maxCap = 100000000000 ether;

        // Premint 70%
        _mint(msg.sender, (maxCap / 100) * 70);
    }

    function setStakingRewards(address _stakingRewards)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        stakingRewards = StakingRewards(_stakingRewards);
    }

    function mint(address to) public onlyRole(MINTER_ROLE) {
        require(to != address(0), "Thank: receiver is the zero address");

        uint256 amountInReserve = maxCap - totalSupply();

        uint256 stakedAmount = stakingRewards.totalSupply();

        // amountInReserve * 0.42% * stakedProportion %
        uint256 amountToMint;
        if (totalSupply() > 0 && stakedAmount > 0) {
            amountToMint =
                (amountInReserve * 42 * stakedAmount) /
                (10000 * totalSupply());
        } else {
            amountToMint = (amountInReserve * 42) / 10000;
        }

        require(
            amountToMint <= maxCap,
            "Thank: amount to mint is greater than the maxCap"
        );

        _mint(to, amountToMint);

        emit Minted(to, amountToMint);
    }

    function getMaxCap() public view returns (uint256) {
        return maxCap;
    }
}
