const CanonicalPracticeRepository = require("../repositories/CanonicalPracticeRepository");
const ReviewAnswerRepository = require("../repositories/ReviewAnswerRepository");
const ReadingRepository = require("../repositories/ReadingRepository");

class PracticeAssemblerService {
  constructor() {
    this._canonicalRepo = new CanonicalPracticeRepository();
    this._reviewAnswerRepo = new ReviewAnswerRepository();
    this._readingRepo = new ReadingRepository();
  }

  async assemble(practiceId) {
    const meta = await this._getMeta(practiceId);
    const listening = await this._assembleListening(practiceId);
    const structure = await this._assembleStructure(practiceId);
    const reading = await this._assembleReading(practiceId);

    return {
      practiceId,
      title: meta?.title || `TOEFL Practice ${practiceId.slice(1)}`,
      officialAnswerKeyAvailable: meta?.official_answer_key_available || false,
      sections: {
        listening,
        structure,
        reading,
      },
      review: {
        listening: listening.review,
        structure: structure.review,
        reading: reading.review,
      },
    };
  }

  async _getMeta(practiceId) {
    const slug = `practice-${practiceId.slice(1)}`;
    const fs = require("node:fs/promises");
    const path = require("node:path");
    const paths = require("../config/paths");
    const metaPath = path.join(paths.CONTENT_DIR, slug, "meta.json");

    try {
      const raw = await fs.readFile(metaPath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async _assembleListening(practiceId) {
    const canonical = await this._canonicalRepo.getListening(practiceId);
    const review = await this._reviewAnswerRepo.getListening(practiceId);

    const reviewMap = new Map();
    review.answers.forEach((a) => {
      reviewMap.set(a.id, a);
    });

    const enrichedParts = canonical.parts.map((part) => ({
      ...part,
      questions: part.questions.map((q) => {
        const reviewData = reviewMap.get(q.id);
        return {
          ...q,
          proposedAnswer: reviewData?.proposed_answer || null,
          validatedAnswer: reviewData?.validated_answer || null,
          validationStatus: reviewData?.validation_status || "unvalidated",
          explanation: reviewData?.rationale_id || null,
          rationale: reviewData?.rationale_id || null,
          rationaleEn: reviewData?.rationale_en || null,
          confidenceLabel: reviewData?.confidence_label || null,
          needsManualReview: reviewData?.needs_manual_review || false,
        };
      }),
    }));

    return {
      directions: canonical.directions,
      parts: enrichedParts,
      review: {
        status: review.status,
        answers: review.answers,
      },
    };
  }

  async _assembleStructure(practiceId) {
    const canonical = await this._canonicalRepo.getStructure(practiceId);
    const review = await this._reviewAnswerRepo.getStructure(practiceId);

    const reviewMap = new Map();
    review.answers.forEach((a) => {
      reviewMap.set(a.id, a);
    });

    const enrichedSubtypes = canonical.subtypes.map((subtype) => ({
      ...subtype,
      questions: subtype.questions.map((q) => {
        const reviewData = reviewMap.get(q.id);
        return {
          ...q,
          proposedAnswer: reviewData?.proposed_answer || null,
          validatedAnswer: reviewData?.validated_answer || null,
          validationStatus: reviewData?.validation_status || "unvalidated",
          explanation: reviewData?.rationale_id || null,
          grammarRule: reviewData?.grammar_rule || null,
          rationale: reviewData?.rationale_id || null,
          rationaleEn: reviewData?.rationale_en || null,
          confidenceLabel: reviewData?.confidence_label || null,
          needsManualReview: reviewData?.needs_manual_review || false,
        };
      }),
    }));

    return {
      directions: canonical.directions,
      subtypes: enrichedSubtypes,
      review: {
        status: review.status,
        answers: review.answers,
      },
    };
  }

  async _assembleReading(practiceId) {
    const sectionData = await this._readingRepo.getSection(practiceId);
    const passages = await this._readingRepo.getPassages(practiceId);
    const questionFiles = await this._readingRepo.getQuestionFiles(practiceId);
    const review = await this._reviewAnswerRepo.getReading(practiceId);

    const reviewMap = new Map();
    review.answers.forEach((a) => {
      reviewMap.set(a.id, a);
    });

    const enrichedQuestions = [];
    questionFiles.forEach((qf) => {
      qf.questions.forEach((q) => {
        const reviewData = reviewMap.get(q.id);
        enrichedQuestions.push({
          ...q,
          passageId: qf.passageId,
          sourceNumber: q.source_number || qf.sourceNumber,
          lineMap: qf.lineMap,
          paragraphRanges: qf.paragraphRanges,
          proposedAnswer: reviewData?.proposed_answer || null,
          validatedAnswer: reviewData?.validated_answer || null,
          validationStatus: reviewData?.validation_status || "unvalidated",
          explanation: reviewData?.rationale_id || null,
          evidenceQuote: reviewData?.evidence_quote || null,
          evidenceRefs: reviewData?.evidence_refs || null,
          rationale: reviewData?.rationale_id || null,
          rationaleEn: reviewData?.rationale_en || null,
          confidenceLabel: reviewData?.confidence_label || null,
          needsManualReview: reviewData?.needs_manual_review || false,
        });
      });
    });

    return {
      directions: sectionData.directions,
      timeLabel: sectionData.timeLabel,
      samplePassageLines: sectionData.samplePassageLines,
      examples: sectionData.examples,
      passages,
      questions: enrichedQuestions,
      review: {
        status: review.status,
        answers: review.answers,
      },
    };
  }
}

module.exports = PracticeAssemblerService;
