import fs from "fs";
import {getClient} from "./helper.js";
import _ from 'lodash'

const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)

const client = await getClient('borrower')

const queryConfigInfo = async () => {

    const response = await client.query.compute.queryContract({
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        query: { config_info: {} },
    })
    console.log(response)
    return response
}

const queryActiveLoan = async (offspringAddress) => {
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
            return
        }
        console.log(borrower_response)
    } else {
        console.log("Responses do not match!")
    }

    console.log(borrower_response)
    return borrower_response
}

const queryMyOffsprings = async () => {
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

const queryNFTs = async (type) => {
    if(type !== 'borrower' && type !== 'lender'){
        console.log("Please provide an argument value (borrower or lender)")
        return
    }
    let client = await getClient(type)
    const response = await client.query.compute.queryContract({
        contractAddress: config.snip721.address,
        codeHash: config.snip721.codeHash,
        query: {
            tokens: {
                owner: client.address,
                viewing_key: config.snip721.viewing_key
            }
        }
    })
    console.log(response)
    return response
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
if (args.length === 0) {
    console.log("No arguments provided.")
} else if(args.length === 1 && args[0] === '--active-offsprings') {
    queryActiveOffsprings()
} else if(args.length === 1 && args[0] === '--inactive-offsprings') {
    queryInactiveOffsprings()
} else if(args.length === 1 && args[0] === '--my-offsprings') {
    queryMyOffsprings()
} else if(args.length === 1 && args[0] === '--config-info') {
    queryConfigInfo()
} else if(args.length === 2 && args[0] === '--active-loan') {
    queryActiveLoan(args[1])
} else if(args.length === 2 && args[0] === '--view-nfts') {
    queryNFTs(args[1])
} else {
    console.log("Incorrect arguments provided.")
}