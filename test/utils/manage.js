const assert = require('assert')
const BigNumber = require('bignumber.js')
// const { testWillThrow, timeTravel } = require('./general')

async function testSetChannelManager(contract, uRaiden, owner) {
  const result = await contract.setChannelManager(uRaiden.address, { from: owner })
  const channelManager = await contract.channelManager()
  assert.equal(channelManager, uRaiden.address)
}


async function testSetTTManager(contract, ttm, owner) {
  console.log(ttm.address)
  const result = await contract.setTTManager(ttm.address, { from: owner })
  const ttmAddress = await contract.ttm()
  assert.equal(ttmAddress, ttm.address)
}


module.exports = {
  testSetChannelManager,
  testSetTTManager
}
