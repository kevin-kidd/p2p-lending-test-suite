import {uploadAll} from "./upload.js";
import {initAll} from "./init.js";
import {getBalances, queryConfigInfo} from "./query.js";

const deploy = async (updateContracts) => {

    // Upload new contracts and update config.json
    if(updateContracts){
        console.log("Uploading new contracts...")
        let uploadResponse = await uploadAll(["snip24", "snip721", "offspring", "factory"])
        if(uploadResponse) {
            console.log("New contracts uploaded and details saved to config.json\n")
        } else {
            console.error("Failed to upload new contracts!")
            return
        }
    }

    // Instantiate all contracts and update config.json
    console.log("Instantiating contracts and setting viewing keys...")
    let initResponse = await initAll(["snip24", "snip721", "factory"])
    if(initResponse){
        console.log("All contracts have been instantiated and details saved to config.json\n")
    } else {
        console.error("Instantiation failed.")
        return
    }

    // Grab SCRT & SNIP-24 balances of both the lender and borrower accounts
    console.log("Fetching balances...")
    let balances = await getBalances()
    if(balances === undefined){
        console.log("Unable to fetch balances....")
    } else {
        console.log(
            "\n#### BALANCES ####\n" +
            "Borrower SCRT: " + balances.borrower.scrt +
            "\nBorrower SNIP24: " + balances.borrower.snip +
            "\nLender SCRT: " + balances.lender.scrt +
            "\nLender SNIP24: " + balances.lender.snip +
            "\nTax SCRT: " + balances.tax.scrt +
            "\nTax SNIP24: " + balances.tax.snip + "\n"
        )
    }

    // Grab relevant config info for the factory contract
    console.log("Fetching config info...")
    await queryConfigInfo()

    console.log("Deployment successful.")
}


const args = process.argv.slice(2);
if (args.length === 0) {
    await deploy(false)
} else if(args.length === 1 && args[0] === "--update-contracts"){
    await deploy(true)
} else {
    console.error("Incorrect arguments provided!")
}