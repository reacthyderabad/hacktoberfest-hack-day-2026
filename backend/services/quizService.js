/**
 * Quiz Evaluation and Readiness Assessment Service
 */

export function evaluateQuizSubmission(quiz = [], answers = []) {
  if (!Array.isArray(quiz) || quiz.length === 0) {
    throw new Error('Invalid quiz data provided for evaluation.');
  }

  let correctCount = 0;
  const totalCount = quiz.length;
  const breakdown = [];
  const reviewTopics = [];

  for (let i = 0; i < totalCount; i++) {
    const questionItem = quiz[i];
    const userAnswer = answers[i] !== undefined ? answers[i] : null;

    const isCorrect = userAnswer !== null && (
      String(userAnswer).trim().toLowerCase() === String(questionItem.correct_answer).trim().toLowerCase()
    );

    if (isCorrect) {
      correctCount++;
    } else {
      reviewTopics.push({
        question: questionItem.question,
        correctAnswer: questionItem.correct_answer,
        explanation: questionItem.explanation
      });
    }

    breakdown.push({
      questionIndex: i,
      question: questionItem.question,
      options: questionItem.options,
      userAnswer,
      correctAnswer: questionItem.correct_answer,
      isCorrect,
      explanation: questionItem.explanation
    });
  }

  const percentage = Math.round((correctCount / totalCount) * 100);
  const isPrepared = percentage >= 70;

  return {
    score: `${correctCount} / ${totalCount}`,
    scorePercentage: percentage,
    isPrepared,
    status: isPrepared ? 'prepared' : 'review_recommended',
    headline: isPrepared
      ? "You're Ready to Explore the Issue!"
      : "A Bit More Preparation Recommended",
    verdict: isPrepared
      ? "Based on this readiness check, you appear prepared to start exploring the issue."
      : "Before attempting this issue, we recommend reviewing the codebase concepts below.",
    disclaimer: "This assessment is an AI-assisted preparation indicator based on repository context, not a professional certification.",
    breakdown,
    reviewTopics,
    nextSteps: isPrepared
      ? [
          'Open the issue on GitHub to read maintainer and community comments',
          'Fork and clone the repository to your local development environment',
          'Locate the primary relevant file identified in the analysis',
          'Write a reproduction test case to isolate the issue',
          'Follow the repository CONTRIBUTING.md guidelines before opening a pull request'
        ]
      : [
          'Review the concept explanations in the "Required Concepts" section',
          'Inspect the target files and corresponding test files mentioned in the preparation path',
          'Retake the readiness check once you feel comfortable with the concepts'
        ]
  };
}
