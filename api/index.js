import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// JSON データを受け取るため
app.use(express.json());

// ---- 静的ファイル (public/) を配信 ----
app.use(express.static(path.join(__dirname, "../public")));

// ---- ルート "/" にアクセスしたら index.html を返す ----
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ---- ここに今までの API を追加（例） ----
app.post("/api/login", async (req, res) => {
  const { user_id } = req.body;
  await db.query(
    "INSERT INTO login_times (user_id, time) VALUES (?, NOW())",
    [user_id]
  );
  res.json({ status: "ok" });
});

// ---- Serverless 用に app を export ----
export default app;
