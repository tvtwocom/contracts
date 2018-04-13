pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract Utils {
  function isContract(address addr)
    internal view returns (bool)
  {
    uint size;
    assembly { size := extcodesize(addr) }
    return size > 0;
  }
}

contract ChannelManagerI {
  function tokenFallback(
			 address _sender_address,
			 uint256 _deposit,
			 bytes _data
			 )
    external;
  function createChannel(
			 address _receiver_address,
			 uint192 _deposit
			 )
    external;
  function createChannelDelegate(
				 address _sender_address,
				 address _receiver_address,
				 uint192 _deposit
				 )
    external;

}


contract UsingChannelManager is Ownable, Utils {
  ChannelManagerI public channelManager = ChannelManagerI(0x0);

  modifier isInitialized() {
    require(channelManager != ChannelManagerI(0x0));
    _;
  }
  
  function setChannelManager(address _new)
    onlyOwner
    public
  {
    require(isContract(_new));
    if(ChannelManagerI(_new) != channelManager && _new != 0x0) {
      channelManager = ChannelManagerI(_new);
    }
  }
}


contract UsingTTManager is Ownable, Utils {
  address public ttm = 0x0;

  modifier isInitialized() {
    require(ttm != 0x0);
    _;
  }
  
  function setTTManager(address _new)
    onlyOwner
    public
  {
    require(isContract(_new));
    if(_new != ttm && _new != 0x0) {
      ttm = _new;
    }
  }
}
