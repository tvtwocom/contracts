pragma solidity ^0.4.18;

import "../lib/manage.sol";

contract TTMProxy is UsingTTManager {

  function addVideo(
    bytes32 _videoHash,
    bool _isAd,
    uint32 _opening_block_number
  )
    public
  {
    TvTwoManagerI(ttm).addVideo(_videoHash, _isAd, _opening_block_number);
  }
}
