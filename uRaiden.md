# MicroRaiden is a many to one off-chain payment solution.

## general principle

A certain amount of a ERC20 token gets locked into the microRaiden contract in order to open a payment channel,
they will be released once this channel is closed again.

* The channle can be closed by providing a valid balance-proof signed by both-parties,

* or the spender can just claim a certain balance, what will trigger a grace period
  in which the recipient can provide a balanceProof signed by the spender.

* The recipient can always withdraw tokens, providing a valid balanceProof signed by the recipient
(or very similar to this)


## idea of an implementation

![stateChannel Diagram](./stateChannels.dia)

### the Consumers Perspective

The receiver, in our case the video platform, runs a proxy server,
that can Sign balance_proofs and serve payable content.

The Consumer opens a channel where ttc are deposited to view original content
While the proxy opens a channel with the Consumer to pay for Ads.

The viewer has incentive to accept tokens for viewing adds, which can be offered
once an add had been downloaded. This means a balance_proof is signed by the paywall 
and published.(sent to the Viewing App where it is saved in order to withdraw the 
tokens when convenient, in order of fairness we should provide a service to reRequest 
those proofs)

The viewer has to send tokens to the uRaiden Paywall Proxy in order to be able to view the content,
which means he signes a balance_proof, the paywall checks it's validity cryptographicly corectness, 
and balance deltas compared to the price of the content). 
We can then withdraw the tokens if we need them as long as we can provide the lates balanceProof

If the viewer closes the channel we receive the tokens automaticly.

We have to watch out for uncooperative Close events and hand in balanceProofs if we do not agree with them

### the contentCreators perspective

The Paywall would open a channel to every contentCreator, when any Consumer pays for any content, we create a balanceProof
with the updated balance for this contentCreator, that is published/sent to the contentCreaotor in any way.

* We would have to deposit tokens for the contentCreators in advance and 
* the contentCreator would have to trust us that we pay according to the ToS.

### the advertisers perspective

the advertiser would have no incentive to pay once its ad has been watched, therefor if he would open a channel with us,
we should not expect to receive tokens. An advertiser would pay in advance, trusting us that we view its ad or repay 
according to the ToS.

* the Advertiser puts tokens into the TvTwoManager contract, as a balance for ads.
* When we need tokens we can withdraw tokens from the TvTwoManager, along with a list of ads.tokensDelta
  the balances of the ads will be updated.
* we have to keep an off-chain database of balances for ads, in sync with all the views and balanceProofs

### TvTwos perspective

We have to keep record of balanceProofs, the paywall server contains one or several private keys to ethereum addresses, 
to sign balanceProofs, if one gets into the wrong hands all tokens in all its channels can be stolen.

Advertisers and ContentCreators would have to trust us that we are fair

Most of the busines logic lives in the paywall, and we are in control of flow of TvTwoCoins, besides traditional trading.

## conclusion

I think implementing this Smart Contract wise is easy,

while the uRaiden-Proxy software seems to be a bit flimsy,
all examples ended up in some unusable states after some experimenting wiht them.

I expect this to improve in the near future.

