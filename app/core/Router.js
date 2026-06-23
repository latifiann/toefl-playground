class Router {
  constructor() {
    this.routes = [];
  }

  get(path, handler) {
    this.routes.push({ method: "GET", path, handler });
  }

  post(path, handler) {
    this.routes.push({ method: "POST", path, handler });
  }

  match(request) {
    const url = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    );
    const pathname = url.pathname;
    const method = request.method || "GET";

    return this.routes
      .filter((route) => route.method === method)
      .filter((route) => this._matchPath(route.path, pathname));
  }

  _matchPath(pattern, pathname) {
    if (pattern === pathname) return true;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return false;
  }
}

module.exports = Router;
