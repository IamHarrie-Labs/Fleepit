# I Named My API Key Wrong, Hit CORS Walls, and Still Shipped a DeFi Intelligence Platform on Mantle — Here's Exactly How

*A raw, honest walkthrough of building Fleepit — from frustration to full product — using AI as my development partner.*

---

There's a line in my code that still makes me cringe every time I open the file.

```js
export const GEMINI_API_KEY = "gsk_VYqDkQo41...";
```

That variable is named `GEMINI_API_KEY`. It has never, not even for one second, held a Gemini key. That is a Groq API key. I named it wrong on day one, it spread across eight different files, and I only caught it when I was writing this article.

That kind of thing is the real story of building Fleepit. Not the clean version. The real version.

---

## What Is Fleepit?

[IMG-1: Fleepit dashboard — full view showing pool list]

Fleepit is a yield intelligence platform built specifically for the Mantle blockchain. The idea is simple: Mantle has over 80 active DeFi protocols, APYs ranging from 3% stablecoin vaults to 400%+ liquidity incentive pools, and a growing TVL that keeps attracting new capital. But there was almost no good tooling to help people navigate that.

DeFiLlama covers Mantle, but it covers a thousand other chains too. Finding Mantle-specific opportunities meant manually filtering, opening multiple tabs, reading Discord announcements, and still not knowing if the APY you found was real or about to disappear in two weeks.

Fleepit was built to solve exactly that. It shows you every Mantle pool in one place, tells you whether it's risky, lets an AI analyze it for you, and alerts you via Telegram the moment something changes.

That was the idea. Getting there was a different story.

---

## How the Build Started — and Where It Immediately Got Complicated

The stack was straightforward: React 19, Vite, Tailwind CSS, Radix UI for components. For AI, I chose Groq running the Llama 3.3-70b model — fast inference, large context, and honestly one of the best free-tier AI APIs available right now.

This is where I made the first mistake. I had been looking at using Google Gemini initially, then switched to Groq. I renamed the model, updated the endpoint, swapped the key — but I forgot to rename the variable. So for the entire build, every file that needed the AI key imported something called `GEMINI_API_KEY` that was secretly a Groq key.

[IMG-2: config.js open in editor — showing GEMINI_API_KEY holding a gsk_ prefixed Groq key]

The app worked perfectly. But the name was wrong across the whole codebase. It's the kind of thing that would never cause a bug, and would also permanently confuse anyone who read the code. I'm fixing it after the contest.

---

## Feature 1: The Pool Dashboard

The first thing I built was the core pool data feed. Fleepit pulls live pool data from DeFiLlama's yields API every five minutes and filters it down to Mantle-only results. You get the pool name, protocol, current APY, TVL, reward tokens, and a risk classification.

[IMG-10: Pool cards showing Low / Medium / High risk badges on the dashboard]

The risk classification logic is hardcoded and I want to be transparent about that:

- High risk: APY above 50%, or the pool has impermanent loss risk flagged
- Medium risk: APY between 15% and 50%
- Low risk: APY below 15%, no impermanent loss risk

Is that a perfect risk model? No. But it's honest, it's consistent, and it gives users a starting point that's better than nothing.

The bigger problem with this feature was the first-fetch bug. When the app loads, it takes a snapshot of all current pools. When it fetches again five minutes later, it compares the new data against the snapshot to detect new pools or APY surges. On the very first load, though, there's no snapshot — so the code was comparing every single pool against an empty list and firing "NEW POOL DETECTED" alerts for all 80+ protocols at once.

[IMG-7: usePools.js code showing the isFirstFetch.current guard fix]

The fix was simple once I found it: skip event detection on the very first load. Only start comparing on the second fetch onward. One boolean flag — isFirstFetch.current — solved the whole problem. But before that fix, opening the app would flood your Telegram with 80 fake alerts the moment the page loaded.

---

## Feature 2: AI Pool Analysis

This is the feature I'm most proud of, and also the one that gave me the most trouble.

[IMG-3: AI Analysis modal showing a pool verdict with risk assessment]

When you click "Analyze with AI" on any pool, the app sends the pool's data — APY, TVL, chain, protocol, reward tokens, risk tier — to Groq's API and asks for an investor verdict. Simple concept. The problem was what came back.

AI models, especially Llama, love using markdown formatting in their responses. The verdict would come back looking like this:

**Opportunity Summary:** This pool offers a 47% APY...
**Risk Flag:** High impermanent loss risk due to...
**Verdict:** Moderate risk, suitable for...

When that text rendered in my React component, the asterisks showed up as literal characters. Users were seeing **Verdict:** on screen instead of a clean label.

[IMG-8: Browser showing raw AI response with **bold** asterisks visible as plain text]

I had to write a regex cleanup that strips the markdown formatting before displaying it:

const cleaned = line.replace(/\*\*(.*?)\*\*/g, "$1");

That fixed the visual issue. But then I hit the next problem: the AI didn't always use the same section names. Sometimes it said "Opportunity Summary," sometimes just "Summary." Sometimes "Risk Flag," sometimes "Risks." I had to build a regex parser that tried multiple variations of each section header before falling back to splitting the text by double line breaks.

Is it perfect? No. It works about 95% of the time. The other 5% falls back to showing the raw text in a plain block. It's not elegant, but it's honest.

---

## Feature 3: Portfolio Allocator

[IMG-4: Portfolio Allocator showing sample capital input and allocation output with dollar amounts]

The Portfolio Allocator is where Fleepit goes from being a data viewer to being an actual decision-support tool. You enter how much capital you want to deploy and your risk profile — conservative, balanced, or aggressive — and the AI builds a specific allocation strategy across three or four pools.

The output includes the exact dollar amount per pool, a blended APY calculation, a 12-month earnings projection, and the reasoning behind the strategy.

Building this was cleaner than the pool analysis feature because I learned from the previous markdown problems. I structured the AI prompt more precisely and told it exactly what format to return the answer in. It still sometimes deviated, but less often.

The real limitation here is that there's no portfolio tracking after you decide. Fleepit tells you where to put your money, but it doesn't follow up to check if those positions are performing. That's on the roadmap.

---

## Feature 4: Ecosystem Feed and AI Briefing

[IMG-5: Ecosystem Feed page showing news cards from multiple sources]

Knowing which pools exist is only half the picture. You also need to know what's happening in the ecosystem — new protocol launches, governance changes, security incidents, liquidity shifts. That's what the Ecosystem Feed is for.

The feed pulls from five RSS sources: Mantle's official blog, CoinDesk, The Block, Cointelegraph, and Decrypt. Every five minutes it refreshes and filters articles for Mantle-relevant keywords.

This is where I ran into the CORS problem.

Most RSS feeds work fine through the rss2json API service. But Mantle's Medium blog returned CORS errors every single time I tried to fetch it directly. Medium's servers reject cross-origin requests from the browser. The fix was to route the request through allorigins.win, a proxy service that strips the CORS headers:

fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(mediumUrl)}&t=${Date.now()}`)

The &t=${Date.now()} at the end is a cache-busting trick. Without it, the proxy would cache the RSS response for hours and return stale news. With it, every fetch is treated as a brand new request.

It works. It's not ideal — it adds a dependency on a third-party proxy service I don't control. But it gets the job done.

The AI Briefing feature, which auto-generates a three-point ecosystem summary every two hours from the top feed items, had the same markdown rendering issues as the pool analysis. Same fix, same regex, applied in both places.

---

## Feature 5: Telegram Alerts

[IMG-6: Telegram notification received on phone — showing APY surge alert]

Real-time alerting was the feature that made everything else feel useful. If you're not watching the dashboard constantly, you need the dashboard to come to you. Fleepit does this through a Telegram bot.

When a new pool launches on Mantle, you get an immediate notification. When a pool's APY surges by 25% or more relative to the last snapshot, you get an alert. You can also subscribe to daily or weekly digests that summarize the top pools.

The 25% threshold was not an obvious choice. I started at 10%, which was too noisy — normal pool fluctuations triggered it constantly. I moved to 50%, which was too quiet — meaningful surges slipped through. 25% ended up being the right balance after testing.

The Telegram integration had one persistent issue: the owner notification system — which is supposed to alert me personally when someone new subscribes — never worked during testing. The reason was that the fallback Chat ID in the config was still set to the placeholder string "YOUR_CHAT_ID". The code had a guard clause that silently returned without sending anything if the chat ID was a placeholder, so there was no error message, no crash — it just did nothing.

Silent failures are easy to miss exactly because they're silent. I found this by adding a temporary debug log, traced it back to the placeholder, and filled in the correct ID.

---

## Feature 6: Email Subscriptions

[IMG-9: Subscribe page showing email input form and notification topic checkboxes]

The email subscription system lets users sign up for three types of notifications: new yield opportunity alerts, weekly ecosystem digests, and airdrop and campaign announcements.

I'll be honest about the state of this feature: it's not fully wired up. The subscription data is stored in localStorage — which means it lives only in the user's browser and disappears if they clear their history. The welcome email system uses EmailJS, but the service credentials are still placeholder strings in the config because I ran out of time to set up the full EmailJS account during the build.

The code handles this gracefully — there's a check that detects unfilled placeholders and skips the email send rather than crashing. Users see the success confirmation in the UI, but the backend infrastructure to actually deliver emails to a real list isn't there yet.

// TODO: Replace localStorage with a backend API call for production

That comment is still in the code. It's the most honest line in the whole project.

---

## What the Agentic Workflow Actually Looked Like

Every feature in this project was built with AI assistance. Not "I pressed Tab to autocomplete a variable name" — I mean actual back-and-forth where I described what I needed, the AI scaffolded an implementation, I read it critically, found the parts that didn't fit, redirected, and iterated. Tight loops. Fast output.

The CORS workaround for Medium? I described the problem in plain language, the AI suggested the allorigins proxy approach. The first-fetch noise problem? I explained what was happening, the AI proposed the isFirstFetch.current flag pattern. The markdown cleanup regex? The AI wrote it, I tested it in the browser, it worked.

What the AI did not do: make architectural decisions, choose which APIs to use, decide what the risk thresholds should be, or catch the naming mistake I made on day one. Those were all on me.

The honest version of agentic development is that it compresses your execution time significantly, but it does not compress your judgment. Every generated function still needed to be read, understood, and tested before it went into the app. When I got lazy about that step, bugs slipped through — and I had to find them the slow way.

---

## What Fleepit Does Right Now

Here's the full feature list as it stands today, working and live:

- Pool Dashboard — 80+ Mantle protocols, live APY and TVL, risk classification, 5-minute auto-refresh
- AI Pool Analysis — one-click Groq/Llama verdict for any pool
- Portfolio Allocator — capital deployment strategy with blended APY and 12-month earnings projection
- Ecosystem Feed — multi-source DeFi news filtered for Mantle, with AI briefings auto-generated every two hours
- Telegram Alerts — real-time new pool notifications and APY surge alerts, plus daily/weekly digest subscriptions
- Email Subscriptions — signup flow with topic preferences (email delivery pending backend)
- MNT Price Ticker — live MNT/USD price and 24-hour change in the header
- Mantle Roadmap — timeline of ecosystem milestones from mainnet launch through the upcoming zkEVM migration

---

## Why Mantle

I want to answer this plainly, not as a pitch.

Mantle has real infrastructure that most L2s don't. Native MNT staking that generates actual yield. EigenDA-based data availability that keeps transaction costs low even as activity scales. Institutional backing that signals long-term commitment. A growing protocol count that keeps the yield landscape interesting.

But the tooling around that ecosystem has been lagging behind the infrastructure. That gap — between the quality of what's been built and the quality of the tools to navigate it — is where Fleepit fits. Not as a better DeFiLlama clone. As something Mantle specifically didn't have.

---

## What's Missing and What's Next

I want to be direct about what Fleepit does not do yet:

- No wallet connection — you can see the opportunity landscape but not your actual positions within it
- No historical APY tracking — you can't see how a pool has performed over the past 30 or 90 days
- No email delivery — the subscription system needs a real backend
- No backtesting — you can't verify whether the AI's allocation strategy would have worked historically

These are the next four things I plan to build. In that order.

---

## Closing

I built Fleepit in a compressed sprint, with AI as my development partner and Mantle as the ecosystem I cared most about solving this problem for. The code has a misnamed API key, a CORS workaround that depends on a third-party proxy, and a subscription system that stores data in localStorage instead of a real database.

It also has 80+ protocols tracked in real time, an AI that gives you a pool verdict in seconds, a portfolio allocator that does the math for you, and a Telegram bot that fires the moment something changes while you're offline.

Both of those things are true. That's how software gets built.

If you're allocating capital on Mantle and you're still doing it from a spreadsheet and three Discord tabs — Fleepit was built for you.

---

Built with React 19, Vite, Tailwind CSS, Groq (Llama 3.3-70b), DeFiLlama API, CoinGecko API, and more tabs open than I want to admit.
