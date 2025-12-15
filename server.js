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

const conversations = {};
const adminIPs = new Set();
let serverStatus = "online";

/* 🔐 ADMIN LOGS (GLOBAL) */
const adminLogs = [];

function addAdminLog(ip, text) {
  adminLogs.push({
    time: new Date().toLocaleString(),
    ip,
    text
  });
  if (adminLogs.length > 200) adminLogs.shift();
}

function getConversation(ip) {
  if (!conversations[ip]) conversations[ip] = [];
  return conversations[ip];
}

app.get("/", (req, res) => {
  res.send("StriveCore AI läuft");
});

app.post("/chat", async (req, res) => {
  const ip = req.ip;
  const { message } = req.body;

  /* 🔐 ADMIN LOGIN */
  if (message?.startsWith("/admin login")) {
    const pass = message.split(" ")[2];
    if (pass === ADMIN_PASSWORD) {
      adminIPs.add(ip);
      addAdminLog(ip, "Admin eingeloggt");

      return res.json({
        reply: "🛡️ Admin eingeloggt",
        admin: true,
        adminIP: ip,
        logs: adminLogs
      });
    }
    return res.json({ reply: "❌ Falsches Passwort" });
  }

  /* 🔐 ADMIN ACTIONS */
  if (adminIPs.has(ip)) {

    if (message?.startsWith("__ADMIN_SET_STATUS__")) {
      const mode = message.split(":")[1];
      serverStatus = mode;
      addAdminLog(ip, `Server → ${mode}`);

      return res.json({
        reply: `Server ist jetzt ${mode.toUpperCase()}`,
        logs: adminLogs
      });
    }
  }

  /* 🚧 SERVER OFFLINE */
  if (serverStatus === "offline") {
    return res.json({
      reply: "🚧 STRIVECORE AI HAT AKTUELL SERVER PROBLEME !"
    });
  }

  if (!message) {
    return res.json({ reply: "Ich habe nichts verstanden." });
  }

  /* 🤖 KI CHAT */
  const conversation = getConversation(ip);
  conversation.push({ role: "user", content: message });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: "Du bist StriveCore AI. Antworte freundlich und hilfreich."
        },
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 StriveCore AI läuft auf Port", PORT)
);
