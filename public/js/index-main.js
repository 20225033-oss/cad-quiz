console.log("✅ ホーム画面スクリプト起動");

// =====================
// 年度チェックボックス取得
// =====================
const yearChecks = document.querySelectorAll(".year-check");
const randomStartButton = document.getElementById("startRandom");
const retryButton = document.getElementById("retryWrong");

// ===== ログイン情報反映 =====
const username = sessionStorage.getItem("username");

const usernameDisplay = document.getElementById("usernameDisplay");
if (usernameDisplay && username) {
  usernameDisplay.textContent = username;
}


// ============================================
// ① ランダム出題：選択した年度から出す
// ============================================
if (randomStartButton) {
  randomStartButton.addEventListener("click", () => {

    // ✔ class=".year-check" のチェックを確実に取得
    const selected = Array.from(document.querySelectorAll(".year-check"))
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    if (selected.length === 0) {
      alert("出題する年度を1つ以上チェックしてください。");
      return;
    }

    // クエリとして渡す → quiz.html?years=201601,201602
    const queryYears = selected.join(",");

    console.log("🎯 選択年度:", queryYears);

    window.location.href = `quiz.html?years=${encodeURIComponent(queryYears)}`;
  });
}

// ============================================
// ② 間違えた問題のみ
// ============================================
if (retryButton) {
  retryButton.addEventListener("click", () => {
    window.location.href = "quiz.html?retry=1";
  });
}

// ============================================
// ③ ログアウト
// ============================================
const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    const username = sessionStorage.getItem("username");

    await fetch("/api/record-logout-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });

    sessionStorage.clear();
    window.location.href = "login.html";
  });
}

// ============================================
// ④ ログインユーザー表示
// ============================================
const usernameLabel = document.getElementById("usernameDisplay");
if (usernameLabel) {
  const username = sessionStorage.getItem("username");
  usernameLabel.textContent = username ?? "(未ログイン)";
}

// ❌ 消す or 使わない
// const adminButton = document.getElementById("adminButton");

// ✅ これだけにする
const adminBtn = document.getElementById("adminBtn");

const isAdmin = sessionStorage.getItem("isAdmin") === "true";

if (adminBtn && isAdmin) {
  adminBtn.style.display = "inline-block";
  adminBtn.onclick = () => {
    location.href = "/admin-scores.html";
  };
}


// ============================================
// ⑥ ログインチェック（最重要）
// ============================================
const user = sessionStorage.getItem("username");
if (!user) {
  location.href = "login.html";
}
