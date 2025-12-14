import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
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

/* =========================
   SPEICHER (einfach, aber stabil)
========================= */

const users = {};           // email -> { passwordHash }
const bans = {};            // ip -> timestamp
const conversations = {};   // ip -> messages[]

/* =========================
   HILFSFUNKTIONEN
========================= */

function isBanned(ip) {
  if (!bans[ip]) return false;
  return Date.now() - bans[ip] < 24 * 60 * 60 * 1000;
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

/* -------- LOGIN / REGISTER -------- */

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;

  if (users[email]) {
    bans[ip] = Date.now();
    return res.status(403).json({ error: "Email existiert bereits. 24h Ban." });
  }

  const hash = await bcrypt.hash(password, 10);
  users[email] = { passwordHash: hash };

  res.json({ success: true });
});

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

  if (isBanned(ip)) {
    return res.status(403).json({
      reply: "🚫 Dein Gerät ist für 24 Stunden gesperrt."
    });
  }

  if (!message) {
    return res.json({
      reply: "Tut mir leid, ich habe nichts verstanden."
    });
  }

  const conversation = getConversation(ip);

  conversation.push({
    role: "user",
    content: message
  });

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

    conversation.push({
      role: "assistant",
      content: reply
    });

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
