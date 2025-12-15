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
   SPEICHER (IN MEMORY)
========================= */

const users = {};
const conversations = {};
const bannedIPs = {};
const adminIPs = new Set();
const onlineIPs = new Set();
const adminLogs = [];
const warningLogs = [];

let serverStatus = "online";

/* =========================
   HELFER
========================= */

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

function logAdmin(ip, action) {
  adminLogs.push({
    ip,
    action,
    time: new Date().toISOString()
  });
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

  /* ADMIN LOGIN IMMER ERLAUBT */
  if (message?.startsWith("/admin login")) {
    const pass = message.split(" ")[2];
    if (pass === ADMIN_PASSWORD) {
      adminIPs.add(ip);
      logAdmin(ip, "Admin Login");
      return res.json({ reply: "🛡️ ADMIN LOGIN ERFOLGREICH" });
    }
    return res.json({ reply: "❌ Falsches Admin Passwort" });
  }

  if (isBanned(ip)) {
    return res.json({ reply: "🚫 Deine IP ist gesperrt." });
  }

  /* SERVER OFFLINE – ADMIN DARF IMMER */
  if (serverStatus === "offline" && !adminIPs.has(ip)) {
    return res.json({
      reply: "🚧 STRIVECORE AI HAT AKTUELL SERVER PROBLEME !"
    });
  }

  /* ADMIN ACTIONS (API) */
  if (adminIPs.has(ip) && message?.startsWith("/admin-action")) {
    const { action, data } = JSON.parse(message.replace("/admin-action ", ""));

    if (action === "server") {
      serverStatus = data;
      logAdmin(ip, `Server ${data}`);
      return res.json({ reply: `Server ist jetzt ${data}` });
    }

    if (action === "ban") {
      bannedIPs[data.ip] = Date.now() + data.hours * 3600000;
      logAdmin(ip, `IP gebannt: ${data.ip} (${data.hours}h)`);
      return res.json({ reply: "IP gebannt" });
    }
  }

  /* WARNING SYSTEM */
  const dangerWords = ["umbringen", "bank ausrauben", "töten", "sprengen"];
  if (dangerWords.some(w => message.toLowerCase().includes(w))) {
    warningLogs.push({
      ip,
      message,
      time: new Date().toISOString()
    });
  }

  /* KI CHAT */
  const conversation = getConversation(ip);
  conversation.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Du bist StriveCore AI." },
        ...conversation
      ]
    });

    const reply = completion.choices[0].message.content;
    conversation.push({ role: "assistant", content: reply });
    res.json({ reply });

  } catch {
    res.json({ reply: "⚠️ KI Fehler" });
  }
});

/* -------- ADMIN DATEN -------- */

app.get("/admin/data", (req, res) => {
  const ip = req.ip;
  if (!adminIPs.has(ip)) return res.status(403).end();

  res.json({
    serverStatus,
    onlineIPs: [...onlineIPs],
    bannedIPs,
    adminLogs,
    warningLogs
  });
});

/* =========================
   START
========================= */

app.listen(3000, () => {
  console.log("🚀 StriveCore AI läuft");
});
