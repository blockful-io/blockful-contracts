// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ERC20} from "../token/ERC20/ERC20.sol";

/**
 * @author @ownerlessinc
 * @dev Implements the Blockful ERC20 Standard.
 */
contract MyToken is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}
