import {getClient, trueBalance} from "./helper.js";
import _ from 'lodash'
import url from "url";
import * as queries from "../interactions/queries.js";

const client = await getClient('borrower')

export const getBalances = async () => {

    const clients = {
        lender: await getClient('lender'),
        borrower: await getClient('borrower'),
        tax: await getClient('tax')
    }

    try {
        // Fetch SCRT balances
        const lender_balance = await queries.queryBalance(clients.lender)
        const borrower_balance = await queries.queryBalance(clients.borrower)
        const tax_balance = await queries.queryBalance(clients.tax)

        // Fetch SNIP-24 balances
        const lenderSnipBalance = await queries.querySnipBalance(clients.lender)
        const borrowerSnipBalance = await queries.querySnipBalance(clients.borrower)
        const taxSnipBalance = await queries.querySnipBalance(clients.tax)

        return {
            lender: {
                scrt: trueBalance(lender_balance.balance.amount),
                snip: trueBalance(lenderSnipBalance.balance.amount)
            },
            borrower: {
                scrt: trueBalance(borrower_balance.balance.amount),
                snip: trueBalance(borrowerSnipBalance.balance.amount)
            },
            tax: {
                scrt: trueBalance(tax_balance.balance.amount),
                snip: trueBalance(taxSnipBalance.balance.amount)
            }
        }
    } catch (e) {
        console.log(e.message)
        return undefined
    }
}

export const queryConfigInfo = async () => {
    try {
        const configInfo = (await queries.queryConfig()).config_info
        console.log(configInfo)
        return configInfo
    } catch (e) {
        console.log(e.message)
        console.error("Failed to query config info.")
        undefined
    }

}

export const queryActiveLoan = async (offspringAddress) => {
    try {
        const lender_client = await getClient('lender')

        // Query the listing info from both borrower & client
        const borrower_response = await queries.queryListingInfo(offspringAddress, client)
        const lender_response = await queries.queryListingInfo(offspringAddress, lender_client)

        // Validation for active loan
        if(_.isEqual(lender_response, borrower_response)){
            if(borrower_response.listing_info.status !== 'active'){
                console.error("Listing is still awaiting loan.")
                return undefined
            }
        } else {
            console.error("Responses do not match!")
            return undefined
        }
        console.log("Listing is active!")
        return borrower_response
    } catch (e) {
        console.error(e.message)
        return undefined
    }
}

const queryMyOffsprings = async (type) => {
    try {
        if(type !== "borrower" || type !== "lender"){
            console.log("Incorrect argument value, need 'lender' or 'borrower'")
        }
        const client = await getClient(type)
        const myOffsprings = (await queries.listMyOffsprings(client)).list_my_offspring.active

        console.log(myOffsprings)
        return myOffsprings
    } catch (e) {
        console.error(e.message)
        return undefined
    }
}

export const queryNFTs = async (type) => {
    try {
        if(type !== 'borrower' && type !== 'lender'){
            console.log("Please provide an argument value (borrower or lender)")
            return
        }
        let client = await getClient(type)
        return await queries.queryInventory(client)
    } catch (e) {
        console.error(e.message)
        return undefined
    }

}

const queryActiveOffsprings = async () => {
    try {
        const activeOffsprings = (await queries.listActiveOffsprings()).list_active_offspring.active;
        return activeOffsprings
    } catch (e) {
        console.error(e.message)
        return []
    }
}

const queryInactiveOffsprings = async () => {
    try {
        const inactiveOffsprings = (await queries.listInactiveOffsprings()).list_inactive_offspring
        console.log(inactiveOffsprings)
        return inactiveOffsprings
    } catch (e) {
        console.error(e.message)
        return []
    }
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
        console.log(await queryActiveLoan(args[1]))
    } else if (args.length === 2 && args[0] === '--view-nfts') {
        console.log(await queryNFTs(args[1]))
    } else if (args.length === 1 && args[0] === '--get-balances') {
        console.log(await getBalances())
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