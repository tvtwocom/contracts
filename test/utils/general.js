const assert = require('assert')
const BigNumber = require('bignumber.js')
const fetch = require('whatwg-fetch').fetch

const TvTwoCoin = artifacts.require('TvTwoCoin')
const URaiden = artifacts.require('RaidenMicroTransferChannels')
const TvTwoManager = artifacts.require('TvTwoManager')

const gasPrice = new BigNumber(30e9)

const zeroAddress = `0x${'0'.repeat(40)}`

const testWillThrow = async (fn, args) => {
  try {
    if(args instanceof Array)
      await fn(...args)
    else
      await fn
    assert.fail('the contract should throw here')
  } catch (error) {
    assert(
      // DONE: have a look at node_modules/zeppelin-solidity/test/helpers/assertRevert.js
      /invalid opcode|revert/.test(error.message),
      `the error message should be invalid opcode, the error was ${error}`
    )
  }
}

const getReceipt = txid => {
  return new Promise((resolve, reject) => {
    if (typeof txid === 'object' && txid.receipt) {
      resolve(txid.receipt)
    }

    web3.eth.getTransactionReceipt(txid, (err, res) => {
      if (err) {
        return reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

const getEtherBalance = address => {
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(address, (err, res) => {
      if (err) reject(err)

      resolve(res)
    })
  })
}

async function migrate(owner, recepient, challengePeriod = 500) {
  // const challengePeriod = !!_challengePeriod ? _challengePeriod : 500
  const ttc =  await TvTwoCoin.new({from: owner})
  const ttm = await TvTwoManager.new({from: owner})

  const uRaiden = await URaiden.new(
     ttc.address,
     challengePeriod,
    [ttc.address, ttm.address],
    {from: owner}
  )

  await Promise.all([ttc,ttm].map(async contract => {
    await contract.setChannelManager(uRaiden.address, {from: owner})
    assert.equal(await contract.channelManager(), uRaiden.address, 'TTC has wrong ChannelManager')
  }))

  await ttc.setTvTwoManager(ttm.address, {from: owner})
  assert.equal(await ttc.ttm(), ttm.address, 'TTC has wrong TvTwoManger')

  ttm.setTvTwoCoin(ttc.address, {from: owner})
  assert.equal(await ttm.ttc(), ttc.address)
  TvTwoCoin.link(URaiden)
  URaiden.link(TvTwoCoin)
  TvTwoManager.link(URaiden)
  return {ttc, ttm, uRaiden}
}

async function timeTravel(secIntoFuture) {
  const result = await fetch(web3.currentProvider.host, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [secIntoFuture]
    })}) // curl -X POST --data '{"jsonrpc":"2.0","method":"evm_increaseTime","params":[31536000]}' localhost:8545
  assert.equal(result.status, 200)

  const timeIncrement = await result.json().then( t => t.result)
  return timeIncrement
}

module.exports = {
  testWillThrow,
  gasPrice,
  getReceipt,
  getEtherBalance,
  zeroAddress,
  migrate,
  timeTravel
}
