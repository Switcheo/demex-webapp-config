import { CarbonSDK } from "carbon-js-sdk";
import Long from "long";
const myArgs = process.argv.slice(2);


(async () => {
  const net = myArgs[0]
  let network: CarbonSDK.Network;
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
  const bridges = await sdk.query.coin.BridgeAll({
    pagination: {
      key: new Uint8Array(),
      limit: new Long(10000),
      offset: Long.UZERO,
      countTotal: true,
      reverse: false,
    },
  })
  console.log(bridges)
})().catch(console.error).finally(() => process.exit(0));
