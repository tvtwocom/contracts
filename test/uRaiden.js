const TvTwoCoin = artifacts.require('TvTwoCoin')
const URaiden = artifacts.require('RaidenMicroTransferChannels')
const TvTwoManager = artifacts.require('TvTwoManager')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')
const { migrate } = require('./utils/general')
const { testCreateChannel, testTopUpChannel, testWatchOriginalContent, testWatchAd, signBalanceProof, channelFromEvent, toChannelInfoObject, balanceProofHash, createChannel, tesCooperativeClose, testWithdrawl } = require('./utils/uRaiden')

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
    const openingBlock = 123
    const amount = 13

    const signedProof = signBalanceProof({
      spender: owner,
      recepient,
      openingBlock,
      balance: amount,
      contractAddress: uRaiden.address
    })
    
    const signer = await uRaiden.extractBalanceProofSignature(
      recepient,
      openingBlock,
      amount,
      signedProof,
      {from: owner}
    )

    assert.equal(signer, owner)

  })

  it('can generate clsoingSig', async () => {
    const openingBlock = 123
    const amount = 13

    const channel = {
      spender: owner,
      recepient,
      openingBlock,
      balance: amount,
      contractAddress: uRaiden.address
    }
    
    const signedProof = await generateClosingSig(channel)
    assert.equal(channel.recepient, await uRaiden.extractClosingSignature(
      channel.spender,
      channel.openingBlock,
      channel.balance,
      signedProof
    ),'closing signature invalid')

  })

  
  it('let us watch videos', async () => {
    const accounts = { viewer: web3.eth.accounts[3],
		       contentCreator: web3.eth.accounts[4],
		       advertiser: web3.eth.accounts[5] }
    const channels = {}
    const amount = 60

    for(role in accounts) {
      await ttc.transfer(accounts[role], amount*2, {from: owner})
    }

    // setup viewer
    try {
      channels.viewerOut = await createChannel(uRaiden, ttc, accounts.viewer, owner, amount)
      channels.viewerIn = await createChannel(uRaiden, ttc, owner, accounts.viewer, amount)
    }catch(e) {console.log('viewer', e)}

    // setup Advertiser
    try {
      channels.advertiser = await createChannel(uRaiden, ttc, accounts.advertiser, owner, amount)
      channels.advertiser.balance = amount
      channels.advertiser.sig = await signBalanceProof(channels.advertiser)
    }catch(e) {console.log('ads', e)}

    // setup contentCreator
    try {
      channels.contentCreator = await createChannel(uRaiden, ttc, owner, accounts.contentCreator, amount)
    }catch(e) {console.log('cc', e)}
    // OffChain Sequence
    // viewer watches Original Content,
    // should pay 1 Token, contentCreator receives 1
    // 402 Payment required <-> Raiden Handshake
    // this gets delivered to the contentCreator 
    // viewer watches Add, receives 3 Token, ad creator has to pay 1 token

    await Promise.all([
      testWatchOriginalContent(uRaiden, ttc, channels),
      testWatchOriginalContent(uRaiden, ttc, channels),
      testWatchOriginalContent(uRaiden, ttc, channels),
      testWatchAd(uRaiden, ttc, channels)
    ])

    testWithdrawl(uRaiden, ttc, channels.advertiser)
    
    console.log(channels)

    await Promise.all(
      Object.keys(channels).filter((key) => key != 'advertiser').map(
	channel => tesCooperativeClose(uRaiden, ttc, channels[channel])
      ))
        
    const viewerBalance = await ttc.balanceOf(accounts.viewer)
    assert.equal(viewerBalance, amount*2, 'viewer balance wrong')

    const contentCreatorBalance = await ttc.balanceOf(accounts.contentCreator).then(web3.toDecimal)
    assert.equal(contentCreatorBalance, amount*2+3, 'contentCreator balance wrong')

    const advertiserBalance =  await ttc.balanceOf(accounts.advertiser).then(web3.toDecimal)
    assert.equal(advertiserBalance, amount, 'advertiser balance wrong')
    console.log(JSON.stringify(channels,null,2))

  }).timeout(5000)
})
