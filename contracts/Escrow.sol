// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "hardhat/console.sol";

contract Escrow is Ownable {

    address payable private _owner;
    uint private _noImpactContFee = 10;
    uint private _impactContFee = 5;
    uint private _noImpactOrgFee = 3;
    uint private _impactOrgFee = 2;
    uint private _decisionRetentionFee = 1;
    IERC20[] public tokenInts;
    
    //Used to store buyer's transactions and for buyers to interact with his transactions. (Such as releasing funds to seller)
    struct EscrowData {
        address contributor;       // Contracted person that contributes with his services

        uint projectId;             // Identifier for the project

        uint netAmmount;           // Final value (in Wei) of the transaction after discounts
        uint organizationFee;      // What will be deducted from organization
        uint contributorFee;       // What will be deducted from contributor

        bool isInProgress;      // Initial State: The Escrow is created and both parts agree to the job conditions
        bool isFinished;        // Finish State - The project is agreed as successfully completed by both sides
        bool isCanceled;        // Extraordinary State: The conditions are not met. There is an Escalation decision from the
    }

    struct TransactionData {                        
        // History of transaction for contributor
        address organizationUser;    // Contractor who is making payment
        uint projectId;              // Project identifier
        uint transactionAmmount;     // Initial ammount without any discount
        uint transactionNumber;      // Transaction number on OrganizationHistory
    }
    
    // Each organization then contain an array of their transactions
    mapping(address => EscrowData[]) public organizationsHistory;

    // Registry for contributors and their transactions
    mapping(address => TransactionData[]) public contributorsHistory;

    event EscrowAction(
        uint256 totalFee, 
        uint256 contAmmount, 
        address orgAddress, 
        address contAddress);
    event DecisionNotification(
        address _organizationUser, 
        address _contributorUser, 
        uint256 _escrowIndex, 
        uint256 refundAmmount, 
        uint256 feeAmmount);

    constructor () {
        address msgSender = _msgSender();
        _owner = payable(msgSender); // Set the contract creator
        emit OwnershipTransferred(address(0), msgSender);
    }

    function getNoImpactContFee() public view returns(uint) {
        return _noImpactContFee;
    }

    function getNoImpactOrgFee() public view returns(uint) {
        return _noImpactOrgFee;
    }

    function getImpactContFee() public view returns(uint) {
        return _impactContFee;
    }

    function getImpactOrgFee() public view returns(uint) {
        return _impactOrgFee;
    }

    function getDecisionRetentionFee() public view returns(uint) {
        return _decisionRetentionFee;
    }

    function _setNoImpactContFee(uint _newFee) private {
        require (_newFee != getNoImpactContFee());
        _noImpactContFee = _newFee;
    }

    function setNoImpactContFee(uint newFee) public onlyOwner {
        _setNoImpactContFee(newFee);
    }

    function _setNoImpactOrgFee(uint _newFee) private {
        require (_newFee != getNoImpactOrgFee());
        _noImpactOrgFee = _newFee;
    }

    function setNoImpactOrgFee(uint newFee) public onlyOwner {
        _setNoImpactOrgFee(newFee);
    }

    function _setImpactContFee(uint _newFee) private {
        require (_newFee != getImpactContFee());
        _impactContFee = _newFee;
    }

    function setImpactContFee(uint newFee) public onlyOwner {
        _setImpactContFee(newFee);
    }

    function _setImpactOrgFee(uint _newFee) private {
        require (_newFee != getImpactOrgFee());
        _impactOrgFee = _newFee;
    }

    function setImpactOrgFee(uint newFee) public onlyOwner {
        _setImpactOrgFee(newFee);
    }

    function _setDecisionRetentionFee(uint _newFee) private {
        require (_newFee != getDecisionRetentionFee());
        _decisionRetentionFee = _newFee;
    }

    function setDecisionRetentionFee(uint newFee) public onlyOwner {
        _setDecisionRetentionFee(newFee);
    }

    function _calculatesFees(uint256 baseValue, uint256 feeType)
        internal view returns (uint256, uint256, 
            uint256, uint256) 
        {
            uint organizationFee_;
            uint contributorFee_;
            if (feeType == 1) { // 1 Stands for Non Impact organizations
                organizationFee_ = getNoImpactOrgFee();
                contributorFee_ = getNoImpactContFee();
            } else if (feeType == 2) { // 2 Stands for Impact organizations
                organizationFee_ = getImpactOrgFee();
                contributorFee_ = getImpactContFee();
            }

            require(organizationFee_ > 0 && contributorFee_ > 0, "Provide a valid Organization Type");

            uint feeContributor = (baseValue / 100) * contributorFee_;
            uint feeOrganization = (baseValue / 100) * organizationFee_;
            uint totalFee = feeOrganization + feeContributor;
            uint totalTransaction = baseValue - totalFee;

            return (feeContributor, feeOrganization, 
                totalFee, totalTransaction);
        }
     
    function newEscrow(
        address _contributorAddress, 
        uint256 _projectId, 
        uint256 _orgType,
        uint256 _ammount,
        uint256 _token
        ) public {
            // The organization will create the Escrow after negotiations with the contributor and will 
            // provide the necessary information regarding their aggrement. This is definitory and should be done
            // only after both parties have agreed with the contract

            require(_ammount > 0 && msg.sender != _contributorAddress,
                "Invalid parameters");

            IERC20 token = tokenInts[_token];

            require(token.balanceOf(msg.sender) >= _ammount, "Not enough funds");
            require(token.allowance(msg.sender, address(this)) >= _ammount, "Not enough allowance");
            
            // Fee calculation
            (uint256 totalContributor, uint256 totalOrganization,
                uint256 totalFees, uint256 transactionFunds) = 
                _calculatesFees(_ammount, _orgType);

            // Save data to blockchain storage
            contributorsHistory[_contributorAddress].push(TransactionData({
                organizationUser: msg.sender,
                projectId: _projectId,
                transactionAmmount: _ammount,
                transactionNumber: organizationsHistory[msg.sender].length
            }));
            organizationsHistory[msg.sender].push(EscrowData({
                contributor: _contributorAddress,
                projectId: _projectId,
                isInProgress: true,
                isFinished: false,
                isCanceled: false,
                netAmmount: transactionFunds,
                organizationFee: totalOrganization,
                contributorFee: totalContributor
            }));
            
            bool successLock = token.transferFrom(msg.sender, address(this), _ammount);
            require(successLock, "Funds lockment have failed!");

            emit EscrowAction(totalFees, transactionFunds, msg.sender, _contributorAddress);
    }

    function getTransactionNumber(address _organizationAddress, address _contributorAddress, uint _projectId, uint _transactionAmmount) public view returns(uint) {
        uint targetTransaction_ = 0; // This will help us identify and filter the EscrowData

        for (uint i = 0; i < contributorsHistory[_contributorAddress].length; i++){
            if (contributorsHistory[_contributorAddress][i].organizationUser == _organizationAddress && contributorsHistory[_contributorAddress][i].projectId == _projectId && contributorsHistory[_contributorAddress][i].transactionAmmount == _transactionAmmount) {
                targetTransaction_ = contributorsHistory[_contributorAddress][i].transactionNumber + 1;
                break;
            }
        }

        return targetTransaction_;
    }

    function getTransactionIndex(address _organizationAddress, address _contributorAddress, uint _projectId, uint _transactionAmmount) public view returns(uint) {
    uint targetIndex_ = 0;

    for (uint i = 0; i < contributorsHistory[_contributorAddress].length; i++){
        if (contributorsHistory[_contributorAddress][i].organizationUser == _organizationAddress && contributorsHistory[_contributorAddress][i].projectId == _projectId && contributorsHistory[_contributorAddress][i].transactionAmmount == _transactionAmmount) {
            targetIndex_ = i + 1;
            break;
        }
    }

    return targetIndex_;
    }

    function getSpecificEscrow(address organizationAddress_, address contributorAddress_, uint projectId_, uint transactionAmmount_) public view returns(EscrowData memory) {
        uint targetTransaction = getTransactionNumber(organizationAddress_, contributorAddress_, projectId_, transactionAmmount_);

        if (targetTransaction > 0) {
            return organizationsHistory[organizationAddress_][targetTransaction - 1];
        } else {
            return EscrowData(address(0), 0, 0, 0, 0, false, false, false); // Default for non existent Escrow
        }
    }

    function _validateOrganizationUser(address _contributorAddress_, uint _projectId_, uint _transactionAmmount_) private view returns(bool) {
        bool result_;
        uint transactionIndex_ = getTransactionIndex(msg.sender, _contributorAddress_, _projectId_, _transactionAmmount_) - 1;

        if (contributorsHistory[_contributorAddress_][transactionIndex_].organizationUser == msg.sender) {
            result_ = true;
        } else {
            result_ = false;
        }

        return result_;
        
    }

    function checkStatus(address _organizationAddress, uint _escrowIndex) internal view returns (uint8) {
        uint8 status;
        
        if (organizationsHistory[_organizationAddress][_escrowIndex].isInProgress) {
            status = 1; // In Progress
        } else if (organizationsHistory[_organizationAddress][_escrowIndex].isFinished) {
            status = 2; // Finished
        } else {
            status = 3; // Canceled
        }
        return (status);
    }

    function withdrawFunds (
        address contributorAddress_, 
        uint256 projectId_, 
        uint256 transactionAmmount_, 
        uint256 _token
        ) external {
            IERC20 token = tokenInts[_token];

            require(_validateOrganizationUser(contributorAddress_, projectId_, transactionAmmount_), 
                    "Only the organization can complete the project");
                    
            uint escrowId_ = getTransactionNumber(msg.sender, 
                contributorAddress_, 
                projectId_, 
                transactionAmmount_) - 1;
            
            require((organizationsHistory[msg.sender][escrowId_].isCanceled == false), 
                    "The contract has already been terminated");

            uint256 totalTransfer = organizationsHistory[msg.sender][escrowId_].netAmmount;
            uint256 totalFees = organizationsHistory[msg.sender][escrowId_].organizationFee 
                    + organizationsHistory[msg.sender][escrowId_].contributorFee;
            
            require(token.balanceOf(address(this)) >= totalFees + totalTransfer, 
                "Not enough funds at the contract");
            bool successTransfer = token.transfer(contributorAddress_, totalTransfer);
            require(successTransfer, "Transfer to contributor have failed");

            bool successFess = token.transfer(_owner, totalFees);
            require(successFess, "Fees payment have failed");

            organizationsHistory[msg.sender][escrowId_].isFinished = true;

            emit EscrowAction(totalFees, totalTransfer, msg.sender, contributorAddress_);
    }
    
    // Decision = 0 is for refunding Organization. Decision = 1 is for releasing funds to contributor
    function escrowDecision(
        uint256 decision_, 
        address contributorAddress_, 
        address organizationAddress_, 
        uint256 projectId_, 
        uint256 transactionAmmount_,
        uint256 _token)
        public onlyOwner {
            IERC20 token = tokenInts[_token];

            uint escrowId_ = getTransactionNumber(organizationAddress_, 
                contributorAddress_, 
                projectId_, 
                transactionAmmount_) - 1;

            require(organizationsHistory[organizationAddress_][escrowId_].isCanceled == false, 
                "The Escrow has already been canceled!");

            uint256 toRefund;
            uint256 toKeep;
            address targetRefund;

            if (decision_ == 0) {
                // Refunds to Organization
                toKeep = (transactionAmmount_ / 100) * getDecisionRetentionFee();
                toRefund = transactionAmmount_ - toKeep;
                targetRefund = organizationAddress_;
            } else {
                // Refunds to Contributor
                toRefund = organizationsHistory[organizationAddress_][escrowId_].netAmmount;
                targetRefund = contributorAddress_;
                toKeep = organizationsHistory[organizationAddress_][escrowId_].organizationFee 
                    + organizationsHistory[organizationAddress_][escrowId_].contributorFee;
            }

            require(token.balanceOf(address(this)) >= toRefund + toKeep, 
                "Not enough funds at the contract");
            bool successRefund = token.transfer(targetRefund, toRefund);
            bool successTransfer = token.transfer(_owner, toKeep);
            require(successRefund && successTransfer, "The transfers have failed");

            organizationsHistory[organizationAddress_][escrowId_].isCanceled = true;
            emit DecisionNotification(organizationAddress_, 
                contributorAddress_, escrowId_,
                toRefund, toKeep);
    }

    function getToken(uint256 tokenIndex) public view returns (IERC20) {
        return tokenInts[tokenIndex];
    }

    function addTokens(address newToken) public onlyOwner {
        tokenInts.push(IERC20(newToken));
    }
}
