# Feature Market

Each json file under the [configs](../../configs) folder correspond to their respective networks. For example, [configs/mainnet.json](../../configs/mainnet.json) contains metadata pertaining to Carbon `mainnet` network.

## JSON Data Structure
|Field   |Type   |Required  |Description  |Notes   |
|---|---|---|---|---|
|`network`   |`string`   |true   |The network in which the json file corresponds with  |The networks available are: **mainnet, testnet, devnet** |
|`featured_markets`   |`string[]`   |true   |The array of denoms of the markets which will be used to generate the list of featured markets in Demex  |Denom names **MUST** match the markets names in the Carbon markets api. Please refer to the [api](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000) |