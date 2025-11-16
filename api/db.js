import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env の読み込み
dotenv.config({ path: path.resolve(__dirname, ".env") });

// serverless では pool を作らず、毎回接続する
export async function query(sql, params) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [results] = await connection.execute(sql, params);
  await connection.end();
  return results;
}
