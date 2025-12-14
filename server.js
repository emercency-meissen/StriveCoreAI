import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   OPENAI
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   SPEICHER (einfach)
========================= */
const users = {};           // email -> { passwordHash }
const conversations = {};   // ip -> messages[]
const admins = {};          // ip -> true
const bans = {};            // ip -> timestamp

/* =========================
   HILFSFUNKTIONEN
========================= */
function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
}

function isBanned(ip) {
  if (!bans[ip]) return false;
  return Date.now() - bans[ip] < 24 * 60 * 60 * 1000;
}

function getConversation(ip) {
  if (!conversations[ip]) conversations[ip] = [];
  return conversations[ip];
}

function isAdmin(ip) {
  return admins[ip] === true;
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
  const ip = getIP(req);

  if (!email || !password) {
    return res.status(400).json({ error: "Fehlende Daten" });
  }

  if (users[email]) {
    bans[ip] = Date.now();
    return res.status(403).json({
      error: "Email existiert bereits. Gerät 24h gesperrt."
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

  if (!user) {
    return res.status(401).json({ error: "Login fehlgeschlagen" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Login fehlgeschlagen" });
  }

  res.json({ success: true });
});

/* -------- CHAT -------- */
app.post("/chat", async (req, res) => {
  const ip = getIP(req);
  const { message } = req.body;

  if (isBanned(ip)) {
    return res.json({ reply: "🚫 Dein Gerät ist 24h gesperrt." });
  }

  if (!message) {
    return res.json({ reply: "Tut mir leid, ich habe nichts verstanden." });
  }

  /* ===== ADMIN LOGIN PER CHAT ===== */
  if (message.startsWith("/admin login")) {
    const pw = message.split(" ")[2];

    if (!pw) {
      return res.json({ reply: "❌ Passwort fehlt." });
    }

    if (pw === process.env.ADMIN_PASSWORD) {
      admins[ip] = true;
      return res.json({ reply: "✅ Admin-Modus aktiviert." });
    } else {
      return res.json({ reply: "❌ Falsches Admin-Passwort." });
    }
  }

  /* ===== ADMIN BEFEHLE ===== */
  if (message === "/admin clear" && isAdmin(ip)) {
    conversations[ip] = [];
    return res.json({ reply: "🧹 Chat gelöscht (Admin)." });
  }

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
- Sei intelligent, logisch und hilfreich
- Wenn du etwas nicht weißt, sage ehrlich:
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
    res.status(500).json({
      reply: "⚠️ Serverfehler bei der KI."
    });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("StriveCore AI läuft auf Port", PORT);
});
