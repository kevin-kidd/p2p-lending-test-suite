import {getBalances, queryActiveLoan, queryNFTs} from "../scripts/query.js"
import {mint} from "../scripts/mint.js";
import {createListing, lend, repayLoan} from "../scripts/exec.js";
import {calculateAmountOwed, trueBalance} from "../scripts/helper.js";

export const testRepayLoan = async () => {
    try {
        const initial_balances = await getBalances()

        // Details for the listing
        const principal = "5000000"
        const expiration = "5000"
        const collateral_amount = 1


        // Mint new NFTs for collateral
        console.log("\nMinting " + collateral_amount + " new NFT(s) for collateral...")
        let mintResponse = await mint(collateral_amount)
        if(mintResponse.length !== collateral_amount) {
            console.error("Failed to mint " + collateral_amount + " new NFT(s)")
            return
        }

        // Verify the NFTs were minted
        const token_ids = await queryNFTs('borrower')
        let collateral
        if(token_ids.token_list.tokens.length >= collateral_amount){
            collateral = token_ids.token_list.tokens.slice(0, collateral_amount)
        } else {
            console.error("Liquidation test failed. Unable to query for new NFTs.")
            return
        }

        // Create listing with freshly minted NFTs as collateral
        console.log("\nCreating new listing with collateral...\n")
        let offspringAddress = await createListing(collateral, expiration, principal)
        if(offspringAddress === undefined) return

        // Lend SNIP24 tokens to the listing
        console.log("\nLending to the new listing...")
        if(await lend(offspringAddress, principal) === undefined) return

        // Query to verify the loan is active
        let queryLoanResponse = await queryActiveLoan(offspringAddress)
        if(queryLoanResponse === undefined) return

        // Check the balances again to verify the principal has been transferred to the borrower
        console.log("\nChecking balances...")
        const new_balances = await getBalances()
        if(new_balances === undefined) return

        // Check borrower balance
        if(new_balances.borrower.snip !== initial_balances.borrower.snip + trueBalance(principal)){
            console.error("Principal amount was not transferred to the borrower's balance.")
            console.error("Expected amount: " + (initial_balances.borrower.snip + trueBalance(principal)))
            console.error("Got: " + new_balances.borrower.snip)
            return
        }

        // Check lender balance
        if(new_balances.lender.snip !== initial_balances.lender.snip - trueBalance(principal)){
            console.error("Principal amount was not taken from the lender's balance")
            console.error("Expected amount: " + (initial_balances.lender.snip - trueBalance(principal)))
            console.error("Got: " + new_balances.lender.snip)
            return
        }

        // Calculate the amount that needs to be paid back
        console.log("\nCalculating amount owed...")
        const owed = calculateAmountOwed(queryLoanResponse)
        const requiredPayment = +owed.interest + +owed.fee + +owed.principal

        // Pay back the loan
        console.log("Paying back the amount owed...")
        const repayResponse = await repayLoan(offspringAddress, requiredPayment)
        if(repayResponse === undefined) return
        if(JSON.parse(repayResponse.value).pay_loan.status !== "Success") {
            console.error(repayResponse)
            return
        }

        // Final balance check
        console.log("\nChecking balances...")
        const final_balances = await getBalances()
        if(final_balances === undefined) return

        // Verify required payment was sent by borrower
        if(new_balances.borrower.snip - trueBalance(requiredPayment) !== final_balances.borrower.snip) {
            console.error("Borrower's balance is not correct!")
            console.log("Required payment: " + trueBalance(requiredPayment))
            console.log("Old balance: " + new_balances.borrower.snip)
            console.log("New balance: " + final_balances.borrower.snip)
            console.log("Expected balance: " + new_balances.borrower.snip - trueBalance(requiredPayment))
        }

        // Verify principal and interest was received by lender
        if(final_balances.lender.snip !== new_balances.lender.snip + trueBalance(owed.interest) + trueBalance(owed.principal)){
            console.error("Lender's balance is not correct!")
            console.log("Old balance: " + new_balances.lender.snip)
            console.log("New balance: " + final_balances.lender.snip)
            console.log("Interest + Principal: " + trueBalance(owed.interest) + trueBalance(owed.principal))
        }

        // Verify tax was sent
        if(final_balances.tax.snip - new_balances.tax.snip !== trueBalance(owed.fee)){
            console.error("Tax balance is not correct!")
            console.log("Fee: " + trueBalance(owed.fee))
            console.log("Old balance: " + new_balances.tax.snip)
            console.log("New balance: " + final_balances.tax.snip)
        }



        // Query the borrowers NFT inventory to verify collateral tokens are given back
        console.log("\nQuerying borrowers NFTs to verify the collateral has been given back...")
        const borrowerTokensResponse = await queryNFTs('borrower')
        if(borrowerTokensResponse === undefined) return
        const result = collateral.every(val => borrowerTokensResponse.token_list.tokens.includes(val))

        if(result) {
            console.log("\nRepayment test completed successfully!")
        } else {
            console.error("\nLiquidation test failed. Collateral was not sent to the lender!\n" +
                "Collateral:"
            )
            console.log(collateral)
            console.log("Borrower Tokens:")
            console.log(borrowerTokensResponse.token_list.tokens)
        }
    } catch (e) {
        console.error(e)
    }
}