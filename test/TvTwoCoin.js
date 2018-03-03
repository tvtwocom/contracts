const TvTwoCoin = artifacts.require('TvTwoCoin')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')
const { testBuyTokens, testSellTokens } = require('./utils/ttc')

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
  })
})
