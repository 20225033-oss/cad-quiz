import express from "express";
import db from "./db.js";

const app = express();

// 静的ファイルを public から配信
app.use(express.static("public"));

// ルート（/）にアクセスが来たら index.html を返す
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// API 例（必要ならここに追加）
app.get("/api/test", (req, res) => {
  res.json({ message: "API OK" });
});

export default app;
