pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract TvTwoCoin is StandardToken {
  string public name = "TV-TWO";
  string public symbol = "TTV";
  uint8 public decimals = 18;
}
