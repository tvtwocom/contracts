const BigNumber = require('bignumber.js')
const assert = require('assert')
const { hasEvent } = require('./general.js')

const channelFromEvent = event => ({
  openingBlock: event.blockNumber,
  spender: event.args._sender_address,
  recipient: event.args._receiver_address,
  contractAddress: event.address,
  balance: 0
})

const toChannelInfoObject = _channelInfo => ({
  key: _channelInfo.shift().toString(),
  deposit: _channelInfo.shift().toString(),
  settleBlockNumber: _channelInfo.shift().toString(),
  closingBalance: _channelInfo.shift().toString(),
  withdrawnBalance: _channelInfo.shift().toString()
})

const balanceProofHash = balance => {
  const hash_header = web3
    .sha3(
      ''.concat(
        'string message_id',
        'address receiver',
        'uint32 block_created',
        'uint192 balance',
        'address contract'
      )
    )
    .replace(/^0x/, '')
  const hash_values = web3
    .sha3(
      ''.concat(
        web3.toHex('Sender balance proof signature'),
        balance.recipient.replace(/^0x/, ''),
        web3.padLeft(balance.openingBlock.toString(16), 8),
        web3.padLeft(balance.balance.toString(16), 48),
        balance.contractAddress.replace(/^0x/, '')
      ),
      { encoding: 'hex' }
    )
    .replace(/^0x/, '')

  const msg_hash = web3.sha3('0x'.concat(hash_header, hash_values), {
    encoding: 'hex'
  })
  return msg_hash
}

const signBalanceProof = balance => {
  const msg_hash = balanceProofHash(balance)
  return web3.eth.sign(balance.spender, msg_hash)
}

const generateClosingSig = async channel => {
  const header = web3.sha3(
    ''.concat(
      'string message_id',
      'address sender',
      'uint32 block_created',
      'uint192 balance',
      'address contract'
    )
  )
  const content = web3.sha3(
    ''.concat(
      web3.toHex('Receiver closing signature'),
      channel.spender.replace(/^0x/, ''),
      web3.padLeft(channel.openingBlock.toString(16), 8),
      web3.padLeft(channel.balance.toString(16), 48),
      channel.contractAddress.replace(/^0x/, '')
    ),
    { encoding: 'hex' }
  )
  const msg = web3.sha3(web3.toHex(header).concat(content.replace(/^0x/, '')), {
    encoding: 'hex'
  })
  return web3.eth.sign(channel.recipient, msg)
}

async function testTopUpChannel(uRaiden, ttc, channel, amount) {
  const { spender, recipient, openingBlock } = channel
  const balances = async () => ({
    uRaiden: await ttc.balanceOf(uRaiden.address),
    spender: await ttc.balanceOf(spender)
  })
  const preBalances = await balances()
  const preChannelInfo = await uRaiden
    .getChannelInfo(spender, recipient, openingBlock)
    .then(toChannelInfoObject)

  const data = spender
    .concat(recipient.replace('0x', ''))
    .concat(web3.padLeft(openingBlock.toString(16), 8)) // 4 bytes
  const topUpResponse = await ttc._transfer(uRaiden.address, amount, data, {
    from: spender
  })
  const channelToppedUpEvent = topUpResponse.logs.filter(
    item => item.event == 'ChannelToppedUp'
  )[0]
  assert.equal(channelToppedUpEvent.args._added_deposit, amount.toString())

  const postBalances = await balances()
  assert(
    preBalances.uRaiden.add(amount).eq(postBalances.uRaiden),
    `uRaiden balance should have increased by ${amount}, but ${postBalances.uRaiden.sub(
      preBalances.uRaiden
    )}`
  )
  assert(
    preBalances.spender.sub(amount).eq(postBalances.spender),
    `spender balance should have decreased by ${amount}, but ${preBalances.spender.sub(
      postBalances.spender
    )}`
  )

  const postChannelInfo = await uRaiden
    .getChannelInfo(spender, recipient, openingBlock)
    .then(toChannelInfoObject)
  assert.equal(
    new BigNumber(preChannelInfo.deposit).add(amount).toString(),
    postChannelInfo.deposit,
    `ChannelInfo Deposit wrong`
  )
  return { ...channel, postChannelInfo }
}

async function createChannel(uRaiden, ttc, spender, recipient, amount) {
  const data = spender.concat(recipient.replace('0x', ''))
  const depositResponse = await ttc._transfer(uRaiden.address, amount, data, {
    from: spender
  })

  const channelCreatedEvent = depositResponse.logs.filter(
    entrie => entrie.event == 'ChannelCreated'
  )[0]
  assert.equal(
    channelCreatedEvent.args._sender_address,
    spender,
    'ChannelCreated sender'
  )
  assert.equal(
    channelCreatedEvent.args._receiver_address,
    recipient,
    'ChannelCreated receiver'
  )
  assert.equal(channelCreatedEvent.args._deposit, amount.toString())
  const channel = channelFromEvent(channelCreatedEvent)
  const channelInfo = await uRaiden
    .getChannelInfo(channel.spender, channel.recipient, channel.openingBlock)
    .then(toChannelInfoObject)
  assert.equal(channelInfo.deposit, amount.toString())
  return { ...channel, channelInfo }
}

// async function getChannelInfos(channels) {
//   await Promise.all(
//     Object.keys(channels).map(async role => {
//       const channel = channels[role]
//       channel.channelInfo = await uRaiden
//         .getChannelInfo(
//           channel.spender,
//           channel.recipient,
//           channel.openingBlock
//         )
//         .then(toChannelInfoObject)
//     })
//   )
// }

async function testDepositTopUp(uRaiden, ttc, ttm, owner, channel, amount) {
  const preBalance = {
    spender: await ttc.balanceOf(channel.spender),
    recipient: await ttc.balanceOf(await ttm.paywall()),
    channelManager: await ttc.balanceOf(uRaiden.address)
  }
  const result = await ttm.deposit(
    channel.spender,
    amount,
    channel.openingBlock,
    { from: owner }
  )

  const postBalance = {
    spender: await ttc.balanceOf(channel.spender),
    recipient: await ttc.balanceOf(await ttm.paywall()),
    channelManager: await ttc.balanceOf(uRaiden.address)
  }

  // sets balances
  assert.equal(
    postBalance.spender.toString(),
    preBalance.spender.sub(amount).toString(),
    'spender balance should have decreased'
  )
  assert.equal(
    postBalance.recipient.toString(),
    preBalance.recipient.toString(),
    'recipient balance should be unaltered'
  )
  assert.equal(
    postBalance.channelManager.toString(),
    preBalance.channelManager.add(amount).toString(),
    'channelManager balance should have increased'
  )

  // emits correct channelCreated and Transfer event
  const channelToppedUpEvents = result.logs.filter(
    l => l.event == 'ChannelToppedUp'
  )
  const transferEvents = result.logs.filter(l => l.event == 'Transfer')

  assert.equal(channelToppedUpEvents.length, 1, 'not one ChannelCreated Event')
  assert.equal(transferEvents.length, 1, 'not one Transfer Event')

  const tuEvent = channelToppedUpEvents[0].args
  const tEvent = transferEvents[0].args

  assert.equal(tuEvent._sender_address, channel.spender, 'spender wrong')
  assert.equal(tEvent.from, channel.spender, 'not from spender')
  assert.equal(tuEvent._receiver_address, channel.recipient, 'receiver wrong')
  assert.equal(tEvent.to, uRaiden.address, 'not to channelManager')

  assert.equal(
    tuEvent._added_deposit.toString(),
    amount.toString(),
    'deposit wrong'
  )
  assert.equal(
    tEvent.value.toString(),
    amount.toString(),
    'wrong amount transfered'
  )

  // return channel (side effect: confirms that channel exists)

  // const channel = channelFromEvent(channelToppedUpEvents[0])
  const channelInfo = await uRaiden
    .getChannelInfo(channel.spender, channel.recipient, channel.openingBlock)
    .then(toChannelInfoObject)
  assert.equal(
    channelInfo.deposit,
    new BigNumber(channel.channelInfo.deposit).add(amount).toString()
  )
  return { ...channel, channelInfo }
}

async function testDeposit(uRaiden, ttc, ttm, spender, owner, amount) {
  const preBalance = {
    spender: await ttc.balanceOf(spender),
    recipient: await ttc.balanceOf(await ttm.paywall()),
    channelManager: await ttc.balanceOf(uRaiden.address)
  }

  const result = await ttm.deposit(spender, amount, 0, { from: owner })

  const postBalance = {
    spender: await ttc.balanceOf(spender),
    recipient: await ttc.balanceOf(await ttm.paywall()),
    channelManager: await ttc.balanceOf(uRaiden.address)
  }

  // sets balances
  assert.equal(
    postBalance.spender.toString(),
    preBalance.spender.sub(amount).toString(),
    'spender balance should have decreased'
  )
  assert.equal(
    postBalance.recipient.toString(),
    preBalance.recipient.toString(),
    'recipient balance should be unaltered'
  )
  assert.equal(
    postBalance.channelManager.toString(),
    preBalance.channelManager.add(amount).toString(),
    'channelManager balance should have increased'
  )

  // emits correct channelCreated and Transfer event

  const channelCreatedEvents = result.logs.filter(
    l => l.event == 'ChannelCreated'
  )
  const transferEvents = result.logs.filter(l => l.event == 'Transfer')

  assert.equal(channelCreatedEvents.length, 1, 'not one ChannelCreated Event')
  assert.equal(transferEvents.length, 1, 'not one Transfer Event')

  const ccEvent = channelCreatedEvents[0].args
  const tEvent = transferEvents[0].args

  assert.equal(ccEvent._sender_address, spender, 'spender wrong')
  assert.equal(tEvent.from, spender, 'not from spender')
  assert.equal(ccEvent._receiver_address, await ttm.paywall(), 'receiver wrong')
  assert.equal(tEvent.to, uRaiden.address, 'not to channelManager')

  assert.equal(ccEvent._deposit.toString(), amount.toString(), 'deposit wrong')
  assert.equal(
    tEvent.value.toString(),
    amount.toString(),
    'wrong amount transfered'
  )

  // return channel (side effect: confirms that channel exists)

  const channel = channelFromEvent(channelCreatedEvents[0])
  const channelInfo = await uRaiden
    .getChannelInfo(channel.spender, channel.recipient, channel.openingBlock)
    .then(toChannelInfoObject)
  assert.equal(channelInfo.deposit, amount.toString())
  return { ...channel, channelInfo }
}

async function testCreateChannel(uRaiden, ttc, spender, recipient, amount) {
  const balances = async () => ({
    uRaiden: await ttc.balanceOf(uRaiden.address),
    spender: await ttc.balanceOf(spender),
    recipient: await ttc.balanceOf(recipient),
    itself: await ttc.balanceOf(ttc.address)
  })

  const preBalances = await balances()

  const data = spender.concat(recipient.replace('0x', ''))
  const depositResponse = await ttc._transfer(uRaiden.address, amount, data, {
    from: spender
  })
  const transferEvents = depositResponse.logs.filter(
    entrie => entrie.event == 'Transfer'
  )
  assert.equal(
    transferEvents.length,
    1,
    'there should have been one transfer event'
  )
  const transferEvent = transferEvents[0]
  assert.equal(transferEvent.args.from, spender, 'from')
  assert.equal(transferEvent.args.to, uRaiden.address, 'to')

  const channelCreatedEvent = depositResponse.logs.filter(
    entrie => entrie.event == 'ChannelCreated'
  )[0]
  assert.equal(
    channelCreatedEvent.args._sender_address,
    spender,
    'ChannelCreated sender'
  )
  assert.equal(
    channelCreatedEvent.args._receiver_address,
    recipient,
    'ChannelCreated receiver'
  )
  assert.equal(channelCreatedEvent.args._deposit, amount.toString())

  const channel = channelFromEvent(channelCreatedEvent)
  const channelInfo = await uRaiden
    .getChannelInfo(channel.spender, channel.recipient, channel.openingBlock)
    .then(toChannelInfoObject)
  assert.equal(channelInfo.deposit, amount.toString())

  const postBalances = await balances()

  assert(
    preBalances.uRaiden.add(amount).eq(postBalances.uRaiden),
    `uRaiden balance should have increased by ${amount}, but ${postBalances.uRaiden.sub(
      preBalances.uRaiden
    )}`
  )
  assert(
    preBalances.spender.sub(amount).eq(postBalances.spender),
    `spender balance should have decreased by ${amount}, but ${preBalances.spender.sub(
      postBalances.spender
    )}`
  )
  assert.equal(
    preBalances.recipient.toString(),
    postBalances.recipient.toString(),
    'recipient balance remains untouched'
  )

  assert.equal(
    preBalances.itself.toString(),
    postBalances.itself.toString(),
    'its own balance remains untouched'
  )

  return { ...channel, channelInfo }
}

async function testCooperativeClose(uRaiden, ttc, channel) {
  channel.closingSig = await generateClosingSig(channel)
  const balances = async () => ({
    spender: await ttc.balanceOf(channel.spender),
    recipient: await ttc.balanceOf(channel.recipient),
    channelManager: await ttc.balanceOf(uRaiden.address)
  })

  const preBalance = await balances()
  const result = await uRaiden.cooperativeClose(
    channel.recipient,
    channel.openingBlock,
    channel.balance,
    channel.sig,
    channel.closingSig
  )
  const postBalance = await balances()
  const settleEvent = hasEvent(result, 'ChannelSettled')
  assert.equal(
    settleEvent.args._sender_address.toLowerCase(),
    channel.spender.toLowerCase(),
    'spender wrong'
  )
  assert.equal(
    settleEvent.args._receiver_address.toLowerCase(),
    channel.recipient.toLowerCase(),
    'recipient wrong'
  )
  assert.equal(
    settleEvent.args._open_block_number.toString(),
    channel.openingBlock.toString(),
    'openingBlock wrong'
  )
  assert.equal(
    settleEvent.args._balance.toString(),
    channel.balance.toString(),
    '_balance wrong'
  )
  assert.equal(
    settleEvent.args._receiver_tokens.toString(),
    new BigNumber(channel.balance)
      .sub(channel.channelInfo.withdrawnBalance)
      .toString(),
    'receiver tokens wrong'
  )

  const transferEvents = hasEvent(result, 'Transfer')
  assert.equal(transferEvents.length, 2, 'should be 2 transfer events')
  assert.equal(
    transferEvents[0].args.from.toLowerCase(),
    uRaiden.address.toLowerCase()
  )
  assert.equal(
    transferEvents[1].args.from.toLowerCase(),
    uRaiden.address.toLowerCase()
  )
  const toSpender = transferEvents.filter(
    t => t.args.to.toLowerCase() === channel.spender
  )[0]

  assert.equal(
    toSpender.args.value.toString(),
    new BigNumber(channel.channelInfo.deposit).sub(channel.balance).toString(),
    'spender transfer value wrong'
  )
  const toRecipient = transferEvents.filter(
    t => t.args.to.toLowerCase() === channel.recipient
  )[0]
  assert.equal(
    toRecipient.args.value.toString(),
    new BigNumber(channel.balance)
      .sub(channel.channelInfo.withdrawnBalance)
      .toString(),
    'recipient transfer value wrong'
  )

  assert.equal(
    postBalance.channelManager.toString(),
    preBalance.channelManager
      .sub(channel.channelInfo.deposit)
      .add(channel.channelInfo.withdrawnBalance)
      .toString(),
    'channelManager balance wrong'
  )
  assert.equal(
    postBalance.recipient.toString(),
    preBalance.recipient.add(channel.balance).toString(),
    'recipient balance wrong'
  )
  assert.equal(
    postBalance.spender.toString(),
    preBalance.spender
      .add(channel.channelInfo.deposit)
      .sub(channel.balance)
      .toString(),
    'spender balance wrong'
  )
  return { channel, closed: true }
}

async function testWatchOriginalContent(uRaiden, ttc, channels) {
  channels.viewerOut.balance += 1
  channels.viewerOut.sig = signBalanceProof(channels.viewerOut)
  assert.equal(
    await uRaiden
      .extractBalanceProofSignature(
        channels.viewerOut.recipient,
        channels.viewerOut.openingBlock,
        channels.viewerOut.balance,
        channels.viewerOut.sig
      )
      .then(i => i.toLowerCase()),
    channels.viewerOut.spender.toLowerCase(),
    'viewer signature invalid'
  )

  // paywall forwards this to content creator
  channels.contentCreator.balance += 1
  channels.contentCreator.sig = signBalanceProof(channels.contentCreator) // signed by TvTwo
  assert.equal(
    await uRaiden
      .extractBalanceProofSignature(
        channels.contentCreator.recipient,
        channels.contentCreator.openingBlock,
        channels.contentCreator.balance,
        channels.contentCreator.sig
      )
      .then(i => i.toLowerCase()),
    channels.contentCreator.spender.toLowerCase(),
    'contentCreator signature invalid'
  )
}

async function testWatchAd(uRaiden, ttc, channels) {
  channels.viewerIn.balance += 3
  channels.viewerIn.sig = signBalanceProof(channels.viewerIn) // signe
  assert.equal(
    await uRaiden
      .extractBalanceProofSignature(
        channels.viewerIn.recipient,
        channels.viewerIn.openingBlock,
        channels.viewerIn.balance,
        channels.viewerIn.sig
      )
      .then(i => i.toLowerCase()),
    channels.viewerIn.spender.toLowerCase(),
    'viewer signature invalid'
  )
}

async function testWithdrawl(uRaiden, ttc, channel) {
  const preBalance = {
    channelManager: await ttc.balanceOf(uRaiden.address),
    spender: await ttc.balanceOf(channel.spender),
    recipient: await ttc.balanceOf(channel.recipient)
  }

  const result = await uRaiden.withdraw(
    channel.openingBlock,
    channel.balance,
    channel.sig,
    { from: channel.recipient }
  )

  const withdrawlEvent = hasEvent(result, 'ChannelWithdraw')
  assert.equal(withdrawlEvent.args._sender_address, channel.spender)
  assert.equal(withdrawlEvent.args._receiver_address, channel.recipient)
  assert.equal(
    withdrawlEvent.args._open_block_number.toString(),
    channel.openingBlock.toString()
  )
  assert.equal(
    withdrawlEvent.args._withdrawn_balance.toString(),
    channel.balance.toString()
  )

  const transferEvent = hasEvent(result, 'Transfer')
  assert.equal(transferEvent.args.from, uRaiden.address)
  assert.equal(transferEvent.args.to, channel.recipient)
  assert.equal(transferEvent.args.value.toString(), channel.balance.toString())

  const postBalance = {
    channelManager: await ttc.balanceOf(uRaiden.address),
    spender: await ttc.balanceOf(channel.spender),
    recipient: await ttc.balanceOf(channel.recipient)
  }
  assert.equal(
    postBalance.channelManager.toString(),
    preBalance.channelManager.sub(channel.balance).toString(),
    'channelManager balance wrong'
  )
  assert.equal(
    postBalance.spender.toString(),
    preBalance.spender.toString(),
    'spender balance wrong'
  )
  assert.equal(
    postBalance.recipient.toString(),
    preBalance.recipient.add(channel.balance).toString(),
    'recipient balance wrong'
  )
  const channelInfo = await uRaiden
    .getChannelInfo(channel.spender, channel.recipient, channel.openingBlock)
    .then(toChannelInfoObject)
  return { ...channel, channelInfo }
}

module.exports = {
  generateClosingSig,
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
  testDeposit,
  testDepositTopUp
}
