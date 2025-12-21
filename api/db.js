import pg from "pg";

const { Pool } = pg;

// 🔴 サーバレスでは Client じゃなく Pool を使う
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}
