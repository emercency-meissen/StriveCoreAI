import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: "strivecore_secret",
  resave: false,
  saveUninitialized: false
}));

/* ===== USERS ===== */
const users = {};
const adminIPs = new Set();

/* ===== FILE ===== */
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

/* ===== AUTH ===== */
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ error: "Fehlende Daten" });

  if (users[username])
    return res.json({ error: "User existiert" });

  users[username] = {
    password: await bcrypt.hash(password, 10),
    admin: false
  };

  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const u = users[username];

  if (!u || !(await bcrypt.compare(password, u.password)))
    return res.json({ error: "Login fehlgeschlagen" });

  req.session.user = username;
  res.json({ ok: true });
});

/* ===== CHAT ===== */
app.post("/api/chat", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ reply: "Bitte einloggen." });

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const { message } = req.body;

  if (message === "/admin login 5910783") {
    adminIPs.add(ip);
    return res.json({ reply: "🛡️ Admin aktiviert", admin: true, ip });
  }

  res.json({
    reply: "StriveCore AI: Nachricht empfangen.",
    admin: adminIPs.has(ip),
    ip: adminIPs.has(ip) ? ip : null
  });
});

app.listen(PORT, () =>
  console.log("🚀 StriveCore AI läuft auf Port", PORT)
);
