// Manual, one-time deploy script. NEVER run automatically or from the app.
//
// Usage:
//   npm run compile
//   DEPLOYER_PRIVATE_KEY=0x... RPC_URL=https://rpc.sepolia.mantle.xyz \
//     node deploy.mjs --network mantle-sepolia --agent-uri https://fleepit.xyz/api/agent-card
//
// Deploys AgentIdentityRegistry, then calls register(agentURI) once to mint
// Fleepit's own identity token. Prints the values to paste into env vars.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NETWORKS = {
  "mantle-sepolia": { chainId: 5003, defaultRpc: "https://rpc.sepolia.mantle.xyz", explorer: "https://sepolia.mantlescan.xyz" },
  "mantle": { chainId: 5000, defaultRpc: "https://rpc.mantle.xyz", explorer: "https://mantlescan.xyz" },
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

async function main() {
  const networkName = arg("network", "mantle-sepolia");
  const network = NETWORKS[networkName];
  if (!network) throw new Error(`Unknown --network ${networkName}. Use one of: ${Object.keys(NETWORKS).join(", ")}`);

  const agentURI = arg("agent-uri", "https://fleepit.xyz/api/agent-card");
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL || network.defaultRpc;
  if (!privateKey) throw new Error("Set DEPLOYER_PRIVATE_KEY in the environment (a fresh wallet dedicated to this deploy, never a wallet holding real funds until you've verified everything on testnet).");

  const artifactPath = path.join(__dirname, "build", "AgentIdentityRegistry.json");
  if (!fs.existsSync(artifactPath)) throw new Error("Run `npm run compile` first.");
  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  const chain = { id: network.chainId, name: networkName, nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } };
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  console.log(`Deploying AgentIdentityRegistry to ${networkName} (chain ${network.chainId}) from ${account.address}...`);
  const deployHash = await walletClient.deployContract({ abi, bytecode });
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const registryAddress = deployReceipt.contractAddress;
  console.log(`Registry deployed: ${registryAddress}`);
  console.log(`  tx: ${network.explorer}/tx/${deployHash}`);

  console.log(`Registering Fleepit's identity, agentURI = ${agentURI} ...`);
  const registerHash = await walletClient.writeContract({
    address: registryAddress, abi, functionName: "register", args: [agentURI],
  });
  await publicClient.waitForTransactionReceipt({ hash: registerHash });
  console.log(`Registered. tx: ${network.explorer}/tx/${registerHash}`);

  console.log("\nPaste these into your env vars:\n");
  console.log(`VITE_IDENTITY_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`VITE_AGENT_TOKEN_ID=0`); // first agent registered on a fresh registry is always id 0
  console.log(`VITE_AGENT_CHAIN_ID=${network.chainId}`);
  console.log(`IDENTITY_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`AGENT_ONCHAIN_ADDRESS=${account.address}`);
  console.log(`MANTLE_CHAIN_ID=${network.chainId}`);
  console.log(`\nExplorer: ${network.explorer}/address/${registryAddress}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
