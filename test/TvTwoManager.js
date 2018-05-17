const TvTwoManager = artifacts.require('TvTwoManager')
const TvTwoCoin = artifacts.require('TvTwoCoin')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow, zeroAddress } = require('./utils/general')
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
      ttm = await TvTwoManager.new()
      ttc = await TvTwoCoin.new()
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
    const contentCreator = accounts[2]
    const adHash = 'AxjkOLZWXGu6MIxdkHS6EYBwFiXWdjdW'
    const videoHash = 'YsjkOLZjdsu6MIxjf7s6EYBwFiXWdjdX'
    const duplicateHash = adHash
    let ttm
    let ttc

    beforeEach('setup contract', async () => {
      ttm = await TvTwoManager.new()
      ttc = await TvTwoCoin.new()
    })

    it('should NOT create ad if NO min balance', async () => {
      const isAd = true
      await testWillThrow(testCreateVideo, [ttm, adHash, isAd, advertiser])
    })

    it('should NOT create ad if NO min allowance', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      await testWillThrow(testCreateVideo, [ttm, adHash, isAd, advertiser])
    })

    it('should NOT create ad if ttc uninitialized', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      await testSetAllowance(ttc, advertiser, ttm.address, minTokenAmount)
      await testWillThrow(testCreateVideo, [ttm, adHash, isAd, advertiser])
    })

    it('should create an ad', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      await testSetAllowance(ttc, advertiser, ttm.address, minTokenAmount)
      await testSetTTCoin(ttm, ttc, owner)
      await testCreateVideo(ttm, adHash, isAd, advertiser)
    })

    it('should NOT create the same ad again with same hash', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      await testSetAllowance(ttc, advertiser, ttm.address, minTokenAmount)
      await testSetTTCoin(ttm, ttc, owner)
      await testCreateVideo(ttm, adHash, isAd, advertiser)
      await testWillThrow(testCreateVideo, [
        ttm,
        duplicateHash,
        isAd,
        advertiser
      ])
    })

    it('should NOT create the same video again with same hash even if other attributes different', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      await testSetAllowance(ttc, advertiser, ttm.address, minTokenAmount)
      await testSetTTCoin(ttm, ttc, owner)
      await testCreateVideo(ttm, adHash, isAd, advertiser)
      await testBuyTokens(ttc, contentCreator, buyAmount)
      await testSetAllowance(ttc, contentCreator, ttm.address, minTokenAmount)
      await testWillThrow(testCreateVideo, [
        ttm,
        duplicateHash,
        isAd,
        contentCreator
      ])
    })

    it('should create a NON ad video', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, contentCreator, buyAmount)
      await testSetAllowance(ttc, contentCreator, ttm.address, minTokenAmount)
      await testSetTTCoin(ttm, ttc, owner)
      await testCreateVideo(ttm, videoHash, isAd, contentCreator)
    })
  })
})

describe('when reaching checkpoints', async () => {
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
})


