const TvTwoCoin = artifacts.require('TvTwoCoin')
const assert = require('assert')
const BigNumber = require('bignumber.js')

const expectedContractData = {
  name: 'TV-TWO',
  symbol: 'TTV',
  decimals: new BigNumber(18)
}

describe('when deploying a new TvTwoCoin', () => {
  contract('TvTwoToken', () => {
    let ttc

    before('setup contract', async () => {
      ttc = await TvTwoCoin.new()
    })

    it('should have the correct name, symbol and decimals', async () => {
      const name = await ttc.name()
      const symbol = await ttc.symbol()
      const decimals = await ttc.decimals()

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
    })
  })
})
