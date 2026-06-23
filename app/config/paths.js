const path = require("node:path");

const CONFIG_DIR = __dirname;
const APP_DIR = path.resolve(CONFIG_DIR, "..");
const ROOT_DIR = path.resolve(APP_DIR, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content");
const PRACTICES_DIR = path.join(ROOT_DIR, "practices");
const PUBLIC_DIR = path.join(APP_DIR, "public");

module.exports = {
  APP_DIR,
  ROOT_DIR,
  CONTENT_DIR,
  PRACTICES_DIR,
  PUBLIC_DIR,
};
