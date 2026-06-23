const securityHeaders = require("../config/securityHeaders");

class ResponseWriter {
  constructor() {
    this.headers = securityHeaders;
  }

  write(response, statusCode, body, contentType) {
    response.writeHead(statusCode, {
      ...this.headers,
      "Content-Type": contentType,
    });
    response.end(body);
  }

  writeNoContent(response) {
    response.writeHead(204, this.headers);
    response.end();
  }

  writeJson(response, statusCode, data) {
    const body = JSON.stringify(data);
    this.write(response, statusCode, body, "application/json; charset=utf-8");
  }

  writeError(response, statusCode, message) {
    this.write(response, statusCode, message, "text/plain; charset=utf-8");
  }
}

module.exports = ResponseWriter;
