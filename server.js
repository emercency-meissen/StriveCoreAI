import express from "express";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// wichtig für ES-Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// STARTSEITE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// CHAT API
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  // einfache Mathe-Erkennung
  try {
    if (/^[0-9+\-*/().\s]+$/.test(userMessage)) {
      const result = eval(userMessage);
      return res.json({ reply: `🧮 Ergebnis: ${result}` });
    }
  } catch {}

  // Fallback-Antwort (offline-safe)
  res.json({
    reply: "🤖 StriveCore AI online. Stelle mir Fragen – Mathe, Sprache, alles."
  });
});

// SERVER START
app.listen(PORT, () => {
  console.log("StriveCoreAI läuft auf Port " + PORT);
});
