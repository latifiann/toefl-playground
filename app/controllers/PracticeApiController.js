class PracticeApiController {
  constructor({ catalogService, assemblerService, payloadService, evaluationService, responseWriter }) {
    this.catalogService = catalogService;
    this.assemblerService = assemblerService;
    this.payloadService = payloadService;
    this.evaluationService = evaluationService;
    this.responseWriter = responseWriter;
    this._res = null;
  }

  setResponse(res) {
    this._res = res;
  }

  async listPractices() {
    const practices = await this.catalogService.getAll();
    this.responseWriter.writeJson(this._res, 200, { practices });
  }

  async getBootstrap(req) {
    const { id: practiceId } = req.params;
    const aggregate = await this.assemblerService.assemble(practiceId);
    const payload = this.payloadService.createPublicPayload(aggregate);
    this.responseWriter.writeJson(this._res, 200, payload);
  }

  async getSection(req) {
    const { id: practiceId, section } = req.params;
    const aggregate = await this.assemblerService.assemble(practiceId);
    const payload = this.payloadService.createPublicPayload(aggregate);

    const sectionData = payload.sections[section];
    if (!sectionData) {
      this.responseWriter.writeJson(this._res, 404, { error: `Section ${section} not found` });
      return;
    }

    this.responseWriter.writeJson(this._res, 200, { section, ...sectionData });
  }

  async submitAnswers(req) {
    const { id: practiceId, section } = req.params;
    let body;

    try {
      body = await this._readBody(req);
    } catch (err) {
      this.responseWriter.writeJson(this._res, 400, { error: "Invalid request body" });
      return;
    }

    const userAnswers = body.answers || {};
    const result = await this.evaluationService.evaluate(practiceId, section, userAnswers);
    this.responseWriter.writeJson(this._res, 200, result);
  }

  _readBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }
}

module.exports = { PracticeApiController };
