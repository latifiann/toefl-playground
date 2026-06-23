const fs = require("node:fs/promises");
const path = require("node:path");
const paths = require("../config/paths");

class PracticeCatalogRepository {
  constructor() {
    this._cache = null;
  }

  async getAll() {
    if (this._cache) {
      return this._cache;
    }

    const entries = await fs.readdir(paths.CONTENT_DIR, { withFileTypes: true });
    const practiceDirs = entries
      .filter((entry) => entry.isDirectory() && /^practice-\d{2}$/i.test(entry.name))
      .map((entry) => path.join(paths.CONTENT_DIR, entry.name))
      .sort((a, b) => a.localeCompare(b));

    const catalog = [];

    for (const dir of practiceDirs) {
      const metaPath = path.join(dir, "meta.json");
      try {
        const raw = await fs.readFile(metaPath, "utf8");
        const meta = JSON.parse(raw);
        catalog.push(meta);
      } catch (error) {
        if (error && error.code === "ENOENT") {
          continue;
        }
        throw error;
      }
    }

    this._cache = catalog;
    return catalog;
  }
}

module.exports = PracticeCatalogRepository;
