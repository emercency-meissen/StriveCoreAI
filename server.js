import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const videosFile = path.join(__dirname, "videos.json");

function readVideos(){
  if(!fs.existsSync(videosFile)) return [];
  return JSON.parse(fs.readFileSync(videosFile));
}
function saveVideos(v){
  fs.writeFileSync(videosFile, JSON.stringify(v,null,2));
}

app.get("/videos",(req,res)=>{
  res.json(readVideos());
});

app.post("/videos/like/:id",(req,res)=>{
  const vids = readVideos();
  const v = vids.find(x=>x.id===req.params.id);
  if(v) v.likes++;
  saveVideos(vids);
  res.json({ok:true});
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

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

/* ===== PAGE ROUTES ===== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/youclip", (req, res) => {
  res.sendFile(path.join(__dirname, "youclip.html"));
});

/* ===== API ===== */
app.post("/chat", async (req, res) => {
  const userIP = ip(req);
  const { message, chatId = "main" } = req.body;

  if (bannedIPs[userIP] > Date.now()) {
    return res.json({ reply: "🚫 Du bist gesperrt." });
  }

  /* ADMIN LOGIN */
  if (message.startsWith("/admin login")) {
    if (message.split(" ")[2] === ADMIN_PASSWORD) {
      adminIPs.add(userIP);
      log("ADMIN LOGIN", userIP);
      return res.json({
        reply: "🛡️ Admin aktiviert",
        admin: true,
        ip: userIP,
        logs,
        warnings
      });
    }
    return res.json({ reply: "❌ Falsches Passwort" });
  }

  if (!serverOnline && !adminIPs.has(userIP)) {
    return res.json({ reply: "🚧 Server aktuell offline" });
  }

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

    res.json({
      reply,
      admin: adminIPs.has(userIP),
      ip: adminIPs.has(userIP) ? userIP : null,
      logs,
      warnings
    });
  } catch (e) {
    res.json({ reply: "⚠️ KI Fehler" });
  }
});

/* ===== ADMIN ===== */
app.post("/admin/online", (req, res) => {
  if (!adminIPs.has(ip(req))) return res.sendStatus(403);
  serverOnline = true;
  log("SERVER ONLINE", ip(req));
  res.json({ ok: true });
});

app.post("/admin/offline", (req, res) => {
  if (!adminIPs.has(ip(req))) return res.sendStatus(403);
  serverOnline = false;
  log("SERVER OFFLINE", ip(req));
  res.json({ ok: true });
});

app.post("/admin/ban", (req, res) => {
  if (!adminIPs.has(ip(req))) return res.sendStatus(403);
  const { target, hours } = req.body;
  bannedIPs[target] = Date.now() + hours * 3600000;
  log(`BAN ${target}`, ip(req));
  res.json({ ok: true });
});

/* ===== START ===== */
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 StriveCore AI läuft");
});

