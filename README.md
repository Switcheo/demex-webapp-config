# demex-webapp-config

This repository allows frontends to fetch metadata associated with Demex.
The config JSON schema can be found [here](/config.schema.json).

Currently, each JSON file contain the following data on its corresponding network (mainnet, testnet, devnet):
- list of markets to be featured
- blacklisted markets
- blacklisted pools
- blacklisted tokens
- default blockchain transfer option order in deposit/withdrawal forms dropdown
- default network token fee order

More metadata will be added in the future if required by the Demex frontend. Please see below the structure of the JSON file:

```json
{
  "network": "testnet",
  "featured_markets": [
    "market_1",
    "market_2",
    "market_3"
  ],
  "blacklisted_markets": [
    "blacklisted_market_1",
    "blacklisted_market_2",
    "blacklisted_market_3"
  ],
  "blacklisted_pools": [
    "blacklisted_pool_1",
    "blacklisted_pool_2",
    "blacklisted_pool_3"
  ],
  "blacklisted_tokens": [
    "blacklisted_token_1",
    "blacklisted_token_2",
    "blacklisted_token_3"
  ],
  "transfer_options": {
    "chain_1": 0,
    "chain_2": 1,
    "chain_3": 2
  },
  "network_fees": {
    "token_denom_1": 0,
    "token_denom_2": 1,
    "token_denom_3": 2
  }
}
```
