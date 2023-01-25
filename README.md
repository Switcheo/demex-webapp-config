# demex-webapp-config

This repository allows frontends to fetch metadata associated with Demex.
The config JSON schema can be found [here](/config.schema.json).

Currently, the JSON files only includes the list of markets to be featured on their respective networks (mainnet, testnet, devnet). More metadata will be added in the future if required by the Demex frontend. Please see below the structure of the JSON file:

```
{
    "network": "testnet",
    "featured_markets": [
        "market_1",
        "market_2",
        "market_3",
        ...
    ],
    "omitted_markets": [
        "market_4",
        "market_5",
        "market_6",
        ...
    ]
}
```
