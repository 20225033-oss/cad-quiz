// public/js/quiz-utils.js
// ================================
// 選択肢シャッフル（大問6〜9対応想定）
// ================================
export function shuffleChoices(row) {
  // row: DBから取得した1行（choice1〜9, correct_choice を持つ）

  // 元の選択肢と「元の番号」をペアで持つ
  const originalChoices = [];
  for (let i = 1; i <= 9; i++) {
    const key = `choice${i}`;
    const text = row[key];
    if (text !== null && text !== "") {
      originalChoices.push({ text, originalIndex: i }); // originalIndex は 1〜9
    }
  }

  if (originalChoices.length === 0) {
    return {
      choices: [],
      correct_choice: 1,
    };
  }

  const originalCorrect = row.correct_choice || 1;
  let correctText = null;

  // 元の正解テキストを取得
  const correctObj = originalChoices.find(
    (c) => c.originalIndex === originalCorrect
  );
  if (correctObj) {
    correctText = correctObj.text;
  } else {
    // 万が一見つからなければ先頭を正解扱い
    correctText = originalChoices[0].text;
  }

  // Fisher-Yates シャッフル
  for (let i = originalChoices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [originalChoices[i], originalChoices[j]] = [
      originalChoices[j],
      originalChoices[i],
    ];
  }

  const choices = originalChoices.map((c) => c.text);
  const newCorrectIndex = choices.indexOf(correctText); // 0〜

  return {
    choices,
    correct_choice: newCorrectIndex + 1, // 1〜 に戻す
  };
}
