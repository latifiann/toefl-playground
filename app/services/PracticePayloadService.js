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
      sourceNumber: q.source_number,
      choices: q.choices,
    };
  }

  sanitizeStructureSubtypes(subtypes) {
    return subtypes.map((subtype) => ({
      type: subtype.type,
      directions: subtype.directions,
      intro: subtype.intro,
      examples: subtype.examples,
      questions: subtype.questions.map((q) => this._sanitizeStructureQuestion(q)),
    }));
  }

  _sanitizeStructureQuestion(q) {
    return {
      id: q.id,
      sourceNumber: q.source_number,
      prompt: q.prompt,
      choices: q.choices,
    };
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
