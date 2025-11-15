import { shuffleChoices } from "./quiz-utils.js";
import { startTimer, stopTimer } from "./setTimer.js";


let currentQuestions = [];
let userAnswers = [];

/**
 * クイズ開始処理（DBから取得）
 */
export function startQuiz(year) {
  fetch(`/get-questions/${year}`)
    .then(res => res.json())
    .then(data => {
      currentQuestions = data.map(q => ({
        question: q.question,
        choices: q.choices,
        answer: q.answer,
        category: q.category || "未分類",
        explanation: q.explanation || "",
        // image or image_path どっちで返ってきても対応できるようにする
        image: q.image || q.image_path || null
      }));


      userAnswers = new Array(currentQuestions.length).fill(null);

      const quizArea = document.getElementById("quizArea");
      quizArea.innerHTML = "";
      document.getElementById("resultArea")?.remove();

      renderQuestions(quizArea);
      renderSubmitButton(quizArea);

      quizArea.style.display = "block";
    })
    .catch(err => alert("問題の読み込みに失敗しました: " + err.message));
}


/**
 * 問題描画（画像対応済）
 */
function renderQuestions(container) {
  currentQuestions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "question-block";

    let html = `<p><strong>Q${i + 1}:</strong> ${q.question}</p>`;

    // ✅ 画像があればそのまま表示
    if (q.image) {
      html += `<img src="${q.image}" style="max-width: 400px; display:block; margin:10px 0;">`;
    }

    div.innerHTML = html;

    q.choices.forEach((choice, idx) => {
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="radio" name="q${i}" value="${idx}">
        ${choice}
      `;
      label.style.display = "block";
      div.appendChild(label);
    });

    container.appendChild(div);
  });
}



/**
 * 解答送信ボタン描画
 */
function renderSubmitButton(container) {
  const btn = document.createElement("button");
  btn.textContent = "解答を送信";
  btn.onclick = handleSubmit;
  btn.style.marginTop = "20px";
  container.appendChild(btn);
}

/**
 * 解答処理と結果表示
 */
export function handleSubmit() {
  stopTimer();

  const quizArea = document.getElementById("quizArea");
  let wrongQuestions = [];
  let score = 0;
  let categoryStats = {};

  currentQuestions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    const ans = selected ? parseInt(selected.value) : null;
    userAnswers[i] = ans;

    const isCorrect = ans === q.answer;
    if (isCorrect) score++;
    else wrongQuestions.push(q);

    // 分野別記録
    if (!categoryStats[q.category]) categoryStats[q.category] = { correct: 0, total: 0 };
    categoryStats[q.category].total++;
    if (isCorrect) categoryStats[q.category].correct++;
  });

  // ✅ 間違い問題の保存ロジック（そのまま）
  const pastWrongs = JSON.parse(localStorage.getItem("wrongQuestions")) || [];
  const isRetryMode = currentQuestions.every(q =>
    pastWrongs.some(pq => pq.question === q.question)
  );

  let updatedWrongs;
  if (isRetryMode) {
    updatedWrongs = pastWrongs.filter(pq =>
      wrongQuestions.some(wq => wq.question === pq.question)
    );
  } else {
    updatedWrongs = [
      ...pastWrongs,
      ...wrongQuestions.filter(
        wq => !pastWrongs.some(pq => pq.question === wq.question)
      )
    ];
  }

  if (updatedWrongs.length > 0) localStorage.setItem("wrongQuestions", JSON.stringify(updatedWrongs));
  else localStorage.removeItem("wrongQuestions");


  // ✅ 成績表示
  const percent = ((score / currentQuestions.length) * 100).toFixed(1);
  let passedAll = true;
  let totalCorrect = 0;

  for (const cat in categoryStats) {
    const stat = categoryStats[cat];
    const ratio = stat.correct / stat.total;
    if (ratio < 0.5) passedAll = false;
    totalCorrect += stat.correct;
  }

  const passed = passedAll && (totalCorrect / currentQuestions.length) >= 0.7;

  let resultHTML = `
    <div id="resultArea">
      <h2>結果まとめ</h2>
      <p>正解数: ${score} / ${currentQuestions.length}（${percent}%）</p>
      <h3 style="color:${passed ? "green" : "red"}">
        ${passed ? "🎉 合格おめでとうございます！" : "❌ 不合格。再挑戦してみましょう。"}
      </h3>
      <hr>
      <h3>分野別正答率</h3>
  `;

  for (const cat in categoryStats) {
    const stat = categoryStats[cat];
    const p = ((stat.correct / stat.total) * 100).toFixed(1);
    resultHTML += `<p>${cat}: ${stat.correct} / ${stat.total}（${p}%）</p>`;
  }

  resultHTML += `<hr><h3>問題ごとの解説</h3>`;

  currentQuestions.forEach((q, i) => {
    const userAns = userAnswers[i];
    const isCorrect = userAns === q.answer;
    resultHTML += `
      <div style="margin-bottom:1em;">
        <strong>Q${i + 1}:</strong> ${q.question}<br>
        あなたの答え: ${q.choices[userAns] ?? "未選択"}<br>
        正答: ${q.choices[q.answer]}<br>
        ${q.explanation ? `<em>解説: ${q.explanation}</em><br>` : ""}
        <span style="color:${isCorrect ? "green" : "red"}">${isCorrect ? "✅ 正解" : "❌ 不正解"}</span>
        <hr>
      </div>
    `;
  });

  resultHTML += `<button onclick="location.reload()">もう一度プレイ</button></div>`;

  quizArea.insertAdjacentHTML("afterend", resultHTML);
  quizArea.style.display = "none";
}

/**
 * 間違えた問題だけ再挑戦
 */
export function retryWrongQuestions() {
  const wrongs = JSON.parse(localStorage.getItem("wrongQuestions")) || [];
  if (wrongs.length === 0) return alert("間違えた問題がありません。");

  stopTimer();

  currentQuestions = wrongs;
  userAnswers = new Array(currentQuestions.length).fill(null);

  const quizArea = document.getElementById("quizArea");
  quizArea.innerHTML = "";
  document.getElementById("resultArea")?.remove();

  renderQuestions(quizArea);
  renderSubmitButton(quizArea);

  quizArea.style.display = "block";
  startTimer(handleSubmit);
}
