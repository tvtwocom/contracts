const TvTwoCoin = artifacts.require('../TvTwoCoin')
const TvTwoManager = artifacts.require('../TvTwoManager')
const RaidenMicroTransferChannels = artifacts.require('../RaidenMicroTransferChannels')

module.exports = deployer => {
  const paywall = web3.eth.accounts[0]
  TvTwoCoin.link(RaidenMicroTransferChannels)
  RaidenMicroTransferChannels.link(TvTwoCoin)
  TvTwoManager.link(TvTwoCoin)
  
  TvTwoCoin.deployed()
    .then( tvTwoCoin => Promise.all([
      tvTwoCoin.setTTManager(TvTwoManager.address),
      tvTwoCoin.setChannelManager(RaidenMicroTransferChannels.address)
    ]))
  
  TvTwoManager.deployed()
    .then( tvTwoManager => Promise.all([
      tvTwoManager.setPaywall(paywall),
      tvTwoManager.setTTCoin(TvTwoCoin.address),
      tvTwoManager.setChannelManager(RaidenMicroTransferChannels.address)
    ]))
}     
