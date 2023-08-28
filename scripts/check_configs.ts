import { CarbonSDK } from 'carbon-js-sdk';
import * as fs from 'fs';
import Long from 'long';

const cwd = process.cwd();
const myArgs = process.argv.slice(2);

interface TotalSupplyItem {
  denom: string;
  amount: string;
}

interface ConfigJSON {
  network: CarbonSDK.Network;
  featured_markets: string[];
  blacklisted_markets: string[];
  blacklisted_pools: string[];
  blacklisted_tokens: string[];
  ibc_tokens_total_supply: TotalSupplyItem[]
  transfer_options: {
    [chainKey: string]: number
  },
  network_fees: {
    [denom: string]: number
  },
}

interface InvalidEntry {
  status: boolean;
  entry?: string[];
}

interface DuplicateEntry {
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

// check for valid entries (match data to the api query)
function checkValidEntries(data: string[], query: string[]): InvalidEntry {
  let invalidEntries: string[] = [];
  data.forEach(entry => {
    if (!query.includes(entry)) {
      invalidEntries.push(entry);
    }
  });
  return invalidEntries.length > 0 ? {
    status: true,
    entry: invalidEntries,
  } : {
    status: false
  };
}

// check for duplicate entries
function checkDuplicateEntries(data: string[]): DuplicateEntry {
  let numOfDuplicates: number = 0;
  let duplicateEntries: string[] = data.filter((entry, index) => {
    if (data.indexOf(entry) != index) {
      numOfDuplicates++;
      return true;
    }
  })
  return duplicateEntries.length > 0 ? {
    status: true,
    entry: duplicateEntries,
    numberOfDuplicates: numOfDuplicates
  } : {
    status: false
  };
}

// check for featured markets to ensure that it does not have blacklisted markets 
function checkBlacklistedMarkets(featuredMarkets: string[], blacklistedMarkets: string[]): InvalidEntry {
  let overlappingMarkets: string[] = [];
  featuredMarkets.forEach(market => {
    if (blacklistedMarkets.includes(market)) {
      overlappingMarkets.push(market);
    }
  });
  return overlappingMarkets.length > 0 ? {
    status: true,
    entry: overlappingMarkets,
  } : {
    status: false
  };
}

async function main() {
  for (const net of myArgs) {
    let network: CarbonSDK.Network;
    switch (net.toLowerCase()) {
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
      const allMarkets = await sdk.query.market.MarketAll({
        pagination: {
          limit: new Long(100000),
          offset: new Long(0),
          key: new Uint8Array(),
          countTotal: true,
          reverse: false,
        },
      });
      const markets: string[] = allMarkets.markets.map(market => market.name);

      // look for invalid market entries
      const hasInvalidMarkets = checkValidEntries(jsonData.featured_markets, markets);
      if (hasInvalidMarkets.status && hasInvalidMarkets.entry) {
        let listOfInvalidMarkets: string = hasInvalidMarkets.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid market entries: ${listOfInvalidMarkets}. Please make sure to only input valid markets in ${network}`);
        outcomeMap[network] = false;
      }

      const hasInvalidBlacklistedMarkets = checkValidEntries(jsonData.blacklisted_markets, markets);
      if (hasInvalidBlacklistedMarkets.status && hasInvalidBlacklistedMarkets.entry) {
        let listOfInvalidMarkets: string = hasInvalidBlacklistedMarkets.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid blacklisted market entries: ${listOfInvalidMarkets}. Please make sure to only input valid markets in ${network}`);
        outcomeMap[network] = false;
      }

      // look for duplicate market entries
      const hasDuplicateMarkets = checkDuplicateEntries(jsonData.featured_markets);
      if (hasDuplicateMarkets.status && hasDuplicateMarkets.entry) {
        let listOfDuplicates: string = hasDuplicateMarkets.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated market entries: ${listOfDuplicates}. Please make sure to only input each market once in ${network}`);
        outcomeMap[network] = false;
      }

      const hasDuplicateBlacklistedMarkets = checkDuplicateEntries(jsonData.blacklisted_markets);
      if (hasDuplicateBlacklistedMarkets.status && hasDuplicateBlacklistedMarkets.entry) {
        let listOfDuplicates: string = hasDuplicateBlacklistedMarkets.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated blacklisted market entries: ${listOfDuplicates}. Please make sure to only input each market once in ${network}`);
        outcomeMap[network] = false;
      }

      // check that market names in blacklisted_markets is not found inside featured_markets
      const hasBlacklistedMarkets = checkBlacklistedMarkets(jsonData.featured_markets, jsonData.blacklisted_markets);
      if (hasBlacklistedMarkets.status && hasBlacklistedMarkets.entry) {
        let listOfBlacklistedMarkets: string = hasBlacklistedMarkets.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following blacklisted market entries in featured markets entries: ${listOfBlacklistedMarkets}. Please make sure that blacklisted markets are not found in featured markets in ${network}`);
        outcomeMap[network] = false;
      }

      // query all liquidity pools
      const allPools = await sdk.query.liquiditypool.PoolAll({
        pagination: {
          limit: new Long(100000),
          offset: new Long(0),
          key: new Uint8Array(),
          countTotal: true,
          reverse: false,
        }
      });
      const pools: string[] = allPools.pools.map(pool => pool.pool?.id.toString() ?? "");

      const hasInvalidPools = checkValidEntries(jsonData.blacklisted_pools, pools);
      if (hasInvalidPools.status && hasInvalidPools.entry) {
        let listOfInvalidPools: string = hasInvalidPools.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid pool id entries: ${listOfInvalidPools}. Please make sure to only input valid pool id in ${network}`);
        outcomeMap[network] = false;
      }

      const hasDuplicatePools = checkDuplicateEntries(jsonData.blacklisted_pools);
      if (hasDuplicatePools.status && hasDuplicatePools.entry) {
        let listOfDuplicates: string = hasDuplicatePools.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated pool id entries: ${listOfDuplicates}. Please make sure to input each pool id only once in ${network}`);
        outcomeMap[network] = false;
      }

      // query all tokens
      const allTokens = await sdk.query.coin.TokenAll({
        pagination: {
          limit: new Long(100000),
          offset: new Long(0),
          key: new Uint8Array(),
          countTotal: true,
          reverse: false,
        }
      });
      const tokens: string[] = allTokens.tokens.map(token => token.denom);

      const hasInvalidTokens = checkValidEntries(jsonData.blacklisted_tokens, tokens);
      if (hasInvalidTokens.status && hasInvalidTokens.entry) {
        let listOfInvalidTokens: string = hasInvalidTokens.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid token denom entries: ${listOfInvalidTokens}. Please make sure to only input valid token denom in ${network}`);
        outcomeMap[network] = false;
      }

      const hasDuplicateTokens = checkDuplicateEntries(jsonData.blacklisted_tokens);
      if (hasDuplicateTokens.status && hasDuplicateTokens.entry) {
        let listOfDuplicates: string = hasDuplicateTokens.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated token denom entries: ${listOfDuplicates}. Please make sure to input each token denom only once in ${network}`);
        outcomeMap[network] = false;
      }

      // IBC total supply map checks
      const feeTokens = await sdk.query.fee.MinGasPriceAll({
        pagination: {
          limit: new Long(100000),
          offset: new Long(0),
          key: new Uint8Array(),
          countTotal: true,
          reverse: false,
        }
      });
      const feeTokensArr: string[] = feeTokens.minGasPrices.map(gasPrice => gasPrice.denom);
      const denomsArr = jsonData.ibc_tokens_total_supply.map((totalSupply: TotalSupplyItem) => totalSupply.denom);
      const hasInvalidIbcFeeTokens = checkValidEntries(denomsArr, feeTokensArr);
      if (hasInvalidIbcFeeTokens.status && hasInvalidIbcFeeTokens.entry) {
        let listOfInvalidIbcTokens: string = hasInvalidIbcFeeTokens.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid fee token denom entries under ibc_tokens_total_supply field: ${listOfInvalidIbcTokens}. Please make sure to only input valid fee token denom in ${network}`);
        outcomeMap[network] = false;
      }

      const hasDuplicateIbcFeeTokens = checkDuplicateEntries(denomsArr);
      if (hasDuplicateIbcFeeTokens.status && hasDuplicateIbcFeeTokens.entry) {
        let listOfIbcFeeDuplicates: string = hasDuplicateIbcFeeTokens.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated fee token denom entries under ibc_tokens_total_supply field: ${listOfIbcFeeDuplicates}. Please make sure to input each fee token denom only once in ${network}`);
        outcomeMap[network] = false;
      }

      // Checking transfer options
      const transferOptionsArr = Object.keys(jsonData.transfer_options)
      const bridgesQuery = await sdk.query.coin.BridgeAll({
        pagination: {
          key: new Uint8Array(),
          limit: new Long(10000),
          offset: Long.UZERO,
          countTotal: true,
          reverse: false,
        },
      })
      const bridges = bridgesQuery.bridges
      const validTransferOptionChains = bridges.map(bridge => bridge.chainName)
      validTransferOptionChains.push('Carbon')

      const hasInvalidChains = checkValidEntries(transferOptionsArr, validTransferOptionChains);
      if (hasInvalidChains.status && hasInvalidChains.entry) {
        let listOfInvalidChains: string = hasInvalidChains.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following chain name entries under transfer_options field: ${listOfInvalidChains}. Please make sure to only input valid chain names in ${network}`);
        outcomeMap[network] = false;
      }

      // Checking network fees
      const networkFeeDenomOptions = Object.keys(jsonData.network_fees)
      const gasPricesQuery = await sdk.query.fee.MinGasPriceAll({
        pagination: {
          limit: new Long(10000),
          offset: new Long(0),
          key: new Uint8Array(),
          countTotal: true,
          reverse: false,
        },
      })

      const minGasPrices = gasPricesQuery.minGasPrices
      const validNetworkFeeDenoms = minGasPrices.map(gasPrice => gasPrice.denom)

      const hasInvalidFeeDenoms = checkValidEntries(networkFeeDenomOptions, validNetworkFeeDenoms);
      if (hasInvalidFeeDenoms.status && hasInvalidFeeDenoms.entry) {
        let listOfInvalidFeeDenoms: string = hasInvalidFeeDenoms.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following network fee token denoms under network_fees field: ${listOfInvalidFeeDenoms}. Please make sure to only input valid network fee token denoms in ${network}`);
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
    console.log(`Configs has passed all checks!`);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
