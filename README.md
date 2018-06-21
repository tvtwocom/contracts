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

## Operations Contract

### Purpose:

- Handles payments between participants in the ecosystem

### Parties interacting with the contract:

1. Advertisers
2. Organic content creators
3. Viewers

### Description:
[TODO] describe managed viewers
- The smart contract implements an internal mapping between wallet address and the number of TTV that 
  can be withdrawn by that wallet address
- The advertiser opens a payment channel with the RaidenMicroTransferChannels and deposits any number 
  of TTV
- The advertiser submits a hash (related his video), his wallet address and the opening_block of its 
  channel to the TTM
- The organic content creator submits a hash (related his video) and his wallet address to the 
  smart contract
- TV-TWO opens a payment channel to give TTV to the content creator
- TV-TWO opens a payment channel to give TTV to the viewer
- TV-TWO can open a payment channel for managed users, or the viewer can do this itself, in order 
to pay TTV 
- TV-TWO has a centralized server with a list of organic video links and links to advertising clips
- The Smart TV app of the user queries the centralized server of TV-TWO for the next video to play
- The app will sign a balance proof and sends it to the TV-TWO server, which will in return deliver 
  the requested original content, while TV-TWO will sign a balance proof about the same amount for 
  the content creator
- When showing an Ad TV-TWO will sign a balance proof and sends it to the App, in order to receive 
  TTV, while the advertiser will have to sign a balance proof about the same amount and delivers 
  it to TV-TWO, since there is no incentive for the advertiser to do so, one might have to pay in 
  advance.
- When a channel is closed by anyone TV-TWO will collect all transactions belonging to that channel,
  meaning which videos had been watched, and the two corresponding balance_proofs.
  This informations gets hashed and published, while the corresponding hash is sent to the TTM,
  which will emit an channelCheckpoint event containging spender recipient balance and opening block 
  number along with the logsHash.
- A distrusting User of the Platform will be able to find the corresponding logs and check them for
  errors. Since the logs are referenced on chain it is infeasable to forge them.

## How to Run
Main things that will matter for now is testing. This can be done with `yarn test`.

Migrations to a test network can be done if running your own node. Once when a node is running on port 8545, you can run: `truffle migrate --network <KOVAN|ROPSTEN|RINKEBY>` replace network with network you are using (lowercase)

other useful commands:

compile smart contracts: `yarn build`

clear build and rebuild: `yarn clean:contracts`

clear install and reinstall dependencies: `yarn clean:install`

lint smart contracts: `yarn lint:contracts`

lint smart contract tests: `yarn lint:js`
