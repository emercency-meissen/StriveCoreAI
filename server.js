import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   TEST ROUTE (WICHTIG!)
========================= */
app.get("/", (req, res) => {
  res.send("✅ StriveCore AI Backend läuft");
});

/* =========================
   CHAT ROUTE
========================= */
app.post("/chat", async (req, res) => {
  try {
    const messages = req.body.messages;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages
      })
    });

    const data = await response.json();

    res.json({
      reply: data.choices[0].message.content
    });

  } catch (err) {
    res.status(500).json({
      reply: "⚠️ Serverfehler bei der KI."
    });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("StriveCore AI läuft auf Port", PORT);
});
