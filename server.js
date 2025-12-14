import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express(); // ❗ DAS HAT GEFEHLT
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

// TEST-ROUTE
app.get("/", (req, res) => {
  res.send("✅ StriveCore AI Backend läuft");
});

app.post("/chat", async (req, res) => {
  try {
    const messages = req.body.messages;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages
        })
      }
    );

    const data = await response.json();

    res.json({
      reply: data.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      reply: "⚠️ Serverfehler bei der KI."
    });
  }
});

app.listen(PORT, () => {
  console.log("✅ StriveCore AI Backend läuft auf Port", PORT);
});
