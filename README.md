# demex-webapp-config

This repository allows frontends to fetch metadata associated with Demex.
The config JSON schema can be found [here](/config.schema.json).

Currently, each JSON file contain the following data on its corresponding network (mainnet, testnet, devnet):
- list of pre-launch markets
- blacklisted markets
- blacklisted pools
- blacklisted tokens
- tokens for which deposits/withdrawals are disabled
- default blockchain transfer option order in deposit/withdrawal forms dropdown
- default network token fee order
- cross selling source tokens
- map of IBC channels for external IBC chains (such as Osmosis, Noble, etc.)
- information about IBC tokens that are not added on chain or require packet forwarding
- default quick select tokens in deposit/withdrawal forms
- LSTs native apr config to show on Nitron markets
- direct deposits url

Additionally, the JSON file for mainnet contains the following data to support ongoing campaigns/promotions:
- demex points config
- config for the Demex Trading League competition
- perp pool promotion parameters
- typeform survey parameters
- market banner parameters for information banners to be displayed on the TradingView charts on Trade UI
- market promo parameters for showing boosted tag on market select on Trade UI
- trading league parameters for showing trading league 
