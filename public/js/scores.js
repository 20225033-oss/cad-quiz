// =========================
// 年度 → 表示名
// =========================
function formatYearJP(y) {
  const s = String(y);
  const year = s.slice(0, 4);
  if (s.endsWith("01")) return `${year}前期`;
  if (s.endsWith("02")) return `${year}後期`;
  return year;
}

// =========================
// 難問ログ保存（解答時）
// ※ quiz-core.js 側で push する必要あり
// =========================
function addWrongLog(year_id, question_number) {
  const log = JSON.parse(localStorage.getItem("wrongLog") || "[]");
  log.push({ year_id, question_number, timestamp: Date.now() });
  localStorage.setItem("wrongLog", JSON.stringify(log));
}

// =========================
// 難問ログの Top10 を計算
// =========================
function getHardRanking() {
  const log = JSON.parse(localStorage.getItem("wrongLog") || "[]");

  // 最新100件だけ使う（重くしないため）
  const recent = log.slice(-100);

  const countMap = {};
  recent.forEach((e) => {
    const key = `${e.year_id}-${e.question_number}`;
    countMap[key] = (countMap[key] || 0) + 1;
  });

  const sortable = Object.entries(countMap)
    .map(([key, count]) => {
      const [year_id, qnum] = key.split("-").map(Number);
      return { year_id, qnum, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return sortable;
}

// =========================
// API から履歴取得（修正版）
// =========================
async function loadScores() {
  const userId = sessionStorage.getItem("userId");

  if (!userId) {
    console.error("userId が取得できません（未ログインの可能性）");
    return [];
  }
  
const res = await fetch(`/api/get-scores?user_id=${userId}`);

  if (!res.ok) {
    console.error("get-scores API エラー", res.status);
    return [];
  }

  const data = await res.json();
  return data.scores || [];
}



// =========================
// タブ切替
// =========================
function setupTabs() {
  const btns = document.querySelectorAll(".tab-buttons button");
  const tabs = document.querySelectorAll(".tab-content");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");

      tabs.forEach((c) => c.classList.remove("active"));
      document.getElementById(tab).classList.add("active");
    });
  });
}

// =========================
// 年度フィルター初期化
// =========================
function setupYearFilter(scores) {
  const select = document.getElementById("yearFilter");

  const years = Array.from(new Set(scores.map((s) => s.year_id))).sort();

  select.innerHTML = `<option value="all">すべて</option>`;
  years.forEach((y) => {
    select.innerHTML += `<option value="${y}">${formatYearJP(y)}</option>`;
  });

  return select;
}

// =========================
// グラフ描画
// =========================
let lineChart, pieChart, barChart, hardChart;

function updateCharts(scores) {
  const ctx1 = document.getElementById("lineChart");
  const ctx2 = document.getElementById("pieChart");
  const ctx3 = document.getElementById("barChart");
  const ctx4 = document.getElementById("hardChart");

  // 既存グラフを破棄
  if (lineChart) lineChart.destroy();
  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();
  if (hardChart) hardChart.destroy();

  // ====== 折れ線：スコア推移 ======
  lineChart = new Chart(ctx1, {
    type: "line",
    data: {
      labels: scores.map((s) => formatYearJP(s.year_id)),
      datasets: [
        {
          label: "得点",
          data: scores.map((s) => s.score),
          borderWidth: 2,
        },
      ],
    },
  });

  // ====== 円：合格率 ======
  const passed = scores.filter((s) => s.pass).length;
  const failed = scores.length - passed;

  pieChart = new Chart(ctx2, {
    type: "pie",
    data: {
      labels: ["合格", "不合格"],
      datasets: [
        {
          data: [passed, failed],
        },
      ],
    },
  });

  // ====== 棒：分野別正答数 ======
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);

  const cat1 = sum(scores.map((s) => s.correct_cat1 || 0));
  const cat2 = sum(scores.map((s) => s.correct_cat2 || 0));
  const cat3 = sum(scores.map((s) => s.correct_cat3 || 0));
  const cat4 = sum(scores.map((s) => s.correct_cat4 || 0));

  barChart = new Chart(ctx3, {
    type: "bar",
    data: {
      labels: ["分野1", "分野2", "分野3", "分野4"],
      datasets: [
        {
          label: "正答数",
          data: [cat1, cat2, cat3, cat4],
        },
      ],
    },
  });

  // ====== 難問分析 Top10 ======
  const hard = getHardRanking();
  hardChart = new Chart(ctx4, {
    type: "bar",
    data: {
      labels: hard.map(
        (h) => `${formatYearJP(h.year_id)} 問${h.qnum}`
      ),
      datasets: [
        {
          label: "間違え数",
          data: hard.map((h) => h.count),
        },
      ],
    },
  });
}

// =========================
// 履歴リスト更新
// =========================
function updateScoreList(scores) {
  const box = document.getElementById("scoreList");
  box.innerHTML = "";

  scores.forEach((s) => {
    box.innerHTML += `
      <div class="score-item">
        <strong>${formatYearJP(s.year_id)}</strong><br>
        得点: ${s.score}/${s.total}（${s.percent.toFixed(1)}%）<br>
        合否: ${s.pass ? "合格" : "不合格"}
      </div>
    `;
  });
}

// =========================
// メイン処理
// =========================
window.addEventListener("DOMContentLoaded", async () => {
  const allScores = await loadScores();

  const filter = setupYearFilter(allScores);
  setupTabs();

  function applyFilter() {
    const year = filter.value;
    const filtered =
      year === "all"
        ? allScores
        : allScores.filter((s) => String(s.year_id) === year);

    updateScoreList(filtered);
    updateCharts(filtered);
  }

  filter.addEventListener("change", applyFilter);

  applyFilter(); // 初期表示
});
