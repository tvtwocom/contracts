const Migrations = artifacts.require('../Migrations.sol');
const TvTwoToken = artifacts.require('../TvTwoToken')

module.exports = deployer => {
  deployer.deploy(Migrations)
  deployer.deploy(TvTwoToken)
}
