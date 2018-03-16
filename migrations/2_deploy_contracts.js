const TvTwoCoin = artifacts.require('../TvTwoCoin')
const TvTwoManager = artifacts.require('../TvTwoManager')
const RaidenMicroTransferChannels = artifacts.require('../RaidenMicroTransferChannels')
module.exports = async deployer => {
  deployer.deploy(TvTwoManager)
  await deployer.deploy(TvTwoCoin)
  const challengePeriod = 500
  const trustedContracts = [] // this contracts may open and top up channels on behalf of a sender
  deployer.deploy(RaidenMicroTransferChannels, TvTwoCoin.address, challengePeriod, trustedContracts)
}
