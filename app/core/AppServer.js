const http = require("node:http");
const Router = require("./Router");
const DashboardController = require("../controllers/DashboardController");
const PracticePageController = require("../controllers/PracticePageController");
const AssetController = require("../controllers/AssetController");
const ResponseWriter = require("./ResponseWriter");

class AppServer {
  constructor(config) {
    this._port = config.PORT || 3000;
    this._responseWriter = new ResponseWriter();
    this._router = new Router();
    this._server = null;

    this._registerRoutes();
  }

  _registerRoutes() {
    const dashboardCtrl = new DashboardController(this._responseWriter);
    const practiceCtrl = new PracticePageController(this._responseWriter);
    const assetCtrl = new AssetController(this._responseWriter);

    this._router.get("/", async () => {
      dashboardCtrl.setRequest(this._res);
      await dashboardCtrl.handle();
    });

    this._router.get("/dashboard", async () => {
      dashboardCtrl.setRequest(this._res);
      await dashboardCtrl.handle();
    });

    this._router.get("/favicon.ico", () => {
      this._responseWriter.writeNoContent(this._res);
    });

    this._router.get("/assets/*", (req) => {
      assetCtrl.setRequest(this._res);
      const url = new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`,
      );
      assetCtrl.handle(url.pathname);
    });

    this._router.get("/practice/*", (req) => {
      const url = new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`,
      );
      const practiceId = url.pathname.slice("/practice/".length);
      practiceCtrl.setRequest(this._res);
      practiceCtrl.handle(practiceId);
    });
  }

  _handleRequest = (req, res) => {
    this._res = res;
    this._req = req;

    try {
      const matches = this._router.match(req);

      if (matches.length > 0) {
        const route = matches[0];
        route.handler(req);
        return;
      }

      this._responseWriter.writeError(res, 404, "Page not found");
    } catch (error) {
      console.error(error);
      this._responseWriter.writeError(res, 500, "Internal server error");
    }
  };

  start() {
    this._server = http.createServer(this._handleRequest);
    this._server.listen(this._port, () => {
      console.log(`TOEFL dashboard running at http://localhost:${this._port}`);
    });
  }

  shutdown() {
    if (this._server) {
      this._server.close();
    }
  }
}

module.exports = AppServer;
