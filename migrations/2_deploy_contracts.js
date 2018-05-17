const TvTwoCoin = artifacts.require('../TvTwoCoin')
const TvTwoManager = artifacts.require('../TvTwoManager')
const RaidenMicroTransferChannels = artifacts.require('../RaidenMicroTransferChannels')
module.exports = deployer => {
  deployer.deploy(TvTwoManager)
  deployer.deploy(TvTwoCoin)
}
