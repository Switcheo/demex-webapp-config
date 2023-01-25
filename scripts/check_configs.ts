import { CarbonSDK } from 'carbon-js-sdk';
import * as fs from 'fs';

const cwd = process.cwd();
const myArgs = process.argv.slice(2);

interface ConfigJSON {
  network: CarbonSDK.Network;
  featured_markets: string[];
  omitted_markets: string[];
}

interface InvalidMarket {
  status: boolean;
  entry?: string[];
}

interface DuplicateMarket {
  status: boolean;
  entry?: string[];
  numberOfDuplicates?: number;
}

type OutcomeMap = { [key in CarbonSDK.Network]: boolean }; // true = success, false = failure

const outcomeMap: OutcomeMap = {
  mainnet: true,
  testnet: true,
  devnet: true,
  localhost: true,
};

//check for valid market entries (match market names in the api)
function checkValidMarkets(data: string[], markets: string[]): InvalidMarket {
  let invalidMarkets : string[] = [];
  data.forEach(market => {
    if (!markets.includes(market)) {
      invalidMarkets.push(market);
    }
  });
  return invalidMarkets.length > 0 ? {
    status: true,
    entry: invalidMarkets,
  } : {
    status: false
  };
}

//check for duplicate market entries
function checkDuplicateMarkets(data: string[]): DuplicateMarket {
  let numOfDuplicates: number = 0;
  let duplicateMarkets: string[] = data.filter((market, index) => {
    if (data.indexOf(market) != index) {
      numOfDuplicates++;
      return true;
    }
  })
  return duplicateMarkets.length > 0 ? {
    status: true,
    entry: duplicateMarkets,
    numberOfDuplicates: numOfDuplicates
  } : {
    status: false
  };
}

function checkNotFeaturedMarkets(data: string[], featuredMarkets: string[]): InvalidMarket {
  // select only markets that are in featured_markets field
  const isFeaturedMarkets = data.filter((market: string) => featuredMarkets.includes(market))
  return isFeaturedMarkets.length > 0 ? {
    status: true,
    entry: isFeaturedMarkets,
  } : {
    status: false
  };
}

function getErrorMessage(
  status: 'invalid' | 'duplicated' | 'contains_featured',
  field: 'featured_markets' | 'omitted_markets',
  listOfMarkets: string[],
  network: CarbonSDK.Network,
) {
  const listOfMarketsStr: string = listOfMarkets.join(', ');
  switch (status) {
    case 'contains_featured':
      return `ERROR: the following omitted_markets entries are also included inside the featured_markets list: ${listOfMarketsStr}. Please remove these from this field under ${network}.json`;
    default:
      return `ERROR: ${network}.json has the following ${status} market entries: ${listOfMarkets} under ${field} field. Please make sure to only input ${status === 'invalid' ? 'valid' : 'each'} market${status === 'invalid' ? 's' : ''} in ${network}.json`;
  }
}

async function main() {
  for (const net of myArgs) {
    let network : CarbonSDK.Network;
    switch(net.toLowerCase()) {
      case "mainnet":
        network = CarbonSDK.Network.MainNet;
        break;
      case "testnet":
        network = CarbonSDK.Network.TestNet;
        break;
      case "devnet":
        network = CarbonSDK.Network.DevNet;
        break;
      default:
        console.log("ERROR: Invalid network keyed");
        process.exit(1);
    }
    const dataString = fs.readFileSync(`${cwd}/configs/${network}.json`, "utf-8");

    let jsonData: ConfigJSON | null = null;
    try {
      jsonData = JSON.parse(dataString) as ConfigJSON;
    } catch (err) {
      console.error(`ERROR: ${network}.json is not a valid JSON file.`);
      outcomeMap[network] = false;
    }

    const sdk = await CarbonSDK.instance({ network });

    if (jsonData) {
      // query all markets
      const allMarkets = await sdk.query.market.MarketAll({});
      const markets: string[] = allMarkets.markets.map(market => market.name);

      const featuredMarkets = jsonData.featured_markets ?? []
      const omittedMarkets = jsonData.omitted_markets ?? []

      // FEATURED_MARKETS FIELD
      // look for invalid market entries
      const hasInvalidFeaturedMarkets = checkValidMarkets(featuredMarkets, markets);
      if (hasInvalidFeaturedMarkets.status && hasInvalidFeaturedMarkets.entry) {
        const errorMsg = getErrorMessage('invalid', 'featured_markets', hasInvalidFeaturedMarkets.entry, network)
        console.error(errorMsg);
        outcomeMap[network] = false;
      }

      // look for duplicate market entries
      const hasDuplicateFeaturedMarkets = checkDuplicateMarkets(featuredMarkets);
      if (hasDuplicateFeaturedMarkets.status && hasDuplicateFeaturedMarkets.entry) {
        const errorMsg = getErrorMessage('duplicated', 'featured_markets', hasDuplicateFeaturedMarkets.entry, network)
        console.error(errorMsg);
        outcomeMap[network] = false;
      }

      // OMITTED_MARKETS FIELD
      // look for invalid market entries
      const hasInvalidOmittedMarkets = checkValidMarkets(omittedMarkets, markets);
      if (hasInvalidOmittedMarkets.status && hasInvalidOmittedMarkets.entry) {
        const errorMsg = getErrorMessage('invalid', 'omitted_markets', hasInvalidOmittedMarkets.entry, network)
        console.error(errorMsg);
        outcomeMap[network] = false;
      }

      // look for duplicate market entries
      const hasDuplicateOmittedMarkets = checkDuplicateMarkets(omittedMarkets);
      if (hasDuplicateOmittedMarkets.status && hasDuplicateOmittedMarkets.entry) {
        const errorMsg = getErrorMessage('duplicated', 'omitted_markets', hasDuplicateOmittedMarkets.entry, network)
        console.error(errorMsg);
        outcomeMap[network] = false;
      }

      // check that omitted markets are not included in featured markets list
      const hasFeaturedMarkets = checkNotFeaturedMarkets(omittedMarkets, featuredMarkets);
      if (hasFeaturedMarkets.status && hasFeaturedMarkets.entry) {
        const errorMsg = getErrorMessage('contains_featured', 'omitted_markets', hasFeaturedMarkets.entry, network)
        console.error(errorMsg);
        outcomeMap[network] = false;
      }
    }
  }
  const outcomeArr = Object.values(outcomeMap);
  if (outcomeArr.includes(false)) {
    console.error("Error!");
    console.log("Please check the error message(s) above to correct the errors.");
    process.exit(1);
  } else {
    console.log("Success!");
    console.log(`Market configs has passed all checks!`);
  }
}

main()
.catch(console.error)
.finally(() => process.exit(0));



