const URaiden = artifacts.require('RaidenMicroTransferChannels')


async function testDeposit(uRaiden, ttc, spender, amount) {
  try {

    const balances = async () => ( {
      uRaiden: await ttc.balanceOf(uRaiden.address),
      spender: await ttc.balanceOf(spender),
      itself: await ttc.balanceOf(ttc.address)
    } )
    
    const preBalances = await balances()

    depositResponse = await ttc.deposit(amount, {from: spender})

    const transferEvents = depositResponse.logs.filter(entrie => entrie.event == 'Transfer')
    assert.equal(transferEvents.length, 2, 'there should have been two transfers one from spender to this, and one from this to stateChannelManager')
    // [TODO] I think the implementation of deposit will change to emit just one event then this can replace the preceeding assert
    // assert.equal(transferEvent.args.from, spender, 'from')
    // assert.equal(transferEvent.args.to, uRaiden.address, 'to')

    const channelCreatedEvent = depositResponse.logs.filter(entrie => entrie.event == 'ChannelCreated')[0]
    assert.equal(channelCreatedEvent.args._sender_address, spender, 'ChannelCreated sender')
    assert.equal(channelCreatedEvent.args._receiver_address, await ttc.tvTwoManager(), 'ChannelCreated receiver')
    assert.equal(channelCreatedEvent.args._deposit, amount.toString())
    
    const postBalances = await balances()

    assert(preBalances.uRaiden.add(amount).eq(postBalances.uRaiden),
	   `uRaiden balance should have increased by ${amount
            }, but ${preBalances.uRaiden.sub(postBalances.uRaiden)}`)
    assert(preBalances.spender.sub(50).eq(postBalances.spender),
	   `spender balance should have decreased by ${amount
            }, but ${preBalances.spender.sub(postBalances.spender)}`)
    assert.equal(preBalances.itself.toString(), postBalances.itself.toString(), 'its own balance remains untouched')
  } catch (e) {
    console.error('testDeposit failed : ', e)
    throw e
  }
}

module.exports = {
  testDeposit
}
