import { BlockchainUtils, CarbonSDK } from "carbon-js-sdk";
import { PageRequest } from "carbon-js-sdk/lib/codec/cosmos/base/query/v1beta1/pagination";
import * as fs from "fs";
import Long from "long";

const cwd = process.cwd();
const myArgs = process.argv.slice(2);

interface ConfigJSON {
  network: CarbonSDK.Network;
  prelaunch_markets: string[];
  blacklisted_markets: string[];
  blacklisted_pools: string[];
  blacklisted_tokens: string[];
  transfer_options: {
    [chainKey: string]: number;
  };
  network_fees: {
    [denom: string]: number;
  };
  perp_pool_banners: PerpPoolBanner[];
  demex_points_config: DemexPointsConfig;
  perp_pool_promo: {
    [perpPoolId: string]: PerpPoolPromo;
  };
  cross_selling_source_tokens: string[];
  external_chain_channels: ExternalChannelsObj;
  additional_ibc_token_config: AdditionalIbcTokenConfigItem[];
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

interface DemexPointsConfig {
  depositsPerSpin: number;
  tradingVolumePerSpin: number;
}

interface PerpPoolPromo {
  start: string;
  end: string;
  perpPoolDepositBoost: string;
  perpTradingBoost: string;
}

type ChainToChannelMap = Record<string, string>;
type ExternalChannelsObj = Record<string, ChainToChannelMap>;

type ChainRoutes = [string, ...string[]];

interface AdditionalIbcTokenConfigItem {
  baseDenom: string;
  chainRoutes: ChainRoutes; // i.e. should have at least 1 item
  denomOnCarbon?: string;
}

type OutcomeMap = { [key in CarbonSDK.Network]: boolean }; // true = success, false = failure

const outcomeMap: OutcomeMap = {
  mainnet: true,
  testnet: true,
  devnet: true,
  localhost: true,
};

const channelRegex = /^channel-([\d]+)$/;

// check for valid entries (match data to the api query)
function checkValidEntries(data: string[], query: string[]): InvalidEntry {
  const invalidEntries: string[] = [];
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

function checkValuesAgainstRegex(data: string[], regex: RegExp): InvalidEntry {
  const invalidValues: string[] = data.reduce((prev: string[], dataItem: string) => {
    if (regex.test(dataItem)) return prev;
    prev.push(dataItem);
    return prev;
  }, []);
  return { status: invalidValues.length > 0 };
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

function isValidExternalChainChannels(chainChannels: ExternalChannelsObj, bridges: string[], network: CarbonSDK.Network): boolean {
  const duplicateChainKeys: string[] = [];
  const invalidChainKeys: string[] = [];
  const invalidChannelRegexValues: string[] = [];
  Object.entries(chainChannels).forEach(([chain, channelMap]: [string, ChainToChannelMap]) => {
    const chainsArr = Object.keys(channelMap).concat([chain]);
    const duplicateCheckOutcome = checkDuplicateEntries(chainsArr);
    if (duplicateCheckOutcome.status) duplicateChainKeys.push(chain);

    const invalidCheckOutcome = checkValidEntries(chainsArr, bridges);
    if (invalidCheckOutcome.status) invalidChainKeys.push(chain);

    const channelsArr = Object.values(channelMap);
    const invalidRegexValuesOutcome = checkValuesAgainstRegex(channelsArr, channelRegex);
    if (invalidRegexValuesOutcome.status) invalidChannelRegexValues.push(chain);
  });

  if (duplicateChainKeys.length > 0) {
    const duplicateChainsStr = duplicateChainKeys.length > 1 ? `${duplicateChainKeys.slice(0, -1).join(", ")} and ${duplicateChainKeys[duplicateChainKeys.length - 1]}` : duplicateChainKeys[0];
    console.error(`[ERROR] external_chain_channels of ${network}.json has duplicate chains in the ${duplicateChainsStr} object(s). Please make sure to input each chain only once in each object.`);
    return false;
  }
  if (invalidChainKeys.length > 0) {
    const invalidChainsStr = invalidChainKeys.length > 1 ? `${invalidChainKeys.slice(0, -1).join(", ")} and ${invalidChainKeys[invalidChainKeys.length - 1]}` : invalidChainKeys[0];
    console.error(`[ERROR] external_chain_channels of ${network}.json has invalid chains in the ${invalidChainsStr} object(s). Please make sure to input only IBC chains in each object.`);
    return false;
  }
  if (invalidChannelRegexValues.length > 0) {
    const invalidChannelIdStr = invalidChannelRegexValues.length > 1 ? `${invalidChannelRegexValues.slice(0, -1).join(", ")} and ${invalidChannelRegexValues[invalidChannelRegexValues.length - 1]}` : invalidChannelRegexValues[0];
    console.error(`[ERROR] external_chain_channels of ${network}.json has invalid channel ids in the ${invalidChannelIdStr} object(s). Please make sure to input valid IBC channel ids in each object.`);
    return false;
  }
  return true;
}

function isValidAdditionalIbcTokenConfig(addTokenConfigArr: AdditionalIbcTokenConfigItem[], bridges: string[], tokenDenoms: string[], network: CarbonSDK.Network): boolean {
  const invalidChainIndexes: number[] = [];
  const invalidDenomIndexes: number[] = [];
  addTokenConfigArr.forEach((configItem: AdditionalIbcTokenConfigItem, index: number) => {
    const invalidChainsOutcome = checkValidEntries(configItem.chainRoutes, bridges);
    if (invalidChainsOutcome.status) invalidChainIndexes.push(index);

    if (configItem.denomOnCarbon) {
      const invalidTokensOutcome = checkValidEntries([configItem.denomOnCarbon], tokenDenoms);
      if (invalidTokensOutcome.status) invalidDenomIndexes.push(index);
    }
  });

  if (invalidChainIndexes.length > 0) {
    const invalidChainsStr = invalidChainIndexes.length > 1 ? `${invalidChainIndexes.slice(0, -1).join(", ")} and ${invalidChainIndexes[invalidChainIndexes.length - 1]}` : invalidChainIndexes[0].toString(10);
    console.error(`[ERROR] additional_ibc_token_config of ${network}.json has invalid chains in the objects at index position(s) ${invalidChainsStr}. Please make sure to input only IBC chains in each object.`);
    return false;
  }
  if (invalidDenomIndexes.length > 0) {
    const invalidDenomsStr = invalidDenomIndexes.length > 1 ? `${invalidDenomIndexes.slice(0, -1).join(", ")} and ${invalidDenomIndexes[invalidDenomIndexes.length - 1]}` : invalidDenomIndexes[0].toString(10);
    console.error(`[ERROR] additional_ibc_token_config of ${network}.json has invalid denomInCarbon values in the objects at index position(s) ${invalidDenomsStr}. Please make sure to input valid token denoms in each object.`);
    return false;
  }
  return true;
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
        pagination: PageRequest.fromPartial({
          limit: new Long(100000),
        }),
      });
      const markets: string[] = allMarkets.markets.map(market => market.id);

      // look for invalid market entries
      const hasInvalidPrelaunchMarkets = checkValidEntries(jsonData.prelaunch_markets, markets);
      if (hasInvalidPrelaunchMarkets.status && hasInvalidPrelaunchMarkets.entry) {
        let listOfInvalidMarkets: string = hasInvalidPrelaunchMarkets.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following invalid pre-launch market entries: ${listOfInvalidMarkets}. Please make sure to only input valid markets in ${network}`);
        outcomeMap[network] = false;
      }

      const hasInvalidBlacklistedMarkets = checkValidEntries(jsonData.blacklisted_markets, markets);
      if (hasInvalidBlacklistedMarkets.status && hasInvalidBlacklistedMarkets.entry) {
        let listOfInvalidMarkets: string = hasInvalidBlacklistedMarkets.entry.join(", ");
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
        pagination: PageRequest.fromPartial({
          limit: new Long(100000),
        }),
      });
      const pools: string[] = allPools.pools.map(pool => pool.pool?.id.toString() ?? "");

      const hasInvalidPools = checkValidEntries(jsonData.blacklisted_pools, pools);
      if (hasInvalidPools.status && hasInvalidPools.entry) {
        let listOfInvalidPools: string = hasInvalidPools.entry.join(", ");
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
        pagination: PageRequest.fromPartial({
          limit: new Long(100000),
        }),
      });
      const tokens: string[] = allTokens.tokens.map(token => token.denom);

      const hasInvalidBlacklistedTokens = checkValidEntries(jsonData.blacklisted_tokens, tokens);
      if (hasInvalidBlacklistedTokens.status && hasInvalidBlacklistedTokens.entry) {
        let listOfInvalidTokens: string = hasInvalidBlacklistedTokens.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid blacklisted token denom entries: ${listOfInvalidTokens}. Please make sure to only input valid token denom in ${network}`);
        outcomeMap[network] = false;
      }

      const hasDuplicateBlacklistedTokens = checkDuplicateEntries(jsonData.blacklisted_tokens);
      if (hasDuplicateBlacklistedTokens.status && hasDuplicateBlacklistedTokens.entry) {
        let listOfDuplicates: string = hasDuplicateBlacklistedTokens.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated blacklisted token denom entries: ${listOfDuplicates}. Please make sure to input each token denom only once in ${network}`);
        outcomeMap[network] = false;
      }

      const hasInvalidCrossSellingTokens = checkValidEntries(jsonData.cross_selling_source_tokens, tokens);
      if (hasInvalidCrossSellingTokens.status && hasInvalidCrossSellingTokens.entry) {
        let listOfInvalidTokens: string = hasInvalidCrossSellingTokens.entry.join(', ');
        console.error(`ERROR: ${network}.json has the following invalid cross selling source token denom entries: ${listOfInvalidTokens}. Please make sure to only input valid token denom in ${network}`);
        outcomeMap[network] = false;
      }

      const hasDuplicateCrossSellingTokens = checkDuplicateEntries(jsonData.cross_selling_source_tokens);
      if (hasDuplicateCrossSellingTokens.status && hasDuplicateCrossSellingTokens.entry) {
        let listOfDuplicates: string = hasDuplicateCrossSellingTokens.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following duplicated cross selling source token denom entries: ${listOfDuplicates}. Please make sure to input each token denom only once in ${network}`);
        outcomeMap[network] = false;
      }

      // Checking transfer options
      const transferOptionsArr = Object.keys(jsonData.transfer_options)
      const ibcBridgeNames = sdk.token.getIbcBlockchainNames();
      if (!ibcBridgeNames.includes("Carbon")) ibcBridgeNames.push("Carbon");
      const validTransferOptionChains = sdk.token.getPolynetworkBlockchainNames().concat(ibcBridgeNames);

      const hasInvalidChains = checkValidEntries(transferOptionsArr, validTransferOptionChains);
      if (hasInvalidChains.status && hasInvalidChains.entry) {
        let listOfInvalidChains: string = hasInvalidChains.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following chain name entries under transfer_options field: ${listOfInvalidChains}. Please make sure to only input valid chain names in ${network}`);
        outcomeMap[network] = false;
      }

      // Checking network fees
      const networkFeeDenomOptions = Object.keys(jsonData.network_fees)
      const gasPricesQuery = await sdk.query.fee.MinGasPriceAll({
        pagination: PageRequest.fromPartial({
          limit: new Long(10000),
        }),
      })

      const minGasPrices = gasPricesQuery.minGasPrices
      const validNetworkFeeDenoms = minGasPrices.map(gasPrice => gasPrice.denom)

      const hasInvalidFeeDenoms = checkValidEntries(networkFeeDenomOptions, validNetworkFeeDenoms);
      if (hasInvalidFeeDenoms.status && hasInvalidFeeDenoms.entry) {
        let listOfInvalidFeeDenoms: string = hasInvalidFeeDenoms.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following network fee token denoms under network_fees field: ${listOfInvalidFeeDenoms}. Please make sure to only input valid network fee token denoms in ${network}`);
        outcomeMap[network] = false;
      }

      // Checking perp pool banners
      const perpPoolsQuery = await sdk.query.perpspool.PoolInfoAll({
        pagination: PageRequest.fromPartial({
          limit: new Long(10000),
        }),
      })

      const perpPoolIds = perpPoolsQuery.pools.map((pool) => pool.poolId.toString())
      const perpPoolBannerIds = Object.values(jsonData.perp_pool_banners).map((banner) => banner.perp_pool_id)

      const hasInvalidPerpPoolBannerIds = checkValidEntries(perpPoolBannerIds, perpPoolIds)
      const hasDuplicatePerpPoolBannerIds = checkDuplicateEntries(perpPoolBannerIds)

      if (hasInvalidPerpPoolBannerIds.status && hasInvalidPerpPoolBannerIds.entry) {
        let listOfInvalidIds: string = hasInvalidPerpPoolBannerIds.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following invalid perp pool ids under the perp_pool_banners field: ${listOfInvalidIds}`)
        outcomeMap[network] = false;
      }

      if (hasDuplicatePerpPoolBannerIds.status && hasDuplicatePerpPoolBannerIds.entry) {
        let listOfDuplicates: string = hasDuplicatePerpPoolBannerIds.entry.join(", ");
        console.error(`ERROR: ${network}.json has duplicated perp pool banners for the following perp pool ids: ${listOfDuplicates}. Please make sure to input each perp pool banner only once in ${network}`);
        outcomeMap[network] = false;
      }

      if (network === CarbonSDK.Network.MainNet && !jsonData.demex_points_config) {
        console.error(`ERROR: ${network}.json is missing demex_points_config`)
        outcomeMap[network] = false;
      }

      if (jsonData.perp_pool_promo) {
        const perpPoolPromo = jsonData.perp_pool_promo

        const perpPoolPromoIds = Object.keys(perpPoolPromo)
        const hasInvalidPerpPoolPromoIds = checkValidEntries(perpPoolPromoIds, perpPoolIds)
        const hasDuplicatePerpPoolPromoIds = checkDuplicateEntries(perpPoolPromoIds)

        // check for valid perp pool id
        if (hasInvalidPerpPoolPromoIds.status && hasInvalidPerpPoolPromoIds.entry) {
          let listOfInvalidIds: string = hasInvalidPerpPoolPromoIds.entry.join(", ");
          console.error(`ERROR: ${network}.json has the following invalid perp pool ids under the perp_pool_promo field: ${listOfInvalidIds}`)
          outcomeMap[network] = false;
        }

        // check for duplicated perp pool id
        if (hasDuplicatePerpPoolPromoIds.status && hasDuplicatePerpPoolPromoIds.entry) {
          let listOfDuplicates: string = hasDuplicatePerpPoolPromoIds.entry.join(", ");
          console.error(`ERROR: ${network}.json has duplicated perp pool promos for the following perp pool ids: ${listOfDuplicates}. Please make sure to input each perp pool promo only once in ${network}`);
          outcomeMap[network] = false;
        }

        for (const promoId in perpPoolPromo) {
          const promoInfo = perpPoolPromo[promoId];
          const startTimeStr = promoInfo.start;
          const endTimeStr = promoInfo.end;

          // Parse start and end times into Date objects
          const startTime = new Date(startTimeStr);
          const endTime = new Date(endTimeStr);

          // Check if end time is before start time
          if (endTime < startTime) {
            console.error(`ERROR: ${network}.json has invalid end time (${endTimeStr}) is before start time (${startTimeStr}) for perp_pool_promo id ${promoId}.`);
            outcomeMap[network] = false;
            break; // Exit the loop early upon encountering an error
          }
        }
      }

      const isExternalChannelsValid = isValidExternalChainChannels(jsonData.external_chain_channels, ibcBridgeNames, network);
      if (!isExternalChannelsValid) outcomeMap[network] = false;

      const isAdditionalTokensConfigValid = isValidAdditionalIbcTokenConfig(jsonData.additional_ibc_token_config, ibcBridgeNames, tokens, network);
      if (!isAdditionalTokensConfigValid) outcomeMap[network] = false;
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
