pragma solidity ^0.4.18;

contract TokenFallbackMock {

  address public sender_address;
  uint256 public deposit;
  bytes public data;
  
  event TokenFallback(address _sender_address,
		      uint256 _deposit,
		      bytes _data);

  
  function tokenFallback(address _sender_address,
			 uint256 _deposit,
			 bytes _data)
    external  {
    TokenFallback(_sender_address, _deposit, _data);
    sender_address = _sender_address;
    deposit = _deposit;
    data = _data;
  }
}
