/**
 * Mantle Roadmap — all milestones verified from official sources:
 * mantle.xyz, group.mantle.xyz, Messari Q4 2024/Q2 2025, Nansen Q4 2025,
 * CryptoSlate, Decrypt, PRNewswire, Chainwire (Dec 2025)
 *
 * Last updated: March 2026
 */

export const ROADMAP = [

  // ── 2023 · Foundation ────────────────────────────────────────────────────────

  {
    id: "testnet-launch",
    title: "Mantle Testnet Launch",
    date: "January 2023",
    icon: "Rocket",
    status: "completed",
    description:
      "The Mantle testnet went live in January 2023, opening the network to developers ahead of mainnet. It was one of the first modular Ethereum L2 testnets, built on a design separating execution, data availability, and consensus layers.",
    whyItMatters:
      "The testnet stress-tested the architecture that every Mantle DeFi protocol runs on today. Bugs caught here never reached user funds on mainnet.",
  },

  {
    id: "bitdao-merger",
    title: "BitDAO Merger & MNT Rebrand",
    date: "May 2023",
    icon: "Coins",
    status: "completed",
    description:
      "A community vote merged the entire BitDAO ecosystem — one of crypto's largest DAOs by treasury — under the Mantle brand. BIT token holders received MNT at a 1:1 ratio, consolidating a multi-billion dollar treasury and governance structure into a single unified network.",
    whyItMatters:
      "The merger handed Mantle one of DeFi's largest war chests, funding years of ecosystem grants, the EcoFund, and liquidity incentives without relying on external capital raises.",
  },

  {
    id: "mainnet-alpha",
    title: "Mainnet Alpha Launch at EthCC",
    date: "July 17, 2023",
    icon: "Rocket",
    status: "completed",
    description:
      "Mantle Network launched its Mainnet Alpha at EthCC Paris on July 17, 2023, alongside a $200 million ecosystem fund. The launch opened the chain to live DeFi protocols and marked the formal birth of the Mantle ecosystem.",
    whyItMatters:
      "Every yield pool on the Fleepit dashboard today exists because of this moment. The $200M fund bootstrapped the protocols that provide the APYs you see tracked here.",
  },

  {
    id: "meth-launch",
    title: "mETH Protocol Launch",
    date: "December 2023",
    icon: "Layers",
    status: "completed",
    description:
      "Mantle launched mETH, its native liquid staking token. Users deposit ETH and receive mETH — a yield-bearing asset that retains full composability across Mantle DeFi, meaning stakers no longer sacrifice yield by participating in DeFi protocols.",
    whyItMatters:
      "mETH became the backbone of Mantle DeFi liquidity. It unlocked a capital-efficient loop — stake ETH, use mETH in lending markets, earn dual yield — which is the core strategy behind many of the highest-APY pools on Fleepit.",
  },

  // ── 2024 · Growth ────────────────────────────────────────────────────────────

  {
    id: "v2-tectonic",
    title: "Mantle V2 Tectonic — OP Stack Bedrock",
    date: "March 2024",
    icon: "Zap",
    status: "completed",
    description:
      "Mantle V2 Tectonic migrated the network to Optimism's OP Stack Bedrock, significantly improving compatibility, developer tooling, and transaction throughput. The upgrade made Mantle fully EVM-equivalent and broadened the pool of protocols able to deploy natively.",
    whyItMatters:
      "OP Stack compatibility meant any protocol already deployed on Optimism or Base could port to Mantle with minimal changes — accelerating ecosystem growth and TVL far faster than building from scratch.",
  },

  {
    id: "fbtc-launch",
    title: "FBTC — Omnichain Bitcoin Asset",
    date: "July 2024",
    icon: "TrendingUp",
    status: "completed",
    description:
      "FBTC launched as Mantle's native omnichain Bitcoin asset, enabling BTC holders to earn real DeFi yields on Mantle without bridging to synthetic wrappers on other chains. FBTC became a foundational collateral asset across Mantle's lending and liquidity protocols.",
    whyItMatters:
      "Bitcoin is the largest crypto asset by market cap. FBTC opened an entirely new depositor class — BTC holders seeking yield — adding trillions in addressable capital to the Mantle ecosystem.",
  },

  {
    id: "meth-top4-tvl-ath",
    title: "mETH Hits #4 LST · TVL All-Time High $2.36B",
    date: "Q3–Q4 2024",
    icon: "Trophy",
    status: "completed",
    description:
      "mETH Protocol became the 4th largest ETH liquid staking protocol by TVL globally — a remarkable achievement within its first year. mETH also introduced restaking capabilities, compounding user yields. On December 9, 2024, Mantle's total TVL reached an all-time high of $2.36 billion.",
    whyItMatters:
      "Reaching #4 in ETH liquid staking within one year validated Mantle's approach. The $2.36B TVL brought Mantle into institutional conversations and improved pool depth across the entire ecosystem.",
  },

  {
    id: "zk-validity-rollup",
    title: "First OP Stack L2 as ZK Validity Rollup",
    date: "December 2024",
    icon: "Shield",
    status: "completed",
    description:
      "Mantle became the first OP Stack L2 to advance its technical roadmap toward a ZK Validity Rollup using Succinct's SP1 zkVM. This placed Mantle on a path to reducing withdrawal finality from 7 days to approximately 1 hour — a fundamental security and UX improvement.",
    whyItMatters:
      "ZK proofs eliminate the need to trust optimistic fraud assumptions. Faster finality means capital moves more efficiently between Mantle and other chains, reducing the premium users pay for liquidity locked during challenge windows.",
  },

  // ── 2025 · Expansion ─────────────────────────────────────────────────────────

  {
    id: "gas-eigenda-upgrade",
    title: "Gas Optimisation & EigenDA Integration",
    date: "June 2025",
    icon: "Zap",
    status: "completed",
    description:
      "On June 28, 2025, Mantle deployed gas fee and L2 fee optimisations — improving gas price accuracy and introducing strategies that meaningfully reduced transaction costs for users. EigenDA, the external data availability layer from EigenLayer, was fully integrated as part of this infrastructure modernisation.",
    whyItMatters:
      "Lower gas directly improves net yield returns for liquidity providers. When protocol overhead drops, more value flows to depositors — making Mantle pools more attractive in real APY terms vs. competing L2s.",
  },

  {
    id: "bybit-integration",
    title: "Bybit Deep Integration",
    date: "August 2025",
    icon: "Building2",
    status: "completed",
    description:
      "In August 2025, Mantle became the heart of Bybit's on-chain ecosystem. Bybit — one of the world's largest crypto exchanges — deepened its integration with Mantle Network, directing significant liquidity and user activity on-chain and establishing key strategic advisors from within the exchange.",
    whyItMatters:
      "Bybit integration brought exchange-scale distribution to Mantle DeFi. Retail and institutional Bybit users gained direct pathways to Mantle yield pools, significantly expanding the top-of-funnel for TVL and protocol activity.",
  },

  {
    id: "rwa-megalaunch",
    title: "RWA Mega Launch — Aave, Anchorage, Ethena & More",
    date: "October 2025",
    icon: "Landmark",
    status: "completed",
    description:
      "In October 2025, Mantle went all-in on Real World Assets with a wave of major integrations: Aave (lending), Anchorage Digital (institutional custody), Backed Finance and xStocks (tokenised equities), DMZ Finance, Ethena, Agora, and Securitize. This made Mantle the most RWA-integrated L2 by number of live partners.",
    whyItMatters:
      "RWAs bring yield that is uncorrelated to crypto market cycles — T-bill rates, credit spreads, tokenised equity dividends. For large capital allocators needing compliant, stable returns, this made Mantle the natural on-chain destination.",
  },

  {
    id: "global-hackathon",
    title: "First Global Hackathon — 900+ Developers",
    date: "October 2025",
    icon: "Users",
    status: "completed",
    description:
      "Mantle's first global developer hackathon launched in October 2025, rapidly surpassing 900 developer registrations. The event was accompanied by the launch of the RWA Scholars Program, which debuted at CCCC Lisbon in November 2025.",
    whyItMatters:
      "Developer mindshare is the long-term leading indicator for protocol growth. 900+ hackathon participants represent a pipeline of future protocols, tools, and integrations that will expand the Mantle DeFi stack.",
  },

  // ── 2026 · Present & Future ───────────────────────────────────────────────────

  {
    id: "eigenda-proxy-aave-1b",
    title: "EigenDA Proxy Upgrade + Aave Crosses $1B",
    date: "Q1 2026",
    icon: "BarChart3",
    status: "completed",
    description:
      "On January 14, 2026, the Sepolia Everest upgrade integrated a new EigenDA proxy and doubled blob capacity, improving data throughput and network stability. On March 2, 2026, Mantle's Aave lending market crossed $1 billion in deposits in under three weeks — a record for any lending market launch.",
    whyItMatters:
      "The $1B Aave milestone in three weeks is one of the fastest lending market ramp-ups in DeFi history. It signals deep institutional trust and positions Mantle as the go-to chain for large-scale, structured lending.",
  },

  {
    id: "eigenda-v2-zk-production",
    title: "EigenDA v2 + ZK Rollup Full Production",
    date: "Q2 2026",
    icon: "Shield",
    status: "in-progress",
    description:
      "Mantle is working to bring EigenDA v2 — which allows users to verify data publication without trusting the sequencer — to mainnet. Simultaneously, the full production deployment of OP-Succinct (ZK validity proofs on mainnet) is advancing, targeting near-instant 1-hour finality to replace the 7-day optimistic window.",
    whyItMatters:
      "EigenDA v2 removes trust assumptions from the data layer. Combined with ZK proofs on execution, Mantle moves to a trust-minimised architecture that can credibly compete with Ethereum mainnet for institutional capital requiring the highest security guarantees.",
  },

  {
    id: "custom-execution-clients",
    title: "Custom Execution Clients — RETH & REVM",
    date: "Q2–Q3 2026",
    icon: "Zap",
    status: "upcoming",
    description:
      "Mantle is building custom execution clients using RETH and REVM to dramatically improve transaction throughput and gas efficiency. These clients replace the default OP Stack execution layer with purpose-built Rust implementations optimised for Mantle's workload.",
    whyItMatters:
      "Custom execution clients unlock significantly higher TPS and lower latency — the infrastructure needed to support institutional-scale trading, RWA settlement, and AI agent activity without bottlenecks.",
  },

  {
    id: "chain-abstraction-taas",
    title: "Chain Abstraction & Tokenization-as-a-Service",
    date: "Q3 2026",
    icon: "Landmark",
    status: "upcoming",
    description:
      "Mantle's Tokenization-as-a-Service (TaaS) platform will provide a structured pathway for institutional issuers to bring RWAs on-chain. Chain abstraction infrastructure will allow users to interact with Mantle applications without managing gas, bridging, or wallet complexity.",
    whyItMatters:
      "TaaS removes the technical barrier for asset managers and banks to tokenise funds and credit instruments on Mantle. Chain abstraction makes those products accessible to non-crypto-native users at scale.",
  },

  {
    id: "ai-defi-agents",
    title: "AI-Powered On-Chain DeFi Agents",
    date: "Q4 2026",
    icon: "Bot",
    status: "upcoming",
    description:
      "On-chain AI agents will autonomously monitor yield opportunities, rebalance positions across Mantle pools, and execute strategies in response to real-time APY shifts and risk signals. This is the next evolution of intelligence tools like Fleepit — from surfacing insights to autonomous execution.",
    whyItMatters:
      "AI agents collapse the gap between insight and action. Instead of manually acting on an APY surge alert, users delegate to agents that respond in real time — capturing opportunities that exist only for minutes before the market normalises.",
  },
];
