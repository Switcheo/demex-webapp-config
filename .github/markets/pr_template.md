# Feature Market

Each json file under the [configs](../../configs) folder correspond to their respective networks. For example, [configs/mainnet.json](../../configs/mainnet.json) contains metadata pertaining to Carbon `mainnet` network.

## JSON Data Structure
|Field   |Type   |Required  |Description  |Notes   |
|---|---|---|---|---|
|`network`   |`string`   |true   |The network that the json file corresponds to  |The networks available are: **mainnet, testnet, devnet** |
|`featured_markets`   |`string[]`   |true   |The array of market names which will be listed under the Featured tab on Demex's [Markets page](https://app.dem.exchange/markets)  |The market names listed here **MUST** match the market names listed under the Carbon [Markets API](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000). |
