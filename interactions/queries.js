const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)
import {getQueryClient} from "../scripts/helper.js";
import fs from "fs";

const queryClient = await getQueryClient()

export const querySnipBalance = async (client) => {
    return await client.query.compute.queryContract({
        contractAddress: config.snip24.address,
        codeHash: config.snip24.codeHash,
        query: {
            balance: {
                key: config.snip24.viewing_key,
                address: client.address
            }
        }
    })
}

export const queryBalance = async (client) => {
    return await client.query.bank.balance({
        address: client.address,
        denom: "uscrt",
    })
}

export const queryConfig = async () => {
    return await queryClient.query.compute.queryContract({
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        query: { config_info: {} }
    })
}

export const queryListingInfo = async (offspringAddress, client) => {
    return await client.query.compute.queryContract({
        contractAddress: offspringAddress,
        codeHash: config.offspring.codeHash,
        query: {
            listing_info: {
                address: client.address,
                viewing_key: config.factory.viewing_key
            }
        }
    })
}

export const listMyOffsprings = async (client) => {
    return await client.query.compute.queryContract({
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        query: {
            list_my_offspring: {
                address: client.address,
                viewing_key: config.factory.viewing_key
            }
        }
    })
}

export const queryInventory = async (client) => {
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

export const listActiveOffsprings = async () => {
    return await queryClient.query.compute.queryContract({
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        query: { list_active_offspring: {} }
    })
}

export const listInactiveOffsprings = async () => {
    return await queryClient.query.compute.queryContract({
        contractAddress: config.factory.address,
        codeHash: config.factory.codeHash,
        query: { list_inactive_offspring: {} },
    })
}