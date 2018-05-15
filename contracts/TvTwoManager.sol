pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import './lib/manage.sol';



contract TvTwoManager is UsingChannelManager, UsingTTCoin {
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
  
  function createViewer(address _viewer)
    ttcInitialized
    onlyOwner
    public
    returns (bool success)
  {
    return ttc.createViewer(_viewer);
  }

  function deposit(address _viewer, uint192 _value, uint32 _opening_block)
    ttcInitialized
    onlyOwner
    public
  {
    ttc.deposit(_viewer, _value, _opening_block);
  }
  
}
