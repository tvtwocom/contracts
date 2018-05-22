const assert = require('assert')
const BigNumber = require('bignumber.js')

const { testBuyTokens, testSetAllowance } = require('./ttc')
const { testSetTTCoin } = require('./manage.js')

const testCreateViewer = async (uRaiden, ttc, ttm, owner, viewer) => {
  const result = await ttm.createViewer(viewer, { from: owner })
  assert.equal(
    await ttc.isManaged(viewer),
    true,
    `viewer : ${viewer} is not set to managed`
  )
  return result
}

const testCreateVideo = async (ttm, adHash, isAd, opening_block, creator) => {
  const preVideoHashIndex = await ttm.videoIndex(adHash)
  await ttm.addVideo(adHash, isAd, opening_block, { from: creator })
  const postVideoHashIndex = await ttm.videoIndex(adHash)
  const [
    postVideoHash32,
    postVideoHashIsAd,
    postVideoCreator
  ] = await ttm.videos(postVideoHashIndex)
  const postVideoHash = web3.toAscii(postVideoHash32)
  assert(
    new BigNumber(0).equals(preVideoHashIndex),
    'preVideoHashIndex should be 0 (uninitialized)'
  )
  assert(
    !new BigNumber(0).equals(postVideoHashIndex),
    'postVideoHashIndex should not be 0 (initialized)'
  )
  assert.equal(
    postVideoHash,
    adHash,
    'the video hash should be equal to that set in addVideo'
  )
  assert.equal(
    postVideoHashIsAd,
    isAd,
    'the video ad boolean should be set to that set in addVideo'
  )
  assert.equal(
    postVideoCreator,
    creator,
    'the video creator should be set to that set in addVideo'
  )
}

const testReachCheckpoint = async (
  ttm,
  ttc,
  consumer,
  videoHash,
  relevanceScore
) => {
  const videoIndex = await ttm.videoIndex(videoHash)
  const videoData = await ttm.videos(videoIndex)
  const isAd = videoData[1]
  const creator = videoData[2]

  isAd
    ? await testReachAdCheckpoint(
        ttm,
        ttc,
        consumer,
        creator,
        videoHash,
        relevanceScore
      )
    : await testReachVideoCheckpoint(
        ttm,
        ttc,
        consumer,
        creator,
        videoHash,
        relevanceScore
      )
}

const testReachAdCheckpoint = async (
  ttm,
  ttc,
  consumer,
  creator,
  adHash,
  relevanceScore
) => {
  const preCreatorBalance = await ttc.balanceOf(creator)
  const preConsumerBalance = await ttc.balanceOf(consumer)
  await ttm.videoCheckpoint(adHash, relevanceScore, {
    from: consumer
  })

  const postCreatorBalance = await ttc.balanceOf(creator)
  const postConsumerBalance = await ttc.balanceOf(consumer)

  const transferAmount = new BigNumber(relevanceScore).mul(3)

  assert.equal(
    postConsumerBalance.sub(preConsumerBalance).toString(),
    transferAmount.toString(),
    'ad consumer token balance should be incremented by transfer amount'
  )
  assert.equal(
    preCreatorBalance.sub(postCreatorBalance).toString(),
    transferAmount.toString(),
    'ad creator token balance should be decremented by transfer amount'
  )
}

const testReachVideoCheckpoint = async (
  ttm,
  ttc,
  consumer,
  creator,
  videoHash,
  relevanceScore
) => {
  const preCreatorBalance = await ttc.balanceOf(creator)
  const preConsumerBalance = await ttc.balanceOf(consumer)

  await ttm.videoCheckpoint(videoHash, relevanceScore, {
    from: consumer
  })

  const postCreatorBalance = await ttc.balanceOf(creator)
  const postConsumerBalance = await ttc.balanceOf(consumer)

  const transferAmount = new BigNumber(relevanceScore)

  assert.equal(
    preConsumerBalance.sub(postConsumerBalance).toString(),
    transferAmount.toString(),
    'video consumer token balance should be decremented by transfer amount'
  )
  assert.equal(
    postCreatorBalance.sub(preCreatorBalance).toString(),
    transferAmount.toString(),
    'video creator token balance should be incremented by transfer amount'
  )
}

const testSetMinAllowance = async (ttm, sender, allowance) => {
  const preAllowance = await ttm.minimumAllowance()
  await await ttm.setMinimumAllowance(allowance, {
    from: sender
  })
  const postAllownace = await ttm.minimumAllowance()
  assert(
    preAllowance.toString() !== postAllownace.toString(),
    'minimumAllowance should have changed'
  )
  assert.equal(
    postAllownace.toString(),
    allowance.toString(),
    'minimumAllowance should be set to the argument given'
  )
}

const testSetupTtcBalancesAllowances = async (
  ttm,
  ttc,
  owner,
  ecosystemParticipants
) => {
  await testSetTTCoin(ttm, ttc, owner)

  const minTokenAmount = await ttm.minimumAllowance()
  const minBuyAmount = await ttc.tokensToWei(minTokenAmount)
  const buyAmount = minBuyAmount.mul(2)
  const approvalAmount = minTokenAmount.mul(2)

  for (const participant of ecosystemParticipants) {
    const preParticipantBalance = await ttc.balanceOf(participant)
    await testBuyTokens(ttc, participant, buyAmount)
    await testSetAllowance(ttc, participant, ttm.address, approvalAmount)

    const postParticipantBalance = await ttc.balanceOf(participant)
    const participantAllowance = await ttc.allowance(participant, ttm.address)

    assert(
      postParticipantBalance.greaterThan(0),
      'participant balance should be more than 0'
    )
    assert(
      participantAllowance.greaterThan(0),
      'participant allowance should be more than 0'
    )
    assert.equal(
      postParticipantBalance.sub(preParticipantBalance).toString(),
      approvalAmount.toString(),
      'participant balance should be incremented by buyAmount'
    )
    assert.equal(
      participantAllowance.toString(),
      approvalAmount.toString(),
      'participant ttm contract approval should be that set in args'
    )
  }
}

module.exports = {
  testCreateVideo,
  testReachCheckpoint,
  testSetMinAllowance,
  testSetupTtcBalancesAllowances,
  testCreateViewer
}
