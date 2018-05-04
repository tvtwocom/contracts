pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import '../TokenInterface.sol';

contract Utils {
  function isContract(address addr)
    internal view returns (bool)
  {
    uint size;
    assembly { size := extcodesize(addr) }
    return size > 0;
  }
}
// used to mint from TvTwoCoin
contract TvTwoCoinI is Token {
  function createViewer(address _viewer)
    external
    returns (bool success);

  function deposit(address spender, uint192 _value, uint32 _opening_block)
    external
    returns (bool success);

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

  modifier cmIsInitialized() {
    require(channelManager != ChannelManagerI(0x0));
    _;
  }

  modifier isCM() {
    require(msg.sender == address(channelManager));
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

  modifier ttmIsInitialized() {
    require(ttm != 0x0);
    _;
  }

  modifier isTTM() {
    require(ttm != 0x0);
    require(msg.sender == ttm);
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

contract UsingPaywall is Ownable {
  address public paywall = 0x0;

  modifier paywallIsInitialized() {
    require(paywall != 0x0);
    _;
  }
  
  function setPaywall(address _new)
    onlyOwner
    public
  {
    if(_new != paywall && _new != 0x0) {
      paywall = _new;
    }
  }
}
