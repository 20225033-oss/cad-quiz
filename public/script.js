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
// 📥 問題読み込み
// ==========================
function loadQuestions(year) {
  return fetch(`/get-questions/${year}`)
    .then(res => {
      if (!res.ok) throw new Error("問題データの取得に失敗しました");
      return res.json();
    });
}


// ==========================
// ⏹ タイマー停止関数（追加）
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

  stopTimer(); // ← 保険としてリセット
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = formatTime(timeLeft);

    if (timeLeft <= 0) {
      stopTimer();
      alert("時間切れです！自動的に解答を送信します。");
      handleSubmit(); // 自動採点
    }
  }, 1000);
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ==========================
// 🧩 クイズ開始処理
// ==========================
startButton.onclick = () => {
  const selectedYear = yearSelect.value;

  stopTimer(); // ← 前回のタイマー停止
  loadQuestions(selectedYear)
    .then(data => {
      currentQuestions = data;
      userAnswers = new Array(currentQuestions.length).fill(null);
      quizArea.innerHTML = ''; // 初期化
      renderQuestions();
      renderSubmitButton();

      quizArea.style.display = "block";
      document.getElementById("resultArea")?.remove(); // 古い結果削除

      startTimer(); // ← 最後にタイマー開始
    })
    .catch(err => {
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

  stopTimer(); // ← タイマー停止
  currentQuestions = wrongs;
  userAnswers = new Array(currentQuestions.length).fill(null);
  quizArea.innerHTML = '';
  renderQuestions();
  renderSubmitButton();
  quizArea.style.display = "block";
  document.getElementById("resultArea")?.remove();

  startTimer(); // ← 最後に開始
};

// ==========================
// 📝 問題描画
// ==========================
function renderQuestions() {
  quizArea.innerHTML = ""; // ← 念のため初期化

  currentQuestions.forEach((q, i) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question-block";

    // ✅ 画像がある場合の表示（ここを追加）
    if (q.image_path && q.image_path !== "") {
      questionDiv.innerHTML += `
        <img src="${q.image_path}" style="max-width: 400px; margin: 10px 0; display:block;">
      `;
    }

    // ✅ 質問文
    questionDiv.innerHTML += `<p><strong>Q${i + 1}:</strong> ${q.question_text}</p>`;

    // ✅ 選択肢（4択 or 9択どちらでもOK）
    const choices = [
      q.choice1, q.choice2, q.choice3, q.choice4,
      q.choice5, q.choice6, q.choice7, q.choice8, q.choice9
    ].filter(c => c && c !== "");

    choices.forEach((choice, idx) => {
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
// 🚀 送信ボタンの描画
// ==========================
function renderSubmitButton() {
  const btn = document.createElement("button");
  btn.textContent = "解答を送信";
  btn.onclick = handleSubmit;
  btn.style.marginTop = "20px";
  quizArea.appendChild(btn);
}

// ==========================
// 🧮 採点処理
// ==========================
function handleSubmit() {
  stopTimer(); // ← タイマー完全停止

  let wrongQuestions = []; // 間違えた問題を格納
  currentQuestions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    userAnswers[i] = selected ? parseInt(selected.value) : null;
  });

  let score = 0;
  let categoryStats = {};
  let resultHTML = `
    <div id="resultArea">
      <h2>結果まとめ</h2>
      <hr>
  `;

  currentQuestions.forEach((q, i) => {
    const userAns = userAnswers[i];
    const isCorrect = userAns === q.answer;
    const cat = q.category;

    if (isCorrect) {
      score++;
    } else {
      wrongQuestions.push(q); // ❗解説付きで保存
    }

    if (!categoryStats[cat]) {
      categoryStats[cat] = { correct: 0, total: 0 };
    }

    categoryStats[cat].total += 1;
    if (isCorrect) categoryStats[cat].correct += 1;

    resultHTML += `
    <div style="margin-bottom: 1em;">
-       <strong>Q${i + 1}:</strong> ${q.question}<br>
-       あなたの答え: ${q.choices[userAns] ?? "未選択"}<br>
-       正しい答え: ${q.choices[q.answer]}<br>

+       <strong>Q${i + 1}:</strong> ${q.question_text}<br>
+       あなたの答え: ${(userAns ? q[`choice${userAns}`] : "未選択")}<br>
+       正しい答え: ${q[`choice${q.answer}`]}<br>

        結果: <span style="color:${isCorrect ? "green" : "red"}">
            ${isCorrect ? "✅ 正解" : "❌ 不正解"}
        </span><br>
        ${q.explanation ? `<em>解説: ${q.explanation}</em>` : ""}
    </div>
`;

  });

  // 分野別成績
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
    resultHTML += `<p>${cat}: ${stat.correct} / ${stat.total}（${percent}%）</p>`;
  }

  resultHTML += `
    <h2 style="color: ${passed ? "green" : "red"}">
      ${passed ? "🎉 合格！おめでとうございます" : "❌ 不合格。再挑戦してみましょう"}
    </h2>
  `;

  const percent = ((score / currentQuestions.length) * 100).toFixed(1);
  resultHTML += `
    <hr>
    <p>正解数: ${score} / ${currentQuestions.length}（正答率: ${percent}%）</p>
    <button onclick="location.reload()">もう一度プレイ</button>
    <button onclick="location.href='scores.html'">スコアを見る</button>
    </div>
  `;

  quizArea.insertAdjacentHTML("afterend", resultHTML);
  quizArea.style.display = "none";

  // 🧠 間違えた問題の保存
  if (wrongQuestions.length > 0) {
    localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));
  } else {
    localStorage.removeItem("wrongQuestions");
  }

  // 📨 スコア送信
  fetch("/save-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: sessionStorage.getItem("username"),
      score,
      total: currentQuestions.length
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) console.log("✅ スコア保存成功");
      else console.error("❌ スコア保存失敗:", data.message);
    })
    .catch(err => console.error("⚠️ スコア送信エラー:", err));
}
