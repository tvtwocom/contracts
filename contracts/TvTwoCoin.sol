pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./lib/manage.sol";


contract TvTwoCoin is StandardToken, UsingChannelManager, UsingPaywall, UsingTTManager {
  string public name = "TV-TWO";
  string public symbol = "TTV";
  uint256 public decimals = 18;
  uint256 public totalSupply = 666666667e18;
  uint256 public weiTokenRate = 5;
  uint256 public companyShare = 15;
  uint256 public vestingPeriod = 3 years;

  mapping (address =>  bool) managed;

  event IsManaged(address user, bool state);

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

  /// @notice converts amount of tokens to wei
  /// @param _tokens amount of tokens
  /// @return amount of wei
  function tokensToWei(uint _tokens)
    public
    view
    returns (uint)
  {
    return _tokens.mul(weiTokenRate).div(100);
  }

  /// @notice converts wei to amount of tokens
  /// @param _wei amount of _wei
  /// @return amount of tokens
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
  /// [TODO] this should be called transfer too, but truffle gives me problems there
  function _transfer(address _to, uint256 _value, bytes _data)
    public
    returns (bool success)
  {
    success = super.transfer(_to, _value);
    if(success && isContract(_to)) {
      ChannelManagerI(_to).tokenFallback(msg.sender, _value, _data);
    }
  }
  
  modifier inVestingPeriod() {
    require(now < vestingPeriod);
    _;
  }


  /// @notice creates data structures for tokenFallback of the channelManager
  /// @param address1 spender address
  /// @param address2 recepient address
  /// @param block_number open_block to topUp, and 0 to create new channel
  /// [TODO] decrease memory usage
  function join(address address1, address address2, uint32 block_number)   pure
    public
    returns (bytes)
  {
    if(block_number == 0) {
      bytes memory openChannelData = new bytes(40);
      assembly {
	let pre := mload(add(openChannelData, 20))
	mstore( add(openChannelData, 40), address2)
	mstore(
	  add(openChannelData, 20),
	  or(pre, address1)
	)	  
      }
      return openChannelData;
    } else {
      bytes memory topUpChannelData = new bytes(44);
      assembly {
	let pre := mload(add(topUpChannelData, 20))
	mstore(add(topUpChannelData, 44), block_number)
	mstore( add(topUpChannelData, 40), address2)
	mstore(
	  add(topUpChannelData, 20),
	  or(pre, address1)
	)
      }
      return topUpChannelData;
    }
  }

  /// @notice deposit tokens with the channelManager for the paywall
  /// @notice can only be called by TvTwoManager
  /// @param _value amount of tokens
  /// @param _open_block_number the block number of an already existing channel, 0 for new channel
  /// @dev this would mean owner can replace channelManager with a wallet contract, stealing all managed coins
  function deposit(
		   address spender,
		   uint192 _value,
		   uint32 _open_block_number
		   )
    onlyTTM
    cmIsInitialized
    paywallIsInitialized
    external
    returns (bool success) {
    require(spender != 0x0);
    require(managed[spender]);
    balances[spender] = balances[spender].sub(_value);
    balances[address(channelManager)] = balances[address(channelManager)].add( _value);
    Transfer(spender, channelManager, _value);
    channelManager.tokenFallback(spender, _value, join(spender, paywall, _open_block_number));

    return true;
  }


  /// @notice ttm calls this when a new user is created,
  /// @notice sets managed to true
  /// @notice it won't affect addresses already owning tokens
  /// @param _viewer address of user
  /// @dev allows use of deposit by TvTwo 
  /// @dev in case of fraud by owner, anyone who is going to recive tokens to a new address can check this.managed() without gasCost, and could change this by calling this.setManaged()
  function createViewer(address _viewer)
    onlyTTM
    external
    returns (bool success)
  {
    require(_viewer != address(0x0));
    require(balances[_viewer] == 0);
    managed[_viewer] = true;
    IsManaged(_viewer, true);
    return true;      
  }

  /// @notice returns managed flag for given address
  function isManaged(address _user)
    public
    view
    returns (bool)
  {
    return managed[_user];
  }

  /// @notice sets managed flag of msg.sender
  /// @notice can be used to turn a managed account into a token owner
  /// @param state false to disable gasless TvTwo viewing
  function setManged(bool state)
    public
  {
    require(managed[msg.sender] != state);
    managed[msg.sender] = state;
    IsManaged(msg.sender, state);
  }

}
