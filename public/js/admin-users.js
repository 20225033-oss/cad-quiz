export function loadUsers() {
  fetch("/get-users")
    .then(res => res.json())
    .then(users => {
      const tbody = document.querySelector("#userTable tbody");
      tbody.innerHTML = "";

      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">ユーザーがいません。</td></tr>`;
        return;
      }

      users.forEach(user => {
        const isActive = user.active !== false;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${user.username}</td>
          <td>
            <button onclick="editPassword('${user.username}')">パスワード変更</button>
            <button onclick="deleteUser('${user.username}')">削除</button>
            <button onclick="toggleUser('${user.username}', ${isActive})">
              ${isActive ? "無効化" : "有効化"}
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
}

// === 新規ユーザー追加フォーム ===
export function addUserFormSetup() {
  const form = document.getElementById("addUserForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("newUsername").value;
    const password = document.getElementById("newPassword").value;

    fetch("/add-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        if (data.success) location.reload();
      });
  });
}

// === 個別操作 ===
window.deleteUser = function (username) {
  if (!confirm(`ユーザー「${username}」を削除しますか？`)) return;
  fetch(`/delete-user/${username}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      location.reload();
    });
};

window.toggleUser = function (username, isActive) {
  const action = isActive ? "無効化" : "有効化";
  if (!confirm(`ユーザー「${username}」を${action}しますか？`)) return;

  fetch(`/toggle-user/${username}`, { method: "PUT" })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      location.reload();
    });
};

window.editPassword = function (username) {
  const newPass = prompt(`ユーザー「${username}」の新しいパスワードを入力してください：`);
  if (!newPass) return;

  fetch("/edit-user-password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, newPassword: newPass })
  })
    .then(res => res.json())
    .then(data => alert(data.message));
};
