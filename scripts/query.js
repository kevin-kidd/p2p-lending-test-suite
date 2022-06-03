import fs from "fs";
import {getClient, trueBalance} from "./helper.js";
import _ from 'lodash'
import url from "url";

const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)

const client = await getClient('borrower')

export const getBalances = async () => {

    const lender_client = await getClient('lender')
    const borrower_client = await getClient('borrower')

    try {
        const lender_balance = await lender_client.query.bank.balance({
            address: lender_client.address,
            denom: "uscrt",
        })

        const borrower_balance = await borrower_client.query.bank.balance({
            address: borrower_client.address,
            denom: "uscrt",
        })

        const lenderSnipBalance = await lender_client.query.compute.queryContract({
            contractAddress: config.snip24.address,
            codeHash: config.snip24.codeHash,
            query: {
                balance: {
                    key: config.snip24.viewing_key,
                    address: lender_client.address
                }
            }
        })

        const borrowerSnipBalance = await borrower_client.query.compute.queryContract({
            contractAddress: config.snip24.address,
            codeHash: config.snip24.codeHash,
            query: {
                balance: {
                    key: config.snip24.viewing_key,
                    address: borrower_client.address
                }
            }
        })

        return {
            lender: {
                scrt: trueBalance(lender_balance.balance.amount),
                snip: trueBalance(lenderSnipBalance.balance.amount)
            },
            borrower: {
                scrt: trueBalance(borrower_balance.balance.amount),
                snip: trueBalance(borrowerSnipBalance.balance.amount)
            }
        }
    } catch (e) {
        console.log(e.message)
        return undefined
    }
}

export const queryConfigInfo = async () => {
    try {
        const response = await client.query.compute.queryContract({
            contractAddress: config.factory.address,
            codeHash: config.factory.codeHash,
            query: { config_info: {} },
        })
        console.log(response.config_info)
        return response.config_info
    } catch (e) {
        console.log(e.message)
        console.error("Failed to query config info.")
    }

}

export const queryActiveLoan = async (offspringAddress) => {
    const lender_client = await getClient('lender')

    const borrower_response = await client.query.compute.queryContract({
        contractAddress: offspringAddress,
        codeHash: config.offspring.codeHash,
        query: {
            listing_info: {
                address: client.address,
                viewing_key: config.factory.viewing_key
            }
        }
    })

    const lender_response = await client.query.compute.queryContract({
        contractAddress: offspringAddress,
        codeHash: config.offspring.codeHash,
        query: {
            listing_info: {
                address: lender_client.address,
                viewing_key: config.factory.viewing_key
            }
        }
    })

    if(_.isEqual(lender_response, borrower_response)){
        if(borrower_response.listing_info.status !== 'active'){
            console.log("Listing is still awaiting loan.")
            return undefined
        }
    } else {
        console.log("Responses do not match!")
        return undefined
    }

    console.log("Listing is active!")

    return borrower_response
}

const queryMyOffsprings = async (type) => {
    if(type !== "borrower" || type !== "lender"){
        console.log("Incorrect argument value, need 'lender' or 'borrower'")
    }
    const client = await getClient(type)
    const response = await client.query.compute.queryContract({
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        query: {
            list_my_offspring: {
                address: client.address,
                viewing_key: config.factory.viewing_key
            }
        },
    })
    console.log(response.list_my_offspring.active)
    return response.list_my_offspring.active
}

export const queryNFTs = async (type) => {
    if(type !== 'borrower' && type !== 'lender'){
        console.log("Please provide an argument value (borrower or lender)")
        return
    }
    let client = await getClient(type)
    return await client.query.compute.queryContract({
        contractAddress: config.snip721.address,
        codeHash: config.snip721.codeHash,
        query: {
            tokens: {
                owner: client.address,
                viewing_key: config.snip721.viewing_key
            }
        }
    })
}

const queryActiveOffsprings = async () => {

    const response = await client.query.compute.queryContract({
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        query: { list_active_offspring: {} },
    })

    console.log(response.list_active_offspring.active)
    return response.list_active_offspring.active
}

const queryInactiveOffsprings = async () => {

    const response = await client.query.compute.queryContract({
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        query: { list_inactive_offspring: {} },
    })

    console.log(response.list_inactive_offspring)
    return response.list_inactive_offspring
}

const args = process.argv.slice(2);
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    if (args.length === 0) {
        console.log("No arguments provided, use --help for instructions.")
    } else if (args.length === 1 && args[0] === '--active-offsprings') {
        await queryActiveOffsprings()
    } else if (args.length === 1 && args[0] === '--inactive-offsprings') {
        await queryInactiveOffsprings()
    } else if (args.length === 2 && args[0] === '--my-offsprings') {
        await queryMyOffsprings(args[1])
    } else if (args.length === 1 && args[0] === '--config-info') {
        await queryConfigInfo()
    } else if (args.length === 2 && args[0] === '--active-loan') {
        await queryActiveLoan(args[1])
    } else if (args.length === 2 && args[0] === '--view-nfts') {
        console.log(await queryNFTs(args[1]))
    } else if (args.length === 1 && args[0] === '--get-balances') {
        await getBalances()
    } else if (args.length === 1 && args[0] === '--help') {
        console.log(
            "\nAvailable arguments:\n" +
            "--active-offsprings\n" +
            "--inactive-offsprings\n" +
            "--my-offsprings\n" +
            "--config-info\n" +
            "--active-loan [offspring address]\n" +
            "--view-nfts [borrower, lender]\n" +
            "--get-balances\n" +
            "Example: 'yarn run query --view-nfts borrower`\n"
        )
    } else {
        console.log("Incorrect arguments provided, use --help for instructions.")
    }
}