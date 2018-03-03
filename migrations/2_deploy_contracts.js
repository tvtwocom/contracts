const TvTwoCoin = artifacts.require('../TvTwoCoin')
const TvTwoManager = artifacts.require('../TvTwoManager')

module.exports = async deployer => {
  deployer.deploy(TvTwoManager)
  deployer.deploy(TvTwoCoin)
}
