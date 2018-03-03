pragma solidity ^0.4.18;

import "./TvTwoCoin.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


contract TvTwo is Ownable {
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

  StandardToken public token;
  uint public tokenPrice = 1000;
  mapping (address => uint) public balances;
  Checkpoint[] public checkpoints;
  Video[] public videos;
  mapping (bytes32 => uint) public video_index;

  // Uncomment this line if user/video caching is needed
  // If enabled, the cache needs to be updated in the createVideo function
  //
  // mapping (address => uint[]) public user_videos;

  event Withdraw(
    uint amount,
    address indexed sender,
    uint balanceOfSender
  );

  function TvTwo() public {
    token = createTokenContract();
  }

  function tokensToWei(uint _tokens)
    public
    view
    returns (uint)
  {
    return _tokens.div(tokenPrice);
  }

  function weiToTokens(uint _wei)
    public
    view
    returns (uint)
  {
    return _wei.mul(tokenPrice);
  }

  function createVideo(
    bytes32 _videoHash,
    bool _isAd
  )
    public
  {
    Video memory video;

    video.videoHash = _videoHash;
    video.isAd = _isAd;
    video.uploader = msg.sender;

    videos.push(video);
    video_index[_videoHash] = videos.length - 1;
  }

  function pay()
    public
    payable
    returns (bool)
  {
    require(msg.value > 0);
    balances[msg.sender] = balances[msg.sender].add(weiToTokens(msg.value));
    return true;
  }

  function setTokenPrice(
    uint _tokenPrice
  ) public
    onlyOwner
    returns (bool)
  {
    tokenPrice = _tokenPrice;
    return true;
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
    Video memory video = videos[video_index[_videoHash]];

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

  function withdraw(
    uint _weiAmount
  )
    public
    returns(bool)
  {
    balances[msg.sender] = balances[msg.sender].sub(tokensToWei(_weiAmount));
    msg.sender.transfer(_weiAmount);
    Withdraw(_weiAmount, msg.sender, balances[msg.sender]);
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

  function createTokenContract()
    internal
    returns (StandardToken)
  {
    return new TvTwoCoin();
  }
}
