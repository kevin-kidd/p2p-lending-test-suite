import {broadcastTx} from "../scripts/helper.js";
import {MsgExecuteContract} from "secretjs";
import fs from "fs";
const file = fs.readFileSync('./config.json', 'utf8')
const config = JSON.parse(file)

const execute = async (client, transaction) => {
    return await broadcastTx(transaction, client)
}

export const execUpdateTax = async (client, rate) => {
    return await execute(client,
        new MsgExecuteContract(
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
    )
}

export const execChangeStatus = async (status, client) => {
    return await execute(client,
        new MsgExecuteContract(
            {
                sender: client.address,
                contractAddress: config.factory.address,
                codeHash: config.factory.codeHash,
                msg: {
                    set_status: {
                        stop: status
                    }
                }
            }
        )
    )
}

export const execUpdateOffspring = async (client) => {
    return await execute(client,
        new MsgExecuteContract(
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
    )
}

export const execLiquidate = async (client, offspringAddress) => {
    return await execute(client,
        new MsgExecuteContract(
            {
                sender: client.address,
                contractAddress: offspringAddress,
                codeHash: config.offspring.codeHash,
                msg: { liquidate: {} }
            }
        )
    )
}

export const execLend = async (offspringAddress, principal, client) => {
    return await execute(client,
        new MsgExecuteContract(
            {
                sender: client.address,
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
    )
}

export const execCancel = async (offspringAddress, client) => {
    return await execute(client,
        new MsgExecuteContract(
            {
                sender: client.address,
                contractAddress: offspringAddress,
                codeHash: config.offspring.codeHash, // optional but way faster
                msg: { cancel_listing: {} }
            }
        )
    )
}

export const execViewingKey = async (client) => {
    return await execute(client,
        new MsgExecuteContract({
            sender: client.address,
            contractAddress: config.factory.address,
            codeHash: config.factory.codeHash, // optional but way faster
            msg: {
                create_viewing_key: {
                    entropy: "eW8="
                }
            }
        })
    )
}

export const execCreateOffspring = async (tokens, expiration, principalAsked, client) => {
    return await execute(client,
        new MsgExecuteContract(
        {
            sender: client.address,
            contractAddress: config.snip721.address,
            codeHash: config.snip721.codeHash,
            msg: {
                batch_send_nft: {
                    sends: [
                        {
                            contract: config.factory.address,
                            token_ids: tokens,
                            receiver_info: {
                                recipient_code_hash: config.factory.codeHash,
                                also_implements_batch_receive_nft: true,
                            },
                            msg: Buffer.from(JSON.stringify({
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
                            )).toString('base64'),
                        }
                    ]
                }
            }
        })
    )
}

export const execRepayLoan = async (owed, client, offspringAddress) => {
    return await execute(client,
        new MsgExecuteContract(
            {
                sender: client.address,
                contractAddress: config.snip24.address,
                codeHash: config.snip24.codeHash,
                msg: {
                    send: {
                        recipient: offspringAddress,
                        amount: owed.toString(),
                        msg: Buffer.from(JSON.stringify({pay_all:{}})).toString('base64')
                    }
                },
            }
        )
    )
}