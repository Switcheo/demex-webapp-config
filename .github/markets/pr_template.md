# Feature Market

Each featured markets json file under the [configs](../../configs) folder correspond to their respective networks. For example, [configs/mainnet.json](../../configs/mainnet.json) is for markets that are featured on the `mainnet`.

## Feature Market Data Structure
|Field   |Type   |Required  |Description  |Notes   |
|---|---|---|---|---|
|`name`   |`string`   |true   |The denom of the market which is used to generate the list of featured markets in Demex  |Name **MUST** match the name of the market in the Carbon markets api. Please refer to the [api](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000) |