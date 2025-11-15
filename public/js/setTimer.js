// ===============================
// タイマー機能（startTimer / stopTimer）
// ===============================

let timerId = null;
let remainingSeconds = 0;

// ⏱ タイマー開始（limitSeconds: 制限時間 秒）
export function startTimer(callback, limitSeconds = 600) {
  stopTimer(); // 既存タイマー停止
  remainingSeconds = limitSeconds;

  updateTimerDisplay();

  timerId = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      stopTimer();
      alert("時間になりました。結果を表示します。");
      callback(); // 自動採点
    }
  }, 1000);
}

// ⏹ タイマー停止
export function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

// ⏲ 表示更新
function updateTimerDisplay() {
  const el = document.getElementById("timer");
  if (!el) return;
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  el.textContent = `残り時間: ${m}:${s.toString().padStart(2, "0")}`;
}
