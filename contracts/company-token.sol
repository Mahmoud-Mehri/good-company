// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/draft-ERC721Votes.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CompanyNFT is ERC721, EIP712, ERC721Votes {
    // Implementing Auto-Increment for TokenId
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // The Owner of the contract
    // We can also inherit from @OpenZeppelin/contracts/access/Ownable.sol which supports transfering ownership
    address private _owner;

    constructor() ERC721("Company NFT", "CNFT") EIP712("Company NFT", "1") {
        _owner = _msgSender();
    }

    modifier onlyOwner() {
        require(
            _msgSender() == _owner,
            "Only Owner of the contract allowed to call this function"
        );
        _;
    }

    modifier onlyTokenOwnerOrApproved(uint256 Id) {
        require(
            _isApprovedOrOwner(_msgSender(), Id),
            "Caller is not Token Owner nor Approved"
        );
        _;
    }

    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        return tokenId;
    }

    function burn(uint256 tokenId) public onlyTokenOwnerOrApproved(tokenId) {
        _burn(tokenId);
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    // This function needs to be overrided because its implemented in two drived classes
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Votes) {
        super._afterTokenTransfer(from, to, tokenId);
    }
}
