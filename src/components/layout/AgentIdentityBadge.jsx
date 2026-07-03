import { useState, useEffect } from "react";
import { getAgentIdentity } from "../../lib/agentIdentity";

const EXPLORERS = { 5000: "https://mantlescan.xyz", 5003: "https://sepolia.mantlescan.xyz" };

// Matches the dark-footer link styling already used in Landing.jsx.
const linkStyle = { fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color 0.2s" };

/**
 * Read-only on-chain identity badge. Renders nothing until a registry is
 * actually deployed and configured — never shows a placeholder or fake
 * identity, since that would be exactly the kind of fabricated state this
 * project avoids everywhere else.
 */
export default function AgentIdentityBadge({ className }) {
  const [identity, setIdentity] = useState(null);

  useEffect(() => {
    getAgentIdentity().then(setIdentity);
  }, []);

  if (!identity || !identity.deployed) return null;

  if (identity.error) {
    return <span style={{ ...linkStyle, color: "rgba(255,255,255,0.28)" }}>Agent identity lookup unavailable</span>;
  }

  const explorer = EXPLORERS[identity.chainId] || EXPLORERS[5000];
  return (
    <a
      href={`${explorer}/token/${identity.registry}?a=${identity.tokenId}`}
      target="_blank"
      rel="noreferrer"
      className={className}
      style={linkStyle}
    >
      ERC-8004 Agent #{identity.tokenId} →
    </a>
  );
}
