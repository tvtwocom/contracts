const TvTwoManager = artifacts.require('TvTwoManager')
const TvTwoCoin = artifacts.require('TvTwoCoin')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow, zeroAddress } = require('./utils/general')
const {
  testSetTvTwoCoin,
  testCreateVideo,
  testSetMinAllowance
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

    it('should start with TvTwoCoin unintialized', async () => {
      const ttmTtc = await ttm.ttc()
      assert.equal(
        ttmTtc,
        zeroAddress,
        'ttm should start with ttc as address(0)'
      )
    })

    it('should set TvTwoCoin when owner', async () => {
      await testSetTvTwoCoin(ttm, owner, ttc.address)
    })

    it('should NOT set TvTwoCoin when NOT owner', async () => {
      await testWillThrow(testSetTvTwoCoin, [ttm, notOwner, zeroAddress])
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
      await testSetTvTwoCoin(ttm, owner, ttc.address)
      await testCreateVideo(ttm, adHash, isAd, advertiser)
    })

    it('should NOT create the same ad again with same hash', async () => {
      const minTokenAmount = await ttm.minimumAllowance()
      const buyAmount = await ttc.tokensToWei(minTokenAmount)
      const isAd = true
      await testBuyTokens(ttc, advertiser, buyAmount)
      await testSetAllowance(ttc, advertiser, ttm.address, minTokenAmount)
      await testSetTvTwoCoin(ttm, owner, ttc.address)
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
      await testSetTvTwoCoin(ttm, owner, ttc.address)
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
      await testSetTvTwoCoin(ttm, owner, ttc.address)
      await testCreateVideo(ttm, videoHash, isAd, contentCreator)
    })
  })
})

// describe('when reaching checkpoints', async () => {
//   contract('TvTwoManager/TvTwoCoin', accounts => {
//     const advertiser = accounts[1]
//     const contentCreator = accounts[2]
//     const contentConsumer = accounts[3]
//     let ttc
//     let ttm
//
//     beforeEach('setup contracts', async () => {
//       ttc = TvTwoCoin.new()
//       ttm = TvTwoManager.new()
//     })
//
//     it('should pay contentConsumer from advertiser for watched ads', async () => {})
//
//     it('should pay contentCreator from contentConsumer from watched videos', async () => {})
//   })
// })
