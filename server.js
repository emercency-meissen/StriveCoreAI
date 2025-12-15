import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Speicher (Demo, später DB) =====
const users = {};        // username -> {password, premium}
const chats = {};        // user -> messages
const admins = new Set();
const logs = [];

// ===== Middleware =====
app.use(express.json());
app.use(express.static("public"));
app.use(session({
  secret: "strivecore-secret",
  resave: false,
  saveUninitialized: false
}));

function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
}

// ===== Auth =====
app.post("/api/register", async (req,res)=>{
  const {username,password} = req.body;
  if(users[username]) return res.json({ok:false,msg:"User existiert"});
  users[username] = {
    password: await bcrypt.hash(password,10),
    premium:false
  };
  chats[username] = [];
  res.json({ok:true});
});

app.post("/api/login", async (req,res)=>{
  const {username,password} = req.body;
  const u = users[username];
  if(!u || !await bcrypt.compare(password,u.password))
    return res.json({ok:false});
  req.session.user = username;
  res.json({ok:true});
});

app.post("/api/logout",(req,res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});

// ===== Chat =====
app.post("/chat",(req,res)=>{
  if(!req.session.user) return res.status(401).end();

  const ip = getIP(req);
  const msg = req.body.message;
  const user = req.session.user;

  if(msg === "/admin login 5910783"){
    admins.add(user);
    logs.push(`[ADMIN LOGIN] ${user} | ${ip}`);
    return res.json({reply:"Admin eingeloggt", admin:true, ip, logs});
  }

  chats[user].push({from:"user",msg});
  chats[user].push({from:"ai",msg:"Hallo! Wie kann ich dir helfen?"});

  res.json({
    reply:"Hallo! Wie kann ich dir helfen?",
    admin: admins.has(user),
    ip,
    logs
  });
});

// ===== Premium (PLATZHALTER) =====
app.post("/api/premium",(req,res)=>{
  if(!req.session.user) return res.status(401).end();
  // Hier später PayPal Webhook
  users[req.session.user].premium = true;
  res.json({ok:true});
});

app.listen(PORT,()=>console.log("StriveCore AI läuft auf",PORT));
