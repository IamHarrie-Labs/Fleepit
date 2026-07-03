import { describe, it, expect } from "vitest";
import {
  extractRequestedCount,
  parseRetryAfterSeconds,
  formatWaitDuration,
  sanitizeError,
  selectToolSchemas,
  recoverToolCall,
} from "./researchAgent";

describe("extractRequestedCount", () => {
  it("reads a digit count stated with a keyword noun", () => {
    expect(extractRequestedCount("top 5 tokens on Mantle")).toBe(5);
    expect(extractRequestedCount("give me 10 headlines")).toBe(10);
  });

  it("reads a spelled-out count, as voice transcription often produces", () => {
    expect(extractRequestedCount("give me five good tokens to invest in")).toBe(5);
  });

  it("allows a filler word or two between the count and the noun", () => {
    expect(extractRequestedCount("give me 3 promising yield pools")).toBe(3);
  });

  it("does not mistake a dollar amount for a requested count", () => {
    expect(extractRequestedCount("if I invest $1,000 for 6 months")).toBeNull();
  });

  it("does not mistake a duration for a requested count", () => {
    expect(extractRequestedCount("compare MNT and LINK over the last 6 months")).toBeNull();
  });

  it("returns null when no count is stated", () => {
    expect(extractRequestedCount("best yield pools on mantle")).toBeNull();
  });
});

describe("parseRetryAfterSeconds", () => {
  it("parses plain seconds with a fractional part", () => {
    expect(parseRetryAfterSeconds("Please try again in 4.189999999s.")).toBeCloseTo(4.19, 1);
  });

  it("parses minutes and seconds together", () => {
    expect(parseRetryAfterSeconds("Please try again in 8m19.392s.")).toBeCloseTo(499.392, 2);
  });

  it("parses whole minutes and seconds without a decimal", () => {
    expect(parseRetryAfterSeconds("Please try again in 12m34s.")).toBe(754);
  });

  it("returns null when there is nothing to parse", () => {
    expect(parseRetryAfterSeconds("some unrelated error")).toBeNull();
  });
});

describe("formatWaitDuration", () => {
  it("shows plain seconds under a minute", () => {
    expect(formatWaitDuration(4.19)).toBe("5s");
  });
  it("shows minutes and seconds over a minute", () => {
    expect(formatWaitDuration(499.392)).toBe("8m 20s");
  });
  it("drops the seconds when they land on an exact minute", () => {
    expect(formatWaitDuration(120)).toBe("2m");
  });
});

describe("sanitizeError", () => {
  it("produces a friendly rate limit message with the parsed wait time", () => {
    const msg = sanitizeError(new Error("Rate limit reached. Please try again in 12m34s."));
    expect(msg).toContain("rate limited");
    expect(msg).toContain("12m 34s");
  });

  it("produces a friendly message for a malformed tool call", () => {
    const err = new Error("failed to call a function");
    err.code = "tool_use_failed";
    expect(sanitizeError(err)).toContain("trouble planning a response");
  });

  it("falls back to a generic message for anything else", () => {
    expect(sanitizeError(new Error("network exploded"))).toContain("network exploded");
  });
});

describe("selectToolSchemas", () => {
  const names = (schemas) => schemas.map((s) => s.function.name);

  it("always includes the core research tools", () => {
    const result = names(selectToolSchemas("some vague question"));
    expect(result).toEqual(expect.arrayContaining([
      "get_mantle_tokens", "get_mantle_protocols", "list_mantle_pools", "get_mantle_chain_metrics",
    ]));
  });

  it("adds wallet tools only when the question actually mentions a wallet", () => {
    expect(names(selectToolSchemas("what is 0x1234567890abcdef1234567890abcdef12345678")))
      .toEqual(expect.arrayContaining(["get_wallet_overview", "get_wallet_tokens", "get_address_transactions"]));
    expect(names(selectToolSchemas("best yield pools on mantle"))).not.toContain("get_wallet_overview");
  });

  it("adds the news tool only when the question is actually about news", () => {
    expect(names(selectToolSchemas("any recent news on mantle"))).toContain("get_mantle_news");
    expect(names(selectToolSchemas("top 5 tokens today"))).not.toContain("get_mantle_news");
  });
});

describe("recoverToolCall", () => {
  it("reconstructs a valid tool call from Groq's malformed echoed payload", () => {
    const recovered = recoverToolCall('<function=get_mantle_tokens {"limit": 5}</function>');
    expect(recovered.tool_calls[0].function.name).toBe("get_mantle_tokens");
    expect(JSON.parse(recovered.tool_calls[0].function.arguments)).toEqual({ limit: 5 });
  });

  it("returns null when there is nothing recoverable", () => {
    expect(recoverToolCall(undefined)).toBeNull();
    expect(recoverToolCall("not a function call at all")).toBeNull();
  });
});
