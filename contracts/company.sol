// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

import "@openzeppelin/contracts/token/ERC721/extensions/draft-ERC721Votes.sol";

import "./company-token.sol";
import "./mim-token.sol";

contract CompanyGoverner is
    Governor,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    CompanyNFT _companyToken;
    MimToken _mimToken;

    enum VoteType {
        Negative,
        Positive
    }

    struct VoteInfo {
        uint256 positiveVotes;
        uint256 negativeVotes;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => VoteInfo) private _proposalVotes;

    constructor(
        string memory name,
        CompanyNFT companyToken_,
        MimToken mimToken_,
        uint8 quorumFraction
    )
        Governor(name)
        GovernorVotes(IVotes(companyToken_))
        GovernorVotesQuorumFraction(quorumFraction)
    {
        _companyToken = companyToken_;
        _mimToken = mimToken_;
    }

    function votingDelay() public pure override returns (uint256) {
        return 1; // 1 block ( Each block takes about 13 seconds to be mined )
    }

    function votingPeriod() public pure override returns (uint256) {
        return 10; // 10 blocks
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 0;
    }

    // The following functions are overrides required by Solidity.
    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function COUNTING_MODE() public pure override returns (string memory) {
        return "";
    }

    function hasVoted(uint256 proposalId, address account)
        public
        view
        override
        returns (bool)
    {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    function _getProposalVotes(uint256 proposalId)
        public
        view
        returns (uint256 positiveVotes, uint256 negativeVotes)
    {
        VoteInfo storage voteInfo = _proposalVotes[proposalId];
        return (voteInfo.positiveVotes, voteInfo.negativeVotes);
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 vote,
        uint256 weight,
        bytes memory
    ) internal override {
        VoteInfo storage voteInfo = _proposalVotes[proposalId];
        require(!voteInfo.hasVoted[account], "This account is already voted");
        voteInfo.hasVoted[account] = true;
        if (vote == uint8(VoteType.Positive)) {
            voteInfo.positiveVotes += weight;
        } else if (vote == uint8(VoteType.Negative)) {
            voteInfo.negativeVotes += weight;
        } else {
            revert("Invalid Vote Type!");
        }
    }

    function _quorumReached(uint256 proposalId)
        internal
        view
        override
        returns (bool)
    {
        VoteInfo storage voteInfo = _proposalVotes[proposalId];
        return voteInfo.positiveVotes >= quorum(proposalSnapshot(proposalId));
    }

    function _voteSucceeded(uint256 proposalId)
        internal
        view
        override
        returns (bool)
    {
        VoteInfo storage voteInfo = _proposalVotes[proposalId];
        return voteInfo.positiveVotes > voteInfo.negativeVotes;
    }

    function _executor() internal view override returns (address) {
        return address(_mimToken);
    }

    function _execute(
        uint256, /* proposalId */
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory,
        bytes32 /*descriptionHash*/
    ) internal virtual override {
        address token = _executor();
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > values[0], "There is no enough balance in Company!");
        IERC20(token).transfer(targets[0], values[0]);
    }
}

contract GoodCompany is CompanyGoverner {
    address private _owner;
    mapping(address => uint256) private _stockShares;
    mapping(address => bool) private _employees;

    struct RequestInfo {
        address creator;
        address target;
        uint256 amount;
        string description;
    }
    mapping(uint256 => RequestInfo) private _requests;

    constructor(CompanyNFT companyToken, MimToken mimToken)
        CompanyGoverner("GoodCompany", companyToken, mimToken, 51)
    {
        _owner = _msgSender();
    }

    modifier onlyOwner() {
        require(
            _owner == _msgSender(),
            "Only owner is allowed to call this function"
        );
        _;
    }

    modifier onlyStakeHolders() {
        require(isStakeHolder(_msgSender()), "You are not Stake Holder!");
        _;
    }

    modifier onlyEmployees() {
        require(isEmployee(_msgSender()), "You are not an Employee!");
        _;
    }

    function registerStakeHolder(address account) public onlyOwner {
        require(
            !isStakeHolder(account),
            "This account is already a Stake Holder"
        );
        require(!isEmployee(account), "This account is an Employee");

        uint256 accountBalance = _companyToken.balanceOf(account);
        require(
            accountBalance > 0,
            "This account has no balance of Company NFT"
        );

        _stockShares[account] = accountBalance;
    }

    function registerEmployee(address account) public onlyOwner {
        require(
            !isStakeHolder(account),
            "This account is already Stake Holder"
        );
        require(!isEmployee(account), "This account is already an Employee");

        _employees[account] = true;
    }

    function isStakeHolder(address account) public view returns (bool) {
        return _stockShares[account] > 0;
    }

    function isEmployee(address account) public view returns (bool) {
        return _employees[account];
    }

    function createRequest(
        address target_,
        uint256 amount_,
        string memory description_
    ) public onlyEmployees {
        address[] memory targets = new address[](1);
        targets[0] = target_;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount_;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("transfer(address,uint256)");

        uint256 requestId = propose(targets, amounts, calldatas, description_);
        RequestInfo memory requestInfo = RequestInfo({
            creator: _msgSender(),
            target: target_,
            amount: amount_,
            description: description_
        });
        _requests[requestId] = requestInfo;
    }

    function castVote(uint256 requestId_, uint8 voteType_)
        public
        override
        onlyStakeHolders
        returns (uint256)
    {
        address voter = _msgSender();
        address delegate = _companyToken.delegates(voter);
        require(delegate == voter, "You don't have delegation");

        return _castVote(requestId_, voter, voteType_, "");
    }

    function getRequestVotes(uint256 requestId)
        public
        view
        returns (uint256, uint256)
    {
        return _getProposalVotes(requestId);
    }

    function getRequestState(uint256 requestId)
        public
        view
        returns (ProposalState)
    {
        return state(requestId);
    }

    function cancelRequest(uint256 requestId) public returns (uint256) {
        RequestInfo storage reqInfo = _requests[requestId];
        require(
            reqInfo.creator == _msgSender(),
            "You are not Creator of this request"
        );
        address[] memory targets = new address[](1);
        targets[0] = reqInfo.target;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = reqInfo.amount;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("transfer(address,uint256)");

        bytes32 descriptionHash = keccak256(bytes(reqInfo.description));

        return _cancel(targets, amounts, calldatas, descriptionHash);
    }

    function executeRequest(uint256 requestId)
        public
        onlyOwner
        returns (uint256)
    {
        RequestInfo storage reqInfo = _requests[requestId];
        address[] memory targets = new address[](1);
        targets[0] = reqInfo.target;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = reqInfo.amount;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("transfer(address,uint256)");

        bytes32 descriptionHash = keccak256(bytes(reqInfo.description));

        return execute(targets, amounts, calldatas, descriptionHash);
    }
}
