const Migrations = artifacts.require('../Migrations.sol')
const TvTwoToken = artifacts.require('../TvTwoCoin')
const TvTwo = artifacts.require('../TvTwo')

module.exports = deployer => {
  deployer.deploy(Migrations)
  deployer.deploy(TvTwoToken)
  deployer.deploy(TvTwo)
}
