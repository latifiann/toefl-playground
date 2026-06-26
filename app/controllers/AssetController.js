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
    const assetMap = {
      "/assets/dashboard.css": {
        fileName: "dashboard.css",
        contentType: "text/css; charset=utf-8",
      },
      "/assets/practice.css": {
        fileName: "practice.css",
        contentType: "text/css; charset=utf-8",
      },
      "/assets/practice-app.js": {
        fileName: "practice-app.js",
        contentType: "application/javascript; charset=utf-8",
      },
    };

    const asset = assetMap[assetPath];

    if (!asset) {
      this.responseWriter.writeError(
        this._res,
        404,
        "Asset not found",
      );
      return;
    }

    const body = await fs.readFile(
      path.join(paths.PUBLIC_DIR, asset.fileName),
      "utf8",
    );
    this.responseWriter.write(
      this._res,
      200,
      body,
      asset.contentType,
    );
  }
}

module.exports = AssetController;
