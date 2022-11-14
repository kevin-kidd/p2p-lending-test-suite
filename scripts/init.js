import dotenv from "dotenv";
dotenv.config();
import { getClient } from "./helper.js";
import fs from "fs";
import url from "url";

const getInitMsg = (type) => {
    const file = fs.readFileSync("./config.json", "utf8");
    const config = JSON.parse(file);

    const initMsgs = {
        snip24: {
            name: "Secret SCRT Test Token",
            admin: process.env.BORROWER_ADDRESS,
            symbol: "SSCRT",
            decimals: 6,
            initial_balances: [
                {
                    address: process.env.BORROWER_ADDRESS,
                    amount: "1000000000000",
                },
                {
                    address: process.env.LENDER_ADDRESS,
                    amount: "1000000000000",
                },
            ],
            prng_seed: "eW8=",
            config: {
                public_total_supply: true,
                enable_deposit: true,
                enable_redeem: true,
                enable_mint: false,
                enable_burn: false,
            },
        },
        bond_maker: {
            entropy: "eW8=",
            factories: [
                {
                    address: config.factory.address,
                    code_hash: config.factory.codeHash,
                },
            ],
            name: "COVER BONDS MAKER",
            symbol: "BONDS",
        },
        snip721: {
            name: "Test Snip721 NFT",
            admin: process.env.BORROWER_ADDRESS,
            symbol: "XXXXX",
            entropy: "eW8=",
            config: {
                public_token_supply: true,
                public_owner: true,
            },
        },
        factory: {
            offspring_code_info: {
                code_id: config.offspring.codeId,
                code_hash: config.offspring.codeHash,
            },
            bonds_contract: {
                address: config.bond_maker.address,
                code_hash: config.bond_maker.codeHash,
            },
            bond_royalty_info: {
                tax_addr: process.env.TAX_ADDRESS,
                tax_rate: {
                    rate: 200,
                    decimal_places: 3,
                },
            },
            tax_addr: process.env.TAX_ADDRESS,
            principal_tax_rate: {
                rate: 20,
                decimal_places: 3,
            },
            collateral_tax_rate: {
                rate: 20,
                decimal_places: 3,
            },
            liquidation_tax_rate: {
                rate: 20,
                decimal_places: 3,
            },
        },
    };

    return initMsgs[type];
};

const setViewingKeys = async (type, updateConfig, contractAddress) => {
    const file = fs.readFileSync("./config.json", "utf8");
    const config = JSON.parse(file);

    const borrower_client = await getClient("borrower");
    const lender_client = await getClient("lender");
    const tax_client = await getClient("tax");

    let key = Math.random().toString(36).substr(4, 10);

    const viewingKeyTx_borrower =
        await borrower_client.tx.compute.executeContract(
            {
                sender: borrower_client.address,
                contractAddress: contractAddress,
                codeHash: config[type].codeHash,
                msg: {
                    set_viewing_key: {
                        key: key,
                    },
                },
            },
            { gasLimit: 1_000_000 }
        );

    const viewingKeyTx_lender = await lender_client.tx.compute.executeContract(
        {
            sender: lender_client.address,
            contractAddress: contractAddress,
            codeHash: config[type].codeHash,
            msg: {
                set_viewing_key: {
                    key: key,
                },
            },
        },
        { gasLimit: 1_000_000 }
    );

    const viewingKeyTx_tax = await tax_client.tx.compute.executeContract(
        {
            sender: tax_client.address,
            contractAddress: contractAddress,
            codeHash: config[type].codeHash,
            msg: {
                set_viewing_key: {
                    key: key,
                },
            },
        },
        { gasLimit: 1_000_000 }
    );

    if (updateConfig) {
        fs.readFile(
            "./config.json",
            "utf8",
            function readFileCallback(err, data) {
                if (err) {
                    console.log(err);
                } else {
                    let obj = JSON.parse(data);
                    obj[type].viewing_key = key;
                    fs.writeFile(
                        "./config.json",
                        JSON.stringify(obj, null, 2),
                        "utf8",
                        (err) => {
                            if (err) throw err;
                        }
                    );
                }
            }
        );
    }

    if (
        viewingKeyTx_borrower.code !== 0 ||
        viewingKeyTx_lender.code !== 0 ||
        viewingKeyTx_tax.code !== 0
    ) {
        console.error("Unable to set viewing key for contract `" + type + "`");
        return undefined;
    }
    return key;
};

const initContract = async (type) => {
    const file = fs.readFileSync("./config.json", "utf8");
    const config = JSON.parse(file);
    try {
        const client = await getClient("borrower");

        const instantiateTx = await client.tx.compute.instantiateContract(
            {
                sender: client.address,
                codeId: config[type].codeId,
                codeHash: config[type].codeHash, // optional but way faster
                initMsg: getInitMsg(type),
                label:
                    type + " Test Contract" + Math.floor(Math.random() * 10000),
            },
            { gasLimit: 1_000_000 }
        );

        if (instantiateTx.code !== 0) {
            console.log(instantiateTx);
            console.error("Error while instantiating contract: " + type);
            return undefined;
        }

        const contractAddress = instantiateTx.arrayLog.find(
            (log) => log.type === "message" && log.key === "contract_address"
        ).value;

        let viewing_key = await setViewingKeys(type, false, contractAddress);
        if (viewing_key === undefined) {
            console.log("Failed to set viewing key!");
            return;
        }

        fs.readFile(
            "./config.json",
            "utf8",
            function readFileCallback(err, data) {
                if (err) {
                    console.log(err);
                } else {
                    let obj = JSON.parse(data);
                    if (type === "factory") {
                        obj.offspring.listings = [];
                    }
                    obj[type].viewing_key = viewing_key;
                    obj[type].address = contractAddress;
                    fs.writeFile(
                        "./config.json",
                        JSON.stringify(obj, null, 2),
                        "utf8",
                        (err) => {
                            if (err) throw err;
                        }
                    );
                }
            }
        );

        console.log(
            "\n### New '" +
                type +
                "' Contract Details ###\n" +
                "Contract Address: " +
                contractAddress +
                "\nViewing Key: " +
                viewing_key +
                "\n"
        );
        return "success";
    } catch (e) {
        console.error(e.message);
    }
};

export const initAll = async (types) => {
    for (const x of types) {
        let response = await initContract(x);
        if (response !== "success") {
            return false;
        }
    }
    return true;
};

const args = process.argv.slice(2);
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    if (args.length === 0) {
        console.log(
            "No arguments provided, use --help for available arguments"
        );
    } else if (args.length === 2 && args[0] === "--contract") {
        const types = ["snip24", "snip721", "factory", "bond_maker"];
        if (types.includes(args[1])) {
            await initContract(args[1]).then(() =>
                console.log("Contract details have been saved to config.json")
            );
        } else if (args[1] === "all") {
            await initAll(types).then(() =>
                console.log("Contract details have been saved to config.json")
            );
        } else {
            console.log(
                "You did not supply a correct argument value! (snip24, snip721, factory, bond_maker, all)"
            );
        }
    } else if (args.length === 2 && args[0] === "--set-viewing-key") {
        const types = ["snip24", "snip721", "factory", "bond_maker"];
        if (types.includes(args[1])) {
            let viewing_key = await setViewingKeys(
                args[1],
                true,
                config[args[1]].address
            );
            console.log(
                "Set new viewing key: " +
                    viewing_key +
                    " for contract: " +
                    args[1]
            );
        } else {
            console.log(
                "You did not supply a correct argument value! (snip24, snip721, factory, bond_maker)"
            );
        }
    } else if (args.length === 1 && args[0] === "--help") {
        console.log(
            "\nAvailable arguments:\n" +
                "--contract [snip721, snip24, factory, bond_maker]\n" +
                "--set-viewing-key [snip721, snip24, factory, bond_maker]\n" +
                "Example: 'yarn run init --set-viewing-key snip24'\n"
        );
    } else {
        console.log(
            "Incorrect arguments provided, use --help for available arguments"
        );
    }
}
