const assert = require('assert')
const BigNumber = require('bignumber.js')

const gasPrice = new BigNumber(30e9)

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

module.exports = {
  testWillThrow,
  gasPrice,
  getReceipt,
  getEtherBalance
}
