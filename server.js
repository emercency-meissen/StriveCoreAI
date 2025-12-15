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

/* =======================
   SPEICHER (SERVERWEIT)
======================= */

const conversations = {}; // ip_chatId -> messages[]
const adminIPs = new Set();
const bannedIPs = {};
const logs = [];
const warnings = [];
let announcement = null;
let serverStatus = "online";

/* =======================
   HELFER
======================= */

function log(text) {
  logs.push(`[${new Date().toLocaleString()}] ${text}`);
}

function checkWarning(text, ip) {
  const t = text.toLowerCase();
  if (t.includes("umbringen") || t.includes("suizid")) {
    warnings.push({ type: "SUICIDE", ip, text });
    log(`⚠️ SUICIDE WARNING von ${ip}`);
  }
  if (t.includes("bombe") || t.includes("anschlag")) {
    warnings.push({ type: "VIOLENCE", ip, text });
    log(`🚨 VIOLENCE WARNING von ${ip}`);
  }
}

function getConv(key) {
  if (!conversations[key]) conversations[key] = [];
  return conversations[key];
}

/* =======================
   ROUTES
======================= */

app.post("/chat", async (req, res) => {
  const ip = req.ip;
  const { message, chatId = "main" } = req.body;
  const key = ip + "_" + chatId;

  /* BAN */
  if (bannedIPs[ip] && Date.now() < bannedIPs[ip]) {
    return res.json({ reply: "🚫 Du bist gesperrt." });
  }

  /* ADMIN LOGIN */
  if (message?.startsWith("/admin login")) {
    const pass = message.split(" ")[2];
    if (pass === ADMIN_PASSWORD) {
      adminIPs.add(ip);
      log(`🛡️ Admin Login von ${ip}`);
      return res.json({
        reply: "🛡️ Admin-Modus aktiviert.",
        admin: true,
        ip,
        logs,
        warnings
      });
    }
    return res.json({ reply: "❌ Falsches Passwort." });
  }

  /* ADMIN AKTIONEN */
  if (adminIPs.has(ip)) {

    if (message === "__ADMIN_ONLINE__") {
      serverStatus = "online";
      log(`🟢 Server ONLINE von ${ip}`);
      return res.json({ reply: "Server ONLINE", admin:true, ip, logs, warnings });
    }

    if (message === "__ADMIN_OFFLINE__") {
      serverStatus = "offline";
      log(`🔴 Server OFFLINE von ${ip}`);
      return res.json({ reply: "Server OFFLINE", admin:true, ip, logs, warnings });
    }

    if (message?.startsWith("__ADMIN_BAN__")) {
      const [,target,h] = message.split(":");
      bannedIPs[target] = Date.now() + h*3600000;
      log(`⛔ IP ${target} gebannt von ${ip}`);
      return res.json({ reply:`IP ${target} gebannt`, admin:true, ip, logs, warnings });
    }

    if (message?.startsWith("__ADMIN_ANNOUNCE__")) {
      const [,min,...txt] = message.split(":");
      announcement = {
        text: txt.join(":"),
        until: Date.now() + min*60000
      };
      log(`📢 Announcement von ${ip}`);
      return res.json({ reply:"📢 Ankündigung gesendet", admin:true, ip, logs, warnings });
    }
  }

  /* SERVER OFFLINE */
  if (serverStatus === "offline") {
    return res.json({ reply:"🚧 STRIVECORE AI HAT AKTUELL SERVER PROBLEME !" });
  }

  checkWarning(message, ip);

  const conv = getConv(key);
  conv.push({ role:"user", content:message });

  try {
    const ai = await openai.chat.completions.create({
      model:"gpt-4.1-mini",
      messages:[
        { role:"system", content:"Du bist StriveCore AI." },
        ...conv
      ]
    });

    const reply = ai.choices[0].message.content;
    conv.push({ role:"assistant", content:reply });

    res.json({
      reply,
      announcement: announcement && Date.now()<announcement.until ? announcement.text : null
    });

  } catch {
    res.json({ reply:"⚠️ KI-Fehler." });
  }
});

app.listen(3000, ()=>console.log("🚀 StriveCore AI läuft"));
