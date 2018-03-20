const TvTwoCoin = artifacts.require('TvTwoCoin')
const URaiden = artifacts.require('RaidenMicroTransferChannels')
const TvTwoManager = artifacts.require('TvTwoManager')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')
const { migrate } = require('./utils/general')
const { testDeposit } = require('./utils/uRaiden')

describe('TvTwoCoin', () => {
  let uRaiden, ttc, ttm
  const owner = web3.eth.accounts[0]
  before(async () => {
    instances = await migrate(owner)
    uRaiden = instances.uRaiden
    ttc = instances.ttc
    ttm = instances.ttm
  })

  it('should deposit', async () => {
    const amount = 50
    await testDeposit(uRaiden, ttc, owner, amount)
    
  })
})
