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
const conversations = {};
const bannedIPs = {};
const adminIPs = new Set();
const onlineIPs = new Set();

const logs = [];
const warnings = [];

let serverStatus = "online"; // online | offline

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

function log(text) {
  logs.push(`[${new Date().toISOString()}] ${text}`);
}

const warningKeywords = [
  "bank ausrauben",
  "umbringen",
  "töten",
  "anschlag",
  "bombe",
  "suizid",
  "mich umbringen"
];

function checkWarnings(ip, text) {
  const lower = text.toLowerCase();
  if (warningKeywords.some(w => lower.includes(w))) {
    warnings.push({
      ip,
      text,
      time: new Date().toISOString()
    });
    log(`⚠️ WARNING von ${ip}: ${text}`);
  }
}

function requireAdmin(req, res, next) {
  if (!adminIPs.has(req.ip)) {
    return res.status(403).json({ error: "Kein Admin-Zugriff" });
  }
  next();
}

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("✅ StriveCore AI Backend läuft");
});

/* -------- REGISTER -------- */

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;

  if (!email || !password) {
    return res.status(400).json({ error: "Fehlende Daten" });
  }

  if (users[email]) {
    bannedIPs[ip] = Date.now() + 24 * 60 * 60 * 1000;
    log(`⛔ Auto-Ban ${ip} (Account existiert)`);
    return res.status(403).json({ error: "Account existiert" });
  }

  users[email] = {
    passwordHash: await bcrypt.hash(password, 10)
  };

  res.json({ success: true });
});

/* -------- LOGIN -------- */

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users[email];

  if (!user) return res.status(401).json({ error: "Login fehlgeschlagen" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Login fehlgeschlagen" });

  res.json({ success: true });
});

/* -------- CHAT -------- */

app.post("/chat", async (req, res) => {
  const ip = req.ip;
  const { message } = req.body;

  onlineIPs.add(ip);

  if (!message) {
    return res.json({ reply: "Ich habe nichts verstanden." });
  }

  /* ===== ADMIN LOGIN (IMMER ERLAUBT) ===== */

  if (message.startsWith("/admin login")) {
    const pass = message.split(" ")[2];
    if (pass === ADMIN_PASSWORD) {
      adminIPs.add(ip);
      log(`🛡️ Admin Login: ${ip}`);
      return res.json({ reply: "🛡️ STRIVECORE AI ADMIN MODUS AKTIV" });
    }
    return res.json({ reply: "❌ Falsches Admin-Passwort." });
  }

  /* ===== BANNED ===== */

  if (isBanned(ip)) {
    return res.json({ reply: "🚫 Dein Gerät ist gesperrt." });
  }

  /* ===== SERVER OFFLINE (NUR USER) ===== */

  if (serverStatus === "offline" && !adminIPs.has(ip)) {
    return res.json({
      reply: "🚧 STRIVECORE AI HAT AKTUELL SERVER PROBLEME !"
    });
  }

  /* ===== WARNINGS ===== */

  checkWarnings(ip, message);

  /* ===== KI CHAT ===== */

  const conversation = getConversation(ip);
  conversation.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Du bist StriveCore AI. Antworte hilfreich."
        },
        ...conversation
      ]
    });

    const reply = completion.choices[0].message.content;
    conversation.push({ role: "assistant", content: reply });

    res.json({ reply });

  } catch (err) {
    res.status(500).json({ reply: "⚠️ KI Fehler" });
  }
});

/* =========================
   ADMIN API (FÜR MENÜ)
========================= */

/* ---- ADMIN STATUS ---- */
app.get("/admin/status", requireAdmin, (req, res) => {
  res.json({
    adminIP: req.ip,
    serverStatus,
    onlineIPs: [...onlineIPs],
    bannedIPs,
    warnings,
    logs
  });
});

/* ---- SERVER ONLINE/OFFLINE ---- */
app.post("/admin/server", requireAdmin, (req, res) => {
  serverStatus = req.body.status;
  log(`🔧 Server ${serverStatus} gesetzt von ${req.ip}`);
  res.json({ success: true });
});

/* ---- IP BAN ---- */
app.post("/admin/ban", requireAdmin, (req, res) => {
  const { ip, hours } = req.body;
  bannedIPs[ip] = Date.now() + hours * 60 * 60 * 1000;
  log(`⛔ IP ${ip} für ${hours}h gebannt`);
  res.json({ success: true });
});

/* =========================
   START
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 StriveCore AI läuft auf Port", PORT);
});
