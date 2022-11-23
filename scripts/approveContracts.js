import { getClient } from "./helper.js";
import fs from "fs";

const contracts = {
  nfts: [
    "secret18fxtnywc7cwmdjf724sqrqqxekfxhd0p5aqjel",
    "secret1rm0texe3ctmz3yj46suq4qle6pna9f4lpyy6g7",
  ],
  tokens: [
    "secret18vd8fpwxzck93qlwghaj6arh4p7c5n8978vsyg",
    "secret1l59ywgxuk23xarhm2e2dpnruhq4hdzhlemcuvc",
  ],
};

const approveContracts = async () => {
  try {
    const config = JSON.parse(fs.readFileSync("./config.json"));
    const client = await getClient("borrower");
    const approveContractsTx = await client.tx.compute.executeContract(
      {
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        sender: client.address,
        msg: {
          add_approved_contracts: contracts,
        },
      },
      {
        gasLimit: 500_000,
      }
    );
    console.log(approveContractsTx);
    const approvedContractsResponse = await client.query.compute.queryContract({
      contractAddress: config.factory.address,
      codeHash: config.factory.codeHash,
      sender: client.address,
      query: {
        list_approved_contracts: {},
      },
    });
    console.log(approvedContractsResponse);
  } catch (error) {
    console.error(error);
  }
};

approveContracts();
