// app.js — Gracie Trinity with GPT + templates.json

import pkg from "@slack/bolt";
const { App } = pkg;
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// --- Load system prompt from templates.json ---
let SYSTEM = "You are Gracie Trinity, a helpful assistant.";
try {
  const templates = JSON.parse(fs.readFileSync("templates.json", "utf8"));
  SYSTEM = templates?.gracie_trinity?.system || SYSTEM;
} catch (e) {
  console.error("Could not load templates.json, using fallback system prompt.", e);
}

// --- Slack (Socket Mode) ---
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Respond to DMs or mentions
app.message(async ({ message, say, logger }) => {
  try {
    if (!message.text || message.subtype === "bot_message") return;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: message.text }
      ]
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I don’t have an answer right now.";
    await say(reply);
  } catch (err) {
    logger.error(err);
    await say("⚠️ Oops, I hit an error.");
  }
});

// Start the bot
(async () => {
  await app.start();
  console.log("⚡ Gracie Trinity with GPT is running (Socket Mode).");
})();
