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
  transfer_disabled_tokens: TransferDisabledTokensObj;
  token_name_override_map: TokenNameOverrideMap;
  transfer_options: {
    [chainKey: string]: number;
  };
  network_fees: {
    [denom: string]: number;
  };
  demex_points_config: DemexPointsConfig;
  perp_pool_promo: {
    [perpPoolId: string]: PerpPoolPromo;
  };
  cross_selling_source_tokens: string[];
  typeform_widget_config: TypeFormWidgetConfig[];
  external_chain_channels: ExternalChannelsObj;
  additional_ibc_token_config: AdditionalIbcTokenConfigItem[];
  demex_trading_league_config?: DemexTradingLeagueConfig;
  perp_pools: PerpPoolConfig;
  wswth_contract?: string;
  market_banners?: MarketBanner[];
  market_promo?: {[marketId: string]: MarketPromo};
  spot_pool_config?: SpotPoolConfig;
  transfer_banner?: TransferBanner;
  quick_select_deposit_options?: QuickSelectToken[];
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
  action_trigger_date?: string;
  past_tense_text?: string;
  subtext?: string;
}

interface TransferDisabledTokensObj {
  deposit: string[];
  withdraw: string[];
}

type TokenNameOverrideMap = {
  [denom: string]: string;
}

interface DemexPointsConfig {
  depositsPerSpin: number;
  tradingVolumePerSpin: number;
}

interface DemexTradingLeagueConfig {
  promoMarkets: string[];
  currentPrizeSymbol: string;
  currentCompPerpPoolId: number;
}

interface PerpPoolPromo {
  start: string;
  end: string;
  perpPoolDepositBoost: string;
  perpTradingBoost: string;
}

interface TypeFormWidgetConfig {
  surveyLink: string
  endTime: string
  pages: string[]
}

type ChainToChannelMap = Record<string, string>;
type ExternalChannelsObj = Record<string, ChainToChannelMap>;

type ChainRoutes = [string, ...string[]];

interface AdditionalIbcTokenConfigItem {
  baseDenom: string;
  chainRoutes: ChainRoutes; // i.e. should have at least 1 item
  denomOnCarbon?: string;
}

interface Incentives {
  proxy?: string,
  distributors?: string[]
  wswth_contract?: string,
}

interface PerpPoolConfig {
  incentives: Incentives
  banners: PerpPoolBanner[]
}

interface MarketBanner {
  market_id: string;
  show_from?: string;
  show_until?: string;
  content: string;
  hideable?: boolean;
}

interface MarketPromo {
  start: string;
  end: string;
  tooltip?: string;
}

interface SpotPoolConfig {
  show_apr_tooltip: boolean;
}

interface TransferBanner {
  no_longer_supported_tokens: [],
  temporary_disabled_transfer_tokens: {
    [denom: string]: {
      start: string,
      end: string
    }
  },
  temporary_disabled_bridges: {
    [bridgeAddress: string]: {
      start: string,
      end: string
    }
  }
}

interface QuickSelectToken {
  label_denom: string;
  target_denom: string;
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

function checkAddressIsEVM(address: string): Boolean {
  const regex = /^0x[a-fA-F0-9]{40}$/
  return regex.test(address)
}

function isErrorOutcome(outcome: DuplicateEntry): boolean {
  return Boolean(outcome.status && outcome.entry?.length && outcome.entry.length > 0);
}

function joinEntriesIntoStr(entriesArr: string[]): string {
  return entriesArr.length > 1
    ? `${entriesArr.slice(0, -1).join(", ")} and ${entriesArr[entriesArr.length - 1]}`
    : entriesArr[0];
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

function isValidTransferDisabledTokens(transferDisabledTokens: TransferDisabledTokensObj, denoms: string[], network: CarbonSDK.Network): boolean {
  const dupDepositTknsOutcome = checkDuplicateEntries(transferDisabledTokens.deposit);
  const dupWithdrawTknsOutcome = checkDuplicateEntries(transferDisabledTokens.withdraw);

  if (dupDepositTknsOutcome.status || dupWithdrawTknsOutcome.status) {
    if (isErrorOutcome(dupDepositTknsOutcome)) {
      const duplicateDepositTokensStr = joinEntriesIntoStr(dupDepositTknsOutcome.entry!);
      console.error(`[ERROR] transfer_disabled_tokens.deposit of ${network}.json has the following duplicate token denoms: ${duplicateDepositTokensStr}. Please make sure to input each denom only once.`);
    }
    if (isErrorOutcome(dupWithdrawTknsOutcome)) {
      const duplicateWithdrawTokensStr = joinEntriesIntoStr(dupWithdrawTknsOutcome.entry!);
      console.error(`[ERROR] transfer_disabled_tokens.withdraw of ${network}.json has the following duplicate token denoms: ${duplicateWithdrawTokensStr}. Please make sure to input each denom only once.`);
    }
    return false;
  }

  const validDepositTknsOutcome = checkValidEntries(transferDisabledTokens.deposit, denoms);
  const validWithdrawTknsOutcome = checkValidEntries(transferDisabledTokens.withdraw, denoms);
  if (validDepositTknsOutcome.status || dupWithdrawTknsOutcome.status) {
    if (isErrorOutcome(validDepositTknsOutcome)) {
      const invalidDepositTokensStr = joinEntriesIntoStr(validDepositTknsOutcome.entry!);
      console.error(`[ERROR] transfer_disabled_tokens.deposit of ${network}.json has the following invalid token denoms: ${invalidDepositTokensStr}. Please make sure to input only valid token denoms.`);
    }
    if (isErrorOutcome(validWithdrawTknsOutcome)) {
      const invalidWithdrawTokensStr = joinEntriesIntoStr(validWithdrawTknsOutcome.entry!);
      console.error(`[ERROR] transfer_disabled_tokens.withdraw of ${network}.json has the following invalid token denoms: ${invalidWithdrawTokensStr}. Please make sure to input only valid token denoms.`);
    }
    return false;
  }

  return true;
}

function isValidTokenNameOverrideMap(tokenNameOverrideMap: TokenNameOverrideMap, denoms: string[], network: CarbonSDK.Network): boolean {
  const denomKeysArr = Object.keys(tokenNameOverrideMap);
  const invalidDenomsOutcome = checkValidEntries(denomKeysArr, denoms);
  if (isErrorOutcome(invalidDenomsOutcome)) {
    const invalidTokensStr = joinEntriesIntoStr(invalidDenomsOutcome.entry!);
    console.error(`[ERROR] token_name_override_map of ${network}.json has the following invalid token denom keys: ${invalidTokensStr}. Please make sure to input only valid token denoms.`);
    return false;
  }
  return true;
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

function isValidDemexTradingLeagueConfig(
  demexTradingLeagueConfig: DemexTradingLeagueConfig,
  network: CarbonSDK.Network,
  marketIds: string[],
  blacklistedMarkets: string[],
  perpPoolIds: string[],
  tokenSymbols: string[]) {

  const hasInvalidPromoMarkets = checkValidEntries(demexTradingLeagueConfig.promoMarkets, marketIds);
  if (hasInvalidPromoMarkets.status && hasInvalidPromoMarkets.entry) {
    let listOfInvalidMarkets: string = hasInvalidPromoMarkets.entry.join(', ');
    console.error(`ERROR: ${network}.json has the following invalid promo market entries in demex_trading_league_config: ${listOfInvalidMarkets}. Please make sure to only input valid markets in ${network}`);
    return false;
  }

  const hasDuplicatePromoMarkets = checkDuplicateEntries(demexTradingLeagueConfig.promoMarkets);
  if (hasDuplicatePromoMarkets.status && hasDuplicatePromoMarkets.entry) {
    let listOfDuplicates: string = hasDuplicatePromoMarkets.entry.join(", ");
    console.error(`ERROR: ${network}.json has the following duplicated promo market entries in demex_trading_league_config: ${listOfDuplicates}. Please make sure to only input each market once in ${network}`);
    return false;
  }

  const hasBlacklistedMarketsInPromo = checkBlacklistedMarkets(demexTradingLeagueConfig.promoMarkets, blacklistedMarkets);
  if (hasBlacklistedMarketsInPromo.status && hasBlacklistedMarketsInPromo.entry) {
    let listOfBlacklistedMarkets: string = hasBlacklistedMarketsInPromo.entry.join(", ");
    console.error(`ERROR: ${network}.json has the following blacklisted market entries in promo markets entries in demex_trading_league_config: ${listOfBlacklistedMarkets}. Please make sure that blacklisted markets are not found in promo markets in ${network}`);
    return false;
  }

  const hasInvalidCurrentCompPerpPoolId = !perpPoolIds.includes(demexTradingLeagueConfig.currentCompPerpPoolId.toString());
  if (hasInvalidCurrentCompPerpPoolId) {
    console.error(`ERROR: ${network}.json has an invalid perp pool id in the currentCompPerpPoolId field: ${demexTradingLeagueConfig.currentCompPerpPoolId}`);
    return false;
  }

  const hasInvalidCurrentPrizeSymbol = !tokenSymbols.includes(demexTradingLeagueConfig.currentPrizeSymbol);
  if (hasInvalidCurrentPrizeSymbol) {
    console.error(`ERROR: ${network}.json has an invalid token symbol in the currentPrizeSymbol field: ${demexTradingLeagueConfig.currentPrizeSymbol}`);
    return false;
  }

  return true;
}

function isValidMarketBanners(marketBanners: MarketBanner[], network: CarbonSDK.Network, marketIds: string[]): boolean {
  const marketBannerIds = marketBanners.map((banner) => banner.market_id);
  const hasInvalidMarketBannerIds = checkValidEntries(marketBannerIds, marketIds);
  const hasDuplicateMarketBannerIds = checkDuplicateEntries(marketBannerIds);

  if (hasInvalidMarketBannerIds.status && hasInvalidMarketBannerIds.entry) {
    let listOfInvalidIds: string = hasInvalidMarketBannerIds.entry.join(", ");
    console.error(`ERROR: ${network}.json has the following invalid market ids under the market_banners field: ${listOfInvalidIds}`);
    return false;
  }

  if (hasDuplicateMarketBannerIds.status && hasDuplicateMarketBannerIds.entry) {
    let listOfDuplicates: string = hasDuplicateMarketBannerIds.entry.join(", ");
    console.error(`ERROR: ${network}.json has duplicated market banners for the following market ids: ${listOfDuplicates}. Please make sure to add only 1 market banner for each market id in ${network}.json`);
    return false;
  }
  return true;
}

function isValidMarketPromo(marketPromo: {[marketId: string]: MarketPromo}, network: CarbonSDK.Network, marketIds: string[]): boolean {
    const marketPromoIds = Object.keys(marketPromo)
    const hasInvalidMarketPromoIds = checkValidEntries(marketPromoIds, marketIds)
    const hasDuplicateMarketPromoIds = checkDuplicateEntries(marketPromoIds)

    if (hasInvalidMarketPromoIds.status && hasInvalidMarketPromoIds.entry) {
      let listOfInvalidIds: string = hasInvalidMarketPromoIds.entry.join(", ");
      console.error(`ERROR: ${network}.json has the following invalid market ids under the market_promo field: ${listOfInvalidIds}`)
      outcomeMap[network] = false;
    }

    if (hasDuplicateMarketPromoIds.status && hasDuplicateMarketPromoIds.entry) {
      let listOfDuplicates: string = hasDuplicateMarketPromoIds.entry.join(", ");
      console.error(`ERROR: ${network}.json has duplicated market promos for the following market ids: ${listOfDuplicates}. Please make sure to input each market promo only once in ${network}`);
      outcomeMap[network] = false;
    }

    for (const promoId of marketPromoIds) {
      const promoInfo = marketPromo[promoId];
      const startTimeStr = promoInfo.start;
      const endTimeStr = promoInfo.end;

      const startTime = new Date(startTimeStr);
      const endTime = new Date(endTimeStr);

      if (endTime < startTime) {
        console.error(`ERROR: ${network}.json has invalid end time (${endTimeStr}) is before start time (${startTimeStr}) for market promo id ${promoId}.`);
        outcomeMap[network] = false;
        break;
      }
    }

  return true;
}

function isValidTransferBanner(transferBanner: TransferBanner, network: CarbonSDK.Network): boolean {
  const { temporary_disabled_transfer_tokens, temporary_disabled_bridges } = transferBanner;
  if (Object.keys(temporary_disabled_transfer_tokens).length > 0) {
    Object.keys(temporary_disabled_transfer_tokens).map((key) => {
      const { start, end } = temporary_disabled_transfer_tokens[key];
      const startTime = new Date(start);
      const endTime = new Date(end);
      if (endTime < startTime) {
        console.error(`ERROR: ${network}.json has invalid end time (${end}) is before start time (${start}) for token denom ${key}.`);
        return false;
      }
    });
  }

  if (Object.keys(temporary_disabled_bridges).length > 0) {
    Object.keys(temporary_disabled_bridges).map((key) => {
      const { start, end } = temporary_disabled_bridges[key];
      const startTime = new Date(start);
      const endTime = new Date(end);
      if (endTime < startTime) {
        console.error(`ERROR: ${network}.json has invalid end time (${end}) is before start time (${start}) for bridge address ${key}.`);
        return false;
      }
    });
  }

  return true
}

function isValidQuickSelectTokens(quickSelectTokens: QuickSelectToken[], network: CarbonSDK.Network, denoms: string[]): boolean {
  const duplicateQuickSelectTokens = checkDuplicateEntries(quickSelectTokens.map(token => token.label_denom));
  const invalidQuickSelectTokens = checkValidEntries(quickSelectTokens.map(token => token.label_denom), denoms);

  const invalidTargetTokens = checkValidEntries(quickSelectTokens.map(token => token.target_denom), denoms);

  if (duplicateQuickSelectTokens.status && duplicateQuickSelectTokens.entry) {
    let listOfDuplicates: string = duplicateQuickSelectTokens.entry.join(", ");
    console.error(`ERROR: ${network}.json has the following duplicated label token denoms: ${listOfDuplicates}. Please make sure to input each token only once in ${network}`);
    return false;
  }

  if (invalidQuickSelectTokens.status && invalidQuickSelectTokens.entry) {
    let listOfInvalidTokens: string = invalidQuickSelectTokens.entry.join(", ");
    console.error(`ERROR: ${network}.json has the following invalid label token denoms: ${listOfInvalidTokens}. Please make sure to only input valid token denoms in ${network}`);
    return false;
  }

  if (invalidTargetTokens.status && invalidTargetTokens.entry) {
    let listOfInvalidTokens: string = invalidTargetTokens.entry.join(", ");
    console.error(`ERROR: ${network}.json has the following invalid target token denoms: ${listOfInvalidTokens}. Please make sure to only input valid token denoms in ${network}`);
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
      const marketIds: string[] = allMarkets.markets.map(market => market.id);

      // look for invalid market entries
      const hasInvalidPrelaunchMarkets = checkValidEntries(jsonData.prelaunch_markets, marketIds);
      if (hasInvalidPrelaunchMarkets.status && hasInvalidPrelaunchMarkets.entry) {
        let listOfInvalidMarkets: string = hasInvalidPrelaunchMarkets.entry.join(", ");
        console.error(`ERROR: ${network}.json has the following invalid pre-launch market entries: ${listOfInvalidMarkets}. Please make sure to only input valid markets in ${network}`);
        outcomeMap[network] = false;
      }

      const hasInvalidBlacklistedMarkets = checkValidEntries(jsonData.blacklisted_markets, marketIds);
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
      const tokenSymbols: string[] = allTokens.tokens.map(token => token.symbol);

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

      // transfer disabled tokens object check
      const isTransferDisabledTokensValid = isValidTransferDisabledTokens(jsonData.transfer_disabled_tokens, tokens, network);
      if (!isTransferDisabledTokensValid) outcomeMap[network] = false;

      // token_name_override_map check
      const isTokenNameOverrideMapValid = isValidTokenNameOverrideMap(jsonData.token_name_override_map, tokens, network);
      if (!isTokenNameOverrideMapValid) outcomeMap[network] = false;

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
      const validTransferOptionChains = sdk.token.getPolynetworkBlockchainNames()
        .concat(sdk.token.getAxelarBlockchainNames())
        .concat(ibcBridgeNames)
        .concat(["Carbon EVM"]);

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

      if (jsonData.typeform_widget_config) {
        const typeFormWidgetConfigs = jsonData.typeform_widget_config
        const links: string[] = []
        let pages: string[] = []
        for (const config of typeFormWidgetConfigs) {
          const startTime = new Date()
          const endTime = new Date(config.endTime)
          // Check if end time is before start time
          if (endTime < startTime) {
            console.error(`ERROR: ${network}.json has invalid end time (${endTime}) is before start time (${startTime}) for a typeform survey config.`);
            outcomeMap[network] = false;
            break; // Exit the loop early upon encountering an error
          }
          pages = pages.concat(config.pages)
          links.push(config.surveyLink)
        }
        // look for duplicate links
        const hasDuplicateLinks = checkDuplicateEntries(links);
        if (hasDuplicateLinks.status && hasDuplicateLinks.entry) {
          let listOfDuplicates: string = hasDuplicateLinks.entry.join(", ");
          console.error(`ERROR: ${network}.json has the following duplicated links in the typeform survey configs: ${listOfDuplicates}. Please make sure to only input each link once in ${network}`);
          outcomeMap[network] = false;
        }
        // look for duplicate pages
        const hasDuplicatePages = checkDuplicateEntries(pages);
        if (hasDuplicatePages.status && hasDuplicatePages.entry) {
          let listOfDuplicates: string = hasDuplicatePages.entry.join(", ");
          console.error(`ERROR: ${network}.json has the following duplicated pages in the typeform survey configs: ${listOfDuplicates}. Please make sure to only input each page once in ${network}`);
          outcomeMap[network] = false;
        }
      }

      if (jsonData.perp_pools) {
        const perpPoolConfig = jsonData.perp_pools
        if (perpPoolConfig.incentives) {
          const distributorsArr = perpPoolConfig.incentives.distributors

          if (distributorsArr) {
            // look for duplicate contract addresses
            const hasDuplicateLinks = checkDuplicateEntries(distributorsArr)
            if (hasDuplicateLinks.status && hasDuplicateLinks.entry) {
              let listOfDuplicates: string = hasDuplicateLinks.entry.join(", ");
              console.error(`ERROR: ${network}.json has the following duplicated distributors in the perp_pools incentives configs: ${listOfDuplicates}. Please make sure to only input each link once in ${network}`);
              outcomeMap[network] = false;
            }

            distributorsArr.forEach((address) => {
              if (!checkAddressIsEVM(address)) {
                console.error(`ERROR: ${network}.json has invalid EVM address in perp_pools incentives configs: ${address}`);
                outcomeMap[network] = false;
              }
            })
          }

          const proxy = perpPoolConfig.incentives.proxy
          if (proxy) {
            if (!checkAddressIsEVM(proxy)) {
              console.error(`ERROR: ${network}.json has invalid EVM address in perp_pools incentives proxy configs: ${proxy}`);
              outcomeMap[network] = false;
            }
          }
        }

        if (perpPoolConfig.banners) {
          const banners = perpPoolConfig.banners
          // Checking perp pool banners

          const perpPoolIds = perpPoolsQuery.pools.map((pool) => pool.poolId.toString())
          const perpPoolBannerIds = Object.values(banners).map((banner) => banner.perp_pool_id)

          const hasInvalidPerpPoolBannerIds = checkValidEntries(perpPoolBannerIds, perpPoolIds)
          const hasDuplicatePerpPoolBannerIds = checkDuplicateEntries(perpPoolBannerIds)

          if (hasInvalidPerpPoolBannerIds.status && hasInvalidPerpPoolBannerIds.entry) {
            let listOfInvalidIds: string = hasInvalidPerpPoolBannerIds.entry.join(", ");
            console.error(`ERROR: ${network}.json has the following invalid perp pool ids under the perp_pools banners field: ${listOfInvalidIds}`)
            outcomeMap[network] = false;
          }

          if (hasDuplicatePerpPoolBannerIds.status && hasDuplicatePerpPoolBannerIds.entry) {
            let listOfDuplicates: string = hasDuplicatePerpPoolBannerIds.entry.join(", ");
            console.error(`ERROR: ${network}.json has duplicated perp pool banners for the following perp pool ids: ${listOfDuplicates}. Please make sure to input each perp pool banner only once in ${network}`);
            outcomeMap[network] = false;
          }
        }
      }

      if (jsonData.wswth_contract) {
        const wSWTH = jsonData.wswth_contract
        if (!checkAddressIsEVM(wSWTH)) {
          console.error(`ERROR: ${network}.json has invalid EVM address in perp pools incentives wswth_contract configs: ${wSWTH}`);
          outcomeMap[network] = false;
        }
      }

      if(jsonData.market_banners && !isValidMarketBanners(jsonData.market_banners, network, marketIds)) {
        outcomeMap[network] = false;
      }

      if(jsonData.market_promo && !isValidMarketPromo(jsonData.market_promo, network, marketIds)) {
        outcomeMap[network] = false;
      }

      // check for spot pool config
      if (jsonData.spot_pool_config) {
        const spotPoolConfig = jsonData.spot_pool_config
        if (spotPoolConfig.show_apr_tooltip === undefined) {
          console.error(`ERROR: the show_apr_tooltip field is missing in spot_pool_config of ${network}.json. Please enter a boolean value for show_apr_tooltip.`);
          outcomeMap[network] = false;
        }
      }

      // external chain channels check
      const isExternalChannelsValid = isValidExternalChainChannels(jsonData.external_chain_channels, ibcBridgeNames, network);
      if (!isExternalChannelsValid) outcomeMap[network] = false;

      // additional ibc token config check
      const isAdditionalTokensConfigValid = isValidAdditionalIbcTokenConfig(jsonData.additional_ibc_token_config, ibcBridgeNames, tokens, network);
      if (!isAdditionalTokensConfigValid) outcomeMap[network] = false;

      // demex trading league config check
      if (jsonData.demex_trading_league_config) {
        const isDemexTradingLeagueConfigValid = isValidDemexTradingLeagueConfig(jsonData.demex_trading_league_config, network, marketIds, jsonData.blacklisted_markets, perpPoolIds, tokenSymbols)
        if (!isDemexTradingLeagueConfigValid) outcomeMap[network] = false;
      }

      // transfer banner check
      if (jsonData.transfer_banner && !isValidTransferBanner(jsonData.transfer_banner, network)) {
        outcomeMap[network] = false;
      }

      // check for validate quick select tokens
      if (jsonData.quick_select_deposit_options && !isValidQuickSelectTokens(jsonData.quick_select_deposit_options, network, tokens)) {
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
