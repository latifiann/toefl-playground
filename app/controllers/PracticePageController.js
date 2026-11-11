const PracticeShellView = require("../views/PracticeShellView");

const SHELL_PRACTICE_IDS = new Set([
  "P01",
  "P02",
  "P03",
  "P04",
  "P05",
  "P06",
  "P07",
  "P08",
]);

class PracticePageController {
  constructor(responseWriter) {
    this.responseWriter = responseWriter;
    this.practiceShellView = new PracticeShellView();
  }

  setRequest(res) {
    this._res = res;
  }

  async handle(practiceId) {
    if (!/^P\d{2}$/i.test(practiceId)) {
      this.responseWriter.writeError(this._res, 404, "Practice not found");
      return;
    }

    const normalizedId = practiceId.toUpperCase();

    if (!SHELL_PRACTICE_IDS.has(normalizedId)) {
      this.responseWriter.writeError(this._res, 404, "Practice not found");
      return;
    }

    const html = await this._renderPracticeShell(normalizedId);
    this.responseWriter.write(this._res, 200, html, "text/html; charset=utf-8");
  }

  async _renderPracticeShell(practiceId) {
    return this.practiceShellView.render({
      practiceId,
      title: `TOEFL Practice ${practiceId.slice(1)} - Review`,
    });
  }
}

module.exports = PracticePageController;
