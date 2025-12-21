// public/js/admin-main.js

// ===============================
//  管理者チェック
// ===============================
const username = sessionStorage.getItem("username");
const isAdmin = sessionStorage.getItem("isAdmin");

if (!username || isAdmin !== "true") {
  alert("このページは管理者専用です。ログインしてください。");
  window.location.href = "login.html";
}

// ===============================
//  ページ読み込み後に実行
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  loadUsers();
  setupAddUserForm();

  loadAllScores();
  setupUserSelect();

  loadLoginTimes();
});

// ======================================================
// ① 登録ユーザー一覧を表示
// ======================================================
async function loadUsers() {
  const res = await fetch("/api/get-users");
  const users = await res.json();

  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";

  users.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>
        <button onclick="deleteUser(${u.id})">削除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 新規ユーザー追加フォーム
function setupAddUserForm() {
  const form = document.getElementById("addUserForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await res.json();
    alert(result.message || "追加しました");

    loadUsers();
  });
}

// ユーザー削除
async function deleteUser(id) {
  if (!confirm("本当に削除しますか？")) return;

  await fetch("/api/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: id }),
  });

  loadUsers();
}

// ======================================================
// ② 全スコア一覧
// ======================================================
async function loadAllScores() {
  const res = await fetch("/api/get-all-scores");
  const data = await res.json();

  const tbody = document.querySelector("#scoreTable tbody");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">スコア履歴がありません。</td></tr>`;
    return;
  }

  data.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.user_id}</td>
      <td>${s.score}</td>
      <td>${s.total}</td>
      <td>${new Date(s.created_at).toLocaleString()}</td>
      <td><button onclick="deleteScore(${s.id})">削除</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteScore(scoreId) {
  if (!confirm("スコアを削除しますか？")) return;

  await fetch("/api/delete-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score_id: scoreId }),
  });

  loadAllScores();
}

// ======================================================
// ③ ユーザー別スコア表示
// ======================================================
async function setupUserSelect() {
  const res = await fetch("/api/get-users");
  const users = await res.json();

  const select = document.getElementById("userSelect");
  select.innerHTML = "";

  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.username;
    select.appendChild(option);
  });
}

async function showUserScores() {
  const id = document.getElementById("userSelect").value;
  if (!id) return;

  const res = await fetch(`/api/get-scores?user_id=${id}`);
  const scores = await res.json();

  const tbody = document.querySelector("#userScoreTable tbody");
  tbody.innerHTML = "";

  if (scores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">スコア履歴がありません。</td></tr>`;
    return;
  }

  scores.forEach((s) => {
    const rate =
      s.total && s.total > 0
        ? ((s.score / s.total) * 100).toFixed(1)
        : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(s.created_at).toLocaleString()}</td>
      <td>${s.score}</td>
      <td>${s.total}</td>
      <td>${rate}%</td>
    `;
    tbody.appendChild(tr);
  });
}

// ======================================================
// ④ ログイン時刻一覧
// ======================================================
async function loadLoginTimes() {
  const res = await fetch("/api/get-login-times");
  const times = await res.json();

  const tbody = document.querySelector("#loginTimeTable tbody");
  tbody.innerHTML = "";

  if (times.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">ログイン履歴がありません。</td></tr>`;
    return;
  }

  times.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.username}</td>
      <td>${t.last_login ? new Date(t.last_login).toLocaleString() : "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}
