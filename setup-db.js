import mysql from "mysql2/promise";

const pool = await mysql.createPool({
  host: "crossover.proxy.rlwy.net",
  port: 29910,
  user: "root",
  password: "FkXtPIpgzhNuMGmlRuKIOCpWYeYhQgGC",
  database: "railway"
});

console.log("✅ DB 接続成功");

await pool.query(`
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    field INT NOT NULL,
    slot_number INT NOT NULL,
    question_text TEXT NOT NULL,
    choices_json JSON NOT NULL,
    correct_choice INT NOT NULL
);
`);

console.log("✅ questions テーブル作成完了");
process.exit();
