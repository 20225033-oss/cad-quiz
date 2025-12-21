export const config = {
  runtime: "nodejs",
};

import { query } from "./db.js";
import { send, parseJsonBody } from "./utils.js";

export default async function handler(req, res) {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // =====================
  // スコア保存
  // =====================
  if (pathname === "/api/save-score" && method === "POST") {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return send(res, 400, { error: "Invalid JSON" });
    }

    try {
      await query(
        `
        INSERT INTO scores
        (user_id, year_id, score, total, percent,
         correct_cat1, total_cat1,
         correct_cat2, total_cat2,
         correct_cat3, total_cat3,
         correct_cat4, total_cat4,
         pass)
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        `,
        [
          body.user_id,
          body.year_id,
          body.score,
          body.total,
          body.percent,
          body.correct_cat1,
          body.total_cat1,
          body.correct_cat2,
          body.total_cat2,
          body.correct_cat3,
          body.total_cat3,
          body.correct_cat4,
          body.total_cat4,
          body.pass,
        ]
      );

      return send(res, 200, { message: "Score saved" });
    } catch (e) {
      console.error("save-score error:", e);
      return send(res, 500, { error: "failed to save score" });
    }
  }

  // =====================
  // スコア取得
  // =====================
  if (pathname === "/api/get-scores" && method === "GET") {
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return send(res, 400, { error: "user_id required" });
    }

    try {
      const { rows } = await query(
        `
        SELECT
          id, user_id, year_id, score, total, percent,
          correct_cat1, total_cat1,
          correct_cat2, total_cat2,
          correct_cat3, total_cat3,
          correct_cat4, total_cat4,
          pass, created_at
        FROM scores
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [Number(userId)]
      );

      return send(res, 200, { scores: rows });
    } catch (e) {
      console.error("get-scores error:", e);
      return send(res, 500, { error: "failed to get scores" });
    }
  }

// =====================
// ログイン
// =====================
if (pathname === "/api/login" && method === "POST") {
  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON" });
  }

  const { username, password } = body;

  if (!username || !password) {
    return send(res, 400, { error: "username and password required" });
  }

  try {
    const { rows } = await query(
      `
      SELECT id, username, password, is_admin
      FROM users
      WHERE username = $1
      `,
      [username]
    );

    if (rows.length === 0) {
      return send(res, 401, { error: "login failed" });
    }

    const user = rows[0];

    // utils.js の verifyPassword を使う
    const { verifyPassword } = await import("./utils.js");

    if (!verifyPassword(password, user.password)) {
      return send(res, 401, { error: "login failed" });
    }

    return send(res, 200, {
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin,
    });
  } catch (e) {
    console.error("login error:", e);
    return send(res, 500, { error: "login failed" });
  }
}

// ===============================
// 管理者：ユーザー一覧
// ===============================
if (pathname === "/api/get-users" && method === "GET") {
  try {
    const { rows } = await query(
      "SELECT id, username FROM users ORDER BY id"
    );
    return send(res, 200, rows);
  } catch (err) {
    console.error("get-users error:", err);
    return send(res, 500, { error: "get-users failed" });
  }
}


// ===============================
// 管理者：全スコア
// ===============================
if (pathname === "/api/get-all-scores" && method === "GET") {
  try {
    const { rows } = await query(`
      SELECT s.*, u.username
      FROM scores s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    return send(res, 200, rows);
  } catch (err) {
    console.error("get-all-scores error:", err);
    return send(res, 500, { error: "get-all-scores failed" });
  }
}


// ===============================
// 管理者：ログイン履歴
// ===============================
if (pathname === "/api/get-login-times" && method === "GET") {
  try {
    const { rows } = await query(`
      SELECT username, MAX(login_time) AS last_login
      FROM login_times
      GROUP BY username
    `);
    return send(res, 200, rows);
  } catch (err) {
    console.error("get-login-times error:", err);
    return send(res, 500, { error: "get-login-times failed" });
  }
}

// =====================
// ユーザー登録（管理者用）
// =====================
if (pathname === "/api/register" && method === "POST") {
  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON" });
  }

  const { username, password } = body;

  if (!username || !password) {
    return send(res, 400, { error: "username and password required" });
  }

  try {
    // パスワードをSHA256でハッシュ
    const crypto = await import("crypto");
    const hashed = crypto.createHash("sha256").update(password).digest("hex");

    await query(
      `
      INSERT INTO users (username, password, active, is_admin)
      VALUES ($1, $2, TRUE, FALSE)
      `,
      [username, hashed]
    );

    return send(res, 200, { message: "user created" });
  } catch (e) {
    console.error("register error:", e);
    return send(res, 500, { error: "register failed" });
  }
}




  // =====================
  // 問題取得
  // =====================
  if (pathname === "/api/get-questions" && method === "GET") {
    const year = url.searchParams.get("year");

    if (!year) {
      return send(res, 400, { error: "year required" });
    }

    try {
      const { rows } = await query(
        `
        SELECT
          id,
          year_id,
          question_number,
          group_id,
          category,
          shuffle_allowed,
          question_text,
          choice1, choice2, choice3, choice4,
          choice5, choice6, choice7, choice8, choice9,
          correct_choice,
          explanation,
          image_path
        FROM questions
        WHERE year_id = $1
        ORDER BY question_number
        `,
        [Number(year)]
      );

      return send(res, 200, { questions: rows });
    } catch (e) {
      console.error("get-questions error:", e);
      return send(res, 500, { error: "failed to get questions" });
    }
  }

  return send(res, 404, { error: "NOT_FOUND" });
}


