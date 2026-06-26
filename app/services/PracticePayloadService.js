class PracticePayloadService {
  sanitizeListeningParts(parts) {
    return parts.map((part) => ({
      part: part.part,
      directions: part.directions,
      exampleLines: part.exampleLines,
      questions: part.questions.map((q) => this._sanitizeListeningQuestion(q)),
    }));
  }

  _sanitizeListeningQuestion(q) {
    return {
      id: q.id,
      sourceNumber: q.sourceNumber,
      prompt: q.prompt || null,
      choices: q.choices,
    };
  }

  sanitizeStructureSubtypes(subtypes) {
    return subtypes.map((subtype) => ({
      type: subtype.type,
      directions: subtype.directions,
      intro: subtype.intro,
      examples: (subtype.examples || []).map((example) => this._sanitizeStructureExample(example)),
      questions: subtype.questions.map((q) => this._sanitizeStructureQuestion(q)),
    }));
  }

  _sanitizeStructureExample(example) {
    return {
      ...example,
      choices: this._structureChoices(example.choices, example.sentence_segments || example.sentenceSegments),
    };
  }

  _sanitizeStructureQuestion(q) {
    return {
      id: q.id,
      sourceNumber: q.sourceNumber,
      prompt: q.prompt,
      choices: this._structureChoices(q.choices, q.render_segments || q.renderSegments),
      renderSegments: q.render_segments || q.renderSegments || null,
    };
  }

  _structureChoices(choices, segments) {
    if (choices && Object.keys(choices).length > 0) {
      return choices;
    }

    if (!Array.isArray(segments)) {
      return choices || {};
    }

    return segments.reduce((acc, segment) => {
      if (segment && segment.marker && segment.underlined) {
        acc[segment.marker] = segment.text || "";
      }
      return acc;
    }, {});
  }

  sanitizeReading(reading) {
    return {
      directions: reading.directions,
      timeLabel: reading.timeLabel,
      samplePassageLines: reading.samplePassageLines,
      examples: reading.examples,
      passages: reading.passages.map((p) => ({
        id: p.id,
        title: p.title,
        markdown: p.markdown,
        lineMap: p.lineMap,
        paragraphRanges: p.paragraphRanges,
        sourceQuestionRange: p.sourceQuestionRange,
        questionRangeLabel: p.questionRangeLabel,
      })),
      questions: reading.questions.map((q) => this._sanitizeReadingQuestion(q)),
    };
  }

  _sanitizeReadingQuestion(q) {
    return {
      id: q.id,
      passageId: q.passageId,
      sourceNumber: q.sourceNumber,
      prompt: q.prompt,
      choices: q.choices,
    };
  }

  createPublicPayload(aggregate) {
    const listening = aggregate.sections.listening;
    const structure = aggregate.sections.structure;
    const reading = aggregate.sections.reading;

    return {
      practiceId: aggregate.practiceId,
      title: aggregate.title,
      officialAnswerKeyAvailable: aggregate.officialAnswerKeyAvailable,
      sections: {
        listening: {
          directions: listening.directions,
          parts: this.sanitizeListeningParts(listening.parts),
        },
        structure: {
          directions: structure.directions,
          subtypes: this.sanitizeStructureSubtypes(structure.subtypes),
        },
        reading: this.sanitizeReading(reading),
      },
      reviewPolicy: {
        mode: "per-question",
        explanationStatus: "ai-draft",
      },
    };
  }
}

module.exports = PracticePayloadService;
