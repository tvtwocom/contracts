const URaiden = artifacts.require('RaidenMicroTransferChannels')

const BigNumber = require('bignumber.js')
const eUtil = require('ethereumjs-util')

channelFromEvent = event => ({
  openingBlock: event.blockNumber,
  spender: event.args._sender_address,
  recepient: event.args._receiver_address,
  contractAddress: event.address,
  balance: 0
})

toChannelInfoObject = _channelInfo => ({
  key: _channelInfo.shift().toString(),
  deposit: _channelInfo.shift().toString(),
  settleBlockNumber: _channelInfo.shift().toString(),
  closingBalance: _channelInfo.shift().toString(),
  withdrawnBalance:_channelInfo.shift().toString()
})

toHex = (_value) => {
  value = _value.toString(16)
  return '0'.repeat(value.length%2)+value
}

balanceProofHash = (balance) => {
  const hash_header = web3.sha3( ''.concat(
    'string message_id',
    'address receiver',
    'uint32 block_created',
    'uint192 balance',
    'address contract') ).replace(/^0x/, '')
  const hash_values = web3.sha3(''.concat(
    web3.toHex('Sender balance proof signature'),
    balance.recepient.replace(/^0x/, ''),
    web3.padLeft(balance.openingBlock.toString(16), 8),
    web3.padLeft(balance.balance.toString(16), 48),
    balance.contractAddress.replace(/^0x/, '')), {encoding: 'hex'})
	.replace(/^0x/, '')
  
  const msg_hash = web3.sha3('0x'.concat(
    hash_header,
    hash_values), {encoding: 'hex'})
  return msg_hash
}

signBalanceProof = (balance) => {
  const msg_hash = balanceProofHash(balance)
  return web3.eth.sign(balance.spender,msg_hash)  
}

generateClosingSig = async (channel) => {
  const header = web3.sha3(''.concat(
    'string message_id',
    'address sender',
    'uint32 block_created',
    'uint192 balance',
    'address contract'        
  ))
  const content = web3.sha3(''.concat(
    web3.toHex('Receiver closing signature'),
    channel.spender.replace(/^0x/,''),
    web3.padLeft(channel.openingBlock.toString(16),8),
    web3.padLeft(channel.balance.toString(16), 48),
    channel.contractAddress.replace(/^0x/,'')
  ), {encoding: 'hex'})
  const msg = web3.sha3(web3.toHex(header).concat(content.replace(/^0x/,'')), {encoding: 'hex'})
  return  web3.eth.sign(channel.recepient, msg)
}


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

async function createChannel(uRaiden, ttc, spender, recepient, amount) {
  const data = spender.concat(recepient.replace('0x',''))
  depositResponse = await ttc._transfer(uRaiden.address, amount, data, {from: spender})

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
  return { ...channel, channelInfo}
}

async function getChannelInfos(channels) {
  await Promise.all(Object.keys(channels).map(async  role => {
    const channel = channels[role]
    channel.channelInfo =
      await uRaiden.getChannelInfo(channel.spender,
    				   channel.recepient,
    				   channel.openingBlock)
      .then(toChannelInfoObject)
  }))

}

async function testDeposit(uRaiden, ttc, ttm, spender, owner, amount) {

  const preBalance = {
    spender: await ttc.balanceOf(spender),
    recipient: await ttc.balanceOf(await ttc.paywall()),
    channelManager: await ttc.balanceOf(uRaiden.address)
  }

  const result = await ttm.deposit(
    spender,
    amount,
    {from: owner}
  )

  const postBalance = {
    spender: await ttc.balanceOf(spender),
    recipient: await ttc.balanceOf(await ttc.paywall()),
    channelManager: await ttc.balanceOf(uRaiden.address)
  }

  // sets balances
  assert.equal(postBalance.spender.toString(), preBalance.spender.sub(amount).toString(), 'spender balance should have decreased')
  assert.equal(postBalance.recipient.toString(), preBalance.recipient.toString(), 'recipient balance should be unaltered')
  assert.equal(postBalance.channelManager.toString(), preBalance.channelManager.add(amount).toString(), 'channelManager balance should have increased')

  // emits correct channelCreated and Transfer event
  
  const channelCreatedEvents = result.logs
	.filter( l => l.event == 'ChannelCreated')
  const transferEvents = result.logs
	.filter( l => l.event == 'Transfer')

  assert.equal(channelCreatedEvents.length, 1, 'not one ChannelCreated Event')
  assert.equal(transferEvents.length, 1, 'not one Transfer Event')

  const ccEvent = channelCreatedEvents[0].args
  const tEvent = transferEvents[0].args

  assert.equal(ccEvent._sender_address, spender, 'spender wrong')
  assert.equal(tEvent.from, spender, 'not from spender')
  assert.equal(ccEvent._receiver_address, await ttc.paywall(), 'receiver wrong')
  assert.equal(tEvent.to, uRaiden.address, 'not to channelManager')
  
  assert.equal(ccEvent._deposit.toString(), amount.toString(), 'deposit wrong')
  assert.equal(tEvent.value.toString(), amount.toString(), 'wrong amount transfered')
  
  // return channel (side effect: confirms that channel exists)
  
  const channel = channelFromEvent(channelCreatedEvents[0])
  const channelInfo = await uRaiden.getChannelInfo(
    channel.spender,
    channel.recepient,
    channel.openingBlock
  ).then(toChannelInfoObject)
  assert.equal(channelInfo.deposit, amount.toString())
  return { ...channel, channelInfo}
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


async function testCooperativeClose(uRaiden, ttc, channel) {
  channel.closingSig = await generateClosingSig(channel)
  const result = await uRaiden.cooperativeClose(
    channel.recepient,
    channel.openingBlock,
    channel.balance,
    channel.sig,
    channel.closingSig
  )

  const settleEvents = result.logs.filter(e => e.event == 'ChannelSettled')
  assert.equal(settleEvents.length, 1, 'should evoke a settle event')
  const transferEvents = result.logs.filter(e => e.event == 'Transfer')
  assert.equal(transferEvents.length, 2, 'should be 2 transfer events')
  // TODO be more certain
  return result
}

async function testWatchOriginalContent(uRaiden, ttc, channels) {

  channels.viewerOut.balance += 1
  channels.viewerOut.sig = signBalanceProof(channels.viewerOut)
  assert.equal(await uRaiden.extractBalanceProofSignature(
    channels.viewerOut.recepient,
    channels.viewerOut.openingBlock,
    channels.viewerOut.balance,
    channels.viewerOut.sig,
  ).then(i => i.toLowerCase()), channels.viewerOut.spender.toLowerCase(),'viewer signature invalid')
  
  // paywall forwards this to content creator
  channels.contentCreator.balance += 1
  channels.contentCreator.sig = signBalanceProof(channels.contentCreator)     // signed by TvTwo
  assert.equal(await uRaiden.extractBalanceProofSignature(
    channels.contentCreator.recepient,
    channels.contentCreator.openingBlock,
    channels.contentCreator.balance,
    channels.contentCreator.sig
  ).then(i => i.toLowerCase()), channels.contentCreator.spender.toLowerCase(),'contentCreator signature invalid')

}

async function testWatchAd(uRaiden, ttc, channels) {
  channels.viewerIn.balance += 3
  channels.viewerIn.sig = signBalanceProof(channels.viewerIn) // signe
  assert.equal(await uRaiden.extractBalanceProofSignature(
    channels.viewerIn.recepient,
    channels.viewerIn.openingBlock,
    channels.viewerIn.balance,
    channels.viewerIn.sig
  ).then(i => i.toLowerCase()), channels.viewerIn.spender.toLowerCase(),'viewer signature invalid')

}

async function testWithdrawl(uRaiden, ttc, channel) {
  const result = await uRaiden.withdraw(channel.openingBlock, channel.balance, channel.sig, {from: channel.recepient})
}

module.exports = {
  testCreateChannel,
  testTopUpChannel,
  channelFromEvent,
  toChannelInfoObject,
  signBalanceProof,
  balanceProofHash,
  createChannel,
  testWatchOriginalContent,
  testWatchAd,
  testCooperativeClose,
  testWithdrawl,
  testDeposit
}
