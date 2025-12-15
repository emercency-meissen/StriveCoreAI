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
   SPEICHER
========================= */

const users = {};
const conversations = {};
const bannedIPs = {};

const onlineIPs = new Set();
const logs = [];
const warnings = [];

const adminSessions = {}; // ip -> expiry
let serverStatus = "online";

/* =========================
   HELFER
========================= */

function isAdmin(ip) {
  if (!adminSessions[ip]) return false;
  if (Date.now() > adminSessions[ip]) {
    delete adminSessions[ip];
    return false;
  }
  return true;
}

function isBanned(ip) {
  if (!bannedIPs[ip]) return false;
  if (Date.now() > bannedIPs[ip]) {
    delete bannedIPs[ip];
    return false;
  }
  return true;
}

function getConversation(ip) {
  if (!conversations[ip]) conversations[ip] = [];
  return conversations[ip];
}

function checkWarning(text) {
  const danger = [
    "umbringen","suizid","töten","bombe",
    "bank ausrauben","waffe","erschießen"
  ];
  return danger.find(w => text.toLowerCase().includes(w));
}

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("✅ StriveCore AI Backend läuft");
});

/* -------- CHAT -------- */

app.post("/chat", async (req, res) => {
  const ip = req.ip;
  const { message } = req.body;

  onlineIPs.add(ip);

  if (!message) {
    return res.json({ reply: "Tut mir leid, ich habe nichts verstanden." });
  }

  /* -------- ADMIN LOGIN -------- */
  if (message.startsWith("/admin login")) {
    const pass = message.split(" ")[2];
    if (pass === ADMIN_PASSWORD) {
      adminSessions[ip] = Date.now() + 60 * 60 * 1000;
      logs.push(`[ADMIN LOGIN] ${ip}`);
      return res.json({
        reply: "🛡️ Admin eingeloggt",
        admin: true
      });
    }
    return res.json({ reply: "❌ Falsches Admin Passwort" });
  }

  /* -------- ADMIN STATUS -------- */
  if (message === "__ADMIN_STATUS__" && isAdmin(ip)) {
    return res.json({
      admin: true,
      serverStatus,
      online: Array.from(onlineIPs),
      logs,
      warnings
    });
  }

  /* -------- ADMIN SERVER CONTROL -------- */
  if (message.startsWith("__ADMIN_SERVER__") && isAdmin(ip)) {
    const mode = message.split(":")[1];
    serverStatus = mode;
    logs.push(`[SERVER ${mode.toUpperCase()}] von ${ip}`);
    return res.json({ reply: `Server ist ${mode}` });
  }

  /* -------- ADMIN LOGOUT -------- */
  if (message === "__ADMIN_LOGOUT__" && isAdmin(ip)) {
    delete adminSessions[ip];
    logs.push(`[ADMIN LOGOUT] ${ip}`);
    return res.json({ reply: "👋 Admin ausgeloggt" });
  }

  /* -------- SERVER OFFLINE (Admins dürfen rein) -------- */
  if (serverStatus === "offline" && !isAdmin(ip)) {
    return res.json({
      reply: "🚧 STRIVECORE AI HAT AKTUELL SERVER PROBLEME !"
    });
  }

  if (isBanned(ip)) {
    return res.json({ reply: "🚫 Dein Gerät ist gesperrt." });
  }

  /* -------- WARNINGS -------- */
  const w = checkWarning(message);
  if (w) {
    warnings.push({
      ip,
      keyword: w,
      text: message,
      time: new Date().toISOString()
    });
    logs.push(`[WARNING] ${ip} → ${w}`);
  }

  /* -------- KI CHAT -------- */

  const conversation = getConversation(ip);
  conversation.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: `
Du bist StriveCore AI.
Antworte wie ChatGPT.
Wenn du etwas nicht weißt, sage:
"Tut mir leid, das weiß ich leider nicht."
`
        },
        ...conversation
      ]
    });

    const reply = completion.choices[0].message.content;
    conversation.push({ role: "assistant", content: reply });

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "⚠️ Serverfehler bei der KI." });
  }
});

/* =========================
   START
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 StriveCore AI läuft auf Port", PORT);
});
