const fs = require("node:fs/promises");
const path = require("node:path");
const paths = require("../config/paths");

class AssetController {
  constructor(responseWriter) {
    this.responseWriter = responseWriter;
  }

  setRequest(res) {
    this._res = res;
  }

  async handle(assetPath) {
    if (assetPath !== "/assets/dashboard.css") {
      this.responseWriter.writeError(
        this._res,
        404,
        "Asset not found",
      );
      return;
    }

    const css = await fs.readFile(
      path.join(paths.PUBLIC_DIR, "dashboard.css"),
      "utf8",
    );
    this.responseWriter.write(
      this._res,
      200,
      css,
      "text/css; charset=utf-8",
    );
  }
}

module.exports = AssetController;
