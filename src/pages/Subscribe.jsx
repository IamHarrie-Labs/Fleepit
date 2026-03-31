import { useState } from "react";
import { CheckCircle2, Bell, Newspaper, Gift, Mail, BellRing, Send } from "lucide-react";
import emailjs from "@emailjs/browser";
import { sendTelegramAlert } from "../utils/telegram";
import { cn } from "../lib/utils";
import {
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY,
} from "../config";

const subscriptionOptions = [
  {
    id: "yields",
    label: "New yield opportunity alerts",
    description: "Get notified when high-APY Mantle pools go live",
    icon: Bell,
  },
  {
    id: "news",
    label: "Mantle ecosystem news digest",
    description: "Weekly roundup of the most important Mantle developments",
    icon: Newspaper,
  },
  {
    id: "airdrops",
    label: "Airdrop & campaign announcements",
    description: "Early alerts on Mantle ecosystem incentive programs",
    icon: Gift,
  },
];

const whatYouGet = [
  {
    icon: Bell,
    title: "Yield Alerts",
    desc: "Real-time notifications when new high-APY pools launch on Mantle, so you never miss an opportunity.",
  },
  {
    icon: Newspaper,
    title: "Ecosystem Digest",
    desc: "A curated weekly briefing covering protocol launches, TVL milestones, and ecosystem partnerships.",
  },
  {
    icon: Gift,
    title: "Campaign Intel",
    desc: "Early access to Mantle incentive programs, airdrops, and DeFi campaigns before they go mainstream.",
  },
];

const NOTIFY_FREQS = [
  { id: "off", label: "Off" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
];

// EmailJS is active only when all three keys have been configured
const isEmailJSConfigured =
  EMAILJS_SERVICE_ID  !== "YOUR_SERVICE_ID"  &&
  EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID" &&
  EMAILJS_PUBLIC_KEY  !== "YOUR_PUBLIC_KEY";

export default function Subscribe() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState({ yields: true, news: true, airdrops: false });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Telegram notification preferences
  const [notifyFreq, setNotifyFreq] = useState(
    () => localStorage.getItem("fleepit_notify_freq") || "off"
  );
  const [telegramChatId, setTelegramChatId] = useState(
    () => localStorage.getItem("fleepit_telegram_chat_id") || ""
  );

  const handleFreqChange = (freq) => {
    setNotifyFreq(freq);
    localStorage.setItem("fleepit_notify_freq", freq);
  };

  const handleChatIdSave = (val) => {
    setTelegramChatId(val);
    const trimmed = val.trim();
    if (trimmed) {
      localStorage.setItem("fleepit_telegram_chat_id", trimmed);
    } else {
      localStorage.removeItem("fleepit_telegram_chat_id");
    }
  };

  const lastNotifiedRaw = localStorage.getItem("fleepit_last_notified");
  const lastNotifiedLabel = lastNotifiedRaw
    ? new Date(lastNotifiedRaw).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const toggleOption = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = (ev) => {
    ev.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Load existing subscribers
    const existing = JSON.parse(localStorage.getItem("fleepit_subscribers") || "[]");

    // Check for duplicate
    if (existing.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      setError("This email is already subscribed.");
      return;
    }

    // Save subscription
    // TODO: Replace localStorage with a backend API call (e.g., POST /api/subscribe) for production
    const newEntry = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subscriptions: Object.keys(selected).filter((k) => selected[k]),
      subscribedAt: new Date().toISOString(),
    };
    localStorage.setItem(
      "fleepit_subscribers",
      JSON.stringify([...existing, newEntry])
    );

    const topics = Object.keys(selected)
      .filter((k) => selected[k])
      .join(", ");

    // Send welcome email via EmailJS (skipped if not configured)
    if (isEmailJSConfigured) {
      emailjs
        .send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_name:       newEntry.name,
            to_email:      newEntry.email,
            subscriptions: topics || "none",
          },
          EMAILJS_PUBLIC_KEY
        )
        .catch(() => {
          // Fire-and-forget — don't block subscription UX on email failure
        });
    }

    // Fire Telegram alert to owner (no user chatId passed — this is an owner notification)
    sendTelegramAlert(
      `📬 *New Fleepit Subscriber*\n\n*Name:* ${newEntry.name}\n*Email:* ${newEntry.email}\n*Topics:* ${topics || "none"}`
    );

    setSubmitted(true);
  };

  // ── Notification Preferences card (shared between main + success views) ─────
  const NotificationPrefs = ({ compact = false }) => (
    <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm", compact ? "p-4 mt-6" : "p-6 mt-8")}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("rounded-lg bg-navy/10 flex items-center justify-center", compact ? "w-7 h-7" : "w-8 h-8")}>
          <BellRing size={compact ? 14 : 16} className="text-navy" />
        </div>
        <h2 className={cn("font-semibold text-navy", compact ? "text-sm" : "")}>
          Telegram Notification Digest
        </h2>
      </div>

      {!compact && (
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Receive a curated digest of the top 2–3 investment-grade Mantle pools with AI verdicts — sent directly to your Telegram.
        </p>
      )}

      {/* Frequency pills */}
      <div className="flex gap-2 mb-4">
        {NOTIFY_FREQS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleFreqChange(id)}
            className={cn(
              "flex-1 rounded-xl font-semibold transition-all border",
              compact ? "py-1.5 text-xs" : "py-2.5 text-sm",
              notifyFreq === id
                ? "bg-navy text-white border-navy shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-navy/30 hover:text-navy"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Last sent timestamp */}
      {lastNotifiedLabel && notifyFreq !== "off" && (
        <p className="text-xs text-gray-400 mb-3">
          Last alert sent: {lastNotifiedLabel}
        </p>
      )}

      {/* Telegram Chat ID input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Your Telegram Chat ID
        </label>
        <input
          type="text"
          value={telegramChatId}
          onChange={(e) => handleChatIdSave(e.target.value)}
          placeholder="e.g. 123456789"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy placeholder:text-gray-300"
        />
        {/* Setup instructions */}
        <div className="mt-2.5 rounded-xl bg-navy/5 border border-navy/10 p-3">
          <p className="text-xs font-semibold text-navy/70 mb-1.5">How to get your Chat ID:</p>
          <ol className="text-xs text-navy/60 leading-relaxed space-y-0.5">
            <li>1) Search for <span className="font-mono font-semibold">@FleepitAlertBot</span> on Telegram and press Start</li>
            <li>2) Send <span className="font-mono font-semibold">/start</span> to the bot</li>
            <li>3) Your Chat ID appears in the reply — or use <span className="font-mono font-semibold">@userinfobot</span></li>
            <li>4) Paste it in the field above</li>
          </ol>
        </div>
      </div>

      {/* Info note */}
      <div className="rounded-xl bg-navy/5 border border-navy/10 p-3">
        <p className="text-xs text-navy/70 leading-relaxed">
          Alerts fire when you open Fleepit and your chosen interval has elapsed.{" "}
          {isEmailJSConfigured
            ? "Email alerts active — check your inbox after subscribing."
            : "Email digest integration coming soon."}
        </p>
      </div>
    </div>
  );

  // ── Success view ─────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-md mx-auto pt-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-navy mb-2">You're in.</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          You're now subscribed to Mantle intelligence. Welcome to the Fleepit community.
          {isEmailJSConfigured && (
            <> Check your inbox for a welcome email.</>
          )}
        </p>
        <button
          onClick={() => { setSubmitted(false); setEmail(""); setName(""); }}
          className="mt-6 text-sm text-navy font-medium hover:underline"
        >
          Subscribe another email →
        </button>

        <NotificationPrefs compact />
      </div>
    );
  }

  // ── Main subscribe view ───────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Stay Ahead</h1>
        <p className="text-gray-500 text-sm mt-1">
          Get Mantle intelligence delivered to your inbox
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
              <Mail size={16} className="text-navy" />
            </div>
            <h2 className="font-semibold text-navy">Subscribe</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Satoshi Nakamoto"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy placeholder:text-gray-300"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy placeholder:text-gray-300"
              />
            </div>

            {/* Checkboxes */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                What would you like to receive?
              </p>
              <div className="space-y-2">
                {subscriptionOptions.map(({ id, label, description, icon: Icon }) => (
                  <label
                    key={id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:border-navy/20 hover:bg-navy/2 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selected[id]}
                      onChange={() => toggleOption(id)}
                      className="mt-0.5 accent-navy"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Icon size={13} className="text-navy" />
                        <span className="text-sm font-medium text-gray-800">{label}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-navy text-white font-semibold text-sm hover:bg-navy/90 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Send size={15} />
              Subscribe to Fleepit
            </button>

            <p className="text-xs text-center text-gray-400">
              No spam. Unsubscribe any time.
              {isEmailJSConfigured && " A welcome email will be sent to your inbox."}
            </p>
          </form>
        </div>

        {/* What you'll get */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            What you'll get
          </h3>
          <div className="space-y-4">
            {whatYouGet.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-navy/8 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-navy" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy mb-1">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-navy/5 border border-navy/10">
            <p className="text-xs text-navy/70 text-center">
              Join the Mantle intelligence community. Free forever.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <NotificationPrefs />
    </div>
  );
}
