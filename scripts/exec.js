import fs from "fs";
import { getClient } from "./helper.js";
import readlineSync from "readline-sync";
import url from "url";
import * as execs from "../interactions/executions.js";

const client = await getClient("borrower");

const updateTax = async (
  bondRoyaltyRate,
  collateralRate,
  liquidationRate,
  principalRate,
  newTaxAddress
) => {
  try {
    const updateTaxResponse = await execs.execUpdateTax(
      client,
      bondRoyaltyRate,
      collateralRate,
      liquidationRate,
      principalRate,
      newTaxAddress
    );
    if (updateTaxResponse.code !== 0) {
      console.error(updateTaxResponse);
      console.error("Unable to update tax rate.");
    }
    return updateTaxResponse;
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

const changeStatus = async (status) => {
  try {
    const changeStatusResponse = await execs.execChangeStatus(
      status !== "start",
      client
    );
    if (changeStatusResponse.code !== 0) {
      console.error(changeStatusResponse);
      console.error("Unable to update status.");
    }
    return changeStatusResponse;
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

const updateOffspring = async () => {
  try {
    const updateOffspringResponse = await execs.execUpdateOffspring(client);
    if (updateOffspringResponse.code !== 0) {
      console.error(updateOffspringResponse);
      console.error("Unable to update status.");
    }
    return updateOffspringResponse;
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

export const liquidateListing = async (offspringAddress) => {
  try {
    const lender_client = await getClient("lender");
    const liquidateResponse = await execs.execLiquidate(
      lender_client,
      offspringAddress
    );
    const response = liquidateResponse.arrayLog.find((a) => {
      return a.key === "response";
    });
    if (JSON.parse(response.value).liquidate.status === "Success") {
      console.log("Liquidation successful!");
      return liquidateResponse;
    } else {
      console.error("Liquidation was not successful!");
      return undefined;
    }
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

export const repayLoan = async (offspringAddress, owed) => {
  try {
    const repayResponse = await execs.execRepayLoan(
      owed,
      client,
      offspringAddress
    );
    if (repayResponse === undefined) return undefined;
    return repayResponse.arrayLog.find((a) => {
      return a.key === "response";
    });
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

export const lend = async (offspringAddress, principal) => {
  try {
    const lender_client = await getClient("lender");
    const lendResponse = await execs.execLend(
      offspringAddress,
      principal,
      lender_client
    );

    const response = lendResponse.arrayLog.find((a) => {
      return a.key === "response";
    });
    if (JSON.parse(response.value).receive_principal.status === "Success") {
      console.log("Successfully lent " + principal + " snip24 tokens");
      return lendResponse;
    } else {
      console.error(lendResponse);
      console.error("Failed to lend to the listing.");
      return undefined;
    }
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

const cancelListing = async (offspringAddress) => {
  try {
    const cancelResponse = await execs.execCancel(offspringAddress);
    if (cancelResponse.code !== 0) {
      console.error(cancelResponse);
      console.error("Failed to cancel the listing.");
    }
    return cancelResponse;
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

const createViewingKey = async () => {
  try {
    const viewingKeyResponse = await execs.execViewingKey(client);
    if (viewingKeyResponse.code !== 0) {
      console.error(viewingKeyResponse);
      console.error("Failed to cancel the listing.");
    }
    return viewingKeyResponse;
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

export const createListing = async (tokens, expiration, principalAsked) => {
  try {
    const createListingResponse = await execs.execCreateOffspring(
      tokens,
      expiration,
      principalAsked,
      client
    );
    const offspringAddress = createListingResponse.arrayLog.find((a) => {
      return a.key === "offspring_address";
    });
    if (!offspringAddress) {
      console.error("Listing transaction failed!");
      console.log(createListingResponse);
      return undefined;
    }
    fs.readFile("./config.json", "utf8", function readFileCallback(err, data) {
      if (err) {
        console.log(err);
      } else {
        const obj = JSON.parse(data);
        obj.offspring.listings.push(offspringAddress.value);
        fs.writeFile(
          "./config.json",
          JSON.stringify(obj, null, 2),
          "utf8",
          (err) => {
            if (err) throw err;
          }
        );
      }
    });
    console.log(
      "Successfully created listing and updated config.json!\n" +
        "Offspring Address: " +
        offspringAddress.value
    );
    return offspringAddress.value;
  } catch (e) {
    console.error(e.message);
    return undefined;
  }
};

const args = process.argv.slice(2);
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  if (args.length === 0) {
    console.log(
      "\nNo arguments provided, use --help for available arguments\n"
    );
  } else if (args.length === 1 && args[0] === "--create-listing") {
    const tokens = readlineSync.question(
      "Token IDs for collateral (comma-separated): "
    );
    const token_ids = tokens.split(",");
    const expiration = readlineSync.question("Expiration (in seconds): ");
    const principal = readlineSync.question("Principal: ");
    await createListing(token_ids, expiration, principal);
  } else if (args.length === 2 && args[0] === "--cancel-listing") {
    await cancelListing(args[1]);
  } else if (args.length === 2 && args[0] === "--liquidate") {
    await liquidateListing(args[1]);
  } else if (
    args.length === 4 &&
    args[0] === "--lend" &&
    args[2] === "--principal"
  ) {
    await lend(args[1], args[3]);
  } else if (args.length === 1 && args[0] === "--update-offspring") {
    await updateOffspring();
  } else if (args.length === 1 && args[0] === "--update-tax") {
    console.log("## NOTE: ENTER AN INTEGER FROM 1-99 FOR THE TAX RATE %");
    const principalRate = readlineSync.question("Principal tax rate: ");
    const collateralRate = readlineSync.question("Collateral tax rate: ");
    const liquidationRate = readlineSync.question("Liquidation tax rate: ");
    const bondRoyaltyRate = readlineSync.question("Bond royalty tax rate: ");
    const newTaxAddress = readlineSync.question("New tax address: ");
    await updateTax(
      bondRoyaltyRate,
      collateralRate,
      liquidationRate,
      principalRate,
      newTaxAddress
    );
  } else if (args.length === 2 && args[0] === "--change-status") {
    await changeStatus(args[1]);
  } else if (args.length === 1 && args[0] === "--create-viewing-key") {
    await createViewingKey(args[1]);
  } else if (args.length === 1 && args[0] === "--help") {
    console.log(
      "\nAvailable arguments:\n" +
        "--create-listing\n" +
        "--cancel-listing [offspring address]\n" +
        "--liquidate [offspring address]\n" +
        "--lend [offspring address] --principal [amount]\n" +
        "--update-offspring\n" +
        "--update-tax\n" +
        "--change-status [start/stop]\n" +
        "--create-viewing-key\n" +
        "Example: 'yarn run exec --create-viewing-key`\n"
    );
  } else {
    console.log(
      "\nIncorrect arguments provided, use --help for available arguments\n"
    );
  }
}
