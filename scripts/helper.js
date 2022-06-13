import dotenv from 'dotenv'
dotenv.config()
import { Wallet, SecretNetworkClient } from "secretjs";

export const getClient = async (type) => {
    try {
        let wallet;
        if(type === 'borrower'){
            wallet = new Wallet(process.env.BORROWER_MNEMONIC)
        } else if(type === 'lender'){
            wallet = new Wallet(process.env.LENDER_MNEMONIC)
        } else {
            wallet = new Wallet(process.env.TAX_MNEMONIC)
        }
        const address = wallet.address
        return await SecretNetworkClient.create({
            grpcWebUrl: process.env.GRPC_URL,
            chainId: process.env.CHAIN_ID,
            wallet: wallet,
            walletAddress: address,
        })
    } catch (e) {
        console.error(e.message)
    }
}

export const trueBalance = (balance) => {
    return balance / 1e6
}

export const calculateGas = async (transaction, client) => {
    try {
        const sim = await client.tx.simulate([transaction])
        return Math.ceil(sim.gasInfo.gasUsed * 1.1)
    } catch (e) {
        console.log(e.message)
        console.error("\nUnable to calculate gas for the transaction.")
    }
}

export const broadcastTx = async (transaction, client) => {
    try{
        const tx = await client.tx.broadcast([transaction],
            {
                gasLimit: await calculateGas(transaction, client)
            }
        )
        if(tx.code !== 0){
            console.log(transaction)
            return "Transaction failed!"
        }
        return tx
    } catch (e) {
        console.log(e.message)
        console.error("\nError broadcasting transaction.")
    }
}