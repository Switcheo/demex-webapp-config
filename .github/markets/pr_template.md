# New Feature Market Template

Please update the below configurations carefully. Each featured markets json file under the [configs](../../configs) folder correspond to their respective networks. For example, [configs/mainnet.json](../../configs/mainnet.json) is for adding maerkets to feature in the `mainnet`. As such, please check which network you would like to feature your market at and add to the correct `configs/<network>.json` file.

Please make sure to add to the **bottom** of the array.

## Feature Market Data Structure
|Field   |Type   |Required  |Description  |Notes   |
|---|---|---|---|---|
|`name`   |`string`   |true   |The denom of the market which is used to generate the list of featured markets in Demex  |Name **MUST** match the name of the market in the Carbon markets api. Please refer to the [api](https://api.carbon.network/carbon/market/v1/markets?pagination.limit=10000) |