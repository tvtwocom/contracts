const TvTwoCoin = artifacts.require('../TvTwoCoin')
const RaidenMicroTransferChannels = artifacts.require(
  '../RaidenMicroTransferChannels'
)

module.exports = deployer => {
  // const tvTwoCoin = await TvTwoCoin.deployed()
  const challengePeriod = 500
  const trustedContracts = [] // this contracts may open and top up channels on behalf of a sender
  deployer.deploy(
    RaidenMicroTransferChannels,
    TvTwoCoin.address,
    challengePeriod,
    trustedContracts
  )
}
