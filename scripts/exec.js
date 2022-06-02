import fs from "fs"
import {getClient} from "../helper.js";
import {MsgExecuteContract} from "secretjs";
import readline from "readline"
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const client = await getClient('borrower')

const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)

const updateTax = async (rate) => {
    const client = await getClient('borrower')

    const updateTx = await client.tx.compute.executeContract(
        {
            sender: client.address,
            contractAddress: config.factory.address,
            codeHash: config.factory.codeHash,
            msg: {
                update_tax: {
                    tax_rate: {
                        decimal_places: 2,
                        rate: parseInt(rate)
                    }
                }
            }
        },
        {
            gasLimit: 200_000
        }
    )

    console.log(updateTx)
    return updateTx
}

const updateStatus = async (status) => {
    let new_status
    status === 'start' ? new_status = false : new_status = true

    const client = await getClient('borrower')

    const updateTx = await client.tx.compute.executeContract(
        {
            sender: client.address,
            contractAddress: config.factory.address,
            codeHash: config.factory.codeHash,
            msg: {
                set_status: {
                    stop: new_status
                }
            }
        },
        {
            gasLimit: 200_000
        }
    )

    console.log(updateTx)
    return updateTx
}

const updateOffspring = async () => {

    const client = await getClient('borrower')
    const updateTx = await client.tx.compute.executeContract(
        {
            sender: client.address,
            contractAddress: config.factory.address,
            codeHash: config.factory.codeHash,
            msg: {
                new_offspring_contract: {
                    offspring_contract: {
                        code_hash: config.offspring.codeHash,
                        code_id: config.offspring.codeId
                    }
                }
            }
        },
        {
            gasLimit: 200_000
        }
    )


    console.log(updateTx)
    return updateTx

}

const liquidateListing = async (offspringAddress) => {

    const lender_client = await getClient('lender')
    const liquidateTx = await lender_client.tx.compute.executeContract(
        {
            sender: lender_client.address,
            contractAddress: offspringAddress,
            codeHash: config.offspring.codeHash,
            msg: { liquidate: {} }
        },
        {
            gasLimit: 200_000
        }
    )
    console.log(liquidateTx)
    return liquidateTx
}

const lend = async (offspringAddress) => {
    const lender_client = await getClient('lender')

    const lendTx = await lender_client.tx.compute.executeContract(
        {
            sender: lender_client.address,
            contractAddress: config.snip24.address,
            codeHash: config.snip24.codeHash,
            msg: {
                send: {
                    recipient: offspringAddress,
                    amount: "5",
                    msg: Buffer.from(JSON.stringify({lend_all:{}})).toString('base64')
                }
            },
        },
        {
            gasLimit: 200_000
        }
    )

    console.log(lendTx)
    return lendTx
}

const cancelListing = async (offspringAddress) => {
    const cancelTx = await client.tx.compute.executeContract(
        {
            sender: client.address,
            contractAddress: offspringAddress,
            codeHash: config.offspring.codeHash, // optional but way faster
            msg: { cancel_listing: {} }
        },
        {
            gasLimit: 200_000
        }
    )
    console.log(cancelTx)
    return cancelTx
}

const createViewingKey = async () => {
    const client = await getClient('borrower')
    const createTx = await client.tx.compute.executeContract(
        {
            sender: client.address,
            contractAddress: config.factory.address,
            codeHash: config.factory.codeHash, // optional but way faster
            msg: {
                create_viewing_key: {
                    entropy: "eW8="
                }
            }
        },
        {
            gasLimit: 200_000
        }
    )
    console.log(createTx)
    return createTx
}

const createListing = async (tokens, expiration, principalAsked) => {

    const createOffspringMsg = {
        create_offspring: {
            label: "Offspring Test Contract" + Math.floor(Math.random() * 100),
            entropy: "random_word",
            owner: client.address,
            owner_is_public: true, // optional
            principal_contract_msg: {
                code_hash: config.snip24.codeHash,
                address: config.snip24.address,
            },
            collateral_contract_msg: {
                code_hash: config.snip721.codeHash,
                address: config.snip721.address,
            },
            collateral_token_ids: tokens,
            ends_after: parseInt(expiration),
            principal_asked: principalAsked,
            interest_rate: { // 20% (yes abnormally high, just for testing)
                rate: 200,
                decimal_places: 3
            },
            description: "Useless" //optional
        }
    }

    const sendMsg = {
        contract: config.factory.address,
        token_ids: tokens,
        receiver_info: {
            recipient_code_hash: config.factory.codeHash,
            also_implements_batch_receive_nft: true,
        },
        msg: Buffer.from(JSON.stringify(createOffspringMsg)).toString('base64'),
    }


    const batchSend = new MsgExecuteContract(
        {
            sender: client.address,
            contractAddress: config.snip721.address,
            codeHash: config.snip721.codeHash,
            msg: {
                batch_send_nft: {
                    sends: [sendMsg],
                }
            }
        })

    const sim = await client.tx.simulate([batchSend])

    const sendTx = await client.tx.broadcast([batchSend],
        {
            gasLimit: Math.ceil(sim.gasInfo.gasUsed * 1.1)
        }
    )

    if(sendTx.code !== 0){
        console.error("Mint transaction failed!")
        return
    }

    const offspringAddress = sendTx.arrayLog.find((a) => {
        return a.key === "offspring_address"
    })

    fs.readFile("./config.json", 'utf8', function readFileCallback(err, data) {
        if (err) {
            console.log(err)
        } else {
            let obj = JSON.parse(data)
            obj.offspring.listings.push(offspringAddress.value)
            fs.writeFile("./config.json", JSON.stringify(obj, null, 2), 'utf8', err => {
                if (err) throw err
            })
        }
    })

    console.log(
        "Successfully created listing and updated config.json!\n" +
        "Offspring Address: " + offspringAddress.value
    )

}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('No arguments provided, need --create-listing')
} else if(args.length === 1 && args[0] === '--create-listing'){
    rl.question("Token IDs for collateral (comma-separated): ", function(tokens) {
        rl.question("Expiration (in seconds): ", function(expiration) {
            rl.question("Principal: ", function(principal) {
                let token_ids = tokens.split(',')
                createListing(token_ids, expiration, principal)
                rl.close();
            })
        });
    });
} else if(args.length === 2 && args[0] === '--cancel-listing'){
    cancelListing(args[1])
} else if(args.length === 2 && args[0] === '--liquidate') {
    liquidateListing(args[1])
} else if(args.length === 2 && args[0] === '--lend'){
    lend(args[1])
} else if(args.length === 1 && args[0] === '--update-offspring') {
    updateOffspring()
} else if(args.length === 2 && args[0] === '--update-tax') {
    updateTax(args[1])
} else if(args.length === 2 && args[0] === '--change-status') {
    updateStatus(args[1])
} else if(args.length === 1 && args[0] === '--create-viewing-key') {
    createViewingKey(args[1])
} else {
    console.log('Incorrect argument provided.')
}