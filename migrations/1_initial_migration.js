const Migrations = artifacts.require('../Migrations.sol')
const TvTwoCoin = artifacts.require('../TvTwoCoin')
const TvTwo = artifacts.require('../TvTwo')

module.exports = deployer => {
  deployer.deploy(Migrations)
  deployer.deploy(TvTwoCoin)
  deployer.deploy(TvTwo)
}
