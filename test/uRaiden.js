const TvTwoCoin = artifacts.require('TvTwoCoin')
const URaiden = artifacts.require('RaidenMicroTransferChannels')
const TvTwoManager = artifacts.require('TvTwoManager')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')
const { migrate } = require('./utils/general')
const { testCreateChannel, testTopUpChannel, signBalanceProof, channelFromEvent, toChannelInfoObject, balanceProofHash } = require('./utils/uRaiden')

describe('StateChannels', () => {
  let uRaiden, ttc, ttm
  const owner = web3.eth.accounts[0]
  const spender = owner
  const recepient = web3.eth.accounts[1]
  beforeEach(async () => {
    instances = await migrate(owner, recepient)
    uRaiden = instances.uRaiden
    ttc = instances.ttc
    ttm = instances.ttm
  })

  it('should throw when transfereing to channelManager without data', async () => {
    const amount = 50
    await testWillThrow(ttc.transfer, [uRaiden.address, amount, {from: spender}])
  })
  
  it('should create a channel', async () => {
    const amount = 50
    await testCreateChannel(uRaiden, ttc, spender, amount)
  })

  it('should increase deposit when channel already exists', async () => {
    const channelInfo = await testCreateChannel(uRaiden, ttc, spender, 30)
    const amount = 23
    await testTopUpChannel(uRaiden, ttc, channelInfo, amount)
  })

  it('can generate balanceProofs', async () => {
    const openBlock = 123
    const amount = 13

    const signedProof = signBalanceProof({
      spender: owner,
      recepient,
      openBlock,
      balance: amount,
      contractAddress: uRaiden.address
    })
    
    const signer = await uRaiden.extractBalanceProofSignature(
      recepient,
      openBlock,
      amount,
      signedProof,
      {from: owner}
    )

    assert.equal(signer, owner)

  })
  
  it('let us watch videos', async () => {
    const accounts = { viewer: web3.eth.accounts[3],
		       contentCreator: web3.eth.accounts[4],
		       advertiser: web3.eth.accounts[5] }
    const channels = {}
    const amount = 50
    
    for( role in accounts ) {
      await ttc.transfer(accounts[role], 100, {from: owner})
      channels[role] = await testCreateChannel(uRaiden, ttc, accounts[role], amount)
    }
    
    // TODO setup TvTwoManager here

    // OffChain Sequence
    // viewer watches Original Content, pays 1 Token, contentCreator receives 1
    // viewer watches Add, receives 3 Token, ad creator has to pay 1 token
    

    console.log(channels)
    
  })
})
