import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pool from "./db.js";

// ✅ ES Module 用 __dirname を先頭で定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 画像フォルダを公開
app.use("/images", express.static(path.join(__dirname, "images")));


app.use(express.json());
app.use(express.static("public")); // publicフォルダ公開



// 🔐 初期ユーザー（admin含む）
//const USERS = [
//  { username: "user1", password: "pass1" },
//  { username: "admin", password: "admin123" },
//];


app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? AND password = ? AND active = 1",
      [username, password]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "ユーザー名またはパスワードが違います。" });
    }

    const user = rows[0];
    const isAdmin = user.username === "admin";
    res.json({ success: true, isAdmin, username: user.username });

  } catch (err) {
    console.error("❌ ログイン処理エラー:", err);
    res.status(500).json({ success: false, message: "ログインに失敗しました。" });
  }
});


// 🕒 ログイン時刻（利用開始時刻）を MySQL に保存
app.post("/record-login-time", async (req, res) => {
  const { username } = req.body; // loginTime は受け取っても無視
  try {
    await pool.query(
      "INSERT INTO login_times (username, login_time) VALUES (?, NOW())",
      [username]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ record-login-time エラー:", err);
    res.status(500).json({ success: false });
  }
});






// ✅ ログアウト時間を記録して利用時間を計算
app.post("/record-logout-time", async (req, res) => {
  const { username, logoutTime } = req.body;

  try {
    // 1. 最後のログイン記録を取得（まだログアウトしていないもの）
    const [rows] = await pool.query(
      "SELECT id, login_time FROM login_times WHERE username = ? AND logout_time IS NULL ORDER BY id DESC LIMIT 1",
      [username]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "ログイン記録が見つかりません。" });
    }

    const { id, login_time } = rows[0];

    // 2. 経過時間を分単位で計算
    const durationMinutes = Math.round(
      (new Date(logoutTime) - new Date(login_time)) / (1000 * 60)
    );

    // 3. logout_time と duration_minutes を更新
    await pool.query(
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



// 🆕 新規登録処理（user_scoresへ保存）
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "ユーザー名とパスワードを入力してください。" });
  }

  try {
    const [existing] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "このユーザー名は既に使われています。" });
    }

    await pool.query(
      "INSERT INTO users (username, password, active) VALUES (?, ?, 1)",
      [username, password]
    );

    res.json({ success: true, message: "登録完了！ログインしてください。" });

  } catch (err) {
    console.error("❌ 登録エラー:", err);
    res.status(500).json({ success: false, message: "登録中にエラーが発生しました。" });
  }
});





// 💾 スコア保存（MySQL版）
app.post("/save-score", async (req, res) => {
  const { username, score, total } = req.body;

  try {
    await pool.query(
      "INSERT INTO scores (username, score, total, date) VALUES (?, ?, ?, NOW())",
      [username, score, total]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ スコア保存エラー:", err);
    res.status(500).json({ success: false });
  }
});


// 🗑 スコア削除
app.delete("/delete-score/:date", (req, res) => {
  const filePath = path.join(__dirname, "scores.json");
  const { date } = req.params;

  if (!fs.existsSync(filePath)) return res.json({ success: false });

  let scores = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  scores = scores.filter(s => s.date !== date);
  fs.writeFileSync(filePath, JSON.stringify(scores, null, 2));

  res.json({ success: true });
});

// ✏️ スコア編集
app.put("/edit-score/:date", (req, res) => {
  const { date } = req.params;
  const { newScore, newTotal } = req.body;
  const filePath = path.join(__dirname, "scores.json");

  if (!fs.existsSync(filePath)) return res.json({ success: false });

  let scores = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const idx = scores.findIndex(s => s.date === date);
  if (idx === -1) return res.json({ success: false });

  scores[idx].score = newScore;
  scores[idx].total = newTotal;
  scores[idx].editedAt = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(scores, null, 2));
  res.json({ success: true });
});

// 👥 ユーザー一覧取得
app.get("/get-users", (req, res) => {
  const filePath = path.join(__dirname, "user.json");
  if (!fs.existsSync(filePath)) return res.json([]);
  const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(users);
});

// 🕓 全ユーザーのログイン履歴取得（管理者用）
app.get("/get-login-times", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT username, login_time, logout_time, duration_minutes
       FROM login_times
       ORDER BY login_time DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ get-login-times エラー:", err);
    res.status(500).json({ success: false });
  }
});


// 📊 ユーザー別総利用時間（MySQL版）
app.get("/get-user-durations", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        username,
        SUM(duration_minutes) AS totalMinutes
      FROM login_times
      WHERE duration_minutes IS NOT NULL
      GROUP BY username
      ORDER BY totalMinutes DESC;
    `);

    const result = rows.map(r => ({
      username: r.username,
      totalMinutes: r.totalMinutes || 0,
      totalHours: ((r.totalMinutes || 0) / 60).toFixed(1)
    }));

    res.json(result);

  } catch (err) {
    console.error("❌ get-user-durations DBエラー:", err);
    res.status(500).json({ success: false });
  }
});





// 🗑 ユーザー削除処理（スコアも同時削除）
app.delete("/delete-user/:username", (req, res) => {
  const username = req.params.username;
  const userFile = path.join(__dirname, "user.json");
  const scoreFile = path.join(__dirname, "scores.json");

  // --- ユーザーファイルの存在確認 ---
  if (!fs.existsSync(userFile)) {
    return res.status(404).json({ success: false, message: "ユーザーファイルが存在しません" });
  }

  // --- ユーザー削除処理 ---
  let users = JSON.parse(fs.readFileSync(userFile, "utf-8"));
  const newUsers = users.filter(u => u.username !== username);

  if (newUsers.length === users.length) {
    return res.status(404).json({ success: false, message: "指定されたユーザーが見つかりません" });
  }

  fs.writeFileSync(userFile, JSON.stringify(newUsers, null, 2));

  // --- スコア削除処理 ---
  if (fs.existsSync(scoreFile)) {
    let scores = JSON.parse(fs.readFileSync(scoreFile, "utf-8"));
    const newScores = scores.filter(s => s.username !== username);
    fs.writeFileSync(scoreFile, JSON.stringify(newScores, null, 2));
  }

  res.json({ success: true, message: `ユーザー「${username}」と関連スコアを削除しました` });
});


// 🆕 ユーザー追加（管理者用）
app.post("/add-user", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "ユーザー名とパスワードを入力してください。" });
  }

  try {
    const [existing] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "このユーザー名は既に存在します。" });
    }

    await pool.query(
      "INSERT INTO users (username, password, active) VALUES (?, ?, 1)",
      [username, password]
    );

    res.json({ success: true, message: `ユーザー「${username}」を追加しました。` });

  } catch (err) {
    console.error("❌ add-user エラー:", err);
    res.status(500).json({ success: false, message: "ユーザー追加中にエラーが発生しました。" });
  }
});



// ✏️ ユーザーパスワード変更（管理者用）
app.put("/edit-user-password", (req, res) => {
  const { username, newPassword } = req.body;
  const filePath = path.join(__dirname, "user.json");

  if (!username || !newPassword) {
    return res.status(400).json({ success: false, message: "ユーザー名または新しいパスワードが不足しています。" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "ユーザーファイルが存在しません。" });
  }

  let users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const userIndex = users.findIndex(u => u.username === username);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "指定されたユーザーが見つかりません。" });
  }

  users[userIndex].password = newPassword;
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

  res.json({ success: true, message: `ユーザー「${username}」のパスワードを変更しました。` });
});


// 📊 全ユーザー統計（MySQL版）
app.get("/get-all-user-stats", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT username, score, total FROM scores"
    );

    if (rows.length === 0) return res.json([]);

    const stats = {};

    rows.forEach(s => {
      if (!stats[s.username]) stats[s.username] = [];
      stats[s.username].push(s);
    });

    const result = Object.entries(stats).map(([username, data]) => {
      const percents = data.map(s => (s.score / s.total) * 100);
      const avg = (percents.reduce((a, b) => a + b, 0) / percents.length).toFixed(1);
      const max = Math.max(...percents).toFixed(1);

      return { username, avgPercent: avg, maxPercent: max, attempts: data.length };
    });

    res.json(result);

  } catch (err) {
    console.error("❌ get-all-user-stats エラー:", err);
    res.status(500).json({ success: false });
  }
});


// 📊 特定ユーザーの統計情報（平均・最高・受験回数）MySQL版
app.get("/get-user-stats/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const [rows] = await pool.query(
      "SELECT score, total FROM scores WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.json({ avgPercent: 0, maxPercent: 0, attempts: 0 });
    }

    const percents = rows.map(s => (s.score / s.total) * 100);
    const avgPercent = (percents.reduce((a, b) => a + b, 0) / percents.length).toFixed(1);
    const maxPercent = Math.max(...percents).toFixed(1);
    const attempts = rows.length;

    res.json({ avgPercent, maxPercent, attempts });

  } catch (err) {
    console.error("❌ get-user-stats エラー:", err);
    res.status(500).json({ success: false });
  }
});


// 🧾 特定ユーザーのスコア履歴取得（MySQL版）
app.get("/get-scores/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const [rows] = await pool.query(
      "SELECT score, total, date FROM scores WHERE username = ? ORDER BY date DESC",
      [username]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ get-scores エラー:", err);
    res.status(500).json({ success: false });
  }
});


app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SHOW TABLES");
    res.json(rows);
  } catch (err) {
    res.status(500).send("DB Error: " + err);
  }
})

// 🔄 ユーザー有効・無効切り替え（DB版）
app.put("/toggle-user/:username", async (req, res) => {
  const { username } = req.params;

  try {
    // 現在の状態を取得
    const [rows] = await pool.query(
      "SELECT active FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "ユーザーが見つかりません。" });
    }

    const currentStatus = rows[0].active; // 1 or 0
    const newStatus = currentStatus === 1 ? 0 : 1;

    // active を更新
    await pool.query(
      "UPDATE users SET active = ? WHERE username = ?",
      [newStatus, username]
    );

    res.json({
      success: true,
      message: `ユーザー「${username}」を ${newStatus === 1 ? "有効化" : "無効化"} しました。`
    });

  } catch (err) {
    console.error("❌ active 更新エラー:", err);
    res.status(500).json({ success: false, message: "更新中にエラーが発生しました。" });
  }
});


// 🧾 全スコア一覧を取得（MySQL版）
app.get("/get-all-scores", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT username, score, total, date FROM scores ORDER BY date DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ get-all-scores エラー:", err);
    res.status(500).json({ success: false });
  }
});


app.get('/db-test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1');
    res.send("✅ DB接続成功！ MySQLと通信できています。");
  } catch (err) {
    console.error("❌ DB接続エラー:", err);
    res.status(500).send("❌ DB接続エラー: " + err.message);
  }
});



// ✅ 年度ごとの問題取得 API
app.get("/get-questions/:year", async (req, res) => {
  const { year } = req.params;
  try {
    const [rows] = await pool.query(
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

    const formatted = rows.map(q => ({
      question: q.question_text,
      choices: [
        q.choice1, q.choice2, q.choice3, q.choice4,
        q.choice5, q.choice6, q.choice7, q.choice8, q.choice9
      ].filter(Boolean),
      answer: q.correct_choice - 1,
      category: q.category || "未分類",
      explanation: q.explanation || "",
      image: q.image_path || null
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ get-questions エラー:", err);
    res.status(500).json({ success: false });
  }
});


// 起動（ローカル用）
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました`);
  });
}

// Vercel 用エクスポート
export default app;
