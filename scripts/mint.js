import {broadcastTx, getClient} from "./helper.js";
import fs from "fs"
import {MsgExecuteContract} from "secretjs";
import url from "url";

const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)

export const mint = async (amount) => {
    const client = await getClient('borrower')

    const { num_tokens } = await client.query.compute.queryContract({
        contractAddress: config.snip721.address,
        codeHash: config.snip721.codeHash, // optional but way faster
        query: { num_tokens: {} },
    })

    let mints = []

    for(let i = 0; i < amount; i++){
        mints.push({token_id: (i + num_tokens.count).toString()})
    }

    const mintTx = new MsgExecuteContract(
        {
        sender: client.address,
        contractAddress: config.snip721.address,
        codeHash: config.snip721.codeHash,
        msg: {
            batch_mint_nft: {
                mints: mints,
            }
        }
    })

    const response = await broadcastTx(mintTx, client)
    if(response.code !== 0){
        console.error("Failed to mint NFTs...")
        return undefined
    }

    console.log("Successfully minted " + amount + " new NFTs!")
    return mints
}

const args = process.argv.slice(2);

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    if (args.length === 0) {
        console.log('No arguments provided, need --amount')
    } else if (args.length === 2 && args[0] === '--amount') {
        await mint(args[1])
    } else {
        console.log('Incorrect arguments provided, need --amount')
    }
}