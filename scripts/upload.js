import fs from "fs"
import url from 'url'
import {getClient}  from "./helper.js"

const uploadContract = async (type) => {
    try {
        const client = await getClient('borrower')

        const tx = await client.tx.compute.storeCode(
            {
                sender: client.address,
                wasmByteCode: fs.readFileSync('contracts/' + type + '.wasm.gz'),
                source: "",
                builder: "",
            },
            {
                gasLimit: 5_000_000,
            },
        );

        const codeId = Number(
            tx.arrayLog.find((log) => log.type === "message" && log.key === "code_id")
                .value,
        );

        const codeHash = await client.query.compute.codeHash(codeId)

        fs.readFile("./config.json", 'utf8', function readFileCallback(err, data) {
            if (err) {
                console.log(err);
            } else {
                let obj = JSON.parse(data)
                obj[type].codeHash = codeHash
                obj[type].codeId = codeId
                fs.writeFile("./config.json", JSON.stringify(obj, null, 2), 'utf8', err => {
                    if (err) throw err;
                });
            }
        });

        console.log(
            "\n### Successfully Uploaded: '" + type + "' - Contract Details ###\n" +
            "Code ID: " + codeId +
            "\nCode Hash: " + codeHash + "\n"
        )

        return "success"

    } catch (e) {
        console.error(e.message)
    }
}

export const uploadAll = async (types) => {
    for(const x of types){
        let response = await uploadContract(x)
        if(response !== "success"){
            return false
        }
    }
    return true
}


const args = process.argv.slice(2);
if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    if(args.length === 0){
        console.log("No arguments provided, need --contract (snip24, snip721, offspring, factory, all)")
    } else if (args.length === 2 && args[0] === '--contract') {
        const types = ["snip24", "snip721", "offspring", "factory"]
        if (types.includes(args[1])) {
            uploadContract(args[1]).then(() => console.log("New contract details have been saved to config.json"))
        } else if (args[1] === "all"){
            uploadAll(types).then(() => console.log("New contract details have been saved to config.json"))
        } else {
            console.log("You did not supply a correct argument value! (snip24, snip721, offspring, factory, all)")
        }
    } else {
        console.log('Incorrect arguments provided, need --contract (snip24, snip721, offspring, factory, all)')
    }
}
