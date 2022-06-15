## Usage & Examples
You will find examples below for all of the commands included in this test suite.

### Deployment
Deploy and upload new contracts from the contracts directory
```angular2html
yarn run deploy --update-contracts
```
Deploy without uploading contracts
```angular2html
yarn run deploy
```
### Run Tests
Test the liquidation functionality
```angular2html
yarn run test --liquidation
```
Test the loan repayment functionality
```angular2html
yarn run test --repay-loan
```

### Upload & Instantiate

Upload a contract
```angular2html
yarn run upload --contract [all, factory, offspring, snip24, snip721]
```
Instantiate a contract
```angular2html
yarn run init --contract [all, factory, snip24, snip721]
```
Set a newly generated viewing key for any contract. This will set the same viewing key for the lender & borrower accounts.
```angular2html
yarn run init --set-viewing-key [snip24, snip721, factory]
```

### Contract Executions

Mint some NFTs for testing
```angular2html
yarn run mint --amount 10
```
Create a listing with NFTs as collateral.
You will be prompted to enter:
- Token IDs (comma-separated values)
- Expiration time for the loan (in seconds)
- Principal amount of the loan

```angular2html
yarn run exec --create-listing
```
Cancel a listing
```angular2html
yarn run exec --cancel-listing [contract address]
```
Lend all of the principal for an active listing
```angular2html
yarn run exec --lend [contract address]
```
Liquidate a listing (after the expiration date has passed)
```angular2html
yarn run exec --liquidate [contract address]
```
Update offspring contract's code ID and hash as defined in config.json
```angular2html
yarn run exec --update-offspring
```
Update tax rate, must be an integer from 1-100. In this example, the tax rate is 80%.
```angular2html
yarn run exec --update-tax 80
```
Change the contract status. You can start/stop all offspring contract creations
```angular2html
yarn run exec --change-status [start/stop]
```

### Queries

List all active offspring contracts (listings)
```angular2html
yarn run query --active-offsprings
```
List all inactive offspring contracts (listings)
```angular2html
yarn run query --inactive-offsprings
```
List all offspring contracts created by the borrower account
```angular2html
yarn run query --my-offsprings
```
Get details about the contract's config
```angular2html
yarn run query --config-info
```
Query an offspring contract to determine if the lender & borrower test accounts have an active loan
```angular2html
yarn run query --active-loan [contract address]
```
Query for an array of the SNIP-721 tokens owned by either the lender or borrower
```angular2html
yarn run query --view-nfts [borrower/lender]
```
