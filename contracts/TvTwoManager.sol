pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import './lib/manage.sol';



contract TvTwoManager is UsingTTCoin, UsingPaywall, UsingChannelManager {
  using SafeMath for uint256;

  event Checkpoint (
    address _spender,
    address _recepient,
    uint192 _balance,
    uint32 _opening_block_number,
    bytes32 _logsHash  
  );

  struct Video {
    bytes32 videoHash;
    bool isAd;
    address uploader;
  }

  uint256 public minimumAllowance = 1e18;
  mapping (bytes32 => uint256) public videoIndex;
  Video[] public videos;

  modifier videoHashExists(bytes32 _videoHash) {
    require(videoIndex[_videoHash] > 0);
    _;
  }

  modifier minAllowanceMet(bool isAd, uint32 _opening_block_number) {
    if(isAd) {
      require(_opening_block_number != 0);
      bytes32 key;
      uint192 deposit;
      uint32 settle_block_number;
      uint192 closing_balance;
      uint192 withdrawn_balance;
      (key, deposit, settle_block_number, closing_balance, withdrawn_balance) = channelManager.getChannelInfo(msg.sender, paywall, _opening_block_number); // selecting the out channel of msg.sender
      require(settle_block_number == 0); // channel not settled yet
      //require(closing_balance == 0); // better check it twice
      require(deposit - withdrawn_balance >= minimumAllowance); // are enough funds deposited
    }
    _;
  }

  function TvTwoManager()
    public
  {
    videos.push(Video('', false, address(0)));
  }

  ///@notice sets the minimum amount of tokens an advertiser has to own and deposit with the channelManager to add Videos
  ///@param _minAllowance the amount of tokens
  function setMinimumAllowance(
    uint256 _minAllowance
  )
    public
    onlyOwner
  {
    require(minimumAllowance != _minAllowance);
    minimumAllowance = _minAllowance;
  }

  /// @notice adding a video to the list
  /// @param _videoHash the id of the video
  /// @param _isAd is it an ad(true) or original content(false)
  /// @param _opening_block_number to reference deposits with channelManager, will be ignored if not an ad
  /// @dev the msg.sender has to have an open channel to the paywall, with sufficient tokens deposited there if isAd == true
  function addVideo(
    bytes32 _videoHash,
    bool _isAd,
    uint32 _opening_block_number
  )
    public
    ttcIsInitialized
    cmIsInitialized
    paywallIsInitialized
    minAllowanceMet(_isAd, _opening_block_number)
    returns (uint256)
  {
    require(videoIndex[_videoHash] == 0);
    videos.push(Video(_videoHash, _isAd, msg.sender));
    videoIndex[_videoHash] = videos.length.sub(1);
    return videos.length.sub(1);
  }


  /// @notice emit an event referencing a withdrawl or settlement and a logsHash
  /// @param _spender channels spender
  /// @param _recipient channels recipient
  /// @param _balance balance that was settled upon
  /// @param _opening_block_number to identify the channel
  /// @param _logsHash a hash referencing some logs, available through tvtwo
  function channelCheckpoint(
    address _spender,
    address _recipient,
    uint192 _balance,
    uint32 _opening_block_number,
    bytes32 _logsHash
  )
    public
    onlyOwner
    ttcIsInitialized
    cmIsInitialized
    paywallIsInitialized
  {
    require(_balance > 0);
    require(_opening_block_number != 0);
    require(_spender != 0x0);
    require(_recipient != 0x0);
    require(_logsHash != 0);
    Checkpoint(_spender, _recipient, _balance, _opening_block_number, _logsHash);
  }
  

  /// @notice creates data structures for tokenFallback of the channelManager
  /// @param address1 spender address
  /// @param address2 recepient address
  /// @param block_number open_block to topUp, and 0 to create new channel
  function join(address address1, address address2, uint32 block_number)
    pure
    public
    returns (bytes)
  {
    bytes memory channelData = new bytes(44);
    uint256 len = 256**20; // 20 byte offset for one address

    if(block_number == 0) {
      len = len * 40; // length of two addresses
    } else {
      len = len * 44; // length of two addresses and block_number
    }
    assembly {
      mstore( add(channelData, 44), block_number)
      mstore( add(channelData, 40), address2)
      mstore(
	add(channelData, 20),
	or(len, address1) // overwriting array's byte length  
      )                   // with value from len
    }
    return channelData;
  }

  /// @notice forwards call to the connected coin
  /// @dev sets ttc.managed(_viewer) to true if ttc.balanceOf(_viewer) == 0
  /// @param _viewer the new viewer address
  function createViewer(address _viewer)
    ttcIsInitialized
    onlyOwner
    public
  {
    ttc.createViewer(_viewer);
  }

  /// @notice will deposit some tokens on behalf of a managed user with the channelManager
  /// @dev forwards a _data value to ttc, which will do transfers of coins and calls tokenFallback of the channelManager
  /// @param _viewer the managed user
  /// @param _value amount of tokens
  /// @param _opening_block_number the block number of an already existing channel, 0 for new channel
  function deposit(address _viewer, uint192 _value, uint32 _opening_block_number)
    ttcIsInitialized
    paywallIsInitialized
    onlyOwner
    public
  {
    ttc.deposit(_viewer, _value,
		join(_viewer, paywall, _opening_block_number));
  }
  
}
