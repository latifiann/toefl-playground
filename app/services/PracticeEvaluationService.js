class PracticeEvaluationService {
  constructor({ assemblerService }) {
    this.assemblerService = assemblerService;
  }

  async evaluate(practiceId, section, userAnswers) {
    const aggregate = await this.assemblerService.assemble(practiceId);
    const sectionData = aggregate?.sections?.[section];
    const submittedQuestionIds = new Set(Object.keys(userAnswers || {}));

    if (!sectionData) {
      throw new Error(`Section ${section} not found for ${practiceId}`);
    }

    const results = [];
    let score = 0;
    let total = 0;

    const questions = this._extractQuestions(sectionData, section);
    for (const question of questions) {
      const questionId = question.id;

      if (submittedQuestionIds.size > 0 && !submittedQuestionIds.has(questionId)) {
        continue;
      }

      const userAnswer = userAnswers[questionId];
      const correctAnswer = question.correctAnswer;
      const isCorrect = Boolean(userAnswer) && userAnswer === correctAnswer;
      total++;

      if (isCorrect) {
        score++;
      }

      const result = {
        questionId,
        userAnswer: userAnswer || null,
        correctAnswer: correctAnswer || null,
        isCorrect,
        explanation: question.explanation || null,
        explanationStatus: question.explanationStatus || "ai-draft",
      };

      if (section === 'structure' && question.grammarRule) {
        result.grammarRule = question.grammarRule;
      }

      if (section === 'reading') {
        result.evidenceQuote = question.evidenceQuote || null;
      }

      results.push(result);
    }

    return {
      practiceId,
      section,
      score,
      total,
      results,
    };
  }

  _extractQuestions(sectionData, section) {
    const questions = [];

    if (section === "listening") {
      const parts = Array.isArray(sectionData.parts) ? sectionData.parts : [];
      for (const part of parts) {
        if (part.questions) {
          for (const q of part.questions) {
            questions.push({
              id: q.id,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              explanationStatus: q.explanationStatus,
            });
          }
        }
      }
    } else if (section === "structure") {
      const subtypes = sectionData.subtypes || [];
      for (const subtype of subtypes) {
        if (subtype.questions) {
          for (const q of subtype.questions) {
            questions.push({
              id: q.id,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              explanationStatus: q.explanationStatus,
              grammarRule: q.grammarRule,
            });
          }
        }
      }
    } else if (section === "reading") {
      if (sectionData.questions) {
        for (const q of sectionData.questions) {
          questions.push({
            id: q.id,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            explanationStatus: q.explanationStatus,
            evidenceQuote: q.evidenceQuote,
          });
        }
      }
    }

    return questions;
  }
}

module.exports = { PracticeEvaluationService };
