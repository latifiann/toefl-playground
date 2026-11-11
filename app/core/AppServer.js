const http = require("node:http");
const Router = require("./Router");
const DashboardController = require("../controllers/DashboardController");
const PracticePageController = require("../controllers/PracticePageController");
const AssetController = require("../controllers/AssetController");
const {
  PracticeApiController,
} = require("../controllers/PracticeApiController");
const ResponseWriter = require("./ResponseWriter");
const { CONTENT_DIR } = require("../config/paths");
const PracticeCatalogRepository = require("../repositories/PracticeCatalogRepository");
const CanonicalPracticeRepository = require("../repositories/CanonicalPracticeRepository");
const ReviewAnswerRepository = require("../repositories/ReviewAnswerRepository");
const ReadingRepository = require("../repositories/ReadingRepository");
const PracticeCatalogService = require("../services/PracticeCatalogService");
const PracticeAssemblerService = require("../services/PracticeAssemblerService");
const PracticePayloadService = require("../services/PracticePayloadService");
const {
  PracticeEvaluationService,
} = require("../services/PracticeEvaluationService");

class AppServer {
  constructor(config) {
    this._port = config.PORT || 3000;
    this._responseWriter = new ResponseWriter();
    this._router = new Router();
    this._server = null;

    this._registerRoutes();
  }

  _registerRoutes() {
    // Repository layer
    const catalogRepo = new PracticeCatalogRepository({
      contentDir: CONTENT_DIR,
    });
    const canonicalRepo = new CanonicalPracticeRepository({
      contentDir: CONTENT_DIR,
    });
    const reviewRepo = new ReviewAnswerRepository({
      contentDir: CONTENT_DIR,
    });
    const readingRepo = new ReadingRepository({
      contentDir: CONTENT_DIR,
    });

    // Service layer
    const catalogService = new PracticeCatalogService({ catalogRepo });
    const assemblerService = new PracticeAssemblerService({
      canonicalRepo,
      reviewRepo,
      readingRepo,
    });
    const payloadService = new PracticePayloadService();
    const evaluationService = new PracticeEvaluationService({
      assemblerService,
    });

    // Controller layer
    this._router.get("/", async (req, res) => {
      const dashboardCtrl = new DashboardController(
        this._responseWriter,
        catalogService,
      );
      dashboardCtrl.setRequest(res);
      return dashboardCtrl.handle();
    });

    this._router.get("/dashboard", async (req, res) => {
      const dashboardCtrl = new DashboardController(
        this._responseWriter,
        catalogService,
      );
      dashboardCtrl.setRequest(res);
      return dashboardCtrl.handle();
    });

    this._router.get("/favicon.ico", (req, res) => {
      this._responseWriter.writeNoContent(res);
    });

    this._router.get("/assets/*", (req, res) => {
      const assetCtrl = new AssetController(this._responseWriter);
      assetCtrl.setRequest(res);
      const url = new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`,
      );
      return assetCtrl.handle(url.pathname);
    });

    this._router.get("/practice/*", (req, res) => {
      const practiceCtrl = new PracticePageController(this._responseWriter);
      const url = new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`,
      );
      const practiceId = url.pathname.slice("/practice/".length);
      practiceCtrl.setRequest(res);
      return practiceCtrl.handle(practiceId);
    });

    // Phase 3: API routes
    this._router.get("/api/practices", (req, res) => {
      const practiceApiCtrl = new PracticeApiController({
        catalogService,
        assemblerService,
        payloadService,
        evaluationService,
        responseWriter: this._responseWriter,
      });
      practiceApiCtrl.setResponse(res);
      return practiceApiCtrl.listPractices();
    });

    this._router.get("/api/practice/:id/bootstrap", (req, res) => {
      const practiceApiCtrl = new PracticeApiController({
        catalogService,
        assemblerService,
        payloadService,
        evaluationService,
        responseWriter: this._responseWriter,
      });
      practiceApiCtrl.setResponse(res);
      return practiceApiCtrl.getBootstrap(req);
    });

    this._router.get("/api/practice/:id/sections/:section", (req, res) => {
      const practiceApiCtrl = new PracticeApiController({
        catalogService,
        assemblerService,
        payloadService,
        evaluationService,
        responseWriter: this._responseWriter,
      });
      practiceApiCtrl.setResponse(res);
      return practiceApiCtrl.getSection(req);
    });

    this._router.post(
      "/api/practice/:id/sections/:section/submit",
      (req, res) => {
        const practiceApiCtrl = new PracticeApiController({
          catalogService,
          assemblerService,
          payloadService,
          evaluationService,
          responseWriter: this._responseWriter,
        });
        practiceApiCtrl.setResponse(res);
        return practiceApiCtrl.submitAnswers(req);
      },
    );
  }

  _handleRequest = (req, res) => {
    try {
      const matches = this._router.match(req);

      if (matches.length > 0) {
        const route = matches[0];
        if (route.handler._params) {
          req.params = route.handler._params;
        }
        const result = route.handler(req, res);
        if (result && typeof result.catch === "function") {
          result.catch((error) => {
            console.error(error);
            if (!res.headersSent) {
              this._responseWriter.writeError(
                res,
                500,
                "Internal server error",
              );
            }
          });
        }
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
