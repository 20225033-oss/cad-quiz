// =============================
// Vercel サーバーレス Express
// =============================
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./db.js";   // ← ← 重要（1階層上にあるため相対パス変更）

dotenv.config();

// ES Module 用 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express App
const app = express();
app.use(express.json());

// =============================
// 静的ファイル（public）
// =============================
app.use(express.static(path.join(__dirname, "../public")));

// 画像フォルダ
app.use("/images", express.static(path.join(__dirname, "../images")));


// =============================
// 🔐 ログイン
// =============================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const rows = await query(
      "SELECT * FROM users WHERE username = ? AND password = ? AND active = 1",
      [username, password]
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "ユーザー名またはパスワードが違います。",
      });
    }

    const user = rows[0];
    const isAdmin = user.username === "admin";
    res.json({ success: true, isAdmin, username: user.username });
  } catch (err) {
    console.error("❌ ログイン処理エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 🕒 ログイン時間保存
// =============================
app.post("/record-login-time", async (req, res) => {
  const { username } = req.body;

  try {
    await query(
      "INSERT INTO login_times (username, login_time) VALUES (?, NOW())",
      [username]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ record-login-time エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 🔄 ログアウト時間保存
// =============================
app.post("/record-logout-time", async (req, res) => {
  const { username } = req.body;

  try {
    const rows = await query(
      "SELECT id, login_time FROM login_times WHERE username = ? AND logout_time IS NULL ORDER BY id DESC LIMIT 1",
      [username]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "ログイン記録が見つかりません。" });
    }

    const { id } = rows[0];

    await query(
      `UPDATE login_times
       SET logout_time = NOW(),
           duration_minutes = TIMESTAMPDIFF(MINUTE, login_time, NOW())
       WHERE id = ?`,
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ record-logout-time エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 🆕 新規登録
// =============================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const exist = await query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (exist.length > 0) {
      return res.json({
        success: false,
        message: "このユーザー名は既に使われています。",
      });
    }

    await query(
      "INSERT INTO users (username, password, active) VALUES (?, ?, 1)",
      [username, password]
    );

    res.json({ success: true, message: "登録完了！ログインしてください。" });
  } catch (err) {
    console.error("❌ 登録エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 💾 スコア保存
// =============================
app.post("/save-score", async (req, res) => {
  const { username, score, total } = req.body;

  try {
    await query(
      "INSERT INTO scores (username, score, total, date) VALUES (?, ?, ?, NOW())",
      [username, score, total]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ スコア保存エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 👥 全ユーザーのログイン履歴
// =============================
app.get("/get-login-times", async (_, res) => {
  try {
    const rows = await query(
      "SELECT username, login_time, logout_time, duration_minutes FROM login_times ORDER BY login_time DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ get-login-times エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 📊 ユーザー別利用時間
// =============================
app.get("/get-user-durations", async (_, res) => {
  try {
    const rows = await query(`
      SELECT username, SUM(duration_minutes) AS totalMinutes
      FROM login_times
      WHERE duration_minutes IS NOT NULL
      GROUP BY username
      ORDER BY totalMinutes DESC
    `);

    res.json(
      rows.map((r) => ({
        username: r.username,
        totalMinutes: r.totalMinutes || 0,
        totalHours: ((r.totalMinutes || 0) / 60).toFixed(1),
      }))
    );
  } catch (err) {
    console.error("❌ get-user-durations エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 📊 全ユーザー統計
// =============================
app.get("/get-all-user-stats", async (_, res) => {
  try {
    const rows = await query("SELECT username, score, total FROM scores");

    if (rows.length === 0) return res.json([]);

    const stats = {};

    rows.forEach((s) => {
      if (!stats[s.username]) stats[s.username] = [];
      stats[s.username].push(s);
    });

    const result = Object.entries(stats).map(([username, data]) => {
      const percents = data.map((s) => (s.score / s.total) * 100);
      return {
        username,
        avgPercent: (
          percents.reduce((a, b) => a + b, 0) / percents.length
        ).toFixed(1),
        maxPercent: Math.max(...percents).toFixed(1),
        attempts: data.length,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ get-all-user-stats エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 📊 特定ユーザー統計
// =============================
app.get("/get-user-stats/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const rows = await query(
      "SELECT score, total FROM scores WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.json({ avgPercent: 0, maxPercent: 0, attempts: 0 });
    }

    const percents = rows.map((s) => (s.score / s.total) * 100);

    res.json({
      avgPercent: (
        percents.reduce((a, b) => a + b, 0) / percents.length
      ).toFixed(1),
      maxPercent: Math.max(...percents).toFixed(1),
      attempts: rows.length,
    });
  } catch (err) {
    console.error("❌ get-user-stats エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 🧾 特定ユーザーのスコア履歴
// =============================
app.get("/get-scores/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const rows = await query(
      "SELECT score, total, date FROM scores WHERE username = ? ORDER BY date DESC",
      [username]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ get-scores エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 🧾 全スコア
// =============================
app.get("/get-all-scores", async (_, res) => {
  try {
    const rows = await query(
      "SELECT username, score, total, date FROM scores ORDER BY date DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ get-all-scores エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// ユーザー有効・無効切替
// =============================
app.put("/toggle-user/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const rows = await query(
      "SELECT active FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "ユーザーが見つかりません。" });
    }

    const next = rows[0].active === 1 ? 0 : 1;

    await query("UPDATE users SET active = ? WHERE username = ?", [
      next,
      username,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ toggle-user エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 問題取得
// =============================
app.get("/get-questions/:year", async (req, res) => {
  const { year } = req.params;

  try {
    const rows = await query(
      `SELECT 
        question_text,
        choice1, choice2, choice3, choice4,
        choice5, choice6, choice7, choice8, choice9,
        correct_choice,
        category,
        explanation,
        image_path
       FROM questions
       WHERE year_id = ?
       ORDER BY question_number`,
      [year]
    );

    res.json(
      rows.map((q) => ({
        question: q.question_text,
        choices: [
          q.choice1,
          q.choice2,
          q.choice3,
          q.choice4,
          q.choice5,
          q.choice6,
          q.choice7,
          q.choice8,
          q.choice9,
        ].filter(Boolean),
        answer: q.correct_choice - 1,
        category: q.category || "未分類",
        explanation: q.explanation || "",
        image: q.image_path || null,
      }))
    );
  } catch (err) {
    console.error("❌ get-questions エラー:", err);
    res.status(500).json({ success: false });
  }
});


// =============================
// 🔚 最後に index.html を返す（/ を開いた時）
// =============================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// =============================
// これを Vercel が serverless function として使う
// =============================
export default app;
