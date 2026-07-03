/**
 * Fleepit Agent — ERC-8004 agent registration file.
 *
 * This is what Fleepit's on-chain identity token's tokenURI resolves to,
 * per the ERC-8004 ("Trustless Agents") spec's registration-file schema.
 * Field names (type/name/description/image/services/registrations/
 * supportedTrust) are fixed by the spec, not ours to rename.
 *
 * The capability list is pulled live from toolSchemas — the same list the
 * LLM sees for tool-calling — so this file can never drift from what the
 * agent actually does.
 */
import { toolSchemas } from "../src/lib/agentTools.js";

export const config = { maxDuration: 10 };

const AGENT_ADDRESS = process.env.AGENT_ONCHAIN_ADDRESS || "";
const REGISTRY_ADDRESS = process.env.IDENTITY_REGISTRY_ADDRESS || "";
const CHAIN_ID = Number(process.env.MANTLE_CHAIN_ID || 5003);
const AGENT_ID = Number(process.env.AGENT_TOKEN_ID ?? 0);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const card = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Fleepit Analyst",
    description:
      "AI-native research agent for the Mantle ecosystem: live token, pool, protocol, gas, wallet, and news data, reasoned over and answered in plain language. Never uses mock data or canned replies — every answer traces back to a live source.",
    image: "https://fleepit.xyz/fleepit-icon.png",
    services: [
      { name: "web", endpoint: "https://fleepit.xyz" },
      { name: "MCP-style tools", endpoint: "https://fleepit.xyz/api/agent-tool", version: "1.0" },
    ],
    x402Support: false,
    active: true,
    capabilities: toolSchemas.map((t) => ({
      name: t.function.name,
      description: t.function.description,
    })),
    registrations: REGISTRY_ADDRESS
      ? [{ agentId: AGENT_ID, agentRegistry: `eip155:${CHAIN_ID}:${REGISTRY_ADDRESS}` }]
      : [],
    supportedTrust: [],
    address: AGENT_ADDRESS,
    source: "github.com/IamHarrie-Labs/Fleepit",
  };

  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json(card);
}
