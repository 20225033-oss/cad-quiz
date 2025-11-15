import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ★ .env を読むための準備
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ★ .env を 2階層上から読み込む
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ★ ← .env読み込みのあとで pool を import
import pool from "../../db.js";


// 年度ごとの画像ファイル名
const settings = {
  201601: "2016_zenki.png",
  201602: "2016_kouki.png",
  201701: "2017_zenki.png",
  201702: "2017_kouki.png",
};

async function applyImages() {
  for (const [year, image] of Object.entries(settings)) {
    console.log(`📌 年度 ${year} の画像設定開始...`);

    // --- まず全画像をクリア（image_path を NULL に） ---
    await pool.query(
      `UPDATE questions
       SET image_path = NULL
       WHERE year_id = ?`,
      [year]
    );

    // --- 大問3の問題番号だけに画像をセット ---
    await pool.query(
      `UPDATE questions
       SET image_path = ?
       WHERE year_id = ?
       AND question_number BETWEEN 21 AND 24`,
      [`/images/${image}`, year]
    );

    console.log(`✔ 完了: year_id ${year}`);
  }

  process.exit(0);
}

applyImages();
