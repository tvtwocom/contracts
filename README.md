# TV-TWO Smart Contracts
## Token Contract

- Total supply: 666,666,667
- Decimals: 18
- Symbol: TTV
- Name: TokenForTelevision
- Distribution:
  - 75% go to contributors (payable immediately in full)
  - 6% go to advisors (payable immediately in full)
  - 4% go to marketing supporters (payable immediately in full)
  - 15% go to the team (split into 36 parts and released every month)

### Progress:
- [x] Total Supply 666666667
- [x] 18 decimals
- [x] TTV symbol
- [x] 15% goes to company
- [ ] Three-year vesting

## Operations Contract

### Purpose:

- Handles payments between participants in the ecosystem

### Parties interacting with the contract:

1. Advertisers
2. Organic content creators
3. Viewers

### Description:

- The smart contract implements an internal mapping between wallet address and the number of TTV that can be withdrawn by that wallet address
- The advertiser submits a hash (related his video), his wallet address and any number of TTV to the smart contract
- The organic content creator submits a hash (related his video) and his wallet address to the smart contract
- TV-TWO has a centralized server with a list of organic video links and links to advertising clips
- The Smart TV app of the user queries the centralized server of TV-TWO for the next video to play
- The app sends a hash related to the current video, a relevance score and its wallet address to the smart contract. The smart contract matches the hash to either the video from an advertiser or one from an organic content creator. In case of an ad, 3 TTV multiplied by the relevance score are subtracted from the internal balance of the advertiser and credited to the internal balance of the viewer. In case of an organic video, 1 TTV multiplied by the relevance score is subtracted from the internal balance of the viewer and credited to the internal balance of the organic content creator

## How to Run
Main things that will matter for now is testing. This can be done with `yarn test`.

Migrations to a test network can be done if running your own node. Once when a node is running on port 8545, you can run: `truffle migrate --network <KOVAN|ROPSTEN|RINKEBY>` replace network with network you are using (lowercase)

other useful commands:

compile smart contracts: `yarn build`

clear build and rebuild: `yarn clean:contracts`

clear install and reinstall dependencies: `yarn clean:install`

lint smart contracts: `yarn lint:contracts`

lint smart contract tests: `yarn lint:js`