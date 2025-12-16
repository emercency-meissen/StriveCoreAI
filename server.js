import express from "express";
import cors from "cors";
import OpenAI from "openai";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/* ===== FIX __dirname ===== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===== APP ===== */
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(session({
  secret: "strivecore_secret",
  resave: false,
  saveUninitialized: false
}));

/* ===== PASSPORT ===== */
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((u, d) => d(null, u));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || "PUT_CLIENT_ID",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PUT_SECRET",
  callbackURL: "/auth/google/callback"
}, (a, r, p, done) => {
  done(null, {
    id: p.id,
    name: p.displayName,
    email: p.emails[0].value,
    premium: false
  });
}));

/* ===== OPENAI ===== */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ===== STORAGE ===== */
const videosFile = path.join(__dirname, "videos.json");
const chats = {};
const adminIPs = new Set();
const ADMIN_PASSWORD = "5910783";

function readVideos() {
  if (!fs.existsSync(videosFile)) return [];
  return JSON.parse(fs.readFileSync(videosFile));
}
function saveVideos(v) {
  fs.writeFileSync(videosFile, JSON.stringify(v, null, 2));
}
const ip = r =>
  r.headers["x-forwarded-for"]?.split(",")[0] ||
  r.socket.remoteAddress;

/* ===== AUTH ===== */
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.redirect("/youclip")
);

app.get("/me", (req, res) => {
  res.json(req.user || null);
});

/* ===== PAGES ===== */
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);
app.get("/youclip", (_, res) =>
  res.sendFile(path.join(__dirname, "youclip.html"))
);

/* ===== VIDEOS ===== */
app.get("/videos", (_, res) => res.json(readVideos()));

app.post("/videos/upload", (req, res) => {
  if (!req.user) return res.sendStatus(401);
  const vids = readVideos();
  vids.push({
    id: Date.now().toString(),
    title: req.body.title,
    creator: req.user.name,
    likes: 0
  });
  saveVideos(vids);
  res.json({ ok: true });
});

app.post("/videos/like/:id", (req, res) => {
  const vids = readVideos();
  const v = vids.find(x => x.id === req.params.id);
  if (v) v.likes++;
  saveVideos(vids);
  res.json({ ok: true });
});

/* ===== CHAT ===== */
app.post("/chat", async (req, res) => {
  const userIP = ip(req);
  const { message, chatId = "main" } = req.body;

  if (message.startsWith("/admin login")) {
    if (message.split(" ")[2] === ADMIN_PASSWORD) {
      adminIPs.add(userIP);
      return res.json({ reply: "🛡️ Admin aktiv" });
    }
  }

  chats[userIP] ??= {};
  chats[userIP][chatId] ??= [];
  chats[userIP][chatId].push({ role: "user", content: message });

  const c = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: chats[userIP][chatId]
  });

  const reply = c.choices[0].message.content;
  chats[userIP][chatId].push({ role: "assistant", content: reply });
  res.json({ reply });
});

/* ===== START ===== */
app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 StriveCore AI läuft")
);
