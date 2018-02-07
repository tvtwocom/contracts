# TV-TWO smart contracts
These will be the smart contracts which will power the payment system through tokens.

## participants
1. viewers
1. advertisers
1. organic content creators (content creators)

## contract requirements
- [ ] advertiser can send video link and tokens to smart contract to start campaign
- [ ] content creators can send video link and wallet address to publish videos
- [ ] can provide video links for tv app (can use ipfs?)
- [ ] content creators are paid tokens by viewer (tv wallet) when 20%+ has been viewed
- [ ] viewer and tv-two is paid tokens (90/10) when watching more 20%+ advertisers ad
- [ ] token transfers are made through µRaiden
- [ ] ensure that only those who should be paid are paid for "work" (viewing) done
- [ ] reCaptcha used to ensure actual viewing is done

## core problems
* how to prove proof of work (viewing)

## contracts needed
1. crowdsale contract?
1. token contract (standard ERC20)
1. token manager contract (needs better name, will handle payments for work)

## current questions
* How do participants come into possession of tokens? Do they buy them somewhere?
* Is a crowdsale needed? If yes, what do these tokens do? Are they the same ones used for payments?

## how to run
Main things that will matter for now is testing. This can be done with `yarn test`.
Migrations to a test network can be done if running your own node. Once when a node is running on port 8545, you can run: `truffle migrate --network <KOVAN|ROPSTEN|RINKEBY>` replace network with network you are using (lowercase)

other useful commands:

compile smart contracts: `yarn build`

clear build and rebuild: `yarn clean:contracts`

clear install and reinstall dependencies: `yarn clean:install`

lint smart contracts: `yarn lint:contracts`

lint smart contract tests: `yarn lint:js`
