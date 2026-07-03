/**
 * Reads Fleepit's on-chain identity (ERC-8004 style Identity Registry token)
 * straight off Mantle RPC — same hand-rolled JSON-RPC fetch() pattern as
 * src/lib/agentTools.js's rpc(), no ABI library needed for two fixed calls
 * (ownerOf, tokenURI). Read-only: no signing, no wallet connection.
 */
import { MANTLE_RPC_URL, IDENTITY_REGISTRY_ADDRESS, AGENT_TOKEN_ID, AGENT_CHAIN_ID } from "../config";

async function rpc(method, params = []) {
  const res = await fetch(MANTLE_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  return j.result;
}

const pad32 = (hex) => hex.replace(/^0x/, "").padStart(64, "0");
// keccak256("ownerOf(uint256)") / keccak256("tokenURI(uint256)") selectors
const SELECTOR_OWNER_OF = "0x6352211e";
const SELECTOR_TOKEN_URI = "0xc87b56dd";

function decodeAddress(resultHex) {
  if (!resultHex || resultHex === "0x") return null;
  return "0x" + resultHex.slice(-40);
}

function decodeString(resultHex) {
  if (!resultHex || resultHex === "0x") return null;
  const data = resultHex.slice(2);
  const lenWordStart = 64; // first word is the offset (always 0x20 for a single string return), second is length
  const len = parseInt(data.slice(lenWordStart, lenWordStart + 64), 16);
  const strHex = data.slice(lenWordStart + 64, lenWordStart + 64 + len * 2);
  const bytes = strHex.match(/.{1,2}/g) || [];
  return bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("");
}

export async function getAgentIdentity() {
  if (!IDENTITY_REGISTRY_ADDRESS) return { deployed: false };

  const tokenIdHex = "0x" + BigInt(AGENT_TOKEN_ID).toString(16);
  const callData = (selector) => selector + pad32(tokenIdHex);

  try {
    const [ownerResult, uriResult] = await Promise.all([
      rpc("eth_call", [{ to: IDENTITY_REGISTRY_ADDRESS, data: callData(SELECTOR_OWNER_OF) }, "latest"]),
      rpc("eth_call", [{ to: IDENTITY_REGISTRY_ADDRESS, data: callData(SELECTOR_TOKEN_URI) }, "latest"]),
    ]);
    return {
      deployed: true,
      registry: IDENTITY_REGISTRY_ADDRESS,
      tokenId: AGENT_TOKEN_ID,
      chainId: AGENT_CHAIN_ID,
      owner: decodeAddress(ownerResult),
      tokenUri: decodeString(uriResult),
    };
  } catch (e) {
    return { deployed: true, registry: IDENTITY_REGISTRY_ADDRESS, error: e.message || "RPC lookup failed" };
  }
}
