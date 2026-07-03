import { describe, it, expect } from "vitest";
import { isStablecoin, classifyRisk, fmtUsd, findPools } from "./agentTools";

describe("isStablecoin", () => {
  it("flags known stablecoin symbols regardless of price", () => {
    expect(isStablecoin({ symbol: "USDT", current_price: 1.4 })).toBe(true);
    expect(isStablecoin({ symbol: "usdc", current_price: 0.9 })).toBe(true);
  });

  it("flags an unlisted token that is both near a dollar and named like a stablecoin", () => {
    expect(isStablecoin({ symbol: "xusd", name: "Some USD Token", current_price: 1.0 })).toBe(true);
  });

  it("does not flag a normal token trading near a dollar with no stablecoin naming", () => {
    expect(isStablecoin({ symbol: "mnt", name: "Mantle", current_price: 1.0 })).toBe(false);
  });

  it("does not flag a dollar-named token that is not actually trading near a dollar", () => {
    expect(isStablecoin({ symbol: "zusd", name: "Some USD Token", current_price: 5.2 })).toBe(false);
  });

  it("does not flag a normal growth token", () => {
    expect(isStablecoin({ symbol: "mnt", name: "Mantle", current_price: 0.43 })).toBe(false);
  });
});

describe("classifyRisk", () => {
  it("is high when impermanent loss risk is flagged", () => {
    expect(classifyRisk({ ilRisk: "yes", apy: 5 })).toBe("high");
  });

  it("is high when the APY is above 50", () => {
    expect(classifyRisk({ apy: 80 })).toBe("high");
  });

  it("is medium when the APY is between 15 and 50", () => {
    expect(classifyRisk({ apy: 20 })).toBe("medium");
  });

  it("is low for a modest, non-IL-risk APY", () => {
    expect(classifyRisk({ apy: 8 })).toBe("low");
  });

  it("treats a missing APY as low risk", () => {
    expect(classifyRisk({})).toBe("low");
  });
});

describe("fmtUsd", () => {
  it("formats billions", () => {
    expect(fmtUsd(2_500_000_000)).toBe("$2.50B");
  });
  it("formats millions", () => {
    expect(fmtUsd(3_400_000)).toBe("$3.4M");
  });
  it("formats thousands", () => {
    expect(fmtUsd(45_000)).toBe("$45K");
  });
  it("formats small values plainly", () => {
    expect(fmtUsd(120)).toBe("$120");
  });
  it("treats zero and falsy values as $0", () => {
    expect(fmtUsd(0)).toBe("$0");
    expect(fmtUsd(null)).toBe("$0");
  });
});

describe("findPools", () => {
  const pools = [
    { pool: "1", symbol: "USDT", project: "aave-v3", tvlUsd: 1000 },
    { pool: "2", symbol: "USDT-USDC", project: "fluxion-network", tvlUsd: 500 },
    { pool: "3", symbol: "MNT", project: "merchant-moe", tvlUsd: 2000 },
  ];

  it("returns an exact symbol match first", () => {
    const result = findPools(pools, "usdt");
    expect(result[0].pool).toBe("1");
  });

  it("matches on project name", () => {
    const result = findPools(pools, "merchant-moe");
    expect(result[0].pool).toBe("3");
  });

  it("returns nothing for an empty query", () => {
    expect(findPools(pools, "")).toEqual([]);
  });

  it("returns nothing when nothing matches", () => {
    expect(findPools(pools, "nonexistent-protocol")).toEqual([]);
  });
});
