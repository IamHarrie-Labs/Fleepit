# Fleepit Identity Registry — deploy script

Gives Fleepit a real on-chain identity on Mantle, in the shape ERC-8004
("Trustless Agents") expects: an ERC-721 + URIStorage registry where minting
a token resolves to an off-chain agent registration file.

Mantle has no official ERC-8004 deployment to plug into (the reference repo's
upgradeable contracts also assume an existing v1 deployment to upgrade from —
deploying them standalone would leave them permanently un-initializable), so
`contracts/AgentIdentityRegistry.sol` is a small, plain, non-upgradeable
contract with the same `register(agentURI)` / `Registered` event / `tokenURI`
shape, deployed fresh.

This directory is isolated from the app on purpose: `viem` and `solc` never
touch the Vite build, they only run here, once, from your own machine.

## What you need

- A fresh wallet, used for nothing else. Never reuse a wallet holding real funds.
- Node 18+.
- Testnet MNT first, from a Mantle Sepolia faucet — this whole flow costs
  nothing to prove out. Only fund a mainnet wallet after you've verified the
  testnet deployment end to end.

## Steps

```bash
cd scripts/identity-registry
npm install
npm run compile                 # compiles the .sol with the pure-JS solc package

# Testnet first — free, no real money involved
DEPLOYER_PRIVATE_KEY=0xyour_testnet_wallet_key \
  node deploy.mjs --network mantle-sepolia
```

The script prints the deployed registry address, the mint transaction, and
the exact env vars to paste into `.env` / your Vercel project settings:

```
VITE_IDENTITY_REGISTRY_ADDRESS=0x...
VITE_AGENT_TOKEN_ID=0
VITE_AGENT_CHAIN_ID=5003
IDENTITY_REGISTRY_ADDRESS=0x...
AGENT_ONCHAIN_ADDRESS=0x...
MANTLE_CHAIN_ID=5003
```

Set those, redeploy the app, and the "Agent Identity" badge in the Landing
page footer should resolve against the testnet registry.

## Going to mainnet

Only after the testnet run is fully verified, and only with your explicit
go-ahead — this is real money and a real transaction, so review the gas
estimate first:

```bash
DEPLOYER_PRIVATE_KEY=0xyour_mainnet_wallet_key \
  node deploy.mjs --network mantle
```

Then update the same env vars with the mainnet values (`VITE_AGENT_CHAIN_ID=5000`).

## Notes

- The deployer key never leaves your machine and is never committed. Discard
  it once you're done, or keep it only if you plan to call `setAgentURI`
  later to update the registration file.
- The first agent registered on a freshly deployed registry is always token
  id `0`.
