const assert = require('assert')
const BigNumber = require('bignumber.js')

const TvTwoCoin = artifacts.require('TvTwoCoin')
const URaiden = artifacts.require('RaidenMicroTransferChannels')
const TvTwoManager = artifacts.require('TvTwoManager')

const gasPrice = new BigNumber(30e9)

const zeroAddress = `0x${'0'.repeat(40)}`

const testWillThrow = async (fn, args) => {
  try {
    await fn(...args)
    assert(false, 'the contract should throw here')
  } catch (error) {
    assert(
      // TODO: is this actually ok to check for revert here? need to investigate more...
      /invalid opcode|revert/.test(error),
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
    [ttc.address],
    {from: owner}
  )

  await ttc.setChannelManager(uRaiden.address, {from: owner})
  assert.equal(await ttc.channelManager(), uRaiden.address, 'TTC has wrong ChannelManager')

  await ttc.setTvTwoManager(recepient, {from: owner})
  assert.equal(await ttc.ttm(), recepient, 'TTC has wrong TvTwoManger')
  TvTwoCoin.link(URaiden)
  URaiden.link(TvTwoCoin)
  return {ttc, ttm, uRaiden}
}

module.exports = {
  testWillThrow,
  gasPrice,
  getReceipt,
  getEtherBalance,
  zeroAddress,
  migrate
}
