const fs = require("node:fs/promises");
const path = require("node:path");
const paths = require("../config/paths");

class CanonicalPracticeRepository {
  constructor() {
    this._cache = new Map();
  }

  async getListening(practiceId) {
    const key = `listening-${practiceId}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const baseDir = this._getPracticeDir(practiceId);
    const listeningDir = path.join(baseDir, "canonical", "listening");
    const result = await this._readListeningSection(listeningDir);
    this._cache.set(key, result);
    return result;
  }

  async getStructure(practiceId) {
    const key = `structure-${practiceId}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const baseDir = this._getPracticeDir(practiceId);
    const structureDir = path.join(baseDir, "canonical", "structure");
    const result = await this._readStructureSection(structureDir);
    this._cache.set(key, result);
    return result;
  }

  async loadSection(practiceId, section) {
    if (section === "listening") {
      return this.getListening(practiceId);
    }
    if (section === "structure") {
      return this.getStructure(practiceId);
    }
    return null;
  }

  async _readListeningSection(listeningDir) {
    const aggregatePath = path.join(listeningDir, "questions.json");

    try {
      const raw = await fs.readFile(aggregatePath, "utf8");
      const aggregate = JSON.parse(raw);
      const partEntries = Object.entries(aggregate.parts || {}).sort((left, right) =>
        left[0].localeCompare(right[0]),
      );

      return {
        directions: partEntries[0]?.[1]?.directions || [],
        parts: partEntries.map(([partKey, part]) => ({
          part: part.part || partKey,
          directions: part.directions || [],
          exampleLines: part.example_lines || [],
          questions: (part.questions || []).map((question) => ({
            ...question,
            sourceNumber: question.source_number || question.sourceNumber || null,
            prompt: question.prompt || null,
          })),
        })),
      };
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        throw error;
      }
    }

    let entries;
    try {
      entries = await fs.readdir(listeningDir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return { directions: [], parts: [] };
      }
      throw error;
    }

    const partFiles = entries
      .filter((entry) => entry.isFile() && /part-[a-c]\.json$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => {
        const aNum = parseInt(a.match(/part-([a-c])$/i)?.[1] || "0", 36);
        const bNum = parseInt(b.match(/part-([a-c])$/i)?.[1] || "0", 36);
        return aNum - bNum;
      });

    const parts = await Promise.all(
      partFiles.map(async (fileName) => {
        const filePath = path.join(listeningDir, fileName);
        const raw = await fs.readFile(filePath, "utf8");
        return JSON.parse(raw);
      }),
    );

    return {
      directions: parts[0]?.directions || [],
      parts: parts.map((part) => ({
        part: part.part || part.subtype || "unknown",
        directions: part.directions || [],
        exampleLines: part.example_lines || [],
        questions: (part.questions || []).map((question) => ({
          ...question,
          sourceNumber: question.source_number || question.sourceNumber || null,
          prompt: question.prompt || null,
        })),
      })),
    };
  }

  async _readStructureSection(structureDir) {
    let entries;
    try {
      entries = await fs.readdir(structureDir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return { directions: [], subtypes: [] };
      }
      throw error;
    }

    const subFiles = entries
      .filter((entry) => entry.isFile() && /\.json$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort();

    const subtypes = await Promise.all(
      subFiles.map(async (fileName) => {
        const filePath = path.join(structureDir, fileName);
        const raw = await fs.readFile(filePath, "utf8");
        return JSON.parse(raw);
      }),
    );

    return {
      directions: subtypes[0]?.directions || [],
      subtypes: subtypes.map((subtype) => ({
        type: subtype.subtype || "unknown",
        directions: subtype.directions || [],
        intro: subtype.intro || [],
        examples: subtype.examples || [],
        questions: subtype.questions || [],
      })),
    };
  }

  _getPracticeDir(practiceId) {
    const slug = `practice-${practiceId.slice(1)}`;
    return path.join(paths.CONTENT_DIR, slug);
  }
}

module.exports = CanonicalPracticeRepository;
