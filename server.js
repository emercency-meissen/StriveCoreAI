import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ADMIN_PASSWORD = "5910783";

/* ====== SERVER STATE ====== */
let serverStatus = "online";
const adminIPs = new Set();
const bannedIPs = {};
const logs = [];
const warnings = [];
const announcements = [];

/* ====== CHAT STORAGE ====== */
const chats = {}; // ip -> { chatId -> messages[] }

/* ====== HELPERS ====== */
function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function log(event, ip) {
  logs.push(`${new Date().toLocaleTimeString()} | ${event} | ${ip}`);
}

function checkWarnings(text, ip) {
  const lower = text.toLowerCase();
  const map = [
    { key: "umbringen", type: "SUICIDE" },
    { key: "bombe", type: "BOMB" },
    { key: "anschlag", type: "TERROR" },
    { key: "töten", type: "VIOLENCE" }
  ];
  map.forEach(w => {
    if (lower.includes(w.key)) {
      warnings.push({ time: Date.now(), type: w.type, ip, text });
      log(`WARNING ${w.type}`, ip);
    }
  });
}

/* ====== ROUTES ====== */
app.get("/", (_, res) => {
  res.send("✅ StriveCore AI Backend läuft");
});

app.post("/chat", async (req, res) => {
  const ip = getIP(req);
  const { message, chatId = "main" } = req.body;

  if (bannedIPs[ip] && Date.now() < bannedIPs[ip]) {
    return res.json({ reply: "🚫 Du bist gesperrt." });
  }

  /* ADMIN LOGIN */
  if (message?.startsWith("/admin login")) {
    const pass = message.split(" ")[2];
    if (pass === ADMIN_PASSWORD) {
      adminIPs.add(ip);
      log("Admin Login", ip);
      return res.json({
        reply: "🛡️ Admin eingeloggt",
        admin: true,
        ip,
        logs,
        warnings
      });
    }
    return res.json({ reply: "❌ Falsches Passwort" });
  }

  /* ADMIN COMMANDS */
  if (adminIPs.has(ip)) {
    if (message === "__ADMIN_ONLINE__") {
      serverStatus = "online";
      log("Server ONLINE", ip);
      return res.json({ reply: "🟢 Server ONLINE", admin: true, ip, logs, warnings });
    }
    if (message === "__ADMIN_OFFLINE__") {
      serverStatus = "offline";
      log("Server OFFLINE", ip);
      return res.json({ reply: "🔴 Server OFFLINE", admin: true, ip, logs, warnings });
    }
    if (message?.startsWith("__ADMIN_BAN__")) {
      const [, target, h] = message.split(":");
      bannedIPs[target] = Date.now() + Number(h) * 3600000;
      log(`BAN ${target}`, ip);
      return res.json({ reply: `⛔ ${target} gebannt`, admin: true, ip, logs, warnings });
    }
  }

  if (serverStatus === "offline" && !adminIPs.has(ip)) {
    return res.json({
      reply: "🚧 STRIVECORE AI HAT AKTUELL SERVER PROBLEME"
    });
  }

  if (!chats[ip]) chats[ip] = {};
  if (!chats[ip][chatId]) chats[ip][chatId] = [];

  checkWarnings(message, ip);

  chats[ip][chatId].push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Du bist StriveCore AI." },
        ...chats[ip][chatId]
      ]
    });

    const reply = completion.choices[0].message.content;
    chats[ip][chatId].push({ role: "assistant", content: reply });

    res.json({
      reply,
      admin: adminIPs.has(ip),
      ip,
      logs,
      warnings
    });
  } catch {
    res.json({ reply: "⚠️ KI Fehler" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 StriveCore AI läuft")
);
const warnings = []; 
// { type, ip, time, chat }
function scanWarnings(text, ip, chat) {
  const t = text.toLowerCase();
  const rules = [
    { key: "suizid", type: "SUICIDE" },
    { key: "umbringen", type: "SUICIDE" },
    { key: "bombe", type: "BOMB" },
    { key: "anschlag", type: "TERROR" },
    { key: "töten", type: "VIOLENCE" }
  ];

  rules.forEach(r => {
    if (t.includes(r.key)) {
      warnings.push({
        type: r.type,
        ip,
        time: new Date().toLocaleTimeString(),
        chat: [...chat]
      });
      log(`WARNING ${r.type}`, ip);
    }
  });
}
scanWarnings(message, ip, chats[ip][chatId]);
res.json({
  reply,
  admin: adminIPs.has(ip),
  ip,
  logs,
  warnings
});

