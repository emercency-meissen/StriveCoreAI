import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 🔧 WICHTIG FÜR GITHUB + RENDER

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ADMIN_PASSWORD = "5910783";

/* ===== STATE ===== */
let serverOnline = true;
const adminIPs = new Set();
const bannedIPs = {};
const logs = [];
const warnings = [];
const chats = {};

/* ===== HELPERS ===== */
const ip = req =>
  req.headers["x-forwarded-for"]?.split(",")[0] ||
  req.socket.remoteAddress ||
  "unknown";

function log(text, ipAddr) {
  logs.push(`${new Date().toLocaleTimeString()} | ${text} | ${ipAddr}`);
}

function scan(text, ipAddr) {
  const keys = ["suizid", "umbringen", "töten", "bombe", "anschlag"];
  if (keys.some(k => text.toLowerCase().includes(k))) {
    warnings.push({ ip: ipAddr, text, time: Date.now() });
    log("WARNING", ipAddr);
  }
}

/* ===== PAGES ===== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/youclip", (req, res) => {
  res.sendFile(path.join(__dirname, "youclip.html"));
});

/* ===== CHAT ===== */
app.post("/chat", async (req, res) => {
  const userIP = ip(req);
  const { message, chatId = "main" } = req.body;

  if (bannedIPs[userIP] > Date.now())
    return res.json({ reply: "🚫 Du bist gesperrt." });

  if (message.startsWith("/admin login")) {
    if (message.split(" ")[2] === ADMIN_PASSWORD) {
      adminIPs.add(userIP);
      log("ADMIN LOGIN", userIP);
      return res.json({ reply: "🛡️ Admin aktiviert", admin: true });
    }
    return res.json({ reply: "❌ Falsches Passwort" });
  }

  if (!serverOnline && !adminIPs.has(userIP))
    return res.json({ reply: "🚧 Server offline" });

  if (!chats[userIP]) chats[userIP] = {};
  if (!chats[userIP][chatId]) chats[userIP][chatId] = [];

  scan(message, userIP);
  chats[userIP][chatId].push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Du bist StriveCore AI." },
        ...chats[userIP][chatId]
      ]
    });

    const reply = completion.choices[0].message.content;
    chats[userIP][chatId].push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch {
    res.json({ reply: "⚠️ KI Fehler" });
  }
});

/* ===== START ===== */
app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 StriveCore AI läuft")
);
