const TvTwoCoin = artifacts.require('TvTwoCoin')
const RaidenMicroTransferChannels = artifacts.require('RaidenMicroTransferChannels')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow, timeTravel } = require('./utils/general')
const { testBuyTokens, testSellTokens, testSetAllowance } = require('./utils/ttc')
const { testSetChannelManager } = require('./utils/manage')
const expectedContractData = {
  name: 'TV-TWO',
  symbol: 'TTV',
  decimals: new BigNumber(18),
  totalSupply: new BigNumber('666666667e18'),
  weiTokenRate: new BigNumber(5),
  companyShare: new BigNumber(15)
}

describe('when deploying a new TvTwoCoin', () => {
  contract('TvTwoCoin', accounts => {
    const company = accounts[0]
    let ttc

    before('setup contract', async () => {
      ttc = await TvTwoCoin.new()
    })

    it('should have correct initialized data', async () => {
      const name = await ttc.name()
      const symbol = await ttc.symbol()
      const decimals = await ttc.decimals()
      const totalSupply = await ttc.totalSupply()
      const weiTokenRate = await ttc.weiTokenRate()
      const companyShare = await ttc.companyShare()

      assert.equal(
        name,
        expectedContractData.name,
        'the token name should match the expected name'
      )
      assert.equal(
        symbol,
        expectedContractData.symbol,
        'the token symbol should match the expected symbol'
      )
      assert.equal(
        decimals.toString(),
        expectedContractData.decimals.toString(),
        'the token decimals should match the expected decimals'
      )
      assert.equal(
        totalSupply.toString(),
        expectedContractData.totalSupply.toString(),
        'the token totalSupply should match the expected totalSupply'
      )
      assert.equal(
        weiTokenRate.toString(),
        expectedContractData.weiTokenRate.toString(),
        'the token weiTokenRate should match the expected weiTokenRate'
      )
      assert.equal(
        companyShare.toString(),
        expectedContractData.companyShare.toString(),
        'the token companyShare should match the expected companyShare'
      )
    })

    it('should initialize with the correct company token balance', async () => {
      const companyBalance = await ttc.balanceOf(company)
      const expectedCompanyBalance = expectedContractData.totalSupply
        .mul(expectedContractData.companyShare)
        .div(100)
      assert.equal(
        companyBalance.toString(),
        expectedCompanyBalance.toString(),
        'the company balance should match the expected value'
      )
    })

    it('should initialize with the correct contract token balance', async () => {
      const contractBalance = await ttc.balanceOf(ttc.address)
      const companyBalance = await ttc.balanceOf(company)
      const expectedContractBalance = expectedContractData.totalSupply.sub(
        companyBalance
      )
      assert.equal(
        contractBalance.toString(),
        expectedContractBalance.toString(),
        'the company balance should match the expected value'
      )
    })

    it('should return correct wei when converting tokens to wei', async () => {
      const tokens = new BigNumber(10e18)
      const expectedWei = tokens
        .mul(expectedContractData.weiTokenRate)
        .div(100)
        .toFixed(0)
      const wei = await ttc.tokensToWei(tokens)
      assert.equal(
        wei.toString(),
        expectedWei.toString(),
        'the wei amount converted from tokens should match the expected value'
      )
    })

    it('should return correct tokens when converting wei to tokens', async () => {
      const wei = new BigNumber(10e18)
      const expectedTokens = wei
        .mul(100)
        .div(expectedContractData.weiTokenRate)
        .toFixed(0)
      const tokens = await ttc.weiToTokens(wei)
      assert.equal(
        tokens.toString(),
        expectedTokens.toString(),
        'the wei amount converted from tokens should match the expected value'
      )
    })
  })
})

describe('when buying and selling', () => {
  contract('TvTwoCoin', accounts => {
    const trader = accounts[1]
    const approver = accounts[2]
    const spender = accounts[3]
    const approveAmount = new BigNumber(1e18)
    let ttc

    beforeEach('setup contract', async () => {
      ttc = await TvTwoCoin.new()
    })

    it('should buy when money sent to buy function', async () => {
      const buyAmountEth = new BigNumber(1e18)
      await testBuyTokens(ttc, trader, buyAmountEth)
    })

    it('should sell when selling up to trader token balance', async () => {
      const buyAmountEth = new BigNumber(1e18)
      await testBuyTokens(ttc, trader, buyAmountEth)
      const sellAmountTokens = await ttc.balanceOf(trader)
      await testSellTokens(ttc, trader, sellAmountTokens)
    })

    it('should NOT sell more than trader token balance', async () => {
      const buyAmountEth = new BigNumber(1e18)
      await testBuyTokens(ttc, trader, buyAmountEth)
      const tokenBalance = await ttc.balanceOf(trader)
      const overSellTokenAmount = tokenBalance.add(1)
      await testWillThrow(testSellTokens, [ttc, trader, overSellTokenAmount])
    })

    it('should set allowances', async () => {
      await testSetAllowance(ttc, approver, spender, approveAmount)
    })

    it('should throw when calling sell after vesting period',async () => {
      const buyAmountEth = new BigNumber(1e18)
      const secIntoFuture = 31536000 // 1 year
      await testBuyTokens(ttc, trader, buyAmountEth)
      const tokenBalance = await ttc.balanceOf(trader)
  
      for(var i = 1; i <= 3; i++) {	
	const timeIncrement = await timeTravel(secIntoFuture)

	if(i < 3) 
	  await testSellTokens(ttc, trader, tokenBalance/4)
	else {
	  assert(timeIncrement + Date.now()/1000 >= await ttc.vestingPeriod(), 'not after vesting period')
	  await testWillThrow(testSellTokens,
			    [ttc, trader, tokenBalance/4])
	}
      }
    })

    it('should throw when calling buy after vesting period', async () => {
      const buyAmountEth = new BigNumber(1e18)
      const secIntoFuture = 31536000 // 1 year
      for(var i = 1; i <= 3; i++) {
	const timeIncrement = await timeTravel(secIntoFuture)
    	if(i < 3)
    	  await testBuyTokens(ttc, trader, buyAmountEth)
    	else {
	  assert(timeIncrement + Date.now()/1000 >= await ttc.vestingPeriod(), 'not after vesting period')
	  await testWillThrow(testBuyTokens, [ttc, trader, buyAmountEth])
	}
      }
    })
  
  })
})


describe('helpers', () => {
  let uRaiden, ttc, ttm
  const owner = web3.eth.accounts[0]
  const spender = web3.eth.accounts[1]
  const recipient = web3.eth.accounts[2]
  const other = web3.eth.accounts[9]
  const addr = web3.eth.accounts
    
  beforeEach(async () => {
    ttc = await TvTwoCoin.new({from: owner}) //instances.ttc
  })

  it('join should create 40 bytes data when called with open_block == 0', async () => {
    const result = await ttc.join(addr[1], addr[2], 0)
    // length in hexstring 40*2 +2
    assert.equal(result.length, 82, 'length wrong')
    assert.equal(result.slice(2,42), addr[1].replace(/^0x/, ''))
    assert.equal(result.slice(42,82), addr[2].replace(/^0x/, ''))
  })

  it('join should create 44 bytes data when called with open_block != 0', async () => {
    const open_block = new BigNumber(0x12345)
    const result = await ttc.join(addr[1], addr[2], open_block)
    // length in hexstring 40*2 +2
    assert.equal(result.length, 90, 'length wrong')
    assert.equal(result.slice(2,42), addr[1].replace(/^0x/, ''))
    assert.equal(result.slice(42,82), addr[2].replace(/^0x/, ''))
    assert(open_block.equals('0x'+result.slice(82,90)) )
  })

  it('channelManager should be unset on deploy', async () => {
    const channelManager = await ttc.channelManager()
    assert.equal(channelManager, '0x0000000000000000000000000000000000000000')
  })

  it('should set the channelManager', async () => {
    const uRaiden = await RaidenMicroTransferChannels.new(ttc.address, 500, [], {from: owner})
    await testSetChannelManager(ttc, uRaiden, owner)
  })

  it('should not set channelManager with wrong token', async () => {
    const ttc2 = await TvTwoCoin.new()
    const uRaiden = await RaidenMicroTransferChannels.new(ttc2.address, 500, [], {from: owner})
    await testWillThrow(testSetChannelManager(ttc, uRaiden, owner))
    assert(await ttc.channelManager(), '0x0000000000000000000000000000000000000000', 'channelManager is not unset')
  })

  it('shold not allow setting ChannelManager by not owner', async () => {
    const uRaiden = await RaidenMicroTransferChannels.new(ttc.address, 500, [], {from: owner})
    await testWillThrow(testSetChannelManager(ttc, uRaiden, other))
    assert(await ttc.channelManager(), '0x0000000000000000000000000000000000000000', 'channelManager is not unset')

  })
  it('should not set the channelManager to not contract', async () => {
    await testWillThrow( ttc.setChannelManager(other, {from: owner}) )
    assert(await ttc.channelManager(), '0x0000000000000000000000000000000000000000', 'channelManager is not unset')
  })
})
