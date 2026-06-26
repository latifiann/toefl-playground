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

    const matchingRoutes = this.routes.filter((route) => route.method === method);

    for (const route of matchingRoutes) {
      const params = this._extractParams(route.path, pathname);
      if (params) {
        route.handler._params = params;
        return [route];
      }
    }
    return [];
  }

  _extractParams(pattern, pathname) {
    if (pattern === pathname) return {};
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (!pathname.startsWith(prefix)) return null;
      return {};
    }
    const patternParts = pattern.split("/");
    const pathnameParts = pathname.split("/");
    if (patternParts.length !== pathnameParts.length) return null;
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        params[patternParts[i].slice(1)] = pathnameParts[i];
      } else if (patternParts[i] !== pathnameParts[i]) {
        return null;
      }
    }
    return params;
  }
}

module.exports = Router;
