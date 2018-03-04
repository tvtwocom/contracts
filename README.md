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

- [x] total supply 666666667
- [x] 18 decimals
- [x] TTV symbol
- [x] TokenForTelevision
- [x] 15% goes to company
- [ ] split into 36 parts and release every month (3 years timeframe)

### TV-TWO smart contract requirements

#### specs
**short term goal: submit some pre-shared hash for token reward to relevant party/situation**

- [ ] advertiser can send video link and tokens to smart contract to start campaign
- [x] content creators can send video link and wallet address to publish videos
- [ ] can provide video links for tv app (can use ipfs?)
- [x] content creators are paid tokens by viewer (tv wallet) when 20%+ has been viewed
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

**idea for proof of work videoHashes:**
1. random time (nonce) which is used in order to hash       videoFrame
  * can only try once every minute
    * prevents brute force attacks
  * essentially need to know videoFrame time (nonce) to hash to match videoHash on contract

#### workflow
The user gets the link for the next video from the TV-TWO server. The video is played through the app. Once 20% of the video is played, the app calculates a hash out of the image that is displayed at this moment. The Smart TV sends the hash to the Smart Contract. Through the hash, the Smart Contract finds the right advertiser / content content creator. TV-TWO has a payment channel with each user, advertiser and content creator through which the tokens are transferred.

#### questions
1. While the token transfer is happening off-chain. Wouldn’t the user incur gas costs for sending the hash of every video to the contract?
  * this is something that has been in the back of my head as well and to be honest I am not sure... I need to check more closely with how things are working with micro raiden. Essentially from what I understand they are keeping signed transactions ready to go... we might be able to store some data with those signed transactions... if this is the case... we should be ok i think...

## how to run
Main things that will matter for now is testing. This can be done with `yarn test`.

Migrations to a test network can be done if running your own node. Once when a node is running on port 8545, you can run: `truffle migrate --network <KOVAN|ROPSTEN|RINKEBY>` replace network with network you are using (lowercase)

other useful commands:

compile smart contracts: `yarn build`

clear build and rebuild: `yarn clean:contracts`

clear install and reinstall dependencies: `yarn clean:install`

lint smart contracts: `yarn lint:contracts`

lint smart contract tests: `yarn lint:js`
