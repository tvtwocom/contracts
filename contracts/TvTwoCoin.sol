pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./lib/manage.sol";


contract TvTwoCoin is StandardToken, UsingChannelManager {
  string public name = "TV-TWO";
  string public symbol = "TTV";
  uint256 public decimals = 18;
  uint256 public totalSupply = 666666667e18;
  uint256 public weiTokenRate = 5;
  uint256 public companyShare = 15;
  uint256 public vestingPeriod = 3 years;
  
  function TvTwoCoin()
    public
  {
    vestingPeriod += now;
    
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
    inVestingPeriod
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
    inVestingPeriod
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

  

  address public ttm = 0x0;
  function setTvTwoManager(address _ttm)
    onlyOwner
    public
  {
    require(isContract(_ttm));
    if(ttm != _ttm) {
      ttm = _ttm;
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
      ChannelManagerI(_to).tokenFallback(msg.sender, _value, empty);
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
      ChannelManagerI(_to).tokenFallback(msg.sender, _value, _data);
    }
  }
  
  modifier isInitialized() {
    /* require(channelManager != ChannelManagerI(0x0)); */
    require(ttm != 0x0);
    _;
  }

  modifier inVestingPeriod() {
    require(now < vestingPeriod);
    _;
  }

  modifier isTTM() {
    require(msg.sender == ttm);
    _;
  }
  /// @notice deposit tokens with the channelManager for the paywall
  /// can only be called by trusted Contracts
  /// @param _value amount of tokens
  /// @notice this would mean owner can replace channelManager with a wallet contract, stealing anyones coins
  function deposit(
		   address spender,
		   address recipient,
		   uint192 _value
		   )
    isInitialized
    isTTM
    public
    returns (bool) {
    allowed[spender][channelManager] = _value;
    channelManager.createChannelDelegate(spender, recipient, uint192(_value)); 
    return true;
  }


  /// @notice ttm calls this when a new user is created
  /// it won't affect addresses already owning tokens
  /// now channelManager can create channels once this address owns tokens
  /// in case of fraud by owner, anyone who is going to recive tokens to a new address can check if any previous channel manager already has an allowance without gasCost, and could change this by calling approve(channelManager, 0)
  function createViewer(address _viewer, uint192 _value)
    isInitialized
    isTTM
    external
    returns (bool success)
  {
    require(_viewer != address(0x0));
    require(balances[_viewer] == 0);
    allowed[_viewer][channelManager] = _value;
    return true;      
  }
  
}
