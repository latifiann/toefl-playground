const PracticeCatalogRepository = require("../repositories/PracticeCatalogRepository");

class PracticeCatalogService {
  constructor() {
    this._catalogRepo = new PracticeCatalogRepository();
  }

  async getAll() {
    const metaList = await this._catalogRepo.getAll();
    return metaList.map((meta) => ({
      practiceId: meta.practice_id,
      title: meta.title,
      officialAnswerKeyAvailable: meta.official_answer_key_available || false,
      status: meta.status || "active",
    }));
  }
}

module.exports = PracticeCatalogService;
