const TvTwoCoin = artifacts.require('../TvTwoCoin')
const TvTwoManager = artifacts.require('../TvTwoManager')
const RaidenMicroTransferChannels = artifacts.require('../RaidenMicroTransferChannels')

module.exports = deployer => // async deployers caused dificulties
TvTwoCoin.deployed()
  .then( tvTwoCoin => Promise.all([
	   tvTwoCoin.setTvTwoManager(TvTwoManager.address),
	   tvTwoCoin.setURaidenContractAddress(RaidenMicroTransferChannels.address)])
	      )
  .then( () => deployer )// !important promise chain must return deployer or the whole migrations timing gets fucked up (I Think ??)
       
