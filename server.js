const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const ADMIN_PASSWORD = "5910783";

// In-Memory Store (für Demo / free)
const users = {}; // ip -> { chats: {id: [messages]}, isAdmin }
const logs = [];

function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
}

app.post("/chat", (req, res) => {
  const ip = getIP(req);
  const { message, chatId } = req.body;

  if (!users[ip]) {
    users[ip] = { chats: {}, isAdmin: false };
  }

  if (!users[ip].chats[chatId]) {
    users[ip].chats[chatId] = [];
  }

  // Admin Login
  if (message.startsWith("/admin login")) {
    if (message.includes(ADMIN_PASSWORD)) {
      users[ip].isAdmin = true;
      logs.push(`ADMIN LOGIN | ${ip}`);
      return res.json({
        reply: "🛡️ Admin eingeloggt",
        admin: true,
        ip,
        logs
      });
    }
  }

  // Save User Message
  users[ip].chats[chatId].push({ role: "user", text: message });

  // Fake AI Reply (Platzhalter)
  const reply = "Ich habe deine Nachricht verstanden: „" + message + "“";

  users[ip].chats[chatId].push({ role: "ai", text: reply });

  res.json({
    reply,
    admin: users[ip].isAdmin,
    ip,
    logs
  });
});

app.get("/chats", (req, res) => {
  const ip = getIP(req);
  if (!users[ip]) return res.json({});
  res.json(users[ip].chats);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("StriveCore AI läuft auf Port " + PORT));
