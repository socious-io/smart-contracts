// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./IteratorMap.sol";

contract Donate is Ownable {
    using IterableMapping for itmap;

    address payable private _owner;
    uint private _ownerFee = 1;

    itmap TokenInterfaces; 

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
        TokenInterfaces.insert(0, IERC20(0xB44a9B6905aF7c801311e8F4E76932ee959c663C)); // USDC Mainnet
        TokenInterfaces.insert(1, IERC20(0xD9Bc92569C14C1FB62Ff0CeE95aCE5d5de4b36EA)); // USDC Testnet
    }

    function donate(int _projectId, address _targetAddress, uint256 _tokenIndex) external payable {
        uint256 userBalance = TokenInterfaces.data[_tokenIndex].value.balanceOf(msg.sender);

        if(userBalance <= msg.value) {
            revert NotEnoughFunds(msg.value, userBalance);
        }

        uint feeAmmount = (msg.value / 100) * getFee();
        uint newAmmount = msg.value - feeAmmount;

        recieverHistory[_targetAddress].push(OrganizationData({
            sender: msg.sender, 
            fullAmmount: msg.value, 
            netAmmount: newAmmount, 
            projectId: _projectId}));

        senderHistory[msg.sender].push(IndividualData({
            ammount: msg.value, 
            projectId: _projectId}));

        bool donationSuccess;
        bool feeSucess;

        donationSuccess = TokenInterfaces.data[_tokenIndex].value.transfer(_targetAddress, newAmmount);
        feeSucess = TokenInterfaces.data[_tokenIndex].value.transfer(_owner, feeAmmount);
        
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

    function _addToken(address _newToken, uint256 _newIndex) private {
        bool tokenExists = TokenInterfaces.contains(_newIndex);

        require(!tokenExists, "That index is already occupied, provided a new one");
        TokenInterfaces.insert(_newIndex, IERC20(_newToken));
    }

    function addToken(address newToken, uint256 newIndex) public onlyOwner {
        _addToken(newToken, newIndex);
    }

    function _deleteToken(uint256 _prevIndex) private {
        bool tokenExists = TokenInterfaces.contains(_prevIndex);

        require(tokenExists, "That index does not exists, provided a valid one");
        TokenInterfaces.remove(_prevIndex);
    }

    function deleteToken(uint256 prevIndex) public onlyOwner {
        _deleteToken(prevIndex);
    }
}