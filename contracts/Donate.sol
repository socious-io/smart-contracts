// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Donate is Ownable {

    address payable private _owner;
    uint private _ownerFee = 1;

    error NotEnoughFunds(uint requested, uint available);

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

    function donate(int _projectId, address _targetAddress) external payable {
        if(msg.sender.balance >= msg.value) {
            revert NotEnoughFunds(msg.value, msg.sender.balance);
        }

        uint feeAmmount = (msg.value / 100) * getFee();
        uint newAmmount = msg.value - feeAmmount;

        recieverHistory[_targetAddress].push(OrganizationData({sender: msg.sender, fullAmmount: msg.value, netAmmount: newAmmount, projectId: _projectId}));
        senderHistory[msg.sender].push(IndividualData({ammount: msg.value, projectId: _projectId}));

        (bool donationSuccess,) = _targetAddress.call{value: newAmmount}("");
        (bool feeSucess,) = _owner.call{value: feeAmmount}("");
        
        require((donationSuccess && feeSucess), "Failed to send money");
    }

    function getRecievedDonations(address _targetAddress) public view returns(OrganizationData[] memory) {
        return recieverHistory[_targetAddress];
    }

    function getSentDonations(address _targetAddress) public view returns(IndividualData[] memory) {
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
}