const TvTwoCoin = artifacts.require('TvTwoCoin')
const TvTwoManager = artifacts.require('TvTwoManager')
const assert = require('assert')
const BigNumber = require('bignumber.js')

const expectedContractData = {
  name: 'TV-TWO',
  symbol: 'TTV',
  decimals: new BigNumber(18),
  totalSupply: new BigNumber('666666667e18'),
  weiTokenRate: new BigNumber(10),
  companyShare: new BigNumber(15)
}

describe('when deploying a new TvTwoCoin', () => {
  contract('TvTwoManagerToken', () => {
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
  })
})
