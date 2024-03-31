import { CarbonSDK } from 'carbon-js-sdk';
import * as fs from 'fs';
import Long from 'long';

const cwd = process.cwd();
const myArgs = process.argv.slice(2);

interface ConfigJSON {
  network: CarbonSDK.Network;
  prelaunch_markets: string[];
  blacklisted_markets: string[];
  blacklisted_pools: string[];
  blacklisted_tokens: string[];
  transfer_options: {
    [chainKey: string]: number
  },
  network_fees: {
    [denom: string]: number
  },
  perp_pool_banners: PerpPoolBanner[]
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

interface PerpPoolBanner {
  perp_pool_id: string;
  show_from?: string;
  show_until?: string;
  title: string;
  removed_markets?: string;
  added_markets?: string;
  subtext?: string;
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

// check list of markets to ensure that it does not have blacklisted markets 
function checkBlacklistedMarkets(marketData: string[], blacklistedMarkets: string[]): InvalidEntry {
  let overlappingMarkets: string[] = [];
  marketData.forEach(market => {
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
      const hasInvalidPrelaunchMarkets = checkValidEntries(jsonData.prelaunch_markets, markets);
      if (hasInvalidPrelaunchMarkets.status && hasInvalidPrelaunchMarkets.entry) {
        let listOfInvalidMarkets: string = hasInvalidPrelaunchMarkets.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid pre-launch market entries: ${listOfInvalidMarkets}. Please make sure to only input valid markets in ${network}`);
        outcomeMap[network] = false;
      }

      const hasInvalidBlacklistedMarkets = checkValidEntries(jsonData.blacklisted_markets, markets);
      if (hasInvalidBlacklistedMarkets.status && hasInvalidBlacklistedMarkets.entry) {
        let listOfInvalidMarkets: string = hasInvalidBlacklistedMarkets.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid blacklisted market entries: ${listOfInvalidMarkets}. Please make sure to only input valid markets in ${network}`);
        outcomeMap[network] = false;
      }

      // look for duplicate market entries
      const hasDuplicatePrelaunchMarkets = checkDuplicateEntries(jsonData.prelaunch_markets);
      if (hasDuplicatePrelaunchMarkets.status && hasDuplicatePrelaunchMarkets.entry) {
        let listOfDuplicates: string = hasDuplicatePrelaunchMarkets.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated pre-launch market entries: ${listOfDuplicates}. Please make sure to only input each market once in ${network}`);
        outcomeMap[network] = false;
      }

      const hasDuplicateBlacklistedMarkets = checkDuplicateEntries(jsonData.blacklisted_markets);
      if (hasDuplicateBlacklistedMarkets.status && hasDuplicateBlacklistedMarkets.entry) {
        let listOfDuplicates: string = hasDuplicateBlacklistedMarkets.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated blacklisted market entries: ${listOfDuplicates}. Please make sure to only input each market once in ${network}`);
        outcomeMap[network] = false;
      }

      // check that market names in blacklisted_markets is not found inside prelaunch_markets
      const hasBlacklistedMarketsInPrelaunch = checkBlacklistedMarkets(jsonData.prelaunch_markets, jsonData.blacklisted_markets);
      if (hasBlacklistedMarketsInPrelaunch.status && hasBlacklistedMarketsInPrelaunch.entry) {
        let listOfBlacklistedMarkets: string = hasBlacklistedMarketsInPrelaunch.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following blacklisted market entries in pre-launch markets entries: ${listOfBlacklistedMarkets}. Please make sure that blacklisted markets are not found in pre-launch markets in ${network}`);
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

      // Checking perp pool banners
      const perpPoolsQuery = await sdk.query.perpspool.PoolInfoAll({
        pagination: {
          key: new Uint8Array(),
          limit: new Long(10000),
          offset: Long.UZERO,
          countTotal: true,
          reverse: false,
        },
      })

      const perpPoolIds = perpPoolsQuery.pools.map((pool) => pool.poolId.toString())
      const perpPoolBannerIds = Object.values(jsonData.perp_pool_banners).map((banner) => banner.perp_pool_id)

      const hasInvalidPerpPoolIds = checkValidEntries(perpPoolBannerIds, perpPoolIds)
      const hasDuplicatePerpPoolIds = checkDuplicateEntries(perpPoolBannerIds)

      if(hasInvalidPerpPoolIds.status && hasInvalidPerpPoolIds.entry) {
        let listOfInvalidIds: string = hasInvalidPerpPoolIds.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following invalid perp pool ids under the perp_pool_banners field: ${listOfInvalidIds}`)
        outcomeMap[network] = false;
      }

      if (hasDuplicatePerpPoolIds.status && hasDuplicatePerpPoolIds.entry) {
        let listOfDuplicates: string = hasDuplicatePerpPoolIds.entry.join(", ");
        console.error(`ERROR: ${network}.json has duplicated perp pool banners for the following perp pool ids: ${listOfDuplicates}. Please make sure to input each perp pool banner only once in ${network}`);
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
