const TvTwo = artifacts.require('TvTwo')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')

describe('when using owner functions', () => {
  contract('TvTwo', accounts => {
    const owner = accounts[0]
    const nonOwner = accounts[1]
    let tt

    before('setup contract', async () => {
      tt = await TvTwo.new()
    })

    it('should have the correct owner set', async () => {
      const actualOwner = await tt.owner()
      assert.equal(
        owner,
        actualOwner,
        'the owner should be the address in accounts'
      )
    })

    it('should set the token price if owner', async () => {
      const tokenPriceIncreaseAmount = new BigNumber(10)
      const preTokenPrice = await tt.tokenPrice()
      await tt.setTokenPrice(preTokenPrice.add(tokenPriceIncreaseAmount), {
        from: owner
      })
      const postTokenPrice = await tt.tokenPrice()
      assert.equal(
        postTokenPrice.sub(preTokenPrice).toString(),
        tokenPriceIncreaseAmount.toString(),
        'the token price should be increased by tokenPriceIncreaseAmount'
      )
    })

    it('should NOT set token price if NOT owner', async () => {
      await testWillThrow(tt.setTokenPrice, [10, { from: nonOwner }])
    })
  })
})

describe('when derping', () => {
  contract('TvTwo', accounts => {
    const advertiser = accounts[1]
    const contentConsumer = accounts[2]
    const contentCreator = accounts[3]
    let tt

    before('setup contract', async () => {
      tt = TvTwo.new()
    })

    it('should create an ad', async () => {
      
    })
  })
})
