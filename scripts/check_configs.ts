import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { CarbonSDK } from 'carbon-js-sdk'
import { NetworkConfigs } from 'carbon-js-sdk/lib/constant';
import * as fs from 'fs'

const cwd = process.cwd();
const myArgs = process.argv.slice(2);


interface ConfigJSON {
    network: CarbonSDK.Network;
    featured_markets: string[]
}

interface InvalidMarket {
    status: boolean
    entry?: string[]
}

interface DuplicateMarket {
    status: boolean;
    entry?: string[]
    numberOfDuplicates?: number
}

type OutcomeMap = { [key in CarbonSDK.Network]: boolean } // true = success, false = failure

const outcomeMap: OutcomeMap = {
    mainnet: true,
    testnet: true,
    devnet: true,
    localhost: true
};

//check for valid market entries (match market names in the api)
function checkValidMarkets(data: string[], markets: string[]): InvalidMarket {
    let invalidMarkets : string[] = []
    data.forEach(market => {
        if (!markets.includes(market)) {
            invalidMarkets.push(market)
        }
    })
    return invalidMarkets.length > 0 ? {
        status: true,
        entry: invalidMarkets
    } : {
        status: false
    }
}

//check for duplicate market entries
function checkDuplicateMarkets(data: string[]): DuplicateMarket {
    let numOfDuplicates: number = 0
    let duplicateMarkets: string[] = data.filter((market, index) => {
        if (data.indexOf(market) != index) {
            numOfDuplicates++
            return true
        }
    })
    return duplicateMarkets.length > 0 ? {
        status: true,
        entry: duplicateMarkets,
        numberOfDuplicates: numOfDuplicates
    } : {
        status: false
    }
}

async function main() {
    for (const net of myArgs) {
        let network : CarbonSDK.Network
        switch(net.toLowerCase()) {
            case "mainnet":
                network = CarbonSDK.Network.MainNet
                break;
            case "testnet":
                network = CarbonSDK.Network.TestNet
                break;
            case "devnet":
                network = CarbonSDK.Network.DevNet
                break;
            default:
                console.log("ERROR: Invalid network keyed")
                process.exit(1)
        }
        const dataString = fs.readFileSync(`${cwd}/configs/${network}.json`, "utf-8")

        let jsonData: ConfigJSON | null = null;
        try {
            jsonData = JSON.parse(dataString) as ConfigJSON;
            console.log(jsonData)
        } catch (err) {
            console.error(`ERROR: ${network}.json is not a valid JSON file.`)
            outcomeMap[network] = false
        }

        const networkConfig = NetworkConfigs[network]

        // const tmClient = GenericUtils.modifyTmClient(await Tendermint34Client.connect(networkConfig.tmRpcUrl))
        const tmClient = await Tendermint34Client.connect(networkConfig.tmRpcUrl)


        const sdk = new CarbonSDK({
            network,
            tmClient
        })

        if (jsonData) {
            // query all markets
            const allMarkets = await sdk.query.market.MarketAll({})
            const markets : string[] = []
            allMarkets.markets.forEach(market => {markets.push(market.name)})
            console.log(`markets in ${network}`, markets)

            //look for invalid market entries
            const hasInvalidMarkets = checkValidMarkets(jsonData.featured_markets, markets)
            if (hasInvalidMarkets.status && hasInvalidMarkets.entry) {
                let listOfInvalidMarkets: string = hasInvalidMarkets.entry.join(', ')
                console.error(`ERROR: ${network}.json has the following invalid market entries: ${listOfInvalidMarkets}. Please make sure to only input valid markets in ${network}`)
                outcomeMap[network] = false
            }

            //look for duplicate market entries
            const hasDuplicateMarkets = checkDuplicateMarkets(jsonData.featured_markets)
            if (hasDuplicateMarkets.status && hasDuplicateMarkets.entry) {
                let listOfDuplicates: string = hasDuplicateMarkets.entry.join(", ")
                console.error(`ERROR: ${network}.json has the following duplicated market entries: ${listOfDuplicates}. Please make sure to only input each market once in ${network}`)
                outcomeMap[network] = false
            }
        }
    }
    const outcomeArr = Object.values(outcomeMap);
    if (outcomeArr.includes(false)) {
        console.error("Error!");
        console.log("Please check the error message(s) above to correct the errors.");
        process.exit(1)
    } else {
        console.log("Success!")
        console.log(`Market configs has passed all checks!`);
    } 
}

main()
.catch(console.error)
.finally(() => process.exit(0))



