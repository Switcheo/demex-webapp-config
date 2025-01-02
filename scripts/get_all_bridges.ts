import { Carbon, CarbonSDK } from "carbon-js-sdk";
import { PageRequest } from "carbon-js-sdk/lib/codec/cosmos/base/query/v1beta1/pagination";
import { BRIDGE_IDS } from "carbon-js-sdk/lib/util/blockchain";
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
  const legacyBridges = await sdk.query.coin.BridgeAll({
    pagination: PageRequest.fromPartial({
      limit: new Long(10000),
    }),
  });
  const axelarBridges = await sdk.query.bridge.ConnectionAll(
    Carbon.Bridge.QueryAllConnectionsRequest.fromPartial({
      pagination: PageRequest.fromPartial({
        limit: new Long(10000),
      }),
    })
  );

  console.log("Chain Name | Bridge Name | Bridge Address(es)")

  legacyBridges.bridges.forEach((bridge: Carbon.Coin.Bridge) => {
    if (!bridge.enabled) return;

    let bridgeAddressStr = JSON.stringify(bridge.bridgeAddresses);
    if (bridge.bridgeId.eq(BRIDGE_IDS.ibc)) {
      bridgeAddressStr = `channel-${bridge.chainId.subtract(1).toString(10)}`;
    }
    console.log(`${bridge.chainName} | ${bridge.bridgeName} | ${bridgeAddressStr}`);
  });

  axelarBridges.connections.forEach((bridge: Carbon.Bridge.Connection) => {
    if (!bridge.isEnabled) return;
    console.log(`${bridge.chainDisplayName} | Axelar | ${bridge.connectionId}`);
  });
})().catch(console.error).finally(() => process.exit(0));
