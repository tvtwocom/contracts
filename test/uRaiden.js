const TvTwoCoin = artifacts.require('TvTwoCoin')
const URaiden = artifacts.require('RaidenMicroTransferChannels')
const TvTwoManager = artifacts.require('TvTwoManager')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')
const { migrate } = require('./utils/general')
const { testCreateChannel, channelFromEvent, toChannelInfoObject } = require('./utils/uRaiden')

describe('StateChannels', () => {
  let uRaiden, ttc, ttm
  const owner = web3.eth.accounts[0]
  const recepient = web3.eth.accounts[1]
  beforeEach(async () => {
    instances = await migrate(owner, recepient)
    uRaiden = instances.uRaiden
    ttc = instances.ttc
    ttm = instances.ttm
  })

  it('should throw when transfereing to channelManager without data', async () => {
    const amount = 50
    await testWillThrow(ttc.transfer, [uRaiden.address, amount, {from: owner}])
  })
  
  it('should create a channel', async () => {
    const amount = 50
    await testCreateChannel(uRaiden, ttc, owner, amount)
  })

  it('should increase deposit when channel already exists', async () => {
    const response = await testCreateChannel(uRaiden, ttc, owner, 30)
    const channel = {
      openingBlock: response.receipt.blockNumber,
      spender: owner,
      recepient
    }
    const _channelInfo = await uRaiden.getChannelInfo(channel.spender, channel.recepient, channel.openingBlock)
    const channelInfo = {
      key: _channelInfo.shift().toString(),
      deposit: _channelInfo.shift().toString(),
      settleBlockNumber: _channelInfo.shift().toString(),
      closingBalance: _channelInfo.shift().toString(),
      withdrawnBalance:_channelInfo.shift().toString()
    }
    const data = owner
	  .concat(recepient.replace('0x', ''))
	  .concat(web3.padLeft(channel.openingBlock.toString(16), 8)) // 4 bytes
    const topUpResponse = await ttc._transfer(uRaiden.address, 70, data)
    const channelToppedUpEvent = topUpResponse.logs.filter( item => item.event == "ChannelToppedUp")[0]
    assert.equal(channelToppedUpEvent.args._added_deposit, "70")    
  })

  xit('should settle', () => {
    
  })

})
