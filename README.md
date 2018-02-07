# TV-TWO smart contracts
These will be the smart contracts which will power the payment system through tokens.

## ecosystem participants
1. viewers
1. advertisers
1. organic content creators (content creators)

## contracts needed
1. crowdsale contract (handled by outside party)
1. token contract (standard ERC20)
1. token manager contract (needs better name, will handle payments for work)

### token specs/requirements

Pausing is not needed due to the way the crowdsale contracts works.

#### important groups relating to tokens are:
  1. team
    * 15% payable in increments
  1. supporters/advisers
    * 6% payable immediately in full
  1. marketing 4%
    * payable immediately in full
  1. contributors 75%
    * payable immediately in full

#### specs

- [ ] total supply 666666667
- [ ] 18 decimals
- [ ] TTV symbol
- [ ] TokenForTelevision
- [ ] 15% goes to company
- [ ] split into 36 parts and release every month (3 years timeframe)

### tvTwo smart contract requirements

#### specs
*short term goal: submit some preshared hash for token reward to relevant party/situation*

- [ ] advertiser can send video link and tokens to smart contract to start campaign
- [ ] content creators can send video link and wallet address to publish videos
- [ ] can provide video links for tv app (can use ipfs?)
- [ ] content creators are paid tokens by viewer (tv wallet) when 20%+ has been viewed
- [ ] viewer and tv-two is paid tokens (90/10) when watching more 20%+ advertisers ad
- [ ] token transfers are made through µRaiden
- [ ] ensure that only those who should be paid are paid for "work" (viewing) done
- [ ] reCaptcha used to ensure actual viewing is done

#### core problems
* how to handle proof of work (viewing)
  1. something something hash of video NEAR 20% of video submitted to smart contract
  1. hash is submitted from smart tv to smart contract when time is hit
  1. smart contract compares hash and identifies relevant party
  1. token payments are made

## how to run
Main things that will matter for now is testing. This can be done with `yarn test`.

Migrations to a test network can be done if running your own node. Once when a node is running on port 8545, you can run: `truffle migrate --network <KOVAN|ROPSTEN|RINKEBY>` replace network with network you are using (lowercase)

other useful commands:

compile smart contracts: `yarn build`

clear build and rebuild: `yarn clean:contracts`

clear install and reinstall dependencies: `yarn clean:install`

lint smart contracts: `yarn lint:contracts`

lint smart contract tests: `yarn lint:js`
