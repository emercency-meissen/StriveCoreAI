import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

app.post("/chat", async (req, res) => {
  try {
    const messages = req.body.messages;

    if (!messages) {
      return res.json({ reply: "Fehler: Keine Nachricht erhalten." });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages
      })
    });

    const data = await response.json();

    res.json({
      reply: data.choices?.[0]?.message?.content
        || "Tut mir leid, ich weiß es leider nicht."
    });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Serverfehler ❌" });
  }
});

app.listen(3000, () => {
  console.log("StriveCore AI Server läuft");
});
