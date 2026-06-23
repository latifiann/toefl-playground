const fs = require("node:fs/promises");
const path = require("node:path");
const paths = require("../config/paths");

class DashboardController {
  constructor(responseWriter) {
    this.responseWriter = responseWriter;
  }

  async handle() {
    const practices = await this._getPractices();
    const html = this._render(practices);
    this.responseWriter.write(
      this._res,
      200,
      html,
      "text/html; charset=utf-8",
    );
  }

  setRequest(res) {
    this._res = res;
  }

  async _getPractices() {
    const entries = await fs.readdir(paths.PRACTICES_DIR, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isFile() && /^P\d{2}\.html$/i.test(entry.name))
      .map((entry) => {
        const id = entry.name.replace(/\.html$/i, "").toUpperCase();
        return {
          id,
          fileName: entry.name,
          title: `TOEFL Practice ${id.slice(1)}`,
        };
      })
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  _render(practices) {
    const cards = practices
      .map(
        (practice) => `
        <a class="practice-card" href="/practice/${practice.id}">
          <span class="practice-badge">${practice.id}</span>
          <h2>${practice.title}</h2>
          <span class="practice-link">Masuk</span>
        </a>`,
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>TOEFL Dashboard</title>
  <link rel="stylesheet" href="/assets/dashboard.css">
</head>
<body>
  <main class="dashboard-shell">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">TOEFL Playground</span>
        <h1>Pusat akses seluruh practice TOEFL</h1>
        <p>Selamat belajar dan semoga sukses 😁</p>
      </div>
      <div class="hero-panel">
        <div class="hero-stat">
          <strong>${practices.length}</strong>
          <span>Total practice</span>
        </div>
        <div class="hero-stat">
          <strong>Light Guard</strong>
          <span>Blok klik kanan dan shortcut inspect umum</span>
        </div>
      </div>
    </section>

    <section class="notice">
      <strong>Catatan:</strong>
      <span>Harap jika sudah mengetahui tentang website tryout ini diharap untuk tidak menyebarluaskan (Yang YTTA YTTA AJA) 😹.</span>
    </section>

    <section class="practice-grid">
      ${cards}
    </section>
  </main>
</body>
</html>`;
  }
}

module.exports = DashboardController;
