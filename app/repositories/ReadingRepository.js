const fs = require("node:fs/promises");
const path = require("node:path");
const paths = require("../config/paths");

class ReadingRepository {
  constructor() {
    this._cache = new Map();
  }

  async getSection(practiceId) {
    const key = `section-${practiceId}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const slug = `practice-${practiceId.slice(1)}`;
    const readingDir = path.join(paths.CONTENT_DIR, slug, "canonical", "reading");
    const sectionPath = path.join(readingDir, "section.json");

    let sectionData;
    try {
      const raw = await fs.readFile(sectionPath, "utf8");
      sectionData = JSON.parse(raw);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        sectionData = {};
      } else {
        throw error;
      }
    }

    const result = {
      directions: sectionData.directions || [],
      timeLabel: sectionData.time_label || "",
      samplePassageLines: sectionData.sample_passage_lines || [],
      examples: sectionData.examples || [],
    };

    this._cache.set(key, result);
    return result;
  }

  async getPassages(practiceId) {
    const key = `passages-${practiceId}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const slug = `practice-${practiceId.slice(1)}`;
    const readingDir = path.join(paths.CONTENT_DIR, slug, "canonical", "reading");

    let entries;
    try {
      entries = await fs.readdir(readingDir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }

    const mdFiles = entries
      .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => {
        const aNum = parseInt(a.match(/passage-(\d+)/i)?.[1] || "0", 10);
        const bNum = parseInt(b.match(/passage-(\d+)/i)?.[1] || "0", 10);
        return aNum - bNum;
      });

    const passages = await Promise.all(
      mdFiles.map(async (fileName, index) => {
        const filePath = path.join(readingDir, fileName);
        const markdown = await fs.readFile(filePath, "utf8");
        return {
          id: `passage${index + 1}`,
          title: fileName.replace(/\.md$/i, "").replace("passage-", "Passage "),
          markdown,
        };
      }),
    );

    this._cache.set(key, passages);
    return passages;
  }

  async getQuestionFiles(practiceId) {
    const key = `questions-${practiceId}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const slug = `practice-${practiceId.slice(1)}`;
    const readingDir = path.join(paths.CONTENT_DIR, slug, "canonical", "reading");

    let entries;
    try {
      entries = await fs.readdir(readingDir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }

    const questionFiles = entries
      .filter((entry) => entry.isFile() && /^passage-\d+\.questions\.json$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => {
        const aNum = parseInt(a.match(/passage-(\d+)/i)?.[1] || "0", 10);
        const bNum = parseInt(b.match(/passage-(\d+)/i)?.[1] || "0", 10);
        return aNum - bNum;
      });

    const questions = await Promise.all(
      questionFiles.map(async (fileName, index) => {
        const filePath = path.join(readingDir, fileName);
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw);
        return {
          passageId: parsed.passage_id || `passage${index + 1}`,
          sourceNumber: parsed.source_number || [],
          lineMap: Array.isArray(parsed.line_map) ? parsed.line_map : [],
          paragraphRanges: Array.isArray(parsed.paragraph_ranges) ? parsed.paragraph_ranges : [],
          questions: parsed.questions || [],
        };
      }),
    );

    this._cache.set(key, questions);
    return questions;
  }
}

module.exports = ReadingRepository;
