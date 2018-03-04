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
}


contract TvTwoManager is Ownable {
  using SafeMath for uint256;

  struct Checkpoint {
    bytes32 videoHash;
    uint256 relevanceScore;
    address sender;
  }

  struct Video {
    bytes32 videoHash;
    bool isAd;
    address uploader;
  }

  mapping (bytes32 => uint256) private videoIndex;
  Checkpoint[] private checkpoints;
  Video[] private videos;
  TvTwoCoinInterface private ttc;

  modifier videoHashExists(bytes32 _videoHash) {
    require(videoIndex[_videoHash] > 0);
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
    ttc = TvTwoCoinInterface(_tokenAddress);
  }

  function addVideo(
    bytes32 _videoHash,
    bool _isAd
  )
    public
    returns (uint256)
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
    uint256 _relevanceScore
  )
    public
    returns (bool)
  {
    checkpoints.push(Checkpoint(
      _videoHash,
      _relevanceScore,
      msg.sender
    ));
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
    return true;
  }
}
