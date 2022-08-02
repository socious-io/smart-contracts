// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "hardhat/console.sol";

contract Donate is Ownable {

    address payable private _owner;
    uint256 private _ownerFee = 1;
    IERC20[] public tokenInts;

    error NotEnoughFunds(uint requested, uint available);
    
    event Donation(uint256 feeAmmount, uint256 donationAmmount, address recieverOrg);

    struct OrganizationData {
        address sender;
        uint fullAmmount;
        uint netAmmount;
        int projectId;
    }

    struct IndividualData {
        uint ammount;
        int projectId;
    }

    mapping (address => OrganizationData[]) recieverHistory;
    mapping (address => IndividualData[]) senderHistory;

    constructor () {
        address msgSender = _msgSender();
        _owner = payable(msgSender);
        emit OwnershipTransferred(address(0), msgSender);
    }

    function donate(int _projectId, address _targetAddress, uint256 _ammount, uint256 _token) external {
        IERC20 token = tokenInts[_token];
        uint256 userBalance = token.balanceOf(msg.sender);
        uint256 contractAllowance = token.allowance(msg.sender, address(this));

        require((_ammount > 0) && (userBalance > _ammount) && (contractAllowance >= _ammount), 
            "Provide an ammount higher than 0");

        uint256 _feeAmmount = (_ammount / 100) * getFee();
        uint256 _newAmmount = _ammount - _feeAmmount;

        recieverHistory[_targetAddress].push(OrganizationData({
            sender: msg.sender, 
            fullAmmount: _ammount, 
            netAmmount: _newAmmount, 
            projectId: _projectId}));

        senderHistory[msg.sender].push(IndividualData({
            ammount: _ammount, 
            projectId: _projectId}));

        bool sucessFee = token.transferFrom(msg.sender, _owner, _feeAmmount);
        require(sucessFee, "Fee payment has failed");
        bool successDonation = token.transferFrom(msg.sender, _targetAddress, _newAmmount);
        require(successDonation, "Donation has failed");
        emit Donation(_feeAmmount, _newAmmount, _targetAddress);
    }

    function getRecievedDonations(address _targetAddress) public view returns (OrganizationData[] memory) {
        return recieverHistory[_targetAddress];
    }

    function getSentDonations(address _targetAddress) public view returns (IndividualData[] memory) {
        return senderHistory[_targetAddress];
    }

    function getFee() public view returns(uint) {
        return _ownerFee;
    }

    function _changeFee(uint _newFee) private {
        require (_newFee != getFee());
        _ownerFee = _newFee;
    }

    function changeFee(uint newFee) public onlyOwner {
        _changeFee(newFee);
    }

    function getToken(uint256 tokenIndex) public view returns (IERC20) {
        return tokenInts[tokenIndex];
    }

    function addTokens(address newToken) public onlyOwner {
        tokenInts.push(IERC20(newToken));
    }
}