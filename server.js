import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   KONFIG
========================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ADMIN_PASSWORD = "5910783";

/* =========================
   SPEICHER (IN-MEMORY)
========================= */

const users = {};
const conversations = {};      // ip -> { chatId -> messages[] }
const activeIPs = new Set();
const bannedIPs = {};
const adminIPs = new Set();

const logs = [];
const warnings = [];

let serverStatus = "online";

/* =========================
   HELFER
========================= */

function now() {
  return new Date().toLocaleString();
}

function isBanned(ip) {
  if (!bannedIPs[ip]) return false;
  if (Date.now() > bannedIPs[ip]) {
    delete bannedIPs[ip];
    return false;
  }
  return true;
}

function getChat(ip, chatId) {
  if (!conversations[ip]) conversations[ip] = {};
  if (!conversations[ip][chatId]) conversations[ip][chatId] = [];
  return conversations[ip][chatId];
}

function checkWarning(text) {
  const t = text.toLowerCase();
  if (t.includes("umbringen") || t.includes("suizid")) return "Suizid";
  if (t.includes("bombe") || t.includes("anschlag")) return "Gewalt";
  return null;
}

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("✅ StriveCore AI Backend läuft");
});

app.post("/chat", async (req, res) => {
  const ip = req.ip;
  const { message, chatId } = req.body;

  activeIPs.add(ip);

  if (isBanned(ip)) {
    return res.json({ reply: "🚫 Dein Gerät wurde gesperrt." });
  }

  /* ADMIN LOGIN IMMER ERLAUBT */
  if (message?.startsWith("/admin login")) {
    const pass = message.split(" ")[2];
    if (pass === ADMIN_PASSWORD) {
      adminIPs.add(ip);
      logs.push(`[${now()}] ADMIN LOGIN von ${ip}`);
      return res.json({ reply: "🛡️ Admin-Modus aktiv", admin: true });
    }
    return res.json({ reply: "❌ Falsches Admin-Passwort" });
  }

  /* ADMIN MENU ACTIONS */
  if (adminIPs.has(ip)) {
    if (message === "__ADMIN_ONLINE__") {
      serverStatus = "online";
      logs.push(`[${now()}] SERVER ONLINE durch ${ip}`);
      return res.json({ reply: "🟢 Server ONLINE", admin: true });
    }
    if (message === "__ADMIN_OFFLINE__") {
      serverStatus = "offline";
      logs.push(`[${now()}] SERVER OFFLINE durch ${ip}`);
      return res.json({ reply: "🔴 Server OFFLINE", admin: true });
    }
    if (message?.startsWith("__ADMIN_BAN__")) {
      const [, targetIP, h] = message.split(":");
      bannedIPs[targetIP] = Date.now() + Number(h) * 3600000;
      logs.push(`[${now()}] IP ${targetIP} gebannt (${h}h) von ${ip}`);
      return res.json({ reply: `⛔ IP ${targetIP} gebannt`, admin: true });
    }
  }

  /* SERVER OFFLINE – nur normale User */
  if (serverStatus === "offline" && !adminIPs.has(ip)) {
    return res.json({
      reply: "⚠️ Emergency Mode aktiv – System wird überwacht"
    });
  }

  if (!message) {
    return res.json({ reply: "…" });
  }

  /* WARNINGS */
  const warnType = checkWarning(message);
  if (warnType) {
    warnings.push({
      time: now(),
      ip,
      type: warnType,
      text: message
    });
    logs.push(`[${now()}] WARNUNG ${warnType} von ${ip}`);
  }

  const conversation = getChat(ip, chatId || "main");
  conversation.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `
Du bist StriveCore AI.
Antworte hilfreich, ruhig und natürlich.
Bei sensiblen Themen unterstützend, nicht wertend.
`
        },
        ...conversation
      ]
    });

    const reply = completion.choices[0].message.content;
    conversation.push({ role: "assistant", content: reply });

    res.json({
      reply,
      admin: adminIPs.has(ip),
      ip,
      onlineIPs: [...activeIPs],
      logs,
      warnings
    });

  } catch (e) {
    res.json({ reply: "⚠️ Serverfehler bei der KI." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 StriveCore AI läuft auf Port", PORT)
);
