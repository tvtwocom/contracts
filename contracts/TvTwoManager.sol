pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


// used to mint from TvTwoCoin
contract TvTwoCoinInterface {
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {}

  function allowance(
    address _owner,
    address _spender
  )
    public
    view
    returns (uint256)
  {}

  function balanceOf(
    address _owner
  )
    public
    view
    returns (uint256 balance)
  {}
}


contract TvTwoManager is Ownable {
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
  TvTwoCoinInterface public ttc;

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

  function setTvTwoCoin(
    address _tokenAddress
  )
    public
    onlyOwner
  {
    require(_tokenAddress != address(ttc));
    ttc = TvTwoCoinInterface(_tokenAddress);
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
}
