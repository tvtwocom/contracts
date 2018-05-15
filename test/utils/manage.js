const assert = require('assert')
const BigNumber = require('bignumber.js')
// const { testWillThrow, timeTravel } = require('./general')

// [TODO] setTvTwoCoin is missing

async function testSetChannelManager(contract, uRaiden, owner) {
  const result = await contract.setChannelManager(uRaiden.address, { from: owner })
  const channelManager = await contract.channelManager()
  assert.equal(channelManager, uRaiden.address)
  // [TODO] should emit events
}


async function testSetTTManager(contract, ttm, owner) {
  const result = await contract.setTTManager(ttm.address, { from: owner })
  const ttmAddress = await contract.ttm()
  assert.equal(ttmAddress, ttm.address)
  // [TODO] should emit events

}

async function testSetPaywall(contract, paywall, owner) {
  const result = await contract.setPaywall(paywall, { from: owner })
  const _paywall = await contract.paywall()
  assert.equal(_paywall, paywall)
  // [TODO] should emit events
}


module.exports = {
  testSetChannelManager,
  testSetTTManager,
  testSetPaywall
}
