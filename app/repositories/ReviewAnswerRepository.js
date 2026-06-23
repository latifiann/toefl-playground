const fs = require("node:fs/promises");
const path = require("node:path");
const paths = require("../config/paths");

class ReviewAnswerRepository {
  constructor() {
    this._cache = new Map();
  }

  async getListening(practiceId) {
    const key = `listening-${practiceId}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const answers = await this._loadDerived(practiceId, "listening");
    this._cache.set(key, answers);
    return answers;
  }

  async getStructure(practiceId) {
    const key = `structure-${practiceId}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const answers = await this._loadDerived(practiceId, "structure");
    this._cache.set(key, answers);
    return answers;
  }

  async getReading(practiceId) {
    const key = `reading-${practiceId}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const answers = await this._loadDerived(practiceId, "reading");
    this._cache.set(key, answers);
    return answers;
  }

  async _loadDerived(practiceId, section) {
    const slug = `practice-${practiceId.slice(1)}`;
    const derivedDir = path.join(paths.CONTENT_DIR, slug, "derived");
    const fileName = `${section}.answers.ai.json`;
    const filePath = path.join(derivedDir, fileName);

    try {
      const raw = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(raw);
      return {
        practiceId: data.practice_id || practiceId,
        section,
        status: data.status || "unknown",
        answers: data.answers || [],
      };
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return { practiceId, section, status: "missing", answers: [] };
      }
      throw error;
    }
  }
}

module.exports = ReviewAnswerRepository;
