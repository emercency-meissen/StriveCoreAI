const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/* ===== FILES AUSLIEFERN ===== */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);

app.get("/style.css", (req, res) =>
  res.sendFile(path.join(__dirname, "style.css"))
);

app.get("/app.js", (req, res) =>
  res.sendFile(path.join(__dirname, "app.js"))
);

/* ===== CHAT API ===== */
app.post("/api/chat", (req, res) => {
  const { message } = req.body;

  const reply = "Ich habe deine Nachricht erhalten.";
  res.json({ reply });
});

app.listen(PORT, () =>
  console.log("StriveCore AI läuft ohne Login")
);
