import crypto from "crypto";

/* =====================
   パスワード関連
===================== */
export function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(inputPassword, hashedPassword) {
  return hashPassword(inputPassword) === hashedPassword;
}

/* =====================
   JSON body パース
===================== */
export async function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

/* =====================
   レスポンス送信（★これが無かった）
===================== */
export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}
