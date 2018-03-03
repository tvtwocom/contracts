pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


contract TvTwoCoin is StandardToken {
  string public name = "TV-TWO";
  string public symbol = "TTV";
  uint256 public decimals = 18;
  uint256 public totalSupply = 666666667e18;
  uint256 public weiTokenRate = 10;
  uint256 public companyShare = 15;

  function TvTwoCoin()
    public
  {
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

  function tokensToWei(uint _tokens)
    public
    view
    returns (uint)
  {
    return _tokens.mul(100).div(weiTokenRate);
  }

  function weiToTokens(uint _wei)
    public
    view
    returns (uint)
  {
    return _wei.mul(weiTokenRate).div(100);
  }

  // will throw on the last bit to buy...
  // doesnt need to work since this isnt final implementation
  function buy()
    public
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
}
