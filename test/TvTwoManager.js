const RaidenMicroTransferChannels = artifacts.require('RaidenMicroTransferChannels')
const TvTwoManager = artifacts.require('TvTwoManager')
const TvTwoCoin = artifacts.require('TvTwoCoin')
const assert = require('assert')
const BigNumber = require('bignumber.js')

const { testCreateChannel, testWithdrawl, testCooperativeClose, signBalanceProof, toChannelInfoObject } = require('./utils/uRaiden')
const { testWillThrow, zeroAddress, migrate } = require('./utils/general')
const { testSetChannelManager,
	testSetPaywall,
	testSetTTCoin } = require('./utils/manage')
const {
  testCreateVideo,
  testSetMinAllowance,
  testSetupTtcBalancesAllowances,
  testReachCheckpoint
} = require('./utils/ttm')

const { testBuyTokens, testSetAllowance } = require('./utils/ttc')

describe('when first setting up TvTwoManager', () => {
  contract('TvTwoManager', accounts => {
    const owner = accounts[0]
    const notOwner = accounts[1]
    let ttm
    let ttc

    before('setup contract', async () => {
      ttm = await TvTwoManager.new({from: owner})
      ttc = await TvTwoCoin.new({from: owner})
    })

    it('should have the correct owner set', async () => {
      const actualOwner = await ttm.owner()
      assert.equal(
        owner,
        actualOwner,
        'the owner should be the address in accounts'
      )
    })

    it('should already have a video placeholder entry in videos list', async () => {
      const placeholder = await ttm.videos(0)
      assert(
        placeholder[2] === zeroAddress,
        'the address set in placeholder should be address(0)'
      )
    })

    it('should set minimumAllowance when owner', async () => {
      const amount = new BigNumber(2e18)
      await testSetMinAllowance(ttm, owner, amount)
    })

    it('should NOT set minimumAllowance when NOT owner', async () => {
      const amount = new BigNumber(1e18)
      await testWillThrow(testSetMinAllowance, [ttm, notOwner, amount])
    })
  })
})

describe('when creating videos', () => {
  contract('TvTwoManager', accounts => {
    const owner = accounts[0]
    const advertiser = accounts[1]
    const paywall = owner
    const contentCreator = accounts[2]
    const adHash = 'AxjkOLZWXGu6MIxdkHS6EYBwFiXWdjdW'
    const videoHash = 'YsjkOLZjdsu6MIxjf7s6EYBwFiXWdjdX'
    const duplicateHash = adHash
    let ttc, ttm, uRaiden
    beforeEach('setup contract', async () => {
      const env = await migrate(owner)
      ttc = env.ttc
      ttm = env.ttm
      uRaiden = env.uRaiden
    })

    it('should NOT create ad if NO channel given', async () => {
      const isAd = true
      const openingBlock = 0
      await testWillThrow(testCreateVideo(ttm, adHash, isAd, openingBlock, advertiser))
    })

    it('should NOT create ad if WRONG channel given', async () => {
      const isAd = true
      const openingBlock = 123
      await testWillThrow(testCreateVideo(ttm, adHash, isAd, openingBlock, advertiser))
    })
    
    it('should NOT create ad if ttc uninitialized', async() => {
      const _ttm = await TvTwoManager.new({from: owner})
      await _ttm.setPaywall(paywall, {from: owner})
      await _ttm.setChannelManager(uRaiden.address, {from:owner})
      // await _ttm.setTTCoin(ttc.address, {from:owner})
      const minTokenAmount = await _ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount)
      await testWillThrow(
	testCreateVideo(_ttm, adHash, isAd, channelInfo.openingBlock, advertiser)
      )

    })
    
    it('should NOT create ad if paywall is uninitialized', async() => {
      const _ttm = await TvTwoManager.new({from: owner})
      // await _ttm.setPaywall(paywall, {from: owner})
      await _ttm.setChannelManager(uRaiden.address, {from:owner})
      await _ttm.setTTCoin(ttc.address, {from:owner})
      const minTokenAmount = await _ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount)
      await testWillThrow(
	testCreateVideo(_ttm, adHash, isAd, channelInfo.openingBlock, advertiser)
      )

    })
    it('should NOT create ad if channelManager is uninitialized', async() => {
      const _ttm = await TvTwoManager.new({from: owner})
      await _ttm.setPaywall(paywall, {from: owner})
      // await _ttm.setChannelManager(uRaiden.address, {from:owner})
      await _ttm.setTTCoin(ttc.address, {from:owner})
      const minTokenAmount = await _ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount)
      await testWillThrow(
	testCreateVideo(_ttm, adHash, isAd, channelInfo.openingBlock, advertiser)
      )
    })

    it('should create an ad', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount)
      await testCreateVideo(ttm, adHash, isAd, channelInfo.openingBlock, advertiser)
    })

    it('should create an ad if there had been withdrawls on the channel', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount * 3)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount*3)
      channelInfo.balance = minTokenAmount
      channelInfo.sig = await signBalanceProof(channelInfo)
      const result = await testWithdrawl(uRaiden, ttc, channelInfo)
      
      await testCreateVideo(ttm, adHash, isAd, channelInfo.openingBlock, advertiser)
    })

    it('should NOT create an ad if there had been withdrawls and not enough balance left', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount * 2)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount*2)
      channelInfo.balance = minTokenAmount.add(1)
      channelInfo.sig = await signBalanceProof(channelInfo)
      const result = await testWithdrawl(uRaiden, ttc, channelInfo)
      await testWillThrow(
	testCreateVideo(ttm, adHash, isAd, channelInfo.openingBlock, advertiser)
      )
    })

    it('should NOT create an ad if channel is setteled', async() => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount.mul(2))
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount.mul(2))
      channelInfo.balance = minTokenAmount
      channelInfo.sig = await signBalanceProof(channelInfo)
      await testCooperativeClose(uRaiden, ttc, channelInfo)
      await testWillThrow(
	testCreateVideo(ttm, adHash, isAd, channelInfo.openingBlock, advertiser)
      )
    })

    it('should not create an ad if channel is closed but not yet settled', async() => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount.mul(2))
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channel = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount.mul(2))
      await uRaiden.uncooperativeClose(channel.recipient, channel.openingBlock, minTokenAmount, {from: channel.spender})
      channel.info = await uRaiden.getChannelInfo(
	channel.spender,
	channel.recipient,
	channel.openingBlock
      ).then(toChannelInfoObject)
      console.log(channel)
      await testWillThrow(
	testCreateVideo(ttm, adHash, isAd, channel.openingBlock, advertiser)
      )
    })
    
    it('should NOT create the same ad again with same hash', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount*2)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount*2)
      await testCreateVideo(ttm, adHash, isAd, channelInfo.openingBlock, advertiser)
      await testWillThrow(testCreateVideo(ttm, adHash, isAd, channelInfo.openingBlock, advertiser))
    })

    it('should NOT create the same video again with same hash even if other attributes different', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      const channelInfo = await testCreateChannel(uRaiden, ttc, advertiser, paywall, minTokenAmount)
      await testCreateVideo(ttm, adHash, isAd, channelInfo.openingBlock, advertiser)

      const duplicateHash = adHash
      await testBuyTokens(ttc, contentCreator, buyAmount)
      const otherChannel = await testCreateChannel(uRaiden, ttc, contentCreator, paywall, minTokenAmount)
      await testWillThrow(testCreateVideo(
        ttm,
        duplicateHash,
        isAd,
	otherChannel.openingBlock,
	contentCreator
      ))

      await testWillThrow(testCreateVideo(
        ttm,
        duplicateHash,
        !isAd,
	otherChannel.openingBlock,
        advertiser
      ))
    })

    it('should create a NON ad video, ignoring openingBlock', async () => {
      const isAd = false
      await testCreateVideo(ttm, videoHash, isAd, 0, contentCreator)
    })
  })
})

xdescribe('when reaching checkpoints', async () => {
  contract('TvTwoManager/TvTwoCoin', accounts => {
    const owner = accounts[0]
    const advertiser = accounts[1]
    const contentCreator = accounts[2]
    const contentConsumer = accounts[3]
    const adHash = 'AxjkOLZWXGu6MIxdkHS6EYBwFiXWdjdW'
    const videoHash = 'YsjkOLZjdsu6MIxjf7s6EYBwFiXWdjdX'
    let ttc
    let ttm

    beforeEach('setup contracts', async () => {
      ttc = await TvTwoCoin.new()
      ttm = await TvTwoManager.new()
      const ecosystemParticipants = accounts.slice(1, 4)
      await testSetupTtcBalancesAllowances(
        ttm,
        ttc,
        owner,
        ecosystemParticipants
      )
      await testCreateVideo(ttm, adHash, true, advertiser)
      await testCreateVideo(ttm, videoHash, false, contentCreator)
    })

    it('should pay contentConsumer from advertiser for watched ads', async () => {
      await testReachCheckpoint(
        ttm,
        ttc,
        contentConsumer,
        videoHash,
        new BigNumber(1e16)
      )
    })

    it('should pay contentCreator from contentConsumer from watched videos', async () => {
      await testReachCheckpoint(
        ttm,
        ttc,
        contentConsumer,
        adHash,
        new BigNumber(1e16)
      )
    })

    it('should NOT pay anyone if hash does not exist', async () => {
      await testWillThrow(testReachCheckpoint, [
        ttm,
        ttc,
        contentConsumer,
        'somerandommadeuphash',
        new BigNumber(1e16)
      ])
    })
  })

})

describe('TvTwoManager helpers', () => {
  const owner = web3.eth.accounts[0]
  const spender = web3.eth.accounts[1]
  const recipient = web3.eth.accounts[2]
  const other = web3.eth.accounts[9]
  const addr  = web3.eth.accounts
  let ttm
  beforeEach(async ()=>{
    ttm = await TvTwoManager.new({from: owner})
  })

  describe('join', () => {
    it('join should create 40 bytes data when called with open_block == 0', async () => {
      const result = await ttm.join(addr[1], addr[2], '0x0')
      // length in hexstring 40*2 +2
      assert.equal(result.length, 82, 'length wrong')
      assert.equal(result.slice(2,42), addr[1].replace(/^0x/, ''))
      assert.equal(result.slice(42,82), addr[2].replace(/^0x/, ''))
    })

    it('join should create 44 bytes data when called with open_block != 0', async () => {
      const open_block = new BigNumber(0x12345)
      const result = await ttm.join(addr[1], addr[2], open_block)
      // length in hexstring 40*2 +2
      assert.equal(result.length, 90, 'length wrong')
      assert.equal(result.slice(2,42), addr[1].replace(/^0x/, ''))
      assert.equal(result.slice(42,82), addr[2].replace(/^0x/, ''))
      assert(open_block.equals('0x'+result.slice(82,90)) )
    })
  })

  describe('paywall', () => {
    it('paywall should be unset on deploy', async () => {
      const paywall = await ttm.paywall()
      assert.equal(paywall, '0x0000000000000000000000000000000000000000')
    })

    it('should set the Paywall', async () => {
      await testSetPaywall(ttm, spender, owner)
    })

    it('shold not allow setting Paywall by not owner', async () => {
      await testWillThrow(testSetPaywall(ttm, spender, other))
      assert(await ttm.paywall(), '0x0000000000000000000000000000000000000000', 'TvTwoManager is not unset')
    })
  })

  describe('setTTCoin', ()=> {
    it('TTCoin should be unset on deploy', async () => {
      const TTCoin = await ttm.ttc()
      assert.equal(TTCoin, '0x0000000000000000000000000000000000000000')
    })

    it('should set the TTCoin', async () => {
      const ttc = await TvTwoCoin.new({from: owner})
      await testSetTTCoin(ttm, ttc, owner)
    })


    it('shold not allow setting TTCoin by not owner', async () => {
      const ttc = await TvTwoCoin.new({from: owner})
      await testWillThrow(testSetTTCoin(ttm, ttc, other))
      assert(await ttm.ttc(), '0x0000000000000000000000000000000000000000', 'TvTwoCoin is not unset')
    })

    it('should not set the TTCoin to not contract', async () => {
      await testWillThrow( ttm.setTTCoin(other, {from: owner}) )
      assert(await ttm.ttc(), '0x0000000000000000000000000000000000000000', 'TvTwoCoin is not unset')
    })
  })

  describe('channelManager', () => {
    it('channelManager should be unset on deploy', async () => {
      const channelManager = await ttm.channelManager()
      assert.equal(channelManager, '0x0000000000000000000000000000000000000000')
  })

  it('should set the channelManager', async () => {
    const ttc = await TvTwoCoin.new({from: owner})
    const uRaiden = await RaidenMicroTransferChannels.new(ttc.address, 500, [], {from: owner})
    await testSetChannelManager(ttm, uRaiden, owner)
  })

  it('shold not allow setting ChannelManager by not owner', async () => {
    const ttc = await TvTwoCoin.new({from: owner})
    const uRaiden = await RaidenMicroTransferChannels.new(ttc.address, 500, [], {from: owner})
    await testWillThrow(testSetChannelManager(ttm, uRaiden, other))
    assert(await ttm.channelManager(), '0x0000000000000000000000000000000000000000', 'channelManager is not unset')

  })
  
  it('should not set the channelManager to not contract', async () => {
    await testWillThrow( ttm.setChannelManager(other, {from: owner}) )
    assert(await ttm.channelManager(), '0x0000000000000000000000000000000000000000', 'channelManager is not unset')
  })

  })
})


