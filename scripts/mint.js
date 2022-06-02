import {getClient} from "./helper.js";
import fs from "fs"
import {MsgExecuteContract} from "secretjs";

const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)

const mint = async (amount) => {
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

    console.log(mints)

    const mint_args = new MsgExecuteContract(
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

    const sim = await client.tx.simulate([mint_args])

    const mintTx = await client.tx.broadcast([mint_args],
        {
            gasLimit: Math.ceil(sim.gasInfo.gasUsed * 1.1)
        }
    );
    if(mintTx.code !== 0){
        console.error("Mint transaction failed!")
        return
    }
    console.log("Successfully minted " + amount + " new NFTs!")
}

const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('No arguments provided, need --amount')
} else if (args.length === 2 && args[0] === '--amount') {
    await mint(args[1])
}