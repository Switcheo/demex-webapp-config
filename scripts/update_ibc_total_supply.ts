// import { BigNumber } from "bignumber.js";
import { CarbonSDK, Models, TypeUtils } from "carbon-js-sdk";
import * as fs from "fs";
import Long from "long";
const nodeFetch = require("node-fetch");

interface TotalSupplyItem {
  denom: string;
  amount: string;
}

interface ConfigJSON {
  network: CarbonSDK.Network;
  featured_markets: string[];
  blacklisted_markets: string[];
  blacklisted_pools: string[];
  blacklisted_tokens: string[];
  ibc_tokens_total_supply: TotalSupplyItem[];
}

const cwd = process.cwd();

const skipTotalSupply: string[] = [
  "ibc/75249A18DEFBEFE55F83B1C70CAD234DF164F174C6BC51682EE92C2C81C18C93" // stOSMO
];

(async () => {
  const networkArr = Object.values(CarbonSDK.Network);

  for (let jj = 0; jj < networkArr.length; jj++) {
    if (networkArr[jj] === CarbonSDK.Network.LocalHost) {
      continue;
    }

    const sdk = await CarbonSDK.instance({
      network: networkArr[jj],
    });
  
    // get all ibc tokens
    const feeTokens = await sdk.query.fee.MinGasPriceAll({
      pagination: {
        limit: new Long(100000),
        offset: new Long(0),
        key: new Uint8Array(),
        countTotal: true,
        reverse: false,
      },
    });
    const allIBCTokens = feeTokens.minGasPrices.filter((token: Models.MinGasPrice) => (
      CarbonSDK.TokenClient.isIBCDenom(token.denom)
    ));
  
    const totalSupplyMap: TotalSupplyItem[] = [];
    for (let ii = 0; ii < allIBCTokens.length; ii++) {
      const coingeckoId = sdk.token.geckoTokenNames[allIBCTokens[ii].denom];
      if (skipTotalSupply.includes(allIBCTokens[ii].denom) || !coingeckoId) continue;
  
      const tokenResponse = await nodeFetch(`https://api.coingecko.com/api/v3/coins/${coingeckoId}`);
      const tokenData = await tokenResponse.json();
      const circulatingSupply = (tokenData?.market_data?.circulating_supply ?? 0).toString(10);
      totalSupplyMap.push({
        denom: allIBCTokens[ii].denom,
        amount: circulatingSupply,
      });
    }

    const filePath = `${cwd}/configs/${networkArr[jj]}.json`;
    const dataString = fs.readFileSync(filePath, "utf-8");
    let jsonData: ConfigJSON = {
      network: networkArr[jj],
      featured_markets: [],
      blacklisted_markets: [],
      blacklisted_tokens: [],
      blacklisted_pools: [],
      ibc_tokens_total_supply: [],
    };
    try {
      jsonData = JSON.parse(dataString) as ConfigJSON;
    } catch (err) { }

    jsonData.ibc_tokens_total_supply = totalSupplyMap;

    const data = JSON.stringify(jsonData, null, 4);
    fs.writeFileSync(filePath, data);
  }
})().catch(console.error).finally(() => process.exit(0));
