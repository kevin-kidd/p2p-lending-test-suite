import { getBalances, queryActiveLoan, queryNFTs } from "../scripts/query.js";
import { mint } from "../scripts/mint.js";
import { createListing, lend, liquidateListing } from "../scripts/exec.js";
import { trueBalance } from "../scripts/helper.js";

export const testLiquidation = async () => {
  const initial_balances = await getBalances();

  // Details for the listing
  const principal = "5000000";
  const expiration = "20";
  const collateral_amount = 3;

  // Mint new NFTs for collateral
  console.log(
    "\nMinting " + collateral_amount + " new NFT(s) for collateral..."
  );
  const mintResponse = await mint(collateral_amount);
  if (mintResponse.length !== collateral_amount) {
    console.error("Failed to mint " + collateral_amount + " new NFT(s)");
    return;
  }

  // Verify the NFTs were minted
  const token_ids = await queryNFTs("borrower");
  let collateral;
  if (token_ids.token_list.tokens.length >= collateral_amount) {
    collateral = token_ids.token_list.tokens.slice(0, collateral_amount);
  } else {
    console.error("Liquidation test failed. Unable to query for new NFTs.");
    return;
  }

  // Create listing with freshly minted NFTs as collateral
  console.log("\nCreating new listing with collateral...\n");
  const offspringAddress = await createListing(
    collateral,
    expiration,
    principal
  );
  // console.log(offspringAddress);

  // Lend SNIP24 tokens to the listing

  console.log("\nLending to the new listing...");
  await lend(offspringAddress, principal);

  // Query to verify the loan is active
  const queryLoanResponse = await queryActiveLoan(offspringAddress);
  if (queryLoanResponse === undefined) {
    console.error("Could not verify that the loan is active.");
    return;
  }

  // Check the balances again to verify the principal has been transferred to the borrower

  console.log("\nChecking balances...");
  const new_balances = await getBalances();

  // Check borrower balance
  if (
    new_balances.borrower.snip !==
    initial_balances.borrower.snip + trueBalance(principal)
  ) {
    console.error(
      "Principal amount was not transferred to the borrower's balance."
    );
    console.error(
      "Expected amount: " +
        (initial_balances.borrower.snip + trueBalance(principal))
    );
    console.error("Got: " + new_balances.borrower.snip);
    return;
  }

  // Check lender balance
  if (
    new_balances.lender.snip !==
    initial_balances.lender.snip - trueBalance(principal)
  ) {
    console.error("Principal amount was not taken from the lender's balance");
    console.error(
      "Expected amount: " +
        (initial_balances.lender.snip - trueBalance(principal))
    );
    console.error("Got: " + new_balances.lender.snip);
    return;
  }

  // Time out until the loan expires
  console.log("\nWaiting for loan to expire...");
  await new Promise((r) => setTimeout(r, parseInt(expiration) * 1000));

  // Liquidate the listing
  console.log("\nLiquidating listing...");
  await liquidateListing(offspringAddress);

  // Query the lenders NFT inventory to verify liquidated tokens are given
  console.log(
    "\nQuerying lenders NFTs to verify the collateral has been given..."
  );
  const lenderTokensResponse = await queryNFTs("lender");
  const result = collateral.every((val) =>
    lenderTokensResponse.token_list.tokens.includes(val)
  );

  if (result) {
    console.log(
      "\nLiquidation test completed successfully! Collateral was sent to the lender."
    );
  } else {
    console.error(
      "\nLiquidation test failed. Collateral was not sent to the lender!\n" +
        "Collateral:"
    );
    console.log(collateral);
    console.log("Lenders Tokens:");
    console.log(lenderTokensResponse.token_list.tokens);
  }
};
