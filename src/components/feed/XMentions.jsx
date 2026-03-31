import { X, Heart, ExternalLink } from "lucide-react";

const mentions = [
  {
    handle: "@Mantle_Official",
    name: "Mantle",
    content: "Mantle Network continues to grow its DeFi ecosystem with new protocol integrations and rising TVL. The future of Ethereum L2 is here. 🔥",
    time: "2h ago",
    likes: 1204,
    verified: true,
  },
  {
    handle: "@0xMantleWhale",
    name: "Mantle Whale",
    content: "Just deployed a new LP strategy on Mantle. The gas fees are practically zero compared to mainnet — this is how DeFi should feel.",
    time: "4h ago",
    likes: 342,
    verified: false,
  },
  {
    handle: "@DeFiAnalyst",
    name: "DeFi Analyst",
    content: "mETH protocol's staking APY has been consistently competitive. Worth watching as the Mantle ecosystem matures and TVL compounds.",
    time: "6h ago",
    likes: 587,
    verified: false,
  },
  {
    handle: "@CryptoResearch",
    name: "Crypto Research",
    content: "FBTC on Mantle is unlocking Bitcoin liquidity for DeFi in ways we haven't seen before. This is a major narrative going into Q2.",
    time: "8h ago",
    likes: 891,
    verified: false,
  },
];

export default function XMentions() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <X size={14} className="text-white" />
          </div>
          <h3 className="font-semibold text-navy text-sm">Latest X Mentions</h3>
        </div>
        <a
          href="https://x.com/Mantle_Official"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-navy font-medium hover:underline"
        >
          Follow <ExternalLink size={11} />
        </a>
      </div>

      <div className="space-y-3">
        {mentions.map((m, i) => (
          <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-navy/10 flex items-center justify-center text-xs font-bold text-navy">
                {m.name[0]}
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-900">{m.name}</span>
                <span className="text-xs text-gray-400 ml-1">{m.handle}</span>
              </div>
              <span className="ml-auto text-xs text-gray-400">{m.time}</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed mb-2">{m.content}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Heart size={11} />
              {m.likes.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          For live updates follow{" "}
          <a
            href="https://x.com/Mantle_Official"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy font-medium hover:underline"
          >
            @Mantle_Official
          </a>
        </p>
      </div>
    </div>
  );
}
