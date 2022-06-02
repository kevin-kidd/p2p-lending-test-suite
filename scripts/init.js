import dotenv from 'dotenv'
dotenv.config()
import {getClient} from "../helper.js";
import fs from "fs"

const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)

const initMsgs = {
    "snip24": {
        name: "Secret SCRT Test Token",
        admin: process.env.BORROWER_ADDRESS,
        symbol: "SSCRT",
        decimals: 6,
        initial_balances: [
            {
                address: process.env.BORROWER_ADDRESS,
                amount: "1000000000"
            },
            {
                address: process.env.LENDER_ADDRESS,
                amount: "1000000000"
            }
        ],
        prng_seed: "eW8=",
        config: {
            public_total_supply: true,
            enable_deposit: true,
            enable_redeem: true,
            enable_mint: false,
            enable_burn: false,
        }
    },
    "snip721": {
        name: "Test Snip721 NFT",
        admin: process.env.BORROWER_ADDRESS,
        symbol: "XXXXX",
        entropy: "eW8=",
        config: {
            public_token_supply: true,
            public_owner: true,
        }
    },
    "factory": {
        entropy: "rndm_word",
        offspring_contract: {
            code_id: config.offspring.codeId,
            code_hash: config.offspring.codeHash
        },
        tax_addr: process.env.BORROWER_ADDRESS,
        tax_rate: {
            rate: 20,
            decimal_places: 3
        }
    }
}

const setViewingKeys = async (type, contractAddress) => {
    const borrower_client = await getClient('borrower')
    const lender_client = await getClient('lender')

    let key = Math.random().toString(36).substr(4, 10)

    const viewingKeyTx_borrower = await borrower_client.tx.compute.executeContract(
        {
            sender: borrower_client.address,
            contractAddress: contractAddress,
            codeHash: config[type].codeHash,
            msg: {
                set_viewing_key: {
                    key: key
                }
            },
        },
        { gasLimit: 1_000_000 }
    )

    const viewingKeyTx_lender = await lender_client.tx.compute.executeContract(
        {
            sender: lender_client.address,
            contractAddress: contractAddress,
            codeHash: config[type].codeHash,
            msg: {
                set_viewing_key: {
                    key: key
                }
            },
        },
        { gasLimit: 1_000_000 }
    )

    if(viewingKeyTx_borrower.code !== 0 || viewingKeyTx_lender.code !== 0) {
        console.error("Failed to set viewing keys!")
        return undefined
    }
    return key
}

const initContract = async (type) => {
    try {

        const client = await getClient('borrower')

        const instantiateTx = await client.tx.compute.instantiateContract(
            {
                sender: client.address,
                codeId: config[type].codeId,
                codeHash: config[type].codeHash, // optional but way faster
                initMsg: initMsgs[type],
                label: type + " Test Contract" + Math.floor(Math.random() * 100),
            },
            { gasLimit: 1_000_000 }
        )

        if(instantiateTx.code !== 0) {
            console.error("Failed to instantiate contract: " + type)
            return undefined
        }

        const contractAddress = instantiateTx.arrayLog.find(
            (log) => log.type === "message" && log.key === "contract_address",
        ).value

        let viewing_key = await setViewingKeys(type, contractAddress)
        if(!viewing_key === undefined){
            console.log("Failed to set viewing key!")
            return
        }

        fs.readFile("./config.json", 'utf8', function readFileCallback(err, data) {
            if (err) {
                console.log(err)
            } else {
                let obj = JSON.parse(data)
                obj[type].viewing_key = viewing_key
                obj[type].address = contractAddress
                fs.writeFile("./config.json", JSON.stringify(obj, null, 2), 'utf8', err => {
                    if (err) throw err
                })
            }
        })

        console.log(
            "\n### New '" + type + "' Contract Details ###\n" +
            "Contract Address: " + contractAddress +
            "\nViewing Key: " + viewing_key + "\n"
        )
        return "success"
    } catch (e) {
        console.error(e.message)
    }
}

const initAll = async (types) => {
    for(const x of types){
        await initContract(x)
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('No arguments provided, need --contract (snip24, snip721, factory, all)')
} else if (args.length === 2 && args[0] === '--contract') {
    const types = ["snip24", "snip721", "factory"]
    if (types.includes(args[1])) {
        initContract(args[1]).then(() => console.log("Contract details have been saved to config.json"))
    } else if (args[1] === "all"){
        initAll(types).then(() => console.log("Contract details have been saved to config.json"))
    } else {
        console.log("You did not supply a correct argument value! (snip24, snip721, factory, all)")
    }
} else if (args.length === 3 && args[0] === '--contract' && args[2] === '--set-viewing-key') {
    const types = ["snip24", "snip721", "factory"]
    if (types.includes(args[1])) {
        let viewing_key = await setViewingKeys(args[1], config[args[1]].address)
        console.log("Set new viewing key: " + viewing_key + " for contract: " + args[1])
    } else {
        console.log("You did not supply a correct argument value! (snip24, snip721, factory)")
    }
} else {
    console.log('Incorrect argument provided, need --contract')
}