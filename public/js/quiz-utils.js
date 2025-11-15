
// ================================
// 選択肢シャッフル（大問6〜9対応）
// ================================
export function shuffleChoices(question) {
    // DBから取得した選択肢を配列化
    const choices = [
        question.choice1,
        question.choice2,
        question.choice3,
        question.choice4,
        question.choice5,
        question.choice6,
        question.choice7,
        question.choice8,
        question.choice9
    ];

    // 正解選択肢のテキストを保持
    const correctText = choices[question.correct_choice - 1];

    // Fisher-Yates シャッフル
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    // 新しい正解位置（1～9）
    const newCorrectIndex = choices.indexOf(correctText) + 1;

    return {
        choices,
        correct_choice: newCorrectIndex
    };
}
