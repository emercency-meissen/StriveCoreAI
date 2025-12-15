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

/* DATEIEN MANUELL */
app.get("/", (_, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/style.css", (_, res) => res.sendFile(path.join(__dirname, "style.css")));
app.get("/app.js", (_, res) => res.sendFile(path.join(__dirname, "app.js")));
app.get("/auth.js", (_, res) => res.sendFile(path.join(__dirname, "auth.js")));

/* IN MEMORY */
const users = {};
const chats = {};

/* AUTH */
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.json({ error: "User existiert" });

  users[username] = {
    password: await bcrypt.hash(password, 10)
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

app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

/* CHAT */
app.post("/api/chat", (req, res) => {
  if (!req.session.user) return res.status(401).end();

  const { message } = req.body;
  chats[req.session.user] ||= [];
  chats[req.session.user].push(message);

  res.json({ reply: "Ich habe deine Nachricht erhalten." });
});

app.listen(PORT, () =>
  console.log("🚀 StriveCoreAI läuft auf Port " + PORT)
);
