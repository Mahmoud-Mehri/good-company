// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MimToken is ERC20 {
    address private _owner;

    constructor(uint256 initialSupply_) ERC20("MimToken", "MMT") {
        _owner = _msgSender();
        _mint(_owner, initialSupply_);
    }

    modifier onlyOwner() {
        require(
            _msgSender() == _owner,
            "Only Owner allowed to call this function"
        );
        _;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(uint256 amount) public onlyOwner returns (bool) {
        _mint(_owner, amount);
        return true;
    }

    function mint(address account, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        _mint(account, amount);
        return true;
    }

    function burn(uint256 amount) public onlyOwner returns (bool) {
        _burn(_owner, amount);
        return true;
    }

    function burn(address account, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        _burn(account, amount);
        return true;
    }
}
