# Demex Config

Each json file under the [configs](../../configs) folder correspond to their respective networks. For example, [configs/mainnet.json](../../configs/mainnet.json) contains metadata pertaining to Carbon `mainnet` network.

## JSON Data Structure
|Field   |Type   |Required  |Description  |Notes   |
|---|---|---|---|---|
|`network`   |`string`   |true   |The network that the json file corresponds to  |The networks available are: **mainnet, testnet, devnet** |
|`prelaunch_markets`   |`string[]`   |true   |The array of market names which are designated as Pre-Launch markets. When added to this list, the markets will have a `Pre-Launch` tag attached to it. |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). |
|`blacklisted_markets`   |`string[]`   |true   |The array of market names that are blacklisted. A market can be blacklisted for a number of reasons, such as it being invalid/duplicate/wrongly-added/etc.  |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). The market names listed here **CANNOT** be under the `prelaunch_markets` field at the same time. |
|`blacklisted_pools`   |`string[]`   |true   |The array of pool ids that are blacklisted. A pool can be blacklisted for a number of reasons, such as it being invalid/duplicate/wrongly-added/etc. |The pool ids listed here **MUST** match the pool ids listed under the Carbon [Liquidity Pool API](https://api.carbon.network/carbon/liquiditypool/v1/pools?pagination.limit=10000). |
|`blacklisted_tokens`   |`string[]`   |true   |The array of token denoms that are blacklisted. A token can be blacklisted for a number of reasons, such as it being invalid/deprecated/etc. |The token denoms listed here **MUST** match the token denoms listed under the Carbon [Tokens API](https://api.carbon.network/carbon/coin/v1/tokens?pagination.limit=10000). |
|`transfer_options`   |`object`   |true   |A collection of blockchain networks along with their associated priority numbers, used to establish their order in the transfer options list for deposit and withdrawal forms.   |Blockchain network listed here **MUST** match the valid chainName of the bridges listed under BridgeAll RPC call.<br /><br /> To view the values of BridgeAll RPC call, simply run `yarn get-bridges [network]` on the command line. Sample for mainnet: `yarn get-bridges mainnet`|
|`network_fees`   |`object`   |true   |List of token denoms along with their associated priority numbers, used to establish their default order in the network fees preference list.   |Token denoms listed here **MUST** match the valid denoms listed under MinGasPriceAll RPC call.<br /><br /> To view the values of MinGasPriceAll RPC call, simply run `yarn get-min-gas-prices [network]` on the command line. Sample for mainnet: `yarn get-min-gas-prices mainnet`|
|`maintenance`   |`Maintenance`   |false   |Object that dictates whether or not the maintenance page is displayed on each particular network. The maintenance page is displayed when the Carbon chain is down (i.e. blocks are not moving).   | If the `maintenance` property is omitted, the maintenance page will not be shown.
|`demex_points_config`   |`DemexPointsConfig`   |false   |Object that contains the parameters to earn demex points.   |This object **must be included** for mainnet.json as demex points is already live on mainnet.   |
|`perp_pool_promo`   |`PerpPoolPromo`   |false   |Map of Objects that contains perp pool promo parameters for each pool   |If the `perp_pool_promo` property is omitted, no promo will be shown. The key of each entry is the ids of the perp pools with existing promo.   |
|`cross_selling_source_tokens`   |`string[]`   |true   |The array of cross selling source tokens. Acquiring these tokens on the spot market will trigger a help wizard, prompting users to borrow USDG and trade perps on Demex. |The token denoms listed here **MUST** match the token denoms listed under the Carbon [Tokens API](https://api.carbon.network/carbon/coin/v1/tokens?pagination.limit=10000). |
|`typeform_widget_config`   |`TypeformWidgetConfig[]`   |false   |Object that contains the parameters for ongoing surveys.   | If the `message` property is omitted, default message is shown: "We want to hear from you!". Multiple widgets being displayed on the same page is not supported. Ensure pages don't overlap between configs.  |
|`external_chain_channels`   |`obj`   |true   |Map of Objects containing destination channels for external IBC chains (e.g. Osmosis, Noble, etc.)   |1. To transfer tokens from Osmosis => Noble, you need to look for the `Osmosis` object, then search for `Noble` in the object to get the channel to be input in `sourceChannel` for MsgTransfer tx msg (in this case channel-750)<br /><br />2. Blockchain names in this object **MUST** match the valid chainName of the bridges listed under BridgeAll RPC call.<br /><br /> To view the values of BridgeAll RPC call, simply run `yarn get-bridges [network]` on the command line. Sample for mainnet: `yarn get-bridges mainnet`   |
|`additional_ibc_token_config`   |`AdditionalIBCTokenConfig[]`   |true   |List of information about IBC tokens that are not added on chain or require packet forwarding.   |
|`demex_trading_league_config` |`DemexTradingLeagueConfig` |false |Object that contains the parameters for the current trading league. |
|`perp_pools`   |`PerpPoolConfig`   |false   |Object that contains the configs for Perp Pools   |
|`wswth_contract`   |`string`   |false   |wSWTH ERC-20 contract.   |
|`market_banners`   |`MarketBanner[]`   |true   |market banner configs.   |
| `native_depositor_contracts_map`  | `object`                 | false    | Map of token denoms to their respective native depositor contract addresses
|`market_promo`   |`MarketPromo`   |false   |Map of Objects that contains market promo parameters for each market   |If the `market_promo` property is omitted, no promo will be shown. The key of each entry is the ids of the market with existing promo.   |
|`spot_pool_config`   |`SpotPoolConfig`   |false   |Object that contains the config parameters for the [Spot Pools](https://app.dem.exchange/pools/spot) page on Demex   |
|`quick_select_tokens`   |`QuickSelectToken[]`   |true   |List of quick select tokens for deposit and withdrawal forms.   |
|`disabled_transfer_banner_config` |`DisabledTransferBannerConfig` |false |Config parameters for displaying banner to inform users that transfers for the relevant tokens are disabled |

## Maintenance Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`title`   |`string`   |false   |Title to be shown on the maintenance page   |If not defined, the title defaults to `Service Maintenance`.   |
|`message`   |`string`   |false   |Description to be shown on the maintenace page (below the title).   |If not defined, the message will default to `Website is temporily unavailable due to planned maintenance. We will be back soon.`.   |

## DemexPointsConfig Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`depositsPerSpin`   |`integer`  |true   |Amount deposited in the perp pool that will earn 1 spin after 1 week.   |
|`tradingVolumePerSpin`   |`integer`  |true   |Volume traded on perp markets that will earn 1 spin.   |

## PerpPoolPromo Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`start`   |`string`  |true   |Start time of the promo.   |
|`end`   |`string`  |true   |End time of the promo.   |
|`perpPoolDepositBoost`   |`integer`  |true   |Boost to perp pool deposits required to earn 1 demex point spin.   |
|`perpTradingBoost`   |`integer`  |true   |Boost to trading volume required to earn 1 demex point spin.   |

## TypeformWidgetConfig
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`message`   |`string`  |false   |The message shown to the user on the widget.   |
|`surveyLink`   |`string`  |true   |The link to the survey that will be shown when user clicks on the widget.   |
|`endTime`   |`string`  |true   |End time of the survey   |
|`pages`   |`string[]`   | true   |The paths to the pages on which the typeform widget must be shown.   |

## AdditionalIBCTokenConfig Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`baseDenom`   |`string`  |true   |The denom of this token on its native chain (e.g. `uosmo` for $OSMO on Osmosis, `uatom` for $ATOM on CosmosHub)   |
|`chainRoutes`   |`string[]`  |true   |The list of IBC chains that this token needs to be forwarded through in order to be deposited into Carbon blockchain.    |1. You need to add **at least 1** blockchain network to this array.<br /><br />2. Blockchain networks in this array **MUST** match the valid chainName of the bridges listed under BridgeAll RPC call.<br /><br /> To view the values of BridgeAll RPC call, simply run `yarn get-bridges [network]` on the command line. Sample for mainnet: `yarn get-bridges mainnet`   |
|`denomOnCarbon`   |`string`  |false   |Denom of token that is added to Carbon chain but still requires packet-forwarding (omit if this token is **NOT** added to Carbon chain)   |The denom in this field **MUST** match the token denoms listed under the Carbon [Tokens API](https://api.carbon.network/carbon/coin/v1/tokens?pagination.limit=10000).   |

## DemexTradingLeagueConfig
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`promoMarkets`   |`string[]`   |true   |The array of market names which are designated as promo markets for the Demex Trading League competition. |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). |
|`currentPrizeSymbol`   |`string`  |true   |The symbol of the prize token, mainly used to display the prize symbol and token icon on the Demex Trading League page. | The symbol in this field **MUST** match the token symbols listed under the Carbon [Tokens API](https://api.carbon.network/carbon/coin/v1/tokens?pagination.limit=10000).   |
|`currentCompPerpPoolId`   |`integer`  |true   |Id of the perp pool that provides liquidity for the promo markets of the Demex Trading League event.  |Perp pool id **MUST** match one of the existing perp pool ids from the PerpPool PoolInfoAll RPC call.<br /><br /> To view the values of PoolInfoAll RPC call, simply run `yarn get-perp-pool-ids [network]` on the command line. Sample for mainnet: `yarn get-perp-pool-ids mainnet`    |
## PerpPoolConfig
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`incentives`   |`PerpPoolIncentives`   |false   |List of incentives distributors contracts for Perp Pool Incentives.   |
|`banners`   |`PerpPoolBanner`   |true   |List of Objects that indicate the banner content on specific perp pool pages.   |

## PerpPoolIncentives
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`distributors`   |`string[]`   |false   |List of incentives distributors contracts for Perp Pool Incentives.   |
|`proxy`   |`string`   |false   |Reward proxy claimer for wSWTH rewards.   |If rewards for Perp Pool Incentives is in wSWTH, this contract must be added as an operator to the respective distributor contract.   |

## PerpPoolBanner
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`perp_pool_id`   |`string`   |true   |Perp pool id where the banner will be shown.  |Perp pool id **MUST** match one of the existing perp pool ids from the PerpPool PoolInfoAll RPC call.<br /><br /> To view the values of PoolInfoAll RPC call, simply run `yarn get-perp-pool-ids [network]` on the command line. Sample for mainnet: `yarn get-perp-pool-ids mainnet`    |
|`show_from`   |`string`   |false   |The date and time when the perp pool banner is scheduled to begin displaying. |If not provided, the banner will be shown immediately.<br /><br /> This field **MUST** follow the valid ISO 8601 format <br /> e.g. *2024-01-23T09:00+00:00* (23 Jan 2024, 9am UTC) |
|`show_until`   |`string`   |false   |The date and time when the perp pool banner is scheduled to stop displaying. |If not provided, the banner will continue to display indefinitely.<br /><br /> This field **MUST** follow the valid ISO 8601 format <br /> e.g. *2024-01-23T09:00+00:00* (23 Jan 2024, 9am UTC) |
|`title`   |`string`   |true   |The title shown on the perp pool banner. |
|`removed_markets`   |`string`   |false   |The message describing markets being removed, shown below the perp-pool banner title. | e.g. "BTCETH Perp will be removed on 6 Mar, 09:00AM UTC". If the field is omitted, no message describing markets being removed will be shown. |
|`added_markets`   |`string`   |false   |The message describing markets being added, shown below the markets being removed (if any). | e.g. "ATOM Perp & SOL Perp will be added on 8 Mar, 12:00AM UTC". If the field is omitted, no message describing markets being added will be shown. |
|`subtext`   |`string`   |false   |The subtext shown on the perp pool banner (below the removed and added market descriptions). |

## MarketBanner
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`market_id`   |`string`   |true   |Market id where the banner will be shown.  |Market id **MUST** match one of the existing market ids from the Market MarketAll RPC call.<br /><br /> To view the values of MarketAll RPC call, simply run `yarn get-market-ids [network]` on the command line. Sample for mainnet: `yarn get-market-ids mainnet`    |
|`show_from`   |`string`   |false   |The date and time when the market banner is scheduled to begin displaying. |If not provided, the banner will be shown immediately.<br /><br /> This field **MUST** follow the valid ISO 8601 format <br /> e.g. *2024-01-23T09:00+00:00* (23 Jan 2024, 9am UTC) |
|`show_until`   |`string`   |false   |The date and time when the market banner is scheduled to stop displaying. |If not provided, the banner will continue to display indefinitely.<br /><br /> This field **MUST** follow the valid ISO 8601 format <br /> e.g. *2024-01-23T09:00+00:00* (23 Jan 2024, 9am UTC) |
|`content`   |`string`   |true   |The content shown on the market banner. |
|`hideable`   |`boolean`   |false   |Indicates if user can hide the banner by clicking on the close button |If set to `false`, the close button will not be rendered on the banner, and user will not be able to dismiss the banner. |

## MarketPromo Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`start`   |`string`  |true   |Start time of the promo.   |
|`end`   |`string`  |true   |End time of the promo.   |
|`tooltip`   |`string`  |false   |Tooltip message for perp trading boost tag.   |

## SpotPoolConfig Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`show_apr_tooltip`   |`boolean`  |true   |Indicates whether or not to show the Annual Percentage Returns (APR) tooltip on [Spot Pools](https://app.dem.exchange/pools/spot) page  |

## AnnouncementBanner
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`show_from`   |`string`   |false   |The date and time when the market banner is scheduled to begin displaying. |If not provided, the banner will be shown immediately.<br /><br /> This field **MUST** follow the valid ISO 8601 format <br /> e.g. *2024-01-23T09:00+00:00* (23 Jan 2024, 9am UTC) |
|`show_until`   |`string`   |false   |The date and time when the market banner is scheduled to stop displaying. |If not provided, the banner will continue to display indefinitely.<br /><br /> This field **MUST** follow the valid ISO 8601 format <br /> e.g. *2024-01-23T09:00+00:00* (23 Jan 2024, 9am UTC) |
|`content`   |`string`   |true   |The content shown on the market banner. |
|`hideable`   |`boolean`   |false   |Indicates if user can hide the banner by clicking on the close button |If set to `false`, the close button will not be rendered on the banner, and user will not be able to dismiss the banner. |
|`show_only_on`   |`string[]`   |true   |Default is empty list, then banner will be shown on all pages  |If list has specified path(s), the banner will be shown on these/that path(s) only, sample: `['/rewards', '/nitron']` |

## QuickSelectToken Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`label_denom`   |`string`   |true   |The default token will be show on UI deposit/withdrawal forms    |
|`target_denom`   |`string`   |true   |The default token will be use to transfer in deposit/withdrawal    |

## DisabledTransferBannerConfig Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`unsupported_tokens`   |`string[]`  |false   |List of tokens that are no longer supported | The token denoms listed here **MUST** match the token denoms listed under the Carbon [Tokens API](https://api.carbon.network/carbon/coin/v1/tokens?pagination.limit=10000) |
|`temp_disabled_transfer_tokens`   |`object`  |false   |List of tokens for which deposits and withdrawals have been temporarily disabled | The token denoms listed in this object **MUST** match the token denoms listed under the Carbon [Tokens API](https://api.carbon.network/carbon/coin/v1/tokens?pagination.limit=10000) |
|`temp_disabled_bridges`   |`object`  |false   |List of bridges for which deposits and withdrawals have been temporarily disabled | Blockchain network listed here **MUST** match the valid chainName of the bridges listed under BridgeAll RPC call.<br /><br /> To view the values of BridgeAll RPC call, simply run yarn get-bridges [network]on the command line. Sample for mainnet:yarn get-bridges mainnet`` |
