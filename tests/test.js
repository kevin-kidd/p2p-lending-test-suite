import {testLiquidation} from "./liquidation.js"


const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("No arguments provided, use --help for instructions.")
} else if(args.length === 1 && args[0] === "--liquidation"){
    await testLiquidation()
} else {
    console.log("Incorrect arguments provided, use --help for instructions.")
}