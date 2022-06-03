import fs from "fs"
import { broadcastTx, getClient} from "./helper.js";
import {MsgExecuteContract} from "secretjs";
import readlineSync from 'readline-sync'
import url from "url";

const client = await getClient('borrower')

const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)

const updateTax = async (rate) => {
    const client = await getClient('borrower')

    const updateTx = new MsgExecuteContract(
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
        }
    )
    const response = await broadcastTx(updateTx, client)
    console.log(response)
    return response
}

const updateStatus = async (status) => {
    let new_status
    status === 'start' ? new_status = false : new_status = true

    const client = await getClient('borrower')

    const updateTx = new MsgExecuteContract(
        {
            sender: client.address,
            contractAddress: config.factory.address,
            codeHash: config.factory.codeHash,
            msg: {
                set_status: {
                    stop: new_status
                }
            }
        }
    )

    const response = await broadcastTx(updateTx, client)
    console.log(response)
    return response
}

const updateOffspring = async () => {

    const client = await getClient('borrower')
    const updateTx = new MsgExecuteContract(
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
        }
    )

    const response = await broadcastTx(updateTx, client)
    console.log(response)
    return response

}

export const liquidateListing = async (offspringAddress) => {

    const lender_client = await getClient('lender')
    const liquidateTx = new MsgExecuteContract(
        {
            sender: lender_client.address,
            contractAddress: offspringAddress,
            codeHash: config.offspring.codeHash,
            msg: { liquidate: {} }
        }
    )
    const tx = await broadcastTx(liquidateTx, lender_client)

    const response = tx.arrayLog.find((a) => {
        return a.key === "response"
    })

    if(JSON.parse(response.value).liquidate.status === "Success"){
        console.log("Liquidation successful!")
        return tx
    } else {
        console.log("Liquidation was not successful!")
        return undefined
    }

}

export const lend = async (offspringAddress, principal) => {
    const lender_client = await getClient('lender')

    const lendTx = new MsgExecuteContract(
        {
            sender: lender_client.address,
            contractAddress: config.snip24.address,
            codeHash: config.snip24.codeHash,
            msg: {
                send: {
                    recipient: offspringAddress,
                    amount: principal,
                    msg: Buffer.from(JSON.stringify({lend_all:{}})).toString('base64')
                }
            },
        }
    )

    const tx = await broadcastTx(lendTx, lender_client)

    const response = tx.arrayLog.find((a) => {
        return a.key === "response"
    })

    if(JSON.parse(response.value).receive_principal.status === "Success"){
        console.log("Successfully lent " + principal + " snip24 tokens")
        return tx
    } else {
        console.log(tx)
        console.log("Failed to lend to the listing.")
        return undefined
    }


}

const cancelListing = async (offspringAddress) => {
    const cancelTx = new MsgExecuteContract(
        {
            sender: client.address,
            contractAddress: offspringAddress,
            codeHash: config.offspring.codeHash, // optional but way faster
            msg: { cancel_listing: {} }
        }
    )
    const response = await broadcastTx(cancelTx, client)
    console.log(response)
    return response
}

const createViewingKey = async () => {
    const createTx = new MsgExecuteContract({
            sender: client.address,
            contractAddress: config.factory.address,
            codeHash: config.factory.codeHash, // optional but way faster
            msg: {
                create_viewing_key: {
                    entropy: "eW8="
                }
            }
        })
    const response = await broadcastTx(createTx, client)
    console.log(response)
    return response
}

export const createListing = async (tokens, expiration, principalAsked) => {

    try {

        const createOffspringMsg = {
            create_offspring: {
                label: "Offspring Test Contract" + Math.floor(Math.random() * 10000),
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

        const offspringAddress = sendTx.arrayLog.find((a) => {
            return a.key === "offspring_address"
        })

        if (offspringAddress === undefined) {
            console.error("Listing transaction failed!")
            return undefined
        }

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

        return offspringAddress.value

    } catch (e) {
        console.log(e.message)
    }

}

const args = process.argv.slice(2);
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    if (args.length === 0) {
        console.log('\nNo arguments provided, use --help for available arguments\n')
    } else if (args.length === 1 && args[0] === '--create-listing') {
        let tokens = readlineSync.question('Token IDs for collateral (comma-separated): ')
        let token_ids = tokens.split(',')
        let expiration = readlineSync.question("Expiration (in seconds): ")
        let principal = readlineSync.question("Principal: ")
        await createListing(token_ids, expiration, principal)
    } else if (args.length === 2 && args[0] === '--cancel-listing') {
        await cancelListing(args[1])
    } else if (args.length === 2 && args[0] === '--liquidate') {
        await liquidateListing(args[1])
    } else if (args.length === 4 && args[0] === '--lend' && args[2] === '--principal') {
        await lend(args[1], args[3])
    } else if (args.length === 1 && args[0] === '--update-offspring') {
        await updateOffspring()
    } else if (args.length === 2 && args[0] === '--update-tax') {
        await updateTax(args[1])
    } else if (args.length === 2 && args[0] === '--change-status') {
        await updateStatus(args[1])
    } else if (args.length === 1 && args[0] === '--create-viewing-key') {
        await createViewingKey(args[1])
    } else if (args.length === 1 && args[0] === '--help') {
        console.log(
            "\nAvailable arguments:\n" +
            "--cancel-listing [offspring address]\n" +
            "--liquidate [offspring address]\n" +
            "--lend [offspring address] --principal [amount]\n" +
            "--update-offspring [factory address]\n" +
            "--update-tax [factory address]\n" +
            "--change-status [factory address]\n" +
            "--create-viewing-key\n" +
            "Example: 'yarn run exec --create-viewing-key`\n"
        )
    } else {
        console.log('\nIncorrect arguments provided, use --help for available arguments\n')
    }
}