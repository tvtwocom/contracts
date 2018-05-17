pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import './lib/manage.sol';



contract TvTwoManager is UsingTTCoin, UsingPaywall {
  using SafeMath for uint256;

  event Checkpoint (
    bytes32 indexed videoHash,
    uint256 relevanceScore,
    address indexed sender
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

  modifier ttcInitialized() {
    require(address(ttc) != address(0));
    _;
  }

  modifier minAllowanceMet() {
    uint256 _allowance = ttc.allowance(msg.sender, this);
    uint256 _balance = ttc.balanceOf(msg.sender);
    require(_balance >= minimumAllowance);
    require(_allowance >= minimumAllowance);
    _;
  }

  function TvTwoManager()
    public
  {
    videos.push(Video('', false, address(0)));
  }

  function setMinimumAllowance(
    uint256 _minAllowance
  )
    public
    onlyOwner
  {
    require(minimumAllowance != _minAllowance);
    minimumAllowance = _minAllowance;
  }

  function addVideo(
    bytes32 _videoHash,
    bool _isAd
  )
    public
    ttcInitialized
    minAllowanceMet
    returns (uint256)
  {
    require(videoIndex[_videoHash] == 0);
    videos.push(Video(_videoHash, _isAd, msg.sender));
    videoIndex[_videoHash] = videos.length.sub(1);
    return videos.length.sub(1);
  }

  function videoCheckpoint(
    bytes32 _videoHash,
    uint256 _relevanceScore
  )
    public
    ttcInitialized
    minAllowanceMet
    videoHashExists(_videoHash)
    returns (bool)
  {
    Video memory video = videos[videoIndex[_videoHash]];
    video.isAd
      ? ttc.transferFrom(
          video.uploader,
          msg.sender,
          _relevanceScore.mul(3)
        )
      : ttc.transferFrom(
          msg.sender,
          video.uploader,
          _relevanceScore
        );
    Checkpoint(_videoHash, _relevanceScore, msg.sender);
    return true;
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


  function createViewer(address _viewer)
    ttcInitialized
    onlyOwner
    public
  {
    ttc.createViewer(_viewer);
  }
  
  /// @param _opening_block_number the block number of an already existing channel, 0 for new channel
  function deposit(address _viewer, uint192 _value, uint32 _opening_block_number)
    ttcInitialized
    paywallIsInitialized
    onlyOwner
    public
  {
    ttc.deposit(_viewer, _value,
		join(_viewer, paywall, _opening_block_number));
  }
  
}
