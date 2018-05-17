const assert = require('assert')
const BigNumber = require('bignumber.js')
const { hasEvent } = require('./general')



async function testSetTTCoin(contract, ttc, owner) {
  const preTtc = await contract.ttc()
  const result = await contract.setTTCoin(ttc.address, {
    from: owner
  })
  const postTtc = await contract.ttc()
  assert.equal(
    postTtc,
    ttc.address,
    'the ttc address should be set to the argument given'
  )
  assert.notEqual(preTtc, postTtc, 'the ttc address should have changed')
  const event = hasEvent(result, 'TvTwoCoinUpdated')
  assert.equal(event.args.ttc, ttc.address)
}

async function testSetChannelManager(contract, uRaiden, owner) {
  const result = await contract.setChannelManager(uRaiden.address, { from: owner })
  const channelManager = await contract.channelManager()
  assert.equal(channelManager, uRaiden.address)
  const event = hasEvent(result, 'ChannelManagerUpdated')
  assert.equal(event.args.channelManager, uRaiden.address)
}


async function testSetTTManager(contract, ttm, owner) {
  const result = await contract.setTTManager(ttm.address, { from: owner })
  const ttmAddress = await contract.ttm()
  assert.equal(ttmAddress, ttm.address)
  const event = hasEvent(result, 'TvTwoManagerUpdated')
  assert.equal(event.args.ttm, ttm.address)

}

async function testSetPaywall(contract, paywall, owner) {
  const result = await contract.setPaywall(paywall, { from: owner })
  const _paywall = await contract.paywall()
  assert.equal(_paywall, paywall)
  const event = hasEvent(result, 'PaywallUpdated')
  assert.equal(event.args.paywall, paywall)
}


module.exports = {
  testSetChannelManager,
  testSetTTManager,
  testSetPaywall,
  testSetTTCoin
}
