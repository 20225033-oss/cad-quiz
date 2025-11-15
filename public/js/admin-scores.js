export function loadScores() {
  // 全スコア
  fetch("/get-all-scores")
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#scoreTable tbody");
      tbody.innerHTML = "";
      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">スコア履歴がありません。</td></tr>`;
        return;
      }

      data.forEach(score => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${score.username}</td>
          <td>${score.score}</td>
          <td>${score.total}</td>
          <td>${new Date(score.date).toLocaleString()}</td>
          <td>
            <button onclick="editScore('${score.date}', ${score.score}, ${score.total})">編集</button>
            <button onclick="deleteScore('${score.date}')">削除</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });

  // ユーザー統計
  fetch("/get-all-user-stats")
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#userStatsTable tbody");
      tbody.innerHTML = "";
      data.forEach(stat => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${stat.username}</td>
          <td>${stat.avgPercent}%</td>
          <td>${stat.maxPercent}%</td>
          <td>${stat.attempts}</td>
        `;
        tbody.appendChild(tr);
      });
    });

  // ユーザーセレクトボックス
  fetch("/get-users")
    .then(res => res.json())
    .then(users => {
      const select = document.getElementById("userSelect");
      select.innerHTML = "";
      users.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.username;
        opt.textContent = u.username;
        select.appendChild(opt);
      });
    });

  // イベント登録
  document.querySelector("button[onclick='showUserScores()']").onclick = showUserScores;
}

// === 関数群 ===
window.deleteScore = function (date) {
  if (!confirm("このスコアを削除しますか？")) return;
  fetch(`/delete-score/${date}`, { method: "DELETE" })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      location.reload();
    });
};

window.editScore = function (date, oldScore, oldTotal) {
  const newScore = prompt("新しいスコアを入力してください:", oldScore);
  const newTotal = prompt("新しい全問題数を入力してください:", oldTotal);
  if (!newScore || !newTotal) return;

  fetch(`/edit-score/${date}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newScore, newTotal })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      location.reload();
    });
};

function showUserScores() {
  const username = document.getElementById("userSelect").value;
  if (!username) return alert("ユーザーを選択してください。");

  fetch(`/get-scores/${username}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#userScoreTable tbody");
      tbody.innerHTML = "";

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">スコア履歴がありません。</td></tr>`;
        return;
      }

      data.forEach(score => {
        const percent = ((score.score / score.total) * 100).toFixed(1);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${new Date(score.date).toLocaleString()}</td>
          <td>${score.score}</td>
          <td>${score.total}</td>
          <td>${percent}%</td>
        `;
        tbody.appendChild(tr);
      });
    });
}
