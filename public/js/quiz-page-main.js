// public/js/quiz-page-main.js
import { startQuiz, startQuizFromYears, retryWrongQuestions } from "./quiz-core.js";

console.log("✅ クイズページ メインスクリプト起動");

// ================================
// 🔐 ログインチェック（最重要）
// ================================
window.addEventListener("DOMContentLoaded", () => {
  if (!sessionStorage.getItem("username")) {
    console.warn("❌ 未ログイン → login.html へ");
    location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);

  const retry = params.get("retry");
  const yearsParamRaw = params.get("years");
  const yearParam = params.get("year");

  console.log("📌 クエリ解析:", {
    retry,
    yearsParamRaw,
    yearParam,
  });

  // ================================
  // ① 間違えた問題モード
  // ================================
  if (retry === "1") {
    console.log("🔁 retryWrongQuestions() を実行");
    retryWrongQuestions();
    return;
  }

  // ================================
  // ② 複数年度ミックスモード
  // ================================
  if (yearsParamRaw) {
    const yearList = yearsParamRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[0-9]+$/.test(s));

    const uniqueYears = Array.from(new Set(yearList));

    if (uniqueYears.length === 0) {
      document.getElementById("quizArea").textContent =
        "年度指定が正しくありません。";
      return;
    }

    if (uniqueYears.length === 1) {
      console.log("➡ 年度1つのため startQuiz() に切り替え:", uniqueYears[0]);
      startQuiz(uniqueYears[0]);
      return;
    }

    console.log("🎯 複数年度ミックス:", uniqueYears);
    startQuizFromYears(uniqueYears);
    return;
  }

  // ================================
  // ③ 単一年度モード
  // ================================
  if (yearParam) {
    console.log("🎯 単一年度モード:", yearParam);
    startQuiz(yearParam);
    return;
  }

  // ================================
  // ④ 何も指定なし
  // ================================
  document.getElementById("quizArea").textContent =
    "クエリパラメータで年度が指定されていません。（例：?year=201601）";
});
