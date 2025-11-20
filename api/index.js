// api/index.js
import { query } from "../db.js";
import { hashPassword, verifyPassword, parseJsonBody } from "../utils.js";

// JSON ボディ取得（Vercel 対策）
async function readBody(req) {
  return await parseJsonBody(req);
}

function json(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  const { method } = req;
  const url = req.url || "";
  const body = await readBody(req);

  try {
    // ======================================================
    //  GET QUESTIONS
    // ======================================================
    if (url.startsWith("/get-questions")) {
      if (method !== "GET")
        return json(res, 405, { error: "Method Not Allowed" });

      const year = new URL(req.url, "http://localhost").searchParams.get("year");
      if (!year) return json(res, 400, { error: "year is required" });

      const result = await query(
        "SELECT * FROM questions WHERE year_id = $1 ORDER BY question_number ASC",
        [year]
      );

      return json(res, 200, { questions: result.rows });
    }

    // ======================================================
    //  GET USERS
    // ======================================================
    if (url.startsWith("/get-users")) {
      const result = await query(
        "SELECT id, username, is_active, is_admin FROM users ORDER BY id ASC"
      );
      return json(res, 200, result.rows);
    }

    // ======================================================
    //  REGISTER
    // ======================================================
    if (url.startsWith("/register") && method === "POST") {
      const { username, password } = body;

      if (!username || !password)
        return json(res, 400, { error: "Missing username or password" });

      const hashed = hashPassword(password);

      await query(
        "INSERT INTO users (username, password) VALUES ($1, $2)",
        [username, hashed]
      );

      return json(res, 200, { message: "Registered!" });
    }

    // ======================================================
    //  LOGIN
    // ======================================================
    if (url.startsWith("/login") && method === "POST") {
      const { username, password } = body;

      const result = await query(
        "SELECT * FROM users WHERE username=$1",
        [username]
      );

      if (result.rowCount === 0)
        return json(res, 400, { error: "User not found" });

      const user = result.rows[0];

      if (!verifyPassword(password, user.password))
        return json(res, 400, { error: "Invalid password" });

      return json(res, 200, {
        message: "Login OK",
        userId: user.id,
        isAdmin: user.is_admin === true
      });
    }

    // ======================================================
    // SAVE SCORE
    // ======================================================
    if (url.startsWith("/save-score") && method === "POST") {
      const { user_id, score, year_id } = body;

      await query(
        "INSERT INTO scores (user_id, score, year_id) VALUES ($1, $2, $3)",
        [user_id, score, year_id]
      );

      return json(res, 200, { message: "Score saved" });
    }

    // ======================================================
    // GET SCORES
    // ======================================================
    if (url.startsWith("/get-scores")) {
      const user_id = new URL(req.url, "http://localhost").searchParams.get("user_id");

      const result = await query(
        "SELECT * FROM scores WHERE user_id=$1 ORDER BY id DESC",
        [user_id]
      );

      return json(res, 200, result.rows);
    }

    // ======================================================
    //  TOGGLE USER ACTIVE
    // ======================================================
    if (url.startsWith("/toggle-user") && method === "POST") {
      const { user_id, is_active } = body;

      await query(
        "UPDATE users SET is_active=$1 WHERE id=$2",
        [is_active, user_id]
      );

      return json(res, 200, { message: "User toggled" });
    }

    // ======================================================
    // DELETE USER
    // ======================================================
    if (url.startsWith("/delete-user") && method === "POST") {
      const { user_id } = body;

      await query("DELETE FROM users WHERE id=$1", [user_id]);

      return json(res, 200, { message: "User deleted" });
    }

    // ======================================================
    // DELETE SCORE
    // ======================================================
    if (url.startsWith("/delete-score") && method === "POST") {
      const { score_id } = body;

      await query("DELETE FROM scores WHERE id=$1", [score_id]);

      return json(res, 200, { message: "Score deleted" });
    }

    // ======================================================
    // GET ALL SCORES
    // ======================================================
    if (url.startsWith("/get-all-scores")) {
      const result = await query("SELECT * FROM scores ORDER BY id DESC");
      return json(res, 200, result.rows);
    }

    // ======================================================
    // GET USER STATS
    // ======================================================
    if (url.startsWith("/get-all-user-stats")) {
      const result = await query(`
        SELECT u.id, u.username, COUNT(s.id) AS play_count, AVG(s.score) AS avg_score
        FROM users u
        LEFT JOIN scores s ON u.id = s.user_id
        GROUP BY u.id
        ORDER BY u.id
      `);

      return json(res, 200, result.rows);
    }

    // ======================================================
    // RECORD LOGIN TIME
    // ======================================================
    if (url.startsWith("/record-login-time") && method === "POST") {
      const { user_id } = body;

      await query(
        "INSERT INTO login_times (user_id, login_time) VALUES ($1, NOW())",
        [user_id]
      );

      return json(res, 200, { message: "Login time recorded" });
    }

    // ======================================================
    // RECORD LOGOUT TIME
    // ======================================================
    if (url.startsWith("/record-logout-time") && method === "POST") {
      const { user_id } = body;

      await query(
        "UPDATE login_times SET logout_time = NOW() WHERE user_id=$1 ORDER BY id DESC LIMIT 1",
        [user_id]
      );

      return json(res, 200, { message: "Logout time recorded" });
    }

    // ======================================================
    // GET LOGIN TIMES
    // ======================================================
    if (url.startsWith("/get-login-times")) {
      const result = await query(`
        SELECT u.username, l.login_time, l.logout_time
        FROM login_times l
        JOIN users u ON u.id = l.user_id
        ORDER BY l.login_time DESC
      `);

      return json(res, 200, result.rows);
    }

    // NOT FOUND
    return json(res, 404, { error: "API Not Found" });

  } catch (err) {
    console.error(err);
    return json(res, 500, {
      error: "Server Error",
      detail: err.message
    });
  }
}
