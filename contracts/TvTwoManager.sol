pragma solidity ^0.4.18;

import "./TvTwoCoin.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


// used to mint from TvTwoCoin
contract TvTwoCoinInterface {
  function mint()
    public
    returns (bool)
  {}
}


contract TvTwoManager is Ownable {
  using SafeMath for uint;

  struct Checkpoint {
    bytes32 videoHash;
    uint relevanceScore;
    address sender;
  }

  struct Video {
    bytes32 videoHash;
    bool isAd;
    address uploader;
  }

  TvTwoCoinInterface public ttc;
  uint public tokenPrice = 1000;
  mapping (address => uint) public balances;
  mapping (bytes32 => uint) public videoIndex;
  Checkpoint[] public checkpoints;
  Video[] public videos;

  // Uncomment this line if user/video caching is needed
  // If enabled, the cache needs to be updated in the addVideo function
  //
  // mapping (address => uint[]) public user_videos;

  function TvTwoManager() public {
    videos.push(Video('', false, address(0)));
  }

  function setTvTwoCoin(
    address _tokenAddress
  )
    public
    onlyOwner
  {
    ttc = TvTwoCoinInterface(_tokenAddress);
  }

  function addVideo(
    bytes32 _videoHash,
    bool _isAd
  )
    public
    returns (uint)
  {
    Video memory video;

    video.videoHash = _videoHash;
    video.isAd = _isAd;
    video.uploader = msg.sender;

    videos.push(video);
    videoIndex[_videoHash] = videos.length.sub(1);
    return videos.length.sub(1);
  }

  function videoCheckpoint(
    bytes32 _videoHash,
    uint _relevanceScore
  )
    public
    returns (bool)
  {
    address userWallet = msg.sender;
    Checkpoint memory toSave = Checkpoint(
      _videoHash,
      _relevanceScore,
      userWallet
    );
    checkpoints.push(toSave);
    Video memory video = videos[videoIndex[_videoHash]];

    if (video.isAd) {
      internalTransfer(
        video.uploader,
        userWallet,
        _relevanceScore.mul(3)
      );
    } else {
      internalTransfer(
        userWallet,
        video.uploader,
        _relevanceScore
      );
    }
    return true;
  }

  function internalTransfer(
    address _from,
    address _to,
    uint _amount
  )
    internal
    returns (bool)
  {
    require (_to != address(0));
    balances[_from] = balances[_from].sub(_amount);
    balances[_to] = balances[_to].add(_amount);

    return true;
  }
}
