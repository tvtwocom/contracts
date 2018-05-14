const TvTwoCoin = artifacts.require('TvTwoCoin')
const URaiden = artifacts.require('RaidenMicroTransferChannels')
const TvTwoManager = artifacts.require('TvTwoManager')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')
const { migrate } = require('./utils/general')
const { testCreateViewer } = require('./utils/ttm')
const { testCreateChannel, testTopUpChannel, testWatchOriginalContent, testWatchAd, signBalanceProof, channelFromEvent, toChannelInfoObject, balanceProofHash, createChannel, testCooperativeClose, testWithdrawl,  testDeposit, testDepositTopUp
 } = require('./utils/uRaiden')


describe('StateChannels', () => {
  let uRaiden, ttc, ttm
  const owner = web3.eth.accounts[0]
  const spender = web3.eth.accounts[1]
  const recipient = web3.eth.accounts[2]
  beforeEach(async () => {
    instances = await migrate(owner, recipient)
    uRaiden = instances.uRaiden
    ttc = instances.ttc
    ttm = instances.ttm
  })
  
  it('transfer should create a channel', async () => {
    const amount = 50
    await ttc.transfer(spender, amount, {from: owner})
    await testCreateChannel(uRaiden, ttc, spender, amount)
  })

  it('transfer should increase deposit when channel already exists', async () => {
    const amount = 100
    await ttc.transfer(spender, amount, {from: owner})
    const channelInfo = await testCreateChannel(uRaiden, ttc, spender, amount*0.3)
    await testTopUpChannel(uRaiden, ttc, channelInfo, amount*0.7)
  })

  it('transfer should fail when channel does not exist', async () => {
    const amount = 100
    await ttc.transfer(spender, amount, {from: owner})
    channelInfo = {
      openingBlock: 24,
      spender: spender,
      recipient: recipient,
      contractAddress: uRaiden.address,
      balance: 0,
    }
    await testWillThrow(testTopUpChannel(uRaiden, ttc, channelInfo, amount))
  })
  
  it('can generate balanceProofs', async () => {
    const openingBlock = 123
    const amount = 13

    const signedProof = signBalanceProof({
      spender: owner,
      recipient,
      openingBlock,
      balance: amount,
      contractAddress: uRaiden.address
    })
    
    const signer = await uRaiden.extractBalanceProofSignature(
      recipient,
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
      recipient,
      openingBlock,
      balance: amount,
      contractAddress: uRaiden.address
    }
    
    const signedProof = await generateClosingSig(channel)
    assert.equal(channel.recipient, await uRaiden.extractClosingSignature(
      channel.spender,
      channel.openingBlock,
      channel.balance,
      signedProof
    ),'closing signature invalid')

  })

  it('createViewer sets managed for Accounts without balance', async () => {
    const viewer = web3.eth.accounts[3]
    await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
  }) 

  it('createViewer reverts for accounts with balance', async () => {
    const viewer = web3.eth.accounts[3]
    ttc.transfer(viewer, 1, {from: owner})
    await testWillThrow(testCreateViewer(uRaiden, ttc, ttm, owner, viewer))

  })

  it('createViewer can only be called by it\'s ttm', async () => {
    const viewer = web3.eth.accounts[3]
    const otherTtm = await TvTwoManager.new()
    await testWillThrow(testCreateViewer(uRaiden, ttc, otherTtm, owner, viewer))
  })
  
  it('deposit can create channels', async () => {
    const viewer = web3.eth.accounts[3]
    const amount = new BigNumber(12e18) 
    await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
    await ttc.transfer(viewer, amount, {from: owner})
    await testDeposit(uRaiden, ttc, ttm, viewer, owner, amount)
  })

  it('deposit can topUp channels', async () => {
    const viewer = web3.eth.accounts[3]
    const amount = new BigNumber(1.72362e18)
    await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
    await ttc.transfer(viewer, amount*2, {from: owner})
    const channel = await testDeposit(uRaiden, ttc, ttm, viewer, owner, amount)
    await testTopUpChannel(uRaiden, ttc, channel, amount)
  })

  it('deposit throws when updating noexistent channel')

  it('deposit fails if cm is not initialized')

  it('deposit fails if paywall is not initialized')

  it('deposit can only be called by it\'s ttm', async () => {
    const viewer = web3.eth.accounts[3]
    const amount = new BigNumber(12e18)
    const otherTtm = await TvTwoManager.new()
    await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
    await ttc.transfer(viewer, amount, {from: owner})
    await testWillThrow(
      testDeposit(uRaiden, ttc, otherTtm, viewer, owner, amount) )
  })  
  
  it('let us watch videos', async () => {
    const accounts = { viewer: web3.eth.accounts[3],
		       contentCreator: web3.eth.accounts[4],
		       advertiser: web3.eth.accounts[5] }
    const channels = {}
    const amount = 60

    for(role in accounts) {
      if(role == 'viewer')
	continue;
      await ttc.transfer(accounts[role], amount*2, {from: owner})
    }

    // setup viewer
    try {
      await ttm.createViewer(accounts.viewer, {from: owner})
      channels.viewerIn = await createChannel(uRaiden, ttc, owner, accounts.viewer, amount)
    }catch(e) {console.log('viewer setup failed : ', e); throw e}

    // setup Advertiser
    try {
      channels.advertiser = await createChannel(uRaiden, ttc, accounts.advertiser, owner, amount)
      channels.advertiser.balance = amount
      channels.advertiser.sig = await signBalanceProof(channels.advertiser)
    }catch(e) {console.log('ads setup failed : ', e); throw e}

    // setup contentCreator
    try {
      channels.contentCreator = await createChannel(uRaiden, ttc, owner, accounts.contentCreator, amount)
    }catch(e) {console.log('cc setup failed : ', e); throw e}
    // OffChain Sequence
    // viewer watches Ad,
    // recives 3 tokens, advertiser pays 3 tokens
    // TV2 settles channel, opensChannel for payment
    // viewer wathces original content 
    // should pay 1 Token, contentCreator receives 1
    // 402 Payment required <-> Raiden Handshake
    // this gets delivered to the contentCreator 

    // console.log('beginning :', await ttc.balanceOf(accounts.viewer).then(web3.toDecimal))

    await testWatchAd(uRaiden, ttc, channels)
    
    await testCooperativeClose(uRaiden, ttc, channels.viewerIn)
    channels.viewerIn = await createChannel(uRaiden, ttc, owner, accounts.viewer, amount)
    // console.log('watched ad :', await ttc.balanceOf(accounts.viewer).then(web3.toDecimal))

    channels.viewerOut = await testDeposit(uRaiden, ttc, ttm, 
      accounts.viewer,
      owner,
      await ttc.balanceOf(accounts.viewer)
    )

    // console.log('deposited :', await ttc.balanceOf(accounts.viewer).then(web3.toDecimal))

    await Promise.all([
      testWatchOriginalContent(uRaiden, ttc, channels),
      await testWatchAd(uRaiden, ttc, channels),
      testWatchOriginalContent(uRaiden, ttc, channels),
      await testWatchAd(uRaiden, ttc, channels),
      testWatchOriginalContent(uRaiden, ttc, channels),
    ])
    // testWithdrawl(uRaiden, ttc, channels.advertiser)

    
    await testCooperativeClose(uRaiden, ttc, channels.viewerIn)

    const topUpViewerOut = await ttc.balanceOf(accounts.viewer)
    assert.equal(topUpViewerOut.toString(), '6')
    await testDepositTopUp(uRaiden, ttc, ttm, owner,
    		    channels.viewerOut,
    		    topUpViewerOut)
    
    console.log('toped Upd Viewer Out : ', channels.viewerOut)
    await Promise.all(
      Object.keys(channels).filter((key) => !['advertiser', 'viewerIn'].includes(key)).map(
	channel => testCooperativeClose(uRaiden, ttc, channels[channel])
      ))
    // console.log('watched content :', await ttc.balanceOf(accounts.viewer).then(web3.toDecimal))

    const viewerBalance = await ttc.balanceOf(accounts.viewer).then(web3.toDecimal)
    const contentCreatorBalance = await ttc.balanceOf(accounts.contentCreator).then(web3.toDecimal)
    const advertiserBalance =  await ttc.balanceOf(accounts.advertiser).then(web3.toDecimal)
    
    assert.equal(viewerBalance, 6, `viewer balance wrong : ${viewerBalance}`)


    assert.equal(contentCreatorBalance, amount*2+3, 'contentCreator balance wrong')

    
    assert.equal(advertiserBalance, amount, 'advertiser balance wrong')
    console.log(JSON.stringify(channels,null,2))

  }).timeout(5000)
})
