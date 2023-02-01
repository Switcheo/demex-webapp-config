# Demex Config

Each json file under the [configs](../../configs) folder correspond to their respective networks. For example, [configs/mainnet.json](../../configs/mainnet.json) contains metadata pertaining to Carbon `mainnet` network.

## JSON Data Structure
|Field   |Type   |Required  |Description  |Notes   |
|---|---|---|---|---|
|`network`   |`string`   |true   |The network that the json file corresponds to  |The networks available are: **mainnet, testnet, devnet** |
|`featured_markets`   |`string[]`   |true   |The array of market names which will be listed under the Featured tab on Demex's [Markets page](https://app.dem.exchange/markets)  |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). |
|`blacklisted_markets`   |`string[]`   |true   |The array of market names that are blacklisted.  |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). |
|`blacklisted_pools`   |`string[]`   |true   |The array of pool ids that are blacklisted.  |The pool ids listed here **MUST** match the pool ids listed under the Carbon [Liquidity Pool API](https://api.carbon.network/carbon/liquiditypool/v1/pools?pagination.limit=10000). |
|`blacklisted_tokens`   |`string[]`   |true   |The array of token denoms that are blacklisted.  |The token denoms listed here **MUST** match the token denoms listed under the Carbon [Tokens API](https://api.carbon.network/carbon/coin/v1/tokens?pagination.limit=10000). |