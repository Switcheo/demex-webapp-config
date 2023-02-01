# demex-webapp-config

This repository allows frontends to fetch metadata associated with Demex.
The config JSON schema can be found [here](/config.schema.json).

Currently, each JSON file contain the following data on its corresponding network (mainnet, testnet, devnet):
- list of markets to be featured
- blacklisted markets
- blacklisted pools
- blacklisted tokens.
More metadata will be added in the future if required by the Demex frontend. Please see below the structure of the JSON file:

```
{
    "network": "testnet",
    "featured_markets": [
        "market_1",
        "market_2",
        "market_3",
        ...
    ],
    "blacklisted_markets": [
        "blacklisted_market_1",
        "blacklisted_market_2",
        "blacklisted_market_3",
        ...
    ],
    "blacklisted_pools": [
        "blacklisted_pool_1",
        "blacklisted_pool_2",
        "blacklisted_pool_3",
        ...
    ],
    "blacklisted_tokens": [
        "blacklisted_token_1",
        "blacklisted_token_2",
        "blacklisted_token_3",
        ...
    ]
}
```
