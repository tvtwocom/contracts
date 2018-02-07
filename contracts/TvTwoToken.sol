pragma solidity 0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


// super basic token... need to know how balances are going to be distributed
contract TvTwoToken is StandardToken {
  string public name = "TvTwoToken";
  string public symbol = "TVT";
  uint8 public decimals = 18;
}
