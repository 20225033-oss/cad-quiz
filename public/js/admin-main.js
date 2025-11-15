import { loadUsers, addUserFormSetup } from "./admin-users.js";
import { loadScores } from "./admin-scores.js";
import { loadLoginTimes } from "./admin-login-times.js";

const username = sessionStorage.getItem("username");
const isAdmin = sessionStorage.getItem("isAdmin");

// 🚨 管理者チェック
if (!username || isAdmin !== "true") {
  alert("このページは管理者専用です。");
  window.location.href = "login.html";
}

// 各機能の読み込み
window.addEventListener("DOMContentLoaded", () => {
  loadUsers();
  addUserFormSetup();
  loadScores();
  loadLoginTimes();
});
