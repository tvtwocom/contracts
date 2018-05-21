pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import '../TokenInterface.sol';

/// @title helpers used in different contracts
contract Utils {

  /// @notice tests if a given address has bytecode
  /// @return true if bytecode saved at address, false otherwise
  function isContract(address addr)
    internal view returns (bool)
  {
    uint size;
    assembly { size := extcodesize(addr) }
    return size > 0;
  }
}

contract TvTwoManagerI {
  function addVideo(
    bytes32 _videoHash,
    bool _isAd,
    uint32 _opening_block_number
  ) public;
}

contract TvTwoCoinI is Token {
  function createViewer(address _viewer)
    external
    returns (bool success);

  function deposit(address spender, uint192 _value, bytes _data)
    external;
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

  function getChannelInfo(
			  address _sender_address,
			  address _receiver_address,
			  uint32 _open_block_number)
    external
    view
    returns (bytes32, uint192, uint32, uint192, uint192);
  address public token;
}

/// @title setter/getter for RaidenMicroTransferChannelsContract
contract UsingChannelManager is Ownable, Utils {

  /// @notice channelManager getter
  ChannelManagerI public channelManager = ChannelManagerI(0x0);

  modifier cmIsInitialized() {
    require(channelManager != ChannelManagerI(0x0));
    _;
  }

  modifier onlyCM() {
    require(channelManager != ChannelManagerI(0x0));
    require(msg.sender == address(channelManager));
    _;
  }

  event ChannelManagerUpdated(address channelManager);
  
  /// @notice sets the channelManager
  /// @dev must have contract code
  /// @param _new future channelManager address
  function setChannelManager(address _new)
    onlyOwner
    public
  {
    require(isContract(_new));
    if(ChannelManagerI(_new) != channelManager && _new != 0x0) {
      channelManager = ChannelManagerI(_new);
      ChannelManagerUpdated(channelManager);
    }
  }
}

/// @title setter/getter for TvTwoManager
contract UsingTTCoin is Ownable, Utils {

  /// @notice the ttm getter
  TvTwoCoinI public ttc = TvTwoCoinI(0x0);

  modifier ttcIsInitialized() {
    require(address(ttc) != 0x0);
    _;
  }

  modifier onlyTTC() {
    require(address(ttc) != 0x0);
    require(msg.sender == address(ttc));
    _;
  }

  event TvTwoCoinUpdated(address ttc);

  /// @notice set the TvTwoManager address
  /// @dev address must have contract code
  /// @param _new the future TvTwoManager address
  function setTTCoin(address _new)
    onlyOwner
    public
  {
    require(isContract(_new));
    if(_new != address(ttc) && _new != 0x0) {
      ttc = TvTwoCoinI(_new);
      TvTwoCoinUpdated(ttc);
    }
  }
}

/// @title setter/getter for TvTwoManager
contract UsingTTManager is Ownable, Utils {

  /// @notice the ttm getter
  address public ttm = 0x0;

  modifier ttmIsInitialized() {
    require(ttm != 0x0);
    _;
  }

  modifier onlyTTM() {
    require(ttm != 0x0);
    require(msg.sender == ttm);
    _;
  }

  event TvTwoManagerUpdated(address ttm);
  
  /// @notice set the TvTwoManager address
  /// @dev address must have contract code
  /// @param _new the future TvTwoManager address
  function setTTManager(address _new)
    onlyOwner
    public
  {
    require(isContract(_new));
    if(_new != ttm && _new != 0x0) {
      ttm = _new;
      TvTwoManagerUpdated(ttm);
    }
  }
}

/// @title getter/setter for the paywal
/// @notice the address that will sign in name of TvTwo
contract UsingPaywall is Ownable {

  /// @notice the getter
  address public paywall = 0x0;

  modifier paywallIsInitialized() {
    require(paywall != 0x0);
    _;
  }

  event PaywallUpdated(address paywall);
  
  /// @notice set the paywall address
  /// @dev must not be a contract
  /// @param _new future address
  function setPaywall(address _new)
    onlyOwner
    public
  {
    if(_new != paywall && _new != 0x0) {
      paywall = _new;
      PaywallUpdated(paywall);
    }
  }
}
