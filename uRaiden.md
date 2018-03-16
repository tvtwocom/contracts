# MicroRaiden is a many to one off-chain payment solution.

## general principle

A certain amount of a ERC20 token gets locked into the microRaiden contract in order to open a payment channel,
they will be release once this channel is closed again.

The channle can be closed by providing a valid balance-proof signed by both-parties,
or after a grace period starting after providing a valid balance-proof only signed by one party
in which the other party can provide a different balance-proof 
(or very similar to this)


## idea of an implementation

The receiver, in our case the video platform, runs a proxy server,
that can Sign balance_proofs and serve payable content.

The viewer has incentive to accept tokens for viewing adds, which can be offered
once an add had been downloaded.

The viewer has to send tokens to the uRaiden Proxy in order to be able to view the content

Any kind of proof-of-view can therefor happen off-chain,
since when using uRaiden we have this single point of failure
(which we have running a centralized server farm serving streaming content anyways),
we can add something like captchas in the traditional way.


Once the app is closed, it could settle the tab and free any locked tokens.

Should someone loose the saved balance-proof he has no way of proofing it's current balance
and all locked tokens might be lost


## conclusion

I think implementing this Smart Contract wise is easy,
while the uRaiden-Proxy software seems to be a bit flimsy,
all examples ended up in some unusable states after some experimenting wiht them.

I expect this to improve in the near future.
