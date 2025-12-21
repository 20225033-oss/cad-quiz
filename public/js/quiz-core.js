// public/js/quiz-core.js
import { startTimer, stopTimer } from "./setTimer.js";

let currentQuestions = [];
let userAnswers = [];
let currentYearId = null;

/* ============================================
   🔧 大問ごとの範囲
============================================ */
const BIG_QUESTION_RANGES = [
  { id: 1, from: 1, to: 16 },
  { id: 2, from: 17, to: 20 },
  { id: 3, from: 21, to: 24 },
  { id: 4, from: 25, to: 32 },
  { id: 5, from: 33, to: 48 },
  { id: 6, from: 49, to: 51 },
  { id: 7, from: 52, to: 54 },
  { id: 8, from: 55, to: 57 },
  { id: 9, from: 58, to: 60 },
];

// 🔒 大問3 / 6〜9 は年度ミックス禁止（同じ年度からまとめて出題）
const FIXED_YEAR_BIG_IDS = new Set([3, 6, 7, 8, 9]);

/* ============================================
   🔧 選択肢数
============================================ */
function getChoiceCount(n) {
  n = Number(n);
  if (n <= 16) return 2;
  if (n <= 20) return 3;
  if (n <= 24) return 3;
  if (n <= 32) return 3;
  if (n <= 48) return 4;
  return 9;
}

/* ============================================
   🔧 長文判定
============================================ */
function isReadingQuestionNumber(n) {
  n = Number(n);
  return n >= 49 && n <= 60;
}

function getReadingRoot(n) {
  n = Number(n);
  if (n <= 51) return 49;
  if (n <= 54) return 52;
  if (n <= 57) return 55;
  return 58;
}

/* ============================================
   🔧 年度表示（201601 → 2016前期 など）
============================================ */
function formatYearJP(yearId) {
  if (!yearId) return "";
  const s = String(yearId);
  if (s.length < 4) return s;

  const year = s.slice(0, 4);
  let term = "";

  if (s.endsWith("01")) term = "前期";
  else if (s.endsWith("02")) term = "後期";

  return term ? `${year}${term}` : year;
}

/* ============================================
   🔧 HTML に表示するテキスト整形
============================================ */
function makeQuestionDisplayText(q) {
  const n = Number(q.question_number);

  if (!isReadingQuestionNumber(n)) {
    return (q.rawText || "").replace(/\n/g, "<br>");
  }

  const root = q.readingRoot ?? getReadingRoot(n);
  if (n === root) return `（${n}）に適する語句を選べ`;
  return `問${root} の（${n}）に適する語句を選べ`;
}

/* ============================================
   🔧 大問3の画像
============================================ */
function getImageForQuestion(row) {
  const n = Number(row.question_number);
  if (!(n >= 21 && n <= 24)) return null;

  let img = row.image_path ?? row.image ?? null;
  if (!img) return null;
  return `/images/${img}`;
}

/* ============================================
   🔧 DB → 内部形式へ変換
============================================ */
function mapRowToQuestion(row) {
  const n = Number(row.question_number);
  const choiceCount = getChoiceCount(n);

  const choices = [
    row.choice1, row.choice2, row.choice3, row.choice4,
    row.choice5, row.choice6, row.choice7, row.choice8, row.choice9,
  ]
    .slice(0, choiceCount)
    .map((c) => c ?? "");

  let correct = Number(row.correct_choice) || 1;
  if (correct < 1 || correct > choiceCount) correct = 1;

  const readingRoot = isReadingQuestionNumber(n)
    ? getReadingRoot(n)
    : null;

  return {
    id: row.id,
    year_id: row.year_id,
    question_number: n,
    category: row.category,
    rawText: row.question_text || "",
    readingRoot,
    readingPassage:
      readingRoot && n === readingRoot ? row.question_text : null,
    choices,
    correctIndex: correct - 1,
    explanation: row.explanation ?? "",
    image: getImageForQuestion(row),
  };
}

/* ============================================
   📥 問題取得
============================================ */
async function loadQuestions(year) {
  const res = await fetch(`/api/get-questions?year=${year}`);
  if (!res.ok) throw new Error("問題取得失敗");
  const data = await res.json();
  return (data.questions || []).map(mapRowToQuestion);
}

/* ============================================
   🔧 1年度分を大問ごとに分割
============================================ */
function splitIntoBigQuestions(questions) {
  const byNum = new Map();
  questions.forEach((q) => byNum.set(q.question_number, q));

  const result = {};

  for (const def of BIG_QUESTION_RANGES) {
    const list = [];
    for (let n = def.from; n <= def.to; n++) {
      const q = byNum.get(n);
      if (!q) {
        // 1問でも欠けたらこの年度はこのモードでは使わない
        return null;
      }
      list.push(q);
    }
    result[def.id] = list;
  }

  return result;
}

/* ============================================
   🔧 クイズ画面セットアップ
============================================ */
function setupQuizScreen(questions, yearIdForScore) {
  const quizArea = document.getElementById("quizArea");
  const resultArea = document.getElementById("resultArea");

  quizArea.innerHTML = "";
  resultArea.innerHTML = "";

  currentQuestions = questions;
  userAnswers = new Array(questions.length).fill(null);
  currentYearId = yearIdForScore;

  renderQuestions(quizArea);
  renderSubmitButton(quizArea);

  // 60分タイマー
  startTimer(handleSubmit, 60 * 60);
}

/* ============================================
   🎮 単一年度モード
============================================ */
export async function startQuiz(year) {
  const questions = await loadQuestions(year);
  setupQuizScreen(questions, questions[0]?.year_id ?? 0);
}

/* ============================================
   🎮 複数年度ミックス
   - 各大問ごとに、使える年度から1つをランダム選択
   - ただし大問3 / 6〜9 は「1つの年度」に固定
============================================ */
export async function startQuizFromYears(years) {
  const quizArea = document.getElementById("quizArea");
  const resultArea = document.getElementById("resultArea");

  quizArea.innerHTML = "問題を読み込んでいます...";
  resultArea.innerHTML = "";
  stopTimer();

  try {
    // 年度ごとに問題取得
    const allYearQuestions = await Promise.all(
      years.map(async (y) => ({
        year: y,
        questions: await loadQuestions(y),
      }))
    );

    // 年度ごとに大問分割
    const perYearBig = [];
    allYearQuestions.forEach(({ year, questions }) => {
      if (!questions.length) return;
      const big = splitIntoBigQuestions(questions);
      if (big) {
        perYearBig.push({ year, big });
      }
    });

    if (!perYearBig.length) {
      quizArea.innerHTML = "有効な年度の問題が見つかりません。";
      return;
    }

    const finalQuestions = [];

    // 🔒 大問3 / 6〜9 用の「固定年度」を決める
    let fixedYearSet = null;
    for (const baseYear of years) {
      const found = perYearBig.find((y) => String(y.year) === String(baseYear));
      if (found) {
        fixedYearSet = found;
        break;
      }
    }
    if (!fixedYearSet) {
      // 指定順で見つからなかったら先頭を固定年度にする
      fixedYearSet = perYearBig[0];
    }

    for (const def of BIG_QUESTION_RANGES) {
      let chosen = null;

      if (FIXED_YEAR_BIG_IDS.has(def.id)) {
        // 🔒 大問3 / 6〜9 は固定年度から
        if (fixedYearSet.big[def.id]) {
          chosen = fixedYearSet;
        } else {
          // もし固定年度にその大問が無い場合だけ他の年度から探す
          const candidates = perYearBig.filter((y) => y.big[def.id]);
          if (!candidates.length) continue;
          chosen =
            candidates[Math.floor(Math.random() * candidates.length)];
        }
      } else {
        // それ以外の大問は年度ごとにランダム
        const candidates = perYearBig.filter((y) => y.big[def.id]);
        if (!candidates.length) continue;
        chosen =
          candidates[Math.floor(Math.random() * candidates.length)];
      }

      finalQuestions.push(...chosen.big[def.id]);
    }

    if (!finalQuestions.length) {
      quizArea.innerHTML = "問題が用意できませんでした。";
      return;
    }

    // ミックスなので year_id=0 として保存
    setupQuizScreen(finalQuestions, 0);
  } catch (err) {
    console.error("startQuizFromYears エラー:", err);
    quizArea.innerHTML = "読み込みエラーが発生しました。";
  }
}

/* ============================================
   🔁 間違えた問題のみ
============================================ */
export function retryWrongQuestions() {
  const wrongs = JSON.parse(localStorage.getItem("wrongQuestions") || "[]");
  if (!wrongs.length) {
    alert("間違えた問題がありません");
    return;
  }
  setupQuizScreen(wrongs, wrongs[0]?.year_id ?? 0);
}

/* ============================================
   🖼 画像ライトボックス
============================================ */
function setupImageLightbox() {
  const overlay = document.getElementById("imageLightbox");
  const overlayImg = document.getElementById("imageLightboxImg");

  if (!overlay || !overlayImg) return;

  document.querySelectorAll("img.question-image").forEach((img) => {
    img.onclick = () => {
      overlayImg.src = img.src;
      overlay.classList.add("show");
    };
  });

  overlay.onclick = () => {
    overlay.classList.remove("show");
  };
}

/* ============================================
   📝 問題 1 問の DOM
   - 9択(Q49〜60) は 3×3 グリッド表示
============================================ */
function createQuestionBlock(q, index) {
  const div = document.createElement("div");
  div.className = "question-block";

  // Q番号
  const titleP = document.createElement("p");
  titleP.className = "question-title";
  titleP.innerHTML = `<strong>Q${index + 1}</strong>`;
  div.appendChild(titleP);

  // 画像
  if (q.image) {
    const img = document.createElement("img");
    img.src = q.image;
    img.className = "question-image";
    img.style.maxWidth = "400px";
    img.style.margin = "10px 0";
    img.style.display = "block";
    div.appendChild(img);
  }

  // 長文
  if (q.readingPassage) {
    const passageDiv = document.createElement("div");
    passageDiv.className = "reading-passage";
    passageDiv.innerHTML = q.readingPassage.replace(/\n/g, "<br>");
    div.appendChild(passageDiv);
  }

  // 問題文
  const textP = document.createElement("p");
  textP.className = "question-text";
  textP.innerHTML = makeQuestionDisplayText(q);
  div.appendChild(textP);

  // 9択かどうか
  const isNineChoices =
    q.choices.length === 9 ||
    (q.question_number >= 49 && q.question_number <= 60);

  // 選択肢コンテナ
  let container = div;
  if (isNineChoices) {
    const grid = document.createElement("div");
    grid.className = "choices-grid-9";
    container = grid;
    div.appendChild(grid);
  }

  // 選択肢
  q.choices.forEach((c, idx) => {
    const label = document.createElement("label");
    label.className = "choice-row";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = `q${index}`;
    input.value = String(idx);

    const span = document.createElement("span");
    span.innerHTML = c.replace(/\n/g, "<br>");

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  });

  return div;
}

/* ============================================
   🧩 大問アコーディオン
============================================ */
function renderQuestions(quizArea) {
  quizArea.innerHTML = "";

  BIG_QUESTION_RANGES.forEach((def) => {
    const list = currentQuestions.filter(
      (q) => q.question_number >= def.from && q.question_number <= def.to
    );

    if (!list.length) return;

    const section = document.createElement("section");
    section.className = "big-question"; // 初期は閉じた状態（CSSで big-body が非表示）

    const header = document.createElement("button");
    header.className = "big-header";
    header.textContent = `大問${def.id}（Q${def.from}〜Q${def.to}）`;
    header.type = "button";

    header.onclick = () => {
      section.classList.toggle("open"); // .open になると big-body が表示
    };

    const body = document.createElement("div");
    body.className = "big-body";

    list.forEach((q) => {
      const index = currentQuestions.indexOf(q);
      body.appendChild(createQuestionBlock(q, index));
    });

    section.appendChild(header);
    section.appendChild(body);
    quizArea.appendChild(section);
  });

  setupImageLightbox();
}

/* ============================================
   🚀 解答送信ボタン
============================================ */
function renderSubmitButton(quizArea) {
  const btn = document.createElement("button");
  btn.textContent = "解答を送信";
  btn.style.marginTop = "20px";
  btn.onclick = handleSubmit;
  quizArea.appendChild(btn);
}

/* ============================================
   🧮 採点処理（年度表示つき）
============================================ */
async function handleSubmit() {
  stopTimer();

  const quizArea = document.getElementById("quizArea");
  const resultArea = document.getElementById("resultArea");

  currentQuestions.forEach((q, i) => {
    const selected = document.querySelector(`input[name="q${i}"]:checked`);
    userAnswers[i] = selected ? Number(selected.value) : null;
  });

  let score = 0;
  let wrongQuestions = [];
  let categoryStats = {};

  let detail = "";

  currentQuestions.forEach((q, i) => {
    const ans = userAnswers[i];
    const ok = ans === q.correctIndex;

    if (!categoryStats[q.category])
      categoryStats[q.category] = { correct: 0, total: 0 };

    categoryStats[q.category].total++;

    if (ok) {
      categoryStats[q.category].correct++;
      score++;
    } else {
      wrongQuestions.push(q);
    }

    const yearLabel = q.year_id ? formatYearJP(q.year_id) : "年度不明";
    const headerLabel = `Q${i + 1} (${yearLabel}・問${q.question_number})`;

    detail += `
      <div style="margin-bottom:1em;">
        <strong>${headerLabel}</strong><br>
        あなたの答え: ${ans != null ? q.choices[ans] : "未選択"}<br>
        正解: ${q.choices[q.correctIndex]}<br>
        <span style="color:${ok ? "green" : "red"};">${ok ? "正解" : "不正解"}</span>
      </div>
    `;
  });

  const total = currentQuestions.length;
  const percent = (score / total) * 100;

  let passedAll = true;
  let totalCorrect = 0;

  let catText = "<h3>分野別成績</h3>";

  for (const cat in categoryStats) {
    const st = categoryStats[cat];
    const ratio = st.correct / st.total;
    const p = (ratio * 100).toFixed(1);
    totalCorrect += st.correct;

    if (ratio < 0.5) passedAll = false;

    catText += `<p>分野${cat}: ${st.correct}/${st.total}（${p}%）</p>`;
  }

  const passed = passedAll && totalCorrect / total >= 0.7;

  resultArea.innerHTML =
    `
    <h2>結果まとめ</h2>
    <p>正解数: ${score}/${total}（${percent.toFixed(1)}%）</p>
    ${catText}
    <h2 style="color:${passed ? "green" : "red"};">
      ${passed ? "🎉合格" : "❌不合格"}
    </h2>
    <button onclick="location.href='index.html'">ホーム</button>
    <button onclick="location.reload()">もう一度</button>
    <hr>
    ` +
    detail;

  quizArea.style.display = "none";

  // 間違えた問題保存
  if (wrongQuestions.length)
    localStorage.setItem("wrongQuestions", JSON.stringify(wrongQuestions));
  else localStorage.removeItem("wrongQuestions");

  // 採点後トップへ戻る
  window.scrollTo({ top: 0, behavior: "smooth" });


  // =========================
  // スコア保存（安定版）
  // =========================
  const userId = sessionStorage.getItem("userId");

  if (!userId) {
    console.error("userId が存在しません（未ログイン）");
  } else {
    try {
      const res = await fetch("/api/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(userId),
          year_id: currentYearId,
          score,
          total,
          percent,
          pass: passed,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("save-score API エラー:", text);
      } else {
        console.log("✅ スコア保存成功");
      }
    } catch (e) {
      console.error("スコア保存通信エラー:", e);
    }
  }



}
