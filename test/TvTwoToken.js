const TvTwoToken = artifacts.require('TvTwoToken')
const assert = require('assert')
const BigNumber = require('bignumber.js')

const expectedContractData = {
  name: 'TvTwoToken',
  symbol: 'TVT',
  decimals: new BigNumber(18)
}

describe('when testing', () => {
  contract('TvTwoToken', accounts => {
    let tvt

    before('setup contract', async () => {
      tvt = await TvTwoToken.new()
    })

    it('should have the correct name, symbol and decimals', async () => {
      const name = await tvt.name()
      const symbol = await tvt.symbol()
      const decimals = await tvt.decimals()

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
