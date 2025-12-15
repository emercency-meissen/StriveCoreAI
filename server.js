import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());

app.use(session({
  secret: "strivecore_secret",
  resave: false,
  saveUninitialized: false
}));

const users = {}; // username -> { password }

/* ===== FILES ===== */
app.get("/",(_,res)=>res.sendFile(process.cwd()+"/index.html"));
app.get("/style.css",(_,res)=>res.sendFile(process.cwd()+"/style.css"));
app.get("/app.js",(_,res)=>res.sendFile(process.cwd()+"/app.js"));

/* ===== AUTH STATUS ===== */
app.get("/api/me",(req,res)=>{
  res.json({ logged: !!req.session.user, user: req.session.user });
});

/* ===== REGISTER ===== */
app.post("/api/register", async (req,res)=>{
  const { username, password } = req.body;
  if(users[username]) return res.json({ error:"Existiert schon" });
  users[username] = { password: await bcrypt.hash(password,10) };
  res.json({ ok:true });
});

/* ===== LOGIN ===== */
app.post("/api/login", async (req,res)=>{
  const { username, password } = req.body;
  const u = users[username];
  if(!u || !(await bcrypt.compare(password,u.password))){
    return res.json({ error:"Falsch" });
  }
  req.session.user = username;
  res.json({ ok:true });
});

/* ===== CHAT ===== */
app.post("/chat",(req,res)=>{
  if(!req.session.user){
    return res.status(401).json({ error:"LOGIN_REQUIRED" });
  }
  res.json({ reply:"Ich bin StriveCoreAI 🤖" });
});

app.listen(process.env.PORT||3000,()=>console.log("StriveCoreAI läuft"));
