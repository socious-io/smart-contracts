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

    event Approval(address owner, address spender, uint256 value);
    event Transfer(address from, address to, uint256 value);

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

    function getTokenBalance(uint256 _token) public view returns(uint256) { 
       return tokenInts[_token].balanceOf(msg.sender);
    }

    function approveTransfer(uint256 _token, address _spender, uint256 _ammount) external returns (bool) {
        IERC20 token = tokenInts[_token];
        uint256 currentBalance = token.balanceOf(msg.sender);
        require(currentBalance > _ammount, "Not enough funds!");
        bool success = token.approve(_spender, _ammount);
        return success;
    }

    function getAllowance(uint256 _token, address _spender) external view returns (uint256) {
        IERC20 token = tokenInts[_token];
        uint256 allowanceAmmount = token.allowance(msg.sender, _spender);
        return allowanceAmmount;
    }

    function donate(int _projectId, address _targetAddress, uint256 _ammount, uint256 _token) external {
        require(_ammount > 0, "Provide an ammount higher than 0");
        uint256 feeAmmount = (_ammount / 100) * getFee();
        uint256 newAmmount = _ammount - feeAmmount;

        recieverHistory[_targetAddress].push(OrganizationData({
            sender: msg.sender, 
            fullAmmount: _ammount, 
            netAmmount: newAmmount, 
            projectId: _projectId}));

        senderHistory[msg.sender].push(IndividualData({
            ammount: _ammount, 
            projectId: _projectId}));
        
        IERC20 token = tokenInts[_token];

        bool sucessFee = token.transferFrom(msg.sender, _owner, feeAmmount);
        require(sucessFee, "Fee payment has failed");
        bool successDonation = token.transferFrom(msg.sender, _targetAddress, newAmmount);
        require(successDonation, "Donation has failed");
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