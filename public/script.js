// ==========================
// 🎯 基本変数
// ==========================
const startButton = document.getElementById("startButton");
const yearSelect = document.getElementById("yearSelect");
const quizArea = document.getElementById("quizArea");
const retryWrongButton = document.getElementById("retryWrong");

let currentQuestions = [];
let userAnswers = [];
let timerInterval = null;
let timeLimit = 3600; // 60分（秒）

// ==========================
// 🧱 DB行 -> クイズ用オブジェクトに変換
// ==========================
function mapRowToQuestion(row) {
  const choices = [
    row.choice1,
    row.choice2,
    row.choice3,
    row.choice4,
    row.choice5,
    row.choice6,
    row.choice7,
    row.choice8,
    row.choice9,
  ].filter((c) => c != null && c !== "");

  return {
    id: row.id,
    year_id: row.year_id,
    question_number: row.question_number,
    group_id: row.group_id,
    category: row.category,
    shuffle_allowed: row.shuffle_allowed,
    question: row.question_text,
    choices,
    answer: (row.correct_choice ?? 1) - 1, // 0 始まりに変換
    explanation: row.explanation || "",
    image: row.image_path || row.image || null,
  };
}

// ==========================
// 📥 問題読み込み
// ==========================
function loadQuestions(year) {
  return fetch(`/api/get-questions?year=${year}`)
    .then((res) => {
      if (!res.ok) throw new Error("問題データの取得に失敗しました");
      return res.json();
    })
    .then((data) => {
      const rows = data.questions || [];
      return rows.map(mapRowToQuestion);
    });
}

// ==========================
// ⏹ タイマー停止
// ==========================
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ==========================
// 🕒 タイマー開始
// ==========================
function startTimer() {
  const timerDisplay = document.getElementById("timer");
  let timeLeft = timeLimit;

  timerDisplay.textContent = formatTime(timeLeft);

  stopTimer();
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = formatTime(timeLeft);

    if (timeLeft <= 0) {
      stopTimer();
      alert("時間切れです！自動的に解答を送信します。");
      handleSubmit();
    }
  }, 1000);
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ==========================
// 🧩 クイズ開始
// ==========================
startButton.onclick = () => {
  const selectedYear = yearSelect.value;

  stopTimer();
  loadQuestions(selectedYear)
    .then((questions) => {
      if (!questions.length) {
        alert("この年度の問題がデータベースにありません。year_id が正しいか確認してください。");
        return;
      }

      currentQuestions = questions;
      userAnswers = new Array(currentQuestions.length).fill(null);
      quizArea.innerHTML = "";
      renderQuestions();
      renderSubmitButton();

      quizArea.style.display = "block";
      document.getElementById("resultArea")?.remove();
      startTimer();
    })
    .catch((err) => {
      alert("問題の読み込みに失敗しました: " + err.message);
    });
};

// ==========================
// 🔁 間違えた問題の再挑戦
// ==========================
retryWrongButton.onclick = () => {
  const wrongs = JSON.parse(localStorage.getItem("wrongQuestions")) || [];
  if (wrongs.length === 0) {
    alert("間違えた問題がありません。");
    return;
  }

  stopTimer();
  currentQuestions = wrongs;
  userAnswers = new Array(currentQuestions.length).fill(null);
  quizArea.innerHTML = "";
  renderQuestions();
  renderSubmitButton();
  quizArea.style.display = "block";
  document.getElementById("resultArea")?.remove();
  startTimer();
};

// ==========================
// 📝 問題描画
// ==========================
function renderQuestions() {
  quizArea.innerHTML = "";

  currentQuestions.forEach((q, i) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question-block";

    if (q.image) {
      questionDiv.innerHTML += `
        <img src="${q.image}" style="max-width: 400px; margin: 10px 0; display:block;">
      `;
    }

    questionDiv.innerHTML += `<p><strong>Q${i + 1}:</strong> ${q.question}</p>`;

    q.choices.forEach((choice, idx) => {
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="radio" name="q${i}" value="${idx + 1}">
        ${choice}
      `;
      label.style.display = "block";
      questionDiv.appendChild(label);
    });

    quizArea.appendChild(questionDiv);
  });
}

// ==========================
// 🚀 送信ボタン
// ==========================
function renderSubmitButton() {
  const btn = document.createElement("button");
  btn.textContent = "解答を送信";
  btn.onclick = handleSubmit;
  btn.style.marginTop = "20px";
  quizArea.appendChild(btn);
}

// ==========================
// 🧮 採点
// ==========================
function handleSubmit() {
  stopTimer();

  let wrongQuestions = [];

  currentQuestions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    userAnswers[i] = selected ? parseInt(selected.value, 10) : null;
  });

  let score = 0;
  let categoryStats = {};
  let resultHTML = `<div id="resultArea"><h2>結果まとめ</h2><hr>`;

  currentQuestions.forEach((q, i) => {
    const userAns = userAnswers[i];
    const isCorrect = userAns !== null && userAns - 1 === q.answer;

    const cat = q.category;
    if (isCorrect) score++;
    else wrongQuestions.push(q);

    if (!categoryStats[cat]) categoryStats[cat] = { correct: 0, total: 0 };

    categoryStats[cat].total++;
    if (isCorrect) categoryStats[cat].correct++;

    resultHTML += `
      <div style="margin-bottom: 1em;">
        <strong>Q${i + 1}:</strong> ${q.question}<br>
        あなたの答え: ${userAns !== null ? q.choices[userAns - 1] : "未選択"}<br>
        正しい答え: ${q.choices[q.answer]}<br>
        結果: <span style="color:${isCorrect ? "green" : "red"}">
          ${isCorrect ? "✅ 正解" : "❌ 不正解"}
        </span><br>
        ${q.explanation ? `<em>解説: ${q.explanation}</em>` : ""}
      </div>
    `;
  });

  let passedAll = true;
  let totalCorrect = 0;

  for (const cat in categoryStats) {
    const stat = categoryStats[cat];
    const ratio = stat.correct / stat.total;
    if (ratio < 0.5) passedAll = false;
    totalCorrect += stat.correct;
  }

  const totalRatio = totalCorrect / currentQuestions.length;
  const passed = passedAll && totalRatio >= 0.7;

  resultHTML += `<hr><h3>分野別成績:</h3>`;
  for (const cat in categoryStats) {
    const stat = categoryStats[cat];
    const percent = ((stat.correct / stat.total) * 100).toFixed(1);
    resultHTML += `<p>分野${cat}: ${stat.correct} / ${stat.total}（${percent}%）</p>`;
  }

  const percent = ((score / currentQuestions.length) * 100).toFixed(1);

  resultHTML += `
    <h2 style="color: ${passed ? "green" : "red"}">
      ${passed ? "🎉 合格！" : "❌ 不合格"}
    </h2>
    <hr>
    <p>正解数: ${score} / ${currentQuestions.length}（正答率: ${percent}%）</p>
    <button onclick="location.reload()">もう一度プレイ</button>
    <button onclick="location.href='scores.html'">スコアを見る</button>
    </div>
  `;

  quizArea.insertAdjacentHTML("afterend", resultHTML);
  quizArea.style.display = "none";

  if (wrongQuestions.length > 0)
    localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));
  else localStorage.removeItem("wrongQuestions");

  // ==========================
  // 💾 スコア保存
  // ==========================
  const userId = sessionStorage.getItem("userId");
  const yearId = currentQuestions[0]?.year_id || null;

  if (!userId || !yearId) return;

  fetch("/api/save-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: Number(userId),
      score,
      year_id: yearId,
    }),
  })
    .then((res) => res.json().catch(() => ({})))
    .then((data) => {
      console.log("スコア保存レスポンス:", data);
    })
    .catch((err) => console.error("⚠️ スコア送信エラー:", err));
}
