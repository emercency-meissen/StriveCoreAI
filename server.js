const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: "strivecore_secret",
  resave: false,
  saveUninitialized: false
}));

/* ====== IN-MEMORY STORAGE (später DB) ====== */
const users = {};
const chats = {};
const logs = [];
const bans = {};
let announcement = null;

/* ====== HELPER ====== */
function ip(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
}
function log(text) {
  logs.push(`[${new Date().toLocaleTimeString()}] ${text}`);
}

/* ====== AUTH ====== */
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.json({ error: "User existiert" });
  users[username] = {
    password: await bcrypt.hash(password, 10),
    premium: false,
    admin: false
  };
  log(`REGISTER ${username}`);
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const u = users[username];
  if (!u || !(await bcrypt.compare(password, u.password)))
    return res.json({ error: "Login fehlgeschlagen" });

  req.session.user = username;
  log(`LOGIN ${username}`);
  res.json({ ok: true, user: u });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* ====== CHAT ====== */
app.post("/api/chat", (req, res) => {
  if (!req.session.user) return res.status(401).end();

  const user = req.session.user;
  const userIP = ip(req);
  if (bans[userIP] && bans[userIP] > Date.now())
    return res.json({ reply: "⛔ Du bist gebannt." });

  const { chatId, message } = req.body;
  chats[chatId] ||= [];
  chats[chatId].push({ from: user, text: message });

  log(`CHAT ${user} (${userIP}): ${message}`);

  let reply = "Ich habe deine Nachricht erhalten.";
  if (message.startsWith("/admin login")) {
    if (message.split(" ")[2] === "5910783") {
      users[user].admin = true;
      reply = "🔐 Admin eingeloggt";
    }
  }

  res.json({
    reply,
    admin: users[user].admin,
    ip: users[user].admin ? userIP : null,
    logs: users[user].admin ? logs.slice(-10) : [],
    announcement
  });
});

/* ====== ADMIN ====== */
app.post("/api/admin/ban", (req, res) => {
  const user = req.session.user;
  if (!users[user]?.admin) return res.status(403).end();

  const { ip, hours } = req.body;
  bans[ip] = Date.now() + hours * 3600000;
  log(`BAN ${ip} (${hours}h)`);
  res.json({ ok: true });
});

app.post("/api/admin/announce", (req, res) => {
  const user = req.session.user;
  if (!users[user]?.admin) return res.status(403).end();

  announcement = {
    text: req.body.text,
    until: Date.now() + req.body.minutes * 60000
  };
  log(`ANNOUNCE ${req.body.text}`);
  res.json({ ok: true });
});

setInterval(() => {
  if (announcement && announcement.until < Date.now()) announcement = null;
}, 10000);

app.listen(PORT, () => console.log("StriveCore AI läuft"));
