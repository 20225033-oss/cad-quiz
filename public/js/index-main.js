// public/js/index-main.js
import { startQuiz, retryWrongQuestions } from "./quiz-core.js";

console.log("✅ クイズモード起動");

const startButton = document.getElementById("startButton");
const retryButton = document.getElementById("retryWrong");
const yearSelect = document.getElementById("yearSelect");

startButton.onclick = () => {
  const selectedYear = yearSelect.value;
  startQuiz(selectedYear);
};

retryButton.onclick = retryWrongQuestions;
