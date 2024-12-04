# demex-webapp-config

This repository allows frontends to fetch metadata associated with Demex.
The config JSON schema can be found [here](/config.schema.json).

Currently, each JSON file contain the following data on its corresponding network (mainnet, testnet, devnet):
- list of pre-launch markets
- blacklisted markets
- blacklisted pools
- blacklisted tokens
- default blockchain transfer option order in deposit/withdrawal forms dropdown
- default network token fee order
- cross selling source tokens
- map of IBC channels for external IBC chains (such as Osmosis, Noble, etc.)
- information about IBC tokens that are not added on chain or require packet forwarding

Additionally, the JSON file for mainnet contains the following data to support ongoing campaigns/promotions:
- demex points config
- config for the Demex Trading League competition
- perp pool promotion parameters
- typeform survey parameters
- market banner parameters for information banners to be displayed on the TradingView charts on Trade UI
- market promo parameters for showing boosted tag on market select on Trade UI

More metadata will be added in the future if required by the Demex frontend. Please see below the structure of the JSON file:

```json
{
  "network": "testnet",
  "prelaunch_markets": [
    "market_1",
    "market_2"
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
  },
  "cross_selling_source_tokens": ["source_token_1"],
  "external_chain_channels": {
    "from_blockchain_1": {
      "to_blockchain_1": "channel_1",
      "to_blockchain_2": "channel_2"
    },
    "from_blockchain_2": {
      "to_blockchain_3": "channel_3",
      "to_blockchain_4": "channel_4",
      "to_blockchain_5": "channel_5"
    }
  },
  "additional_ibc_token_config": [{
    "baseDenom": "denom_1",
    "chainRoutes": ["blockchain_1", "blockchain_2"]
  }, {
    "baseDenom": "denom_2",
    "chainRoutes": ["blockchain_3", "blockchain_4"]
  }, {
    "baseDenom": "denom_3",
    "chainRoutes": ["blockchain_5", "blockchain_6"],
    "denomOnCarbon": "carbon_denom_1"
  }], 
  "demex_trading_league_config": {
    "promoMarkets": [
      "promo_market_1",
      "promo_market_2",
      "promo_market_3"
    ],
    "currentPrizeSymbol": "market_symbol",
    "currentCompPerpPoolId": 1
  }
}
```
