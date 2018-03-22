const URaiden = artifacts.require('RaidenMicroTransferChannels')
const BigNumber = require('bignumber.js')

channelFromEvent = event => ({
  openingBlock: event.blockNumber,
  spender: event.args._sender_address,
  recepient: event.args._receiver_address
})

toChannelInfoObject = _channelInfo => ({
  key: _channelInfo.shift().toString(),
  deposit: _channelInfo.shift().toString(),
  settleBlockNumber: _channelInfo.shift().toString(),
  closingBalance: _channelInfo.shift().toString(),
  withdrawnBalance:_channelInfo.shift().toString()
})

async function testTopUpChannel(uRaiden, ttc, channel, amount) {
  const {spender, recepient, openingBlock} = channel
  const balances = async () => ( {
    uRaiden: await ttc.balanceOf(uRaiden.address),
    spender: await ttc.balanceOf(spender),
  } )
    const preBalances = await balances()
    const preChannelInfo  = await uRaiden.getChannelInfo(
      spender,
      recepient,
      openingBlock
    ).then(toChannelInfoObject)

    const data = spender
	  .concat(recepient.replace('0x', ''))
	  .concat(web3.padLeft(openingBlock.toString(16), 8)) // 4 bytes
    const topUpResponse = await ttc._transfer(uRaiden.address, amount, data)
    const channelToppedUpEvent = topUpResponse.logs.filter( item => item.event == "ChannelToppedUp")[0]
  assert.equal(channelToppedUpEvent.args._added_deposit, amount.toString())
    
    const postBalances = await balances()
    assert(preBalances.uRaiden.add(amount).eq(postBalances.uRaiden),
	   `uRaiden balance should have increased by ${amount
            }, but ${postBalances.uRaiden.sub(preBalances.uRaiden)}`)
    assert(preBalances.spender.sub(amount).eq(postBalances.spender),
	   `spender balance should have decreased by ${amount
            }, but ${preBalances.spender.sub(postBalances.spender)}`)

    
    const postChannelInfo = await uRaiden.getChannelInfo(
      spender,
      recepient,
      openingBlock
    ).then(toChannelInfoObject)
    assert.equal(new BigNumber(preChannelInfo.deposit)
		 .add(amount).toString(),
		 postChannelInfo.deposit, `ChannelInfo Deposit wrong`)
    return { ...channel, postChannelInfo}
}

async function testCreateChannel(uRaiden, ttc, spender, amount) {
  try {
    const recepient = await ttc.ttm()

    const balances = async () => ( {
      uRaiden: await ttc.balanceOf(uRaiden.address),
      spender: await ttc.balanceOf(spender),
      recepient: await ttc.balanceOf(recepient),
      itself: await ttc.balanceOf(ttc.address)
    } )

    const preBalances = await balances()

    // depositResponse = await ttc.deposit(amount, {from: spender})
    const data = spender.concat(recepient.replace('0x',''))
    depositResponse = await ttc._transfer(uRaiden.address, amount, data, {from: spender})
    const transferEvent = depositResponse.logs.filter(entrie => entrie.event == 'Transfer')[0]
    // assert.equal(transferEvents.length, 1, 'there should have been two transfers one from spender to this, and one from this to stateChannelManager')
    // [TODO] I think the implementation of deposit will change to emit just one event then this can replace the preceeding assert
    assert.equal(transferEvent.args.from, spender, 'from')
    assert.equal(transferEvent.args.to, uRaiden.address, 'to')

    const channelCreatedEvent = depositResponse.logs.filter(entrie => entrie.event == 'ChannelCreated')[0]
    assert.equal(channelCreatedEvent.args._sender_address, spender, 'ChannelCreated sender')
    assert.equal(channelCreatedEvent.args._receiver_address, recepient, 'ChannelCreated receiver')
    assert.equal(channelCreatedEvent.args._deposit, amount.toString())

    const channel = channelFromEvent(channelCreatedEvent)
    const channelInfo = await uRaiden.getChannelInfo(
      channel.spender,
      channel.recepient,
      channel.openingBlock
    ).then(toChannelInfoObject)
    assert.equal(channelInfo.deposit, amount.toString())
    
    const postBalances = await balances()

    assert(preBalances.uRaiden.add(amount).eq(postBalances.uRaiden),
	   `uRaiden balance should have increased by ${amount
            }, but ${postBalances.uRaiden.sub(preBalances.uRaiden)}`)
    assert(preBalances.spender.sub(amount).eq(postBalances.spender),
	   `spender balance should have decreased by ${amount
            }, but ${preBalances.spender.sub(postBalances.spender)}`)
    assert.equal(preBalances.recepient.toString(), postBalances.recepient.toString(), 'recepient balance remains untouched')

    assert.equal(preBalances.itself.toString(), postBalances.itself.toString(), 'its own balance remains untouched')
    
    return { ...channel, channelInfo}
  } catch (e) {
    console.error('testDeposit failed : ', e)
    throw e
  }
}

module.exports = {
  testCreateChannel,
  testTopUpChannel,
  channelFromEvent,
  toChannelInfoObject
}
