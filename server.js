import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();
const PORT = process.env.PORT || 3000;

const users = {}; // username -> {password, premium}
const admins = new Set();

app.use(express.json());
app.use(express.static("public"));
app.use(session({
  secret: "STRIVECORE_AI_SECRET",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "NOT_LOGGED_IN" });
  next();
}

// ===== REGISTER =====
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ ok:false });

  if (users[username]) return res.json({ ok:false, msg:"EXISTS" });

  users[username] = {
    password: await bcrypt.hash(password, 10),
    premium: false
  };
  res.json({ ok:true });
});

// ===== LOGIN =====
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const u = users[username];
  if (!u || !(await bcrypt.compare(password, u.password))) {
    return res.json({ ok:false });
  }
  req.session.user = username;
  res.json({ ok:true, premium:u.premium });
});

// ===== SESSION CHECK =====
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ logged:false });
  const u = users[req.session.user];
  res.json({
    logged:true,
    user:req.session.user,
    premium:u.premium,
    admin:admins.has(req.session.user)
  });
});

// ===== CHAT =====
app.post("/chat", auth, (req, res) => {
  const msg = req.body.message;

  if (msg === "/admin login 5910783") {
    admins.add(req.session.user);
    return res.json({ reply:"Admin eingeloggt", admin:true });
  }

  res.json({ reply:"Hallo! Wie kann ich dir helfen?" });
});

app.listen(PORT, () => console.log("StriveCore AI läuft"));
