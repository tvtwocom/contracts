const assert = require('assert')
const { gasPrice, getReceipt, getEtherBalance } = require('./general')

const testBuyTokens = async (ttc, buyer, buyAmountEth) => {
  const preBuyerTokenBalance = await ttc.balanceOf(buyer)
  const preBuyerEthBalance = await getEtherBalance(buyer)
  const txid = await ttc.buy({
    from: buyer,
    value: buyAmountEth,
    gasPrice
  })

  const tx = await getReceipt(txid)
  const gasUsed = tx.gasUsed

  const postBuyerTokenBalance = await ttc.balanceOf(buyer)
  const postBuyerEthBalance = await getEtherBalance(buyer)
  const expectedPostBuyerTokenIncrement = await ttc.weiToTokens(buyAmountEth)
  const expectedPostBuyerEthBalance = preBuyerEthBalance
    .sub(gasPrice.mul(gasUsed))
    .sub(buyAmountEth)

  assert.equal(
    postBuyerTokenBalance.sub(preBuyerTokenBalance).toString(),
    expectedPostBuyerTokenIncrement.toString(),
    'the buyer token balance should be incremented by the expected amount'
  )
  assert.equal(
    postBuyerEthBalance.toString(),
    expectedPostBuyerEthBalance.toString(),
    'the buyer eth balance should be decremented by the buy amount + gas'
  )
}

const testSellTokens = async (ttc, seller, sellAmountTokens) => {
  const preSellerTokenBalance = await ttc.balanceOf(seller)
  const preSellerEthBalance = await getEtherBalance(seller)
  const txid = await ttc.sell(sellAmountTokens, {
    from: seller,
    gasPrice
  })

  const tx = await getReceipt(txid)
  const gasUsed = tx.gasUsed

  const postSellerTokenBalance = await ttc.balanceOf(seller)
  const postSellerEthBalance = await getEtherBalance(seller)
  const expectedPostSellerEthIncrement = await ttc.tokensToWei(sellAmountTokens)
  const expectedPostSellerEthTotalIncrement = expectedPostSellerEthIncrement.sub(
    gasPrice.mul(gasUsed)
  )

  assert.equal(
    preSellerTokenBalance.sub(postSellerTokenBalance).toString(),
    sellAmountTokens.toString(),
    'the seller token balance should be decremented by the sell amount'
  )
  assert.equal(
    postSellerEthBalance.sub(preSellerEthBalance).toString(),
    expectedPostSellerEthTotalIncrement.toString(),
    'the seller eth balance should be incremented by the sell amount - gas'
  )
}

module.exports = {
  testBuyTokens,
  testSellTokens
}
