const TvTwoManager = artifacts.require('TvTwoManager')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')
const { testCreateVideo } = require('./utils/ttm')

describe('when using owner functions', () => {
  contract('TvTwoManager', accounts => {
    const owner = accounts[0]
    const nonOwner = accounts[1]
    let tt

    before('setup contract', async () => {
      tt = await TvTwoManager.new()
    })

    it('should have the correct owner set', async () => {
      const actualOwner = await tt.owner()
      assert.equal(
        owner,
        actualOwner,
        'the owner should be the address in accounts'
      )
    })
  })
})

describe('when derping', () => {
  contract('TvTwoManager', accounts => {
    const advertiser = accounts[1]
    const contentConsumer = accounts[2]
    const contentCreator = accounts[3]
    let tt

    before('setup contract', async () => {
      tt = await TvTwoManager.new()
    })

    it('should create an ad', async () => {
      const adHash = 'AxjkOLZWXGu6MIxdkHS6EYBwFiXWdjdW'
      const isAd = true
      await testCreateVideo(tt, adHash, isAd, advertiser)
    })
  })
})
