const TvTwoCoin = artifacts.require('TvTwoCoin')
const TvTwoManager = artifacts.require('TvTwoManager')
const assert = require('assert')
const BigNumber = require('bignumber.js')
const { testWillThrow } = require('./utils/general')
const { migrate } = require('./utils/general')
const { testCreateViewer } = require('./utils/ttm')
const {
  generateClosingSig,
  testCreateChannel,
  testTopUpChannel,
  testWatchOriginalContent,
  testWatchAd,
  signBalanceProof,
  createChannel,
  testCooperativeClose,
  testWithdrawl,
  testDeposit,
  testDepositTopUp
} = require('./utils/uRaiden')

describe('StateChannels', () => {
  let uRaiden, ttc, ttm
  const owner = web3.eth.accounts[0]
  const spender = web3.eth.accounts[1]
  const recipient = web3.eth.accounts[2]
  beforeEach(async () => {
    const instances = await migrate(owner, recipient)
    uRaiden = instances.uRaiden
    ttc = instances.ttc
    ttm = instances.ttm
  })

  describe('transfer', () => {
    it('should create a channel', async () => {
      const amount = 50
      await ttc.transfer(spender, amount, { from: owner })
      await testCreateChannel(uRaiden, ttc, spender, recipient, amount)
    })

    it('should increase deposit when channel already exists', async () => {
      const amount = 100
      await ttc.transfer(spender, amount, { from: owner })
      const channelInfo = await testCreateChannel(
        uRaiden,
        ttc,
        spender,
        recipient,
        amount * 0.3
      )
      await testTopUpChannel(uRaiden, ttc, channelInfo, amount * 0.7)
    })

    it('should fail when channel does not exist', async () => {
      const amount = 100
      await ttc.transfer(spender, amount, { from: owner })
      const channelInfo = {
        openingBlock: 24,
        spender: spender,
        recipient: recipient,
        contractAddress: uRaiden.address,
        balance: 0
      }
      await testWillThrow(testTopUpChannel(uRaiden, ttc, channelInfo, amount))
    })
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
      { from: owner }
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
    assert.equal(
      channel.recipient,
      await uRaiden.extractClosingSignature(
        channel.spender,
        channel.openingBlock,
        channel.balance,
        signedProof
      ),
      'closing signature invalid'
    )
  })

  describe('createViewer', () => {
    const viewer = web3.eth.accounts[3]

    it('sets managed for Accounts without balance', async () => {
      await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
    })

    xit('fails if cm is not initialized', async () => {
      const _ttc = await TvTwoCoin.new({ from: owner })
      await _ttc.setTTManager(ttm.address)
      ttm.setTTCoin(_ttc.address, { from: owner })
      await testWillThrow(testCreateViewer(uRaiden, _ttc, ttm, owner, viewer))
    })

    it('reverts for accounts with balance', async () => {
      ttc.transfer(viewer, 1, { from: owner })
      await testWillThrow(testCreateViewer(uRaiden, ttc, ttm, owner, viewer))
    })

    it("can only be called by it's ttm", async () => {
      const otherTtm = await TvTwoManager.new()
      await testWillThrow(
        testCreateViewer(uRaiden, ttc, otherTtm, owner, viewer)
      )
    })
  })

  describe('deposit', async () => {
    it('deposit can create channels', async () => {
      const viewer = web3.eth.accounts[3]
      const amount = new BigNumber(12e18)
      await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
      await ttc.transfer(viewer, amount, { from: owner })
      await testDeposit(uRaiden, ttc, ttm, viewer, owner, amount)
    })

    it('deposit can topUp channels', async () => {
      const viewer = web3.eth.accounts[3]
      const amount = new BigNumber(1.72362e18)
      await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
      await ttc.transfer(viewer, amount * 2, { from: owner })
      const channel = await testDeposit(
        uRaiden,
        ttc,
        ttm,
        viewer,
        owner,
        amount
      )
      await testDepositTopUp(uRaiden, ttc, ttm, owner, channel, amount)
    })

    it('deposit throws when updating noexistent channel', async () => {
      const viewer = web3.eth.accounts[3]
      const amount = new BigNumber(2.5632e19)
      await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
      await ttc.transfer(viewer, amount * 2, { from: owner })
      const channel = {
        spender: viewer,
        recipient: await ttm.paywall(),
        openingBlock: 12
      }
      await testWillThrow(
        testDepositTopUp(uRaiden, ttc, ttm, owner, channel, amount)
      )
    })

    it('deposit fails if viewer is not managed', async () => {
      const viewer = web3.eth.accounts[3]
      const amount = new BigNumber(12e18)
      await ttc.transfer(viewer, amount, { from: owner })
      await testWillThrow(testDeposit(uRaiden, ttc, ttm, viewer, owner, amount))
    })

    it('deposit fails if cm is not initialized', async () => {
      const viewer = web3.eth.accounts[3]
      const amount = new BigNumber(12e18)
      const _ttc = await TvTwoCoin.new({ from: owner })
      await _ttc.setTTManager(ttm.address)
      await ttm.setTTCoin(_ttc.address, { from: owner })
      await ttm.createViewer(viewer, { from: owner })
      await _ttc.transfer(viewer, amount, { from: owner })
      await testWillThrow(ttm.deposit(viewer, amount, 0, { from: owner }))
    })

    it('deposit fails if paywall is not initialized', async () => {
      const viewer = web3.eth.accounts[3]
      const amount = new BigNumber(12e18)
      const _ttm = await TvTwoManager.new({ from: owner })
      await ttc.setTTManager(_ttm.address, { from: owner })
      await _ttm.setTTCoin(ttc.address, { from: owner })
      await _ttm.createViewer(viewer, { from: owner })
      await ttc.transfer(viewer, amount, { from: owner })

      await testWillThrow(_ttm.deposit(viewer, amount, 0, { from: owner }))
    })

    it("deposit can only be called by it's ttm", async () => {
      const viewer = web3.eth.accounts[3]
      const amount = new BigNumber(12e18)
      const otherTtm = await TvTwoManager.new()
      await testCreateViewer(uRaiden, ttc, ttm, owner, viewer)
      await ttc.transfer(viewer, amount, { from: owner })
      await testWillThrow(
        testDeposit(uRaiden, ttc, otherTtm, viewer, owner, amount)
      )
    })
  })

  it('let us watch videos', async () => {
    const accounts = {
      viewer: web3.eth.accounts[3],
      contentCreator: web3.eth.accounts[4],
      advertiser: web3.eth.accounts[5]
    }
    const channels = {}
    const amount = 60

    // the advertiser bought some tokens somewhere
    await ttc.transfer(accounts.advertiser, amount * 2, { from: owner })

    // setup viewer
    try {
      await ttm.createViewer(accounts.viewer, { from: owner })
      channels.viewerIn = await createChannel(
        uRaiden,
        ttc,
        owner,
        accounts.viewer,
        amount
      )
    } catch (e) {
      console.log('viewer setup failed : ', e) //eslint-disable-line no-console
      throw e
    }

    // setup Advertiser
    try {
      channels.advertiser = await createChannel(
        uRaiden,
        ttc,
        accounts.advertiser,
        owner,
        amount
      )
      channels.advertiser.balance = amount
      channels.advertiser.sig = await signBalanceProof(channels.advertiser)
    } catch (e) {
      console.log('ads setup failed : ', e) //eslint-disable-line no-console
      throw e
    }

    // setup contentCreator
    try {
      channels.contentCreator = await createChannel(
        uRaiden,
        ttc,
        owner,
        accounts.contentCreator,
        amount
      )
    } catch (e) {
      console.log('cc setup failed : ', e) //eslint-disable-line no-console
      throw e
    }

    // OffChain Sequence
    // viewer watches Ad,
    // recives 3 tokens, advertiser pays 3 tokens
    // TV2 settles channel, opensChannel for payment

    // console.log('beginning :', await ttc.balanceOf(accounts.viewer).then(web3.toDecimal))

    await testWatchAd(uRaiden, ttc, channels)

    await testCooperativeClose(uRaiden, ttc, channels.viewerIn)
    channels.viewerIn = await createChannel(
      uRaiden,
      ttc,
      owner,
      accounts.viewer,
      amount
    )
    // console.log('watched ad :', await ttc.balanceOf(accounts.viewer).then(web3.toDecimal))

    channels.viewerOut = await testDeposit(
      uRaiden,
      ttc,
      ttm,
      accounts.viewer,
      owner,
      await ttc.balanceOf(accounts.viewer)
    )

    // viewer wathces original content
    // 402 Payment required <-> Raiden Handshake
    // should pay 1 Token, contentCreator receives 1
    // viewer has to sign off-chain to pay tvtwo
    // tvtwo has to sign off-chain to pay contentCreator

    // viewer watches ad
    // advertiser should pay 1 token viewer should receive 1 token
    // tvtwo has to sign off-chain to pay viewer
    // advertiser has to pay beforehand to pay tvtwo

    // console.log('deposited :', await ttc.balanceOf(accounts.viewer).then(web3.toDecimal))

    await Promise.all([
      testWatchOriginalContent(uRaiden, ttc, channels),
      await testWatchAd(uRaiden, ttc, channels),
      testWatchOriginalContent(uRaiden, ttc, channels),
      await testWatchAd(uRaiden, ttc, channels),
      testWatchOriginalContent(uRaiden, ttc, channels)
    ])
    // testWithdrawl(uRaiden, ttc, channels.advertiser)

    // closing viewers receiving channel to free up tokens and toping up existing sending channel
    channels.viewerIn = await testCooperativeClose(
      uRaiden,
      ttc,
      channels.viewerIn
    )

    const topUpViewerOut = await ttc.balanceOf(accounts.viewer)
    assert.equal(topUpViewerOut.toString(), '6')
    channels.viewerOut = await testDepositTopUp(
      uRaiden,
      ttc,
      ttm,
      owner,
      channels.viewerOut,
      topUpViewerOut
    )
    console.log('toped Upd Viewer Out : ', channels.viewerOut) //eslint-disable-line no-console

    // contentCreator withdraws the earned tokens
    channels.contentCreator = await testWithdrawl(
      uRaiden,
      ttc,
      channels.contentCreator
    )

    // close the channel for the viewer to free up it's tokens
    channels.viewerOut = await testCooperativeClose(
      uRaiden,
      ttc,
      channels.viewerOut
    )
    // console.log('watched content :', await ttc.balanceOf(accounts.viewer).then(web3.toDecimal))

    const viewerBalance = await ttc
      .balanceOf(accounts.viewer)
      .then(web3.toDecimal)
    const contentCreatorBalance = await ttc
      .balanceOf(accounts.contentCreator)
      .then(web3.toDecimal)
    const advertiserBalance = await ttc
      .balanceOf(accounts.advertiser)
      .then(web3.toDecimal)

    assert.equal(viewerBalance, 6, `viewer balance wrong : ${viewerBalance}`)

    assert.equal(contentCreatorBalance, 3, 'contentCreator balance wrong') // we watched 3 original videos

    assert.equal(advertiserBalance, amount, 'advertiser balance wrong') // advertiser had amount*2 tokens and deposited amount
    console.log(JSON.stringify(channels, null, 2)) //eslint-disable-line no-console
  }).timeout(5000)
})
