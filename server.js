import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express(); // ⬅️ DAS HAT GEFEHLT ❗❗❗
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ StriveCore AI Backend läuft");
});
