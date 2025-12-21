// ===============================
//  admin-login-times.js（新規作成）
//  ※ 統合API index.js に完全対応
// ===============================

export async function loadLoginTimes() {
  const res = await fetch("/api/get-login-times");
  const data = await res.json();

  const tbody = document.querySelector("#loginTimeTable tbody");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2">データがありません。</td></tr>`;
    return;
  }

  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.username}</td>
      <td>${formatDate(row.login_time)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 日付整形用
function formatDate(dt) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
