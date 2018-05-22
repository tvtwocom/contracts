const TvTwoCoin = artifacts.require('../TvTwoCoin')
const TvTwoManager = artifacts.require('../TvTwoManager')

module.exports = deployer => {
  deployer.deploy(TvTwoManager)
  deployer.deploy(TvTwoCoin)
}
