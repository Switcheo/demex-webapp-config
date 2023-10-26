import { CarbonSDK } from "carbon-js-sdk";
import Long from "long";
const myArgs = process.argv.slice(2);

(async () => {
  const net = myArgs[0]
  let network: CarbonSDK.Network;
  if (!net ||  net === "") {
    console.log("ERROR: No network keyed");
    process.exit(1);
  }

  switch (net.toLowerCase()) {
    case "mainnet":
      network = CarbonSDK.Network.MainNet;
      break;
    case "testnet":
      network = CarbonSDK.Network.TestNet;
      break;
    case "devnet":
      network = CarbonSDK.Network.DevNet;
      break;
    default:
      console.log("ERROR: Invalid network keyed");
      process.exit(1);
  }

  const sdk = await CarbonSDK.instance({ network });
  const feeQueryClient =  sdk.query.fee
  const gasPrices = await feeQueryClient.MinGasPriceAll({
    pagination: {
      limit: new Long(10000),
      offset: new Long(0),
      key: new Uint8Array(),
      countTotal: true,
      reverse: false,
    },
  })

  console.log(gasPrices)
})().catch(console.error).finally(() => process.exit(0));
