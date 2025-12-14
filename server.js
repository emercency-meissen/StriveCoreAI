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

function getConversation(id) {
  if (!conversations[id]) conversations[id] = [];
  return conversations[id];
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
    return res.status(403).json({
      error: "Account existiert bereits. 24h IP-Ban."
    });
  }

  const hash = await bcrypt.hash(password, 10);
  users[email] = { passwordHash: hash };

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

  if (!message) {
    return res.json({ reply: "Tut mir leid, ich habe nichts verstanden." });
  }

  /* =========================
     ADMIN LOGIN – IMMER ERLAUBT
  ========================= */

  if (message.startsWith("/admin login")) {
    const pass = message.split(" ")[2];
    if (pass === ADMIN_PASSWORD) {
      adminIPs.add(ip);
      return res.json({ reply: "🛡️ Admin-Modus aktiviert." });
    }
    return res.json({ reply: "❌ Falsches Admin-Passwort." });
  }

  /* =========================
     ADMIN BEFEHLE – IMMER ERLAUBT
  ========================= */

  if (adminIPs.has(ip)) {

    if (message.startsWith("/admin server")) {
      const mode = message.split(" ")[2];

      if (mode === "online") {
        serverStatus = "online";
        return res.json({ reply: "🟢 Server ist ONLINE." });
      }

      if (mode === "offline") {
        serverStatus = "offline";
        return res.json({ reply: "🔴 Server ist OFFLINE." });
      }

      return res.json({
        reply: "⚙️ Nutzung: /admin server online | offline"
      });
    }

    if (message.startsWith("/admin ban")) {
      const parts = message.split(" ");
      const targetIP = parts[2];
      const hours = parseInt(parts[3]);

      if (!targetIP || !hours) {
        return res.json({
          reply: "⚠️ Nutzung: /admin ban <IP> <Stunden>"
        });
      }

      bannedIPs[targetIP] = Date.now() + hours * 60 * 60 * 1000;
      return res.json({
        reply: `⛔ IP ${targetIP} für ${hours} Stunden gebannt.`
      });
    }
  }

  /* =========================
     NORMALE USER REGELN
  ========================= */

  if (isBanned(ip)) {
    return res.json({
      reply: "🚫 Dein Gerät ist temporär gesperrt."
    });
  }

  if (serverStatus === "offline") {
    return res.json({
      reply: "🚧 STRIVECORE AI HAT AKTUELL SERVER PROBLEME !"
    });
  }

  /* =========================
     KI CHAT
  ========================= */

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
- Antworte wie ChatGPT
- Verstehe Rechtschreibfehler
- Antworte in der Sprache des Nutzers
- Sei logisch, hilfreich und freundlich
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
    res.status(500).json({
      reply: "⚠️ Serverfehler bei der KI."
    });
  }
});

/* =========================
   START
========================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 StriveCore AI läuft auf Port", PORT);
});
