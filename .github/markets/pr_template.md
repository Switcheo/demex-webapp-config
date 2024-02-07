# Demex Config

Each json file under the [configs](../../configs) folder correspond to their respective networks. For example, [configs/mainnet.json](../../configs/mainnet.json) contains metadata pertaining to Carbon `mainnet` network.

## JSON Data Structure
|Field   |Type   |Required  |Description  |Notes   |
|---|---|---|---|---|
|`network`   |`string`   |true   |The network that the json file corresponds to  |The networks available are: **mainnet, testnet, devnet** |
|`featured_markets`   |`string[]`   |true   |The array of market names which will be listed under the Featured tab on Demex's [Markets page](https://app.dem.exchange/markets)  |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). |
|`prelaunch_markets`   |`string[]`   |true   |The array of market names which are designated as Pre-Launch markets. When added to this list, the markets will have a `Pre-Launch` tag attached to it. |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). |
|`blacklisted_markets`   |`string[]`   |true   |The array of market names that are blacklisted. A market can be blacklisted for a number of reasons, such as it being invalid/duplicate/wrongly-added/etc.  |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). The market names listed here **CANNOT** be under the `featured_markets` or `prelaunch_markets` fields at the same time. |
|`blacklisted_pools`   |`string[]`   |true   |The array of pool ids that are blacklisted. A pool can be blacklisted for a number of reasons, such as it being invalid/duplicate/wrongly-added/etc. |The pool ids listed here **MUST** match the pool ids listed under the Carbon [Liquidity Pool API](https://api.carbon.network/carbon/liquiditypool/v1/pools?pagination.limit=10000). |
|`blacklisted_tokens`   |`string[]`   |true   |The array of token denoms that are blacklisted. A token can be blacklisted for a number of reasons, such as it being invalid/deprecated/etc. |The token denoms listed here **MUST** match the token denoms listed under the Carbon [Tokens API](https://api.carbon.network/carbon/coin/v1/tokens?pagination.limit=10000). |
|`transfer_options`   |`object`   |true   |A collection of blockchain networks along with their associated priority numbers, used to establish their order in the transfer options list for deposit and withdrawal forms.   |Blockchain network listed here **MUST** match the valid chainName of the bridges listed under BridgeAll RPC call.<br /><br /> To view the values of BridgeAll RPC call, simply run `yarn get-bridges [network]` on the command line. Sample for mainnet: `yarn get-bridges mainnet`|
|`network_fees`   |`object`   |true   |List of token denoms along with their associated priority numbers, used to establish their default order in the network fees preference list.   |Token denoms listed here **MUST** match the valid denoms listed under MinGasPriceAll RPC call.<br /><br /> To view the values of MinGasPriceAll RPC call, simply run `yarn get-min-gas-prices [network]` on the command line. Sample for mainnet: `yarn get-min-gas-prices mainnet`|
|`maintenance`   |`Maintenance`   |false   |Object that dictates whether or not the maintenance page is displayed on each particular network. The maintenance page is displayed when the Carbon chain is down (i.e. blocks are not moving).   | If the `maintenance` property is omitted, the maintenance page will not be shown.
|`perp_pool_banners`   |`PerpPoolBanner`   |true   |List of Objects that indicate the banner content on specific perp pool pages.   | 

## Maintenance Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`title`   |`string`   |false   |Title to be shown on the maintenance page   |If not defined, the title defaults to `Service Maintenance`.   |
|`message`   |`string`   |false   |Description to be shown on the maintenace page (below the title).   |If not defined, the message will default to `Website is temporily unavailable due to planned maintenance. We will be back soon.`.   |

## PerpPoolBanner Data Structure
|Field   |Type   |Required   |Description   |Notes   |
|---|---|---|---|---|
|`perp_pool_id`   |`string`   |true   |Perp pool id where the banner will be shown.  |Perp pool id **MUST** match one of the existing perp pool ids from the PerpPool PoolInfoAll RPC call.<br /><br /> To view the values of PoolInfoAll RPC call, simply run `yarn get-perp-pool-ids [network]` on the command line. Sample for mainnet: `yarn get-perp-pool-ids mainnet`    |
|`show_from`   |`string`   |false   |The date and time when the perp pool banner is scheduled to begin displaying. |If not provided, the banner will be shown immediately.<br /><br /> This field **MUST** follow the valid ISO 8601 format <br /> e.g. *2024-01-23T09:00+00:00* (23 Jan 2024, 9am UTC) |
|`show_until`   |`string`   |false   |The date and time when the perp pool banner is scheduled to stop displaying. |If not provided, the banner will continue to display indefinitely.<br /><br /> This field **MUST** follow the valid ISO 8601 format <br /> e.g. *2024-01-23T09:00+00:00* (23 Jan 2024, 9am UTC) | 
|`title`   |`string`   |true   |The title shown on the perp pool banner. | 
|`subtext`   |`string`   |true   |The subtext shown on the perp pool banner (below the title). | 
