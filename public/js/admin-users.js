// public/js/admin-users.js
// ===============================
//  admin-users.js（最新版）
//  ※ 統合API index.js に完全対応
// ===============================

// ユーザー一覧を読み込む
export async function loadUsers() {
  const res = await fetch("/api/get-users");
  const users = await res.json();

  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">ユーザーがいません。</td></tr>`;
    return;
  }

  users.forEach((user) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${user.username}</td>
      <td>
        <button onclick="editPassword(${user.id})">パスワード変更</button>
        <button onclick="deleteUser(${user.id})">削除</button>
        <button onclick="toggleUser(${user.id}, ${user.is_active})">
          ${user.is_active ? "無効化" : "有効化"}
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ===============================
// 新規ユーザー追加
// ===============================
export function addUserFormSetup() {
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
    alert(result.message);

    if (!result.error) location.reload();
  });
}

// ===============================
// ユーザー削除
// ===============================
window.deleteUser = async function (user_id) {
  if (!confirm("本当に削除しますか？")) return;

  const res = await fetch("/api/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id }),
  });

  const result = await res.json();
  alert(result.message);

  location.reload();
};

// ===============================
//  有効・無効切り替え
// ===============================
window.toggleUser = async function (user_id, is_active) {
  const confirmTxt = is_active ? "無効化" : "有効化";
  if (!confirm(`このユーザーを${confirmTxt}しますか？`)) return;

  const res = await fetch("/api/toggle-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, is_active: !is_active }),
  });

  const result = await res.json();
  alert(result.message);

  location.reload();
};

// ===============================
// パスワード変更
// ===============================
window.editPassword = async function (user_id) {
  const newPass = prompt("新しいパスワードを入力してください：");
  if (!newPass) return;

  const res = await fetch("/api/edit-user-password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, newPassword: newPass }),
  });

  const result = await res.json();
  alert(result.message);
};
