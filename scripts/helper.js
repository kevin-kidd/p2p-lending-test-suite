import dotenv from "dotenv";
import { Wallet, SecretNetworkClient } from "secretjs";
dotenv.config();

export const getClient = async (type) => {
  try {
    let wallet;
    if (type === "borrower") {
      wallet = new Wallet(process.env.BORROWER_MNEMONIC);
    } else if (type === "lender") {
      wallet = new Wallet(process.env.LENDER_MNEMONIC);
    } else {
      wallet = new Wallet(process.env.TAX_MNEMONIC);
    }
    const address = wallet.address;
    return await SecretNetworkClient.create({
      grpcWebUrl: process.env.GRPC_URL,
      chainId: process.env.CHAIN_ID,
      wallet,
      walletAddress: address,
    });
  } catch (e) {
    console.error(e.message);
  }
};

export const getQueryClient = async () => {
  return await SecretNetworkClient.create({
    grpcWebUrl: process.env.GRPC_URL,
    chainId: process.env.CHAIN_ID,
  });
};

export const trueBalance = (balance) => {
  return balance / 1e6;
};

export const calculateAmountOwed = (queryLoanResponse) => {
  const interest_interval = 120;

  const interest_rate = queryLoanResponse.listing_info.interest_rate;
  const lock_up_time = queryLoanResponse.listing_info.lock_up_time;
  const ends_at = queryLoanResponse.listing_info.ends_at;
  const principal_asked = queryLoanResponse.listing_info.principal_asked.amount;

  const current_time_seconds = new Date().getTime() / 1000;
  const rate = interest_rate.rate;
  const decimal_places = interest_rate.decimal_places;

  const remaining_time =
    new Date(ends_at).getTime() / 1000 - current_time_seconds;
  const elapsed_time = lock_up_time - remaining_time;
  const hours_elapsed = Math.floor(elapsed_time / interest_interval);
  const interest =
    (principal_asked * rate * hours_elapsed) /
    (lock_up_time / interest_interval) /
    Math.pow(10, decimal_places);
  const fee = (interest * rate) / Math.pow(10, decimal_places);

  return {
    interest,
    fee,
    principal: principal_asked,
  };
};

export const calculateGas = async (transaction, client) => {
  try {
    const sim = await client.tx.simulate([transaction]);
    return Math.ceil(sim.gasInfo.gasUsed * 1.1);
  } catch (e) {
    console.log(e.message);
    console.error("\nUnable to calculate gas for the transaction.");
    return 1_000_000;
  }
};

export const broadcastTx = async (transaction, client) => {
  try {
    const tx = await client.tx.broadcast([transaction], {
      gasLimit: await calculateGas(transaction, client),
    });
    if (tx.code !== 0) {
      console.log(tx);
      return "Transaction failed!";
    }
    return tx;
  } catch (e) {
    console.error(e.message);
    console.error("\nError broadcasting transaction.");
  }
};
