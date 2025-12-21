// ============================
//  全スコア一覧読み込み
// ============================
export function loadScores() {

  // ------------------------------------------
  // 全スコア一覧
  // ------------------------------------------
  fetch("/api/get-all-scores")
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
          <td>${score.user_id}</td>
          <td>${score.score}</td>
          <td>${score.year_id}</td>
          <td>${new Date(score.date).toLocaleString()}</td>
          <td>
            <button onclick="editScore(${score.id}, ${score.score}, ${score.year_id})">編集</button>
            <button onclick="deleteScore(${score.id})">削除</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });

  // ------------------------------------------
  // ユーザー統計
  // ------------------------------------------
  fetch("/api/get-all-user-stats")
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#userStatsTable tbody");
      tbody.innerHTML = "";

      data.forEach(stat => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${stat.username}</td>
          <td>${stat.avg_score ? stat.avg_score.toFixed(1) : "-"}</td>
          <td>${stat.play_count}</td>
        `;
        tbody.appendChild(tr);
      });
    });

  // ------------------------------------------
  // ユーザー一覧 → セレクトボックス
  // ------------------------------------------
  fetch("/api/get-users")
    .then(res => res.json())
    .then(users => {
      const select = document.getElementById("userSelect");
      select.innerHTML = "";

      users.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.username;
        select.appendChild(opt);
      });
    });
}


// ============================
//  個別スコア削除
// ============================
window.deleteScore = function (score_id) {
  if (!confirm("このスコアを削除しますか？")) return;

  fetch("/api/delete-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score_id })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      location.reload();
    });
};


// ============================
//  スコア編集
// ============================
window.editScore = function (score_id, oldScore, oldYear) {
  const newScore = prompt("新しいスコア:", oldScore);
  const newYear = prompt("新しい年度 (例: 201601):", oldYear);

  if (!newScore || !newYear) return;

  fetch(`/api/edit-score?score_id=${score_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newScore, newTotal: newYear })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      location.reload();
    });
};


// ============================
//  特定ユーザーのスコア一覧
// ============================
window.showUserScores = function () {
  const user_id = document.getElementById("userSelect").value;

  fetch(`/api/get-scores?user_id=${user_id}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector("#userScoreTable tbody");
      tbody.innerHTML = "";

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">スコア履歴がありません。</td></tr>`;
        return;
      }

      data.forEach(score => {
        const percent = score.total
          ? `${((score.score / score.total) * 100).toFixed(1)}%`
          : "-";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${new Date(score.date).toLocaleString()}</td>
          <td>${score.score}</td>
          <td>${score.total}</td>
          <td>${percent}</td>
        `;
        tbody.appendChild(tr);
      });
    });
};
