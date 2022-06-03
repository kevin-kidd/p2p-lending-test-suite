import {queryActiveLoan, queryNFTs} from "../scripts/query.js"
import {mint} from "../scripts/mint.js";
import {createListing, lend, liquidateListing} from "../scripts/exec.js";


export const testLiquidation = async () => {

    // Details for the listing
    let principal = "5"
    let expiration = "20"
    let collateral_amount = 3


    // Mint 3 new NFTs for collateral
    console.log("\nMinting 3 new NFTs for collateral...")
    let mintResponse = await mint(collateral_amount)
    if(mintResponse.length !== 3) {
        console.log("Failed to mint 3 new NFTs")
        return
    }

    // Verify the NFTs were minted
    const token_ids = await queryNFTs('borrower')
    let collateral
    if(token_ids.token_list.tokens.length >= 2){
        collateral = token_ids.token_list.tokens.slice(0, collateral_amount)
    } else {
        console.log("Liquidation test failed. Unable to query for new NFTs.")
        return
    }

    // Create listing with freshly minted NFTs as collateral
    console.log("\nCreating new listing with collateral...\n")
    let offspringAddress = await createListing(collateral, expiration, principal)

    // Lend SNIP24 tokens to the listing

    console.log("\nLending to the new listing...")
    await lend(offspringAddress, principal)

    // Query to verify the loan is active
    let queryLoanResponse = await queryActiveLoan(offspringAddress)
    if(queryLoanResponse === undefined){
        console.log("Could not verify that the loan is active.")
        return
    }

    // Time out until the loan expires
    console.log("\nWaiting for loan to expire...")
    await new Promise(r => setTimeout(r, (parseInt(expiration) * 1000) + 10000))

    // Liquidate the listing
    console.log("\nLiquidating listing...")
    await liquidateListing(offspringAddress)

    // Query the lenders NFT inventory to verify liquidated tokens are given
    console.log("\nQuerying lenders NFTs to verify the collateral has been given")
    const lenderTokensResponse = await queryNFTs('lender')
    const result = collateral.every(val => lenderTokensResponse.token_list.tokens.includes(val))

    if(result) {
        console.log("\nLiquidation test completed successfully!")
    } else {
        console.log("\nLiquidation test failed. Collateral was not returned to the lender!\n" +
            "Collateral:"
        )
        console.log(collateral)
        console.log("Lenders Tokens:")
        console.log(lenderTokensResponse.token_list.tokens)
    }
}