// api/get-questions.js
import { query } from './db';

export default async function handler(req, res) {
  const { year } = req.query;

  if (!year) {
    return res.status(400).json({ error: "Missing year parameter" });
  }

  try {
    const sql = `
      SELECT *
      FROM questions
      WHERE year_id = $1
      ORDER BY question_number
    `;
    const result = await query(sql, [year]);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("GET QUESTIONS ERROR:", error);
    return res.status(500).json({ error: "Failed to load questions" });
  }
}
