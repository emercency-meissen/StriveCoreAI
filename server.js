const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { v4: uuid } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

/* === CONFIG === */
const ADMIN_USERS = ["admin"];
const users = {};
const chats = {};
const onlineUsers = {};
const logs = [];

/* === MIDDLEWARE === */
app.use(express.json());
app.use(express.static("."));
app.use(session({
  secret: "strivecore-secret",
  resave: false,
  saveUninitialized: false
}));

/* === AUTH === */
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.json({ error: "User existiert" });

  users[username] = {
    password: await bcrypt.hash(password, 10),
    premium: false
  };

  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user) return res.json({ error: "Login fehlgeschlagen" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ error: "Login fehlgeschlagen" });

  req.session.user = username;
  onlineUsers[username] = req.ip;
  logs.push(`LOGIN: ${username} (${req.ip})`);

  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  if (req.session.user) {
    delete onlineUsers[req.session.user];
  }
  req.session.destroy(() => res.json({ ok: true }));
});

/* === CHAT === */
app.post("/api/chat", (req, res) => {
  if (!req.session.user) return res.status(401).end();

  const user = req.session.user;
  const { chatId, message } = req.body;

  if (!chats[chatId]) chats[chatId] = [];
  chats[chatId].push({ from: user, text: message });

  // einfache KI
  const reply = "🤖 StriveCore AI: " + message;
  chats[chatId].push({ from: "AI", text: reply });

  res.json({
    reply,
    admin: ADMIN_USERS.includes(user),
    ip: req.ip,
    online: onlineUsers,
    logs: logs.slice(-10)
  });
});

/* === START === */
app.listen(PORT, () => {
  console.log("StriveCore AI läuft auf Port", PORT);
});
