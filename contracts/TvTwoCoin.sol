pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract ChannelManagerInterface {
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

contract TvTwoCoin is Ownable, StandardToken {
  string public name = "TV-TWO";
  string public symbol = "TTV";
  uint256 public decimals = 18;
  uint256 public totalSupply = 666666667e18;
  uint256 public weiTokenRate = 5;
  uint256 public companyShare = 15;

  function TvTwoCoin()
    public
  {
    uint256 _companyAmount = totalSupply
      .mul(companyShare)
      .div(100);
    balances[msg.sender] = _companyAmount;
    Transfer(address(0), this, _companyAmount);

    uint256 _contractBalance = totalSupply
      .sub(_companyAmount);
    balances[this] = _contractBalance;
    Transfer(address(0), this, _contractBalance);
  }

  function tokensToWei(uint _tokens)
    public
    view
    returns (uint)
  {
    return _tokens.mul(weiTokenRate).div(100);
  }

  function weiToTokens(uint _wei)
    public
    view
    returns (uint)
  {
    return _wei.mul(100).div(weiTokenRate);
  }

  // will throw on the last bit to buy...
  // doesnt need to work since this isnt final implementation
  function buy()
    public
    payable
    returns (bool)
  {
    uint256 _buyAmount = weiToTokens(msg.value);
    require(_buyAmount > 0);
    balances[this] = balances[this]
      .sub(_buyAmount);
    balances[msg.sender] = balances[msg.sender]
      .add(_buyAmount);
    Transfer(this, msg.sender, _buyAmount);
    return true;
  }

  function sell(
    uint _tokenAmount
  )
    public
    returns(bool)
  {
    balances[msg.sender] = balances[msg.sender]
      .sub(_tokenAmount);
    balances[this] = balances[this]
      .add(_tokenAmount);
    msg.sender.transfer(tokensToWei(_tokenAmount));
    Transfer(msg.sender, this, _tokenAmount);
    return true;
  }

  function isContract(address addr)
    view
    internal
    returns (bool)
  {
    uint size;
    assembly { size := extcodesize(addr) }
    return size > 0;
  }
  
  ChannelManagerInterface public channelManager = ChannelManagerInterface(0x0);
  function setChannelManager(address _channelManagerContract)
    onlyOwner
    public
  {
    if(isContract(_channelManagerContract) && _channelManagerContract != address(channelManager)) {
      channelManager = ChannelManagerInterface(_channelManagerContract);
    }
  }

  address public ttm = 0x0;
  function setTvTwoManager(address _tvTwoManagerContract)
    onlyOwner
    public
  {
    if(isContract(_tvTwoManagerContract) && ttm != _tvTwoManagerContract) {
      ttm = _tvTwoManagerContract;
    }
  }

  /* function toBytes(address[2] x) // I hate this but there seems to be no better way without using assembly */
  /*   pure */
  /*   public */
  /*   returns (bytes b) */
  /* { */
  /*   b = new bytes(40); */
  /*   for (uint i = 0; i < 40; i++) */
  /*     b[i] = byte(uint8(uint(x[i/20]) / (2**(8*(20 - i/20))))); */
  /* } */

  /// @notice send `_value` token to `_to` from `msg.sender`.
  /// @dev regarding ERC223, transfer should call tokenFallback when sending tokens to contracts
  /// @param _to The address of the recipient.
  /// @param _value The amount of token to be transferred.
  function transfer(address _to, uint _value)
    public
    returns (bool success)
  {
    bytes memory empty;
    success = super.transfer(_to, _value);
    if(success && isContract(_to)) {
      ChannelManagerInterface(_to).tokenFallback(msg.sender, _value, empty);
    }
  }
  
  /// @notice send `_value` token to `_to` from `msg.sender`.
  /// @dev regarding ERC223, transfer can have some data attached to it
  /// @param _to The address of the recipient.
  /// @param _value The amount of token to be transferred.
  /// @param _data Data to be sent to `tokenFallback.

  function _transfer(address _to, uint256 _value, bytes _data)
    public
    returns (bool success)
  {
    success = super.transfer(_to, _value);
    if(success && isContract(_to)) {
      ChannelManagerInterface(_to).tokenFallback(msg.sender, _value, _data);
    }
  }
  
  modifier isInitialized() {
    require(ttm != 0x0);
    require(channelManager != ChannelManagerInterface(0x0));
    _;
  }

  /// @notice deposit tokens with the channelManager for the ttm
  /// @param _value amount of tokens
  
  function deposit(
    uint256 _value
  )
    isInitialized
    public
    returns (bool) {
    require(_value < 2**192);
    super.transfer(this, _value);
    if(this.approve(channelManager, _value)) {
      channelManager.createChannelDelegate(msg.sender, ttm, uint192(_value));
    }
  }

}
