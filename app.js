// app.js — Brand GPT (Slack + OpenAI)
// Works on Render and locally (Socket Mode)

import pkg from "@slack/bolt";
const { App } = pkg;
import OpenAI from "openai";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// ── Slack (Socket Mode)
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// ── OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Optional: load templates.json if you add one later (won’t crash if missing)
let TEMPLATES = {};
try {
  const raw = fs.readFileSync("./templates.json", "utf8");
  TEMPLATES = JSON.parse(raw);
} catch (_) {
  // no templates.json present — that’s fine
}

// ── Brand system prompt (tone, links, rules)
const BRAND_SYSTEM = `
You are **Brand GPT** for Kevin Gallagher (a.k.a. Uncle Coach Kevin).
Goal: write helpful, on-brand responses about BJJ/MMA, coaching, products, and content.

Voice & style:
- Direct, funny, motivational; expert in BJJ/MMA; practical and clear.
- Short actionable answers first; add context if asked.

Products & links (use when relevant):
- Skool Academy: https://www.skool.com/gracie-trinity-academy
- Leglocks for Dummies: https://leglocks.unclecoachkevin.com

General rules:
- If the user asks for the Skool link, give it (exact URL above).
- If they ask about leglocks course, give the Leglocks link.
- Never claim you can’t share links—use the ones above.
- You do NOT access private data. If asked about personal info, say you don’t store private info and pivot to help.
- If a request matches a known template (if provided), prefer that tone and structure.
`;

// ── Quick intent helpers (fast answers without using tokens)
function contains(text, ...needles) {
  const t = (text || "").toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

// ── Main listener: DMs & mentions
app.message(async ({ message, say, logger }) => {
  try {
    // Ignore non-text and bot echoes
    if (!message?.text || message.subtype === "bot_message") return;
    const userText = message.text.trim();

    // 1) Hardcoded brand intents (snappy, linkable)
    if (contains(userText, "skool", "academy", "course platform")) {
      await say(
        "Here’s the Skool Academy link 👉 https://www.skool.com/gracie-trinity-academy"
      );
      return;
    }
    if (contains(userText, "leglock", "leg lock", "leglocks for dummies")) {
      await say(
        "Leglocks for Dummies is here 🔗 https://leglocks.unclecoachkevin.com"
      );
      return;
    }

    // 2) Optional template key lookup (if you add templates.json)
    const key = Object.keys(TEMPLATES).find((k) => contains(userText, k));
    if (key) {
      await say(TEMPLATES[key]);
      return;
    }

    // 3) GPT fallback (brand voice)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: BRAND_SYSTEM },
        { role: "user", content: userText },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I don’t have an answer right now.";
    await say(reply);
  } catch (err) {
    logger?.error(err);
    await say("⚠️ Oops, I hit an error. Try again in a moment.");
  }
});

// ── Start the bot
(async () => {
  await app.start();
  console.log("⚡ Brand GPT is running (Socket Mode).");
})();
