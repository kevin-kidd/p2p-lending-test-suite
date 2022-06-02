import dotenv from 'dotenv'
dotenv.config()
import { Wallet, SecretNetworkClient } from "secretjs";

export const getClient = async (type) => {
    try {
        let wallet;
        if(type === 'borrower'){
            wallet = new Wallet(process.env.BORROWER_MNEMONIC)
        } else {
            wallet = new Wallet(process.env.LENDER_MNEMONIC)
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