const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: "strivecore_secret",
  resave: false,
  saveUninitialized: false
}));

/* ===== FILES AUSLIEFERN ===== */
app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.get("/style.css",(req,res)=>res.sendFile(path.join(__dirname,"style.css")));
app.get("/app.js",(req,res)=>res.sendFile(path.join(__dirname,"app.js")));
app.get("/auth.js",(req,res)=>res.sendFile(path.join(__dirname,"auth.js")));
app.get("/admin.js",(req,res)=>res.sendFile(path.join(__dirname,"admin.js")));

/* ===== STORAGE ===== */
const users={}, chats={}, logs=[], bans={};
let announcement=null;

/* ===== HELPERS ===== */
const getIP=req=>req.headers["x-forwarded-for"]?.split(",")[0]||req.socket.remoteAddress;
const log=t=>logs.push(`[${new Date().toLocaleTimeString()}] ${t}`);

/* ===== AUTH ===== */
app.post("/api/register", async (req,res)=>{
  const {username,password}=req.body;
  if(users[username]) return res.json({error:"Existiert"});
  users[username]={password:await bcrypt.hash(password,10),admin:false,premium:false};
  log(`REGISTER ${username}`);
  res.json({ok:true});
});

app.post("/api/login", async (req,res)=>{
  const {username,password}=req.body;
  const u=users[username];
  if(!u||!await bcrypt.compare(password,u.password))
    return res.json({error:"Login fehlgeschlagen"});
  req.session.user=username;
  log(`LOGIN ${username}`);
  res.json({ok:true,user:u});
});

/* ===== CHAT ===== */
app.post("/api/chat",(req,res)=>{
  if(!req.session.user) return res.status(401).end();
  const user=req.session.user;
  const ip=getIP(req);

  if(bans[ip]&&bans[ip]>Date.now())
    return res.json({reply:"⛔ Gebannt"});

  const {chatId,message}=req.body;
  chats[chatId] ||= [];
  chats[chatId].push({user,message});
  log(`CHAT ${user} (${ip}): ${message}`);

  let reply="Ich habe deine Nachricht erhalten.";
  if(message.startsWith("/admin login 5910783")){
    users[user].admin=true;
    reply="🔐 Admin aktiviert";
  }

  res.json({
    reply,
    admin:users[user].admin,
    ip:users[user].admin?ip:null,
    logs:users[user].admin?logs.slice(-10):[],
    announcement
  });
});

/* ===== ADMIN ===== */
app.post("/api/admin/ban",(req,res)=>{
  const u=users[req.session.user];
  if(!u?.admin) return res.status(403).end();
  bans[req.body.ip]=Date.now()+req.body.hours*3600000;
  log(`BAN ${req.body.ip}`);
  res.json({ok:true});
});

app.listen(PORT,()=>console.log("StriveCore AI läuft"));
