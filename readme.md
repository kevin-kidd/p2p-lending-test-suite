### Upload & Instantiate

Upload a contract
```
yarn run upload --contract [all, factory, offspring, snip24, snip721]
```
Instantiate a contract
```
yarn run init --contract [all, factory, snip24, snip721]
```
Set a newly generated viewing key for all contracts. This will set the same viewing key for the lender & borrower accounts.
```
yarn run init --contract [snip24, snip721, factory] --set-viewing-key
```

### Contract Executions

Mint some NFTs for testing
```
yarn run mint --amount 10
```
Create a listing with NFTs as collateral.
You will be prompted to enter:
- Token IDs (comma-separated values)
- Expiration time for the loan (in seconds)
- Principal amount of the loan

```
yarn run exec --create-listing
```
Cancel a listing
```
yarn run exec --cancel-listing [contract address]
```
Lend all of the principal for an active listing
```
yarn run exec --lend [contract address]
```
Liquidate a listing (after the expiration date has passed)
```
yarn run exec --liquidate [contract address]
```
Update offspring contract's code ID and hash as defined in config.json
```
yarn run exec --update-offspring
```
Update tax rate, must be an integer from 1-100. In this example, the tax rate is 80%.
```
yarn run exec --update-tax 80
```
Change the contract status. You can start/stop all offspring contract creations
```
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
