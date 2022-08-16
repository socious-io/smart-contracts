// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/finance/VestingWallet.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IThank.sol";
import "./TokenVesting.sol";

contract ThankVestingManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ERC20 token
    IThank public thankToken;

    // Shares
    uint256 public coreTeamSharePercentage = 10;
    uint256 public contributorsSharePercentage = 5;
    uint256 public seedSharePercentage = 5;
    uint256 public privateSaleSharePercentage = 5;

    // Vesting Configs
    struct VestingConfig {
        uint256 share;
        uint64 cliff;
        uint64 duration;
        uint256 allocated;
    }

    struct Vesting {
        uint256 config;
        TokenVesting tokenVesting;
        VestingConfig vestingConfig;
        bool canceled;
    }

    mapping(uint256 => VestingConfig) public vestingConfigs;
    uint256 public CORE_TEAM_CONFIG = 1;
    uint256 public CONTRIBUTOR_CONFIG = 2;
    uint256 public SEED_CONFIG = 3;
    uint256 public PRIVATE_SALE_CONFIG = 4;

    mapping(address => mapping(address => Vesting)) public vestings;
    mapping(address => address[]) public vestingAddresses;

    constructor(address _thankTokenAddress) {
        thankToken = IThank(_thankTokenAddress);
        uint256 thankTokenMaxCap = thankToken.getMaxCap();
        uint256 thankTokenMaxCapDiv = thankTokenMaxCap / 100;

        // core team vesting configuration in seconds: 2 years cliff and 4 years linear vesting
        uint256 coreTeamShare = thankTokenMaxCapDiv * coreTeamSharePercentage;
        vestingConfigs[CORE_TEAM_CONFIG] = VestingConfig(
            coreTeamShare,
            63072000,
            126144000,
            0
        );

        // contributors vesting configuration in seconds:  1 year cliff and 2 years linear vesting
        uint256 contributorsShare = thankTokenMaxCapDiv *
            contributorsSharePercentage;
        vestingConfigs[CONTRIBUTOR_CONFIG] = VestingConfig(
            contributorsShare,
            31536000,
            63072000,
            0
        );

        // seed vesting configuration in seconds:  3 months cliff and 1 years linear vesting
        uint256 seedShare = thankTokenMaxCapDiv * seedSharePercentage;
        vestingConfigs[SEED_CONFIG] = VestingConfig(
            seedShare,
            7890000,
            31536000,
            0
        );

        // private sale vesting configuration in seconds:  3 months cliff and 1 years linear vesting
        uint256 privateSaleShare = thankTokenMaxCapDiv *
            privateSaleSharePercentage;
        vestingConfigs[PRIVATE_SALE_CONFIG] = VestingConfig(
            privateSaleShare,
            7890000,
            31536000,
            0
        );
    }

    // Modifier functions

    function createVesting(
        address _beneficiary,
        uint256 _amount,
        uint256 _config
    ) public onlyOwner nonReentrant returns (TokenVesting) {
        require(_amount > 0, "amount = 0");
        require(_beneficiary != address(0), "beneficiary is zero address");
        require(
            _amount <= availableAmount(_config),
            "amount is greater than the available amount"
        );
        require(
            IERC20(address(thankToken)).balanceOf(address(this)) > _amount,
            "Insufficient amount"
        );

        uint64 startTimestamp = uint64(block.timestamp) +
            vestingConfigs[_config].cliff;
        uint64 durationSeconds = vestingConfigs[_config].duration;

        // deploy a new vesting contract
        TokenVesting tokenVesting = new TokenVesting(
            _beneficiary,
            startTimestamp,
            durationSeconds,
            address(this)
        );

        address tokenVestingAddress = address(tokenVesting);

        // transfer tokens to the created vesting contract
        IERC20(address(thankToken)).approve(address(this), _amount);
        IERC20(address(thankToken)).transferFrom(
            address(this),
            tokenVestingAddress,
            _amount
        );
        vestingAddresses[_beneficiary].push(tokenVestingAddress);

        vestings[_beneficiary][tokenVestingAddress] = Vesting(
            _config,
            tokenVesting,
            vestingConfigs[_config],
            false
        );
        vestingConfigs[_config].allocated += _amount;

        emit VestingCreated(_beneficiary, _amount, _config, tokenVesting);

        return tokenVesting;
    }

    function cancelVesting(address _beneficiary, address _tokenVesting)
        public
        onlyOwner
        nonReentrant
    {
        require(_beneficiary != address(0), "beneficiary is zero address");
        require(_tokenVesting != address(0), "token vesting is zero address");

        Vesting memory vesting = getAVestingForABeneficiary(
            _beneficiary,
            _tokenVesting
        );

        require(
            address(vesting.tokenVesting) != address(0),
            "vesting does not exist"
        );

        uint256 balance = IERC20(address(thankToken)).balanceOf(
            address(vesting.tokenVesting)
        );

        vesting.tokenVesting.cancelVesting(address(thankToken));

        vestingConfigs[vesting.config].allocated -= balance;
        vesting.canceled = true;

        emit VestingCanceled(
            _beneficiary,
            balance,
            vesting.config,
            vesting.tokenVesting
        );
    }

    // View Functions

    function availableAmount(uint256 _config) public view returns (uint256) {
        return
            vestingConfigs[_config].share - vestingConfigs[_config].allocated;
    }

    function getVestingsForABeneficiary(address _beneficiary)
        public
        view
        returns (address[] memory)
    {
        return vestingAddresses[_beneficiary];
    }

    function getAVestingForABeneficiary(
        address _beneficiary,
        address _tokenVesting
    ) public view returns (Vesting memory) {
        return vestings[_beneficiary][_tokenVesting];
    }

    event VestingCreated(
        address beneficiary,
        uint256 _amount,
        uint256 _config,
        TokenVesting tokenVesting
    );

    event VestingCanceled(
        address beneficiary,
        uint256 _amount,
        uint256 _config,
        TokenVesting tokenVesting
    );
}
