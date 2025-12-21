// api/save-score.js
console.log("🔥 NEW SAVE-SCORE VERSION RUNNING 🔥");

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      user_id,
      year_id,
      score,
      total,
      percent,
      pass,
    } = req.body;

    // 必須チェック
    if (
      user_id == null ||
      year_id == null ||
      score == null ||
      total == null ||
      percent == null
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sql = `
    INSERT INTO scores (
        user_id,
        year_id,
        score,
        total,
        percent,
        correct_cat1, total_cat1,
        correct_cat2, total_cat2,
        correct_cat3, total_cat3,
        correct_cat4, total_cat4,
        pass
    )
    VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,$11,$12,$13,
        $14
    )
    `;

    await pool.query(sql, [
        user_id,
        year_id,
        score,
        total,
        percent,
        0, 15,   // cat1
        0, 15,   // cat2
        0, 15,   // cat3
        0, 15,   // cat4
        !!pass,
    ]);




    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ save-score error:", err);

    return res.status(500).json({
    error: err.message,
    detail: err.detail,
    code: err.code,
    });

  }
}
