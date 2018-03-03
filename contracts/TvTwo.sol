pragma solidity ^0.4.18;

import "./TvTwoCoin.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract TvTwo is Ownable {
  using SafeMath for uint;

  // Structs

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

  // State variables
  StandardToken public token;
  // TTV to Wei rate
  uint public tokenPrice = 1000; // Default value
  // Holds both advertiser and user balances.
  // For the sake of a DRY codebase, the identity of advertisers/users is
  mapping (address => uint) public balances;
  Checkpoint[] public checkpoints;
  Video[] public videos;
  // Maps video hashes to array indices
  mapping (bytes32 => uint) public video_index;

  // Uncomment this line if user/video caching is needed
  // If enabled, the cache needs to be updated in the createVideo function
  //
  // mapping (address => uint[]) public user_videos;

  // Events

  event Withdraw(
    uint amount,
    address indexed sender,
    uint balanceOfSender
  );

  // Functions

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

  // For now anyone can set the price, of course later we need to add a check to the owner of the contract
  function setTokenPrice(
    uint _tokenPrice
  ) public
    returns (bool)
  {
    // price need to be set manually as it cannot be done via Ethereum network
    tokenPrice = _tokenPrice;
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

  // This function should trigger when the user reached
  // the defined minimum view time.
  //
  // We assume that the relevance score is a number of points
  // given out of 100
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

  function () payable public {
    pay();
  }

  function createTokenContract() internal returns (StandardToken) {
    return new TvTwoCoin();
  }
}
