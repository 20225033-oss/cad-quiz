export function loadLoginTimes() {
  fetch("/get-login-times")
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#loginTimeTable tbody");
      tbody.innerHTML = "";
      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2">ログイン履歴がありません。</td></tr>`;
        return;
      }

      data.forEach(log => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${log.username}</td>
          <td>${log.lastLogin}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => console.error("ログイン履歴取得エラー:", err));
}
