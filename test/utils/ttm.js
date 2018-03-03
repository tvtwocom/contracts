const assert = require('assert')
const BigNumber = require('bignumber.js')

const testCreateVideo = async (ttm, adHash, isAd, creator) => {
  const preVideoHashIndex = await ttm.videoIndex(adHash)
  await ttm.addVideo(adHash, true, { from: creator })
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

module.exports = {
  testCreateVideo
}
