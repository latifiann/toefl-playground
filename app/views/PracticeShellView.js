function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

class PracticeShellView {
  render({ practiceId, title }) {
    const pageTitle = title || `TOEFL Practice ${practiceId.slice(1)}`;

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>${escapeHtml(pageTitle)}</title>
  <link rel="stylesheet" href="/assets/practice.css">
</head>
<body>
  <a class="dashboard-return-link" href="/" aria-label="Kembali ke dashboard">
    <span aria-hidden="true">&larr;</span>
    <span>Kembali ke Dashboard</span>
  </a>

  <main class="practice-shell" data-practice-id="${escapeHtml(practiceId)}">
    <header class="practice-hero">
      <div>
        <h1>${escapeHtml(pageTitle)}</h1>
      </div>
    </header>

    <div class="controls-top" id="section-nav" aria-label="Section navigation"></div>

    <section class="section-stats" id="active-section-stats">
      <div class="section-title" id="active-section-title">Loading practice...</div>
      <div class="stats-content">
        <div class="stat-item"><div class="stat-value" id="active-correct">0</div><div class="stat-label">Correct</div></div>
        <div class="stat-item"><div class="stat-value" id="active-incorrect">0</div><div class="stat-label">Incorrect</div></div>
        <div class="stat-item"><div class="stat-value" id="active-unanswered">0</div><div class="stat-label">Unanswered</div></div>
      </div>
    </section>

    <section class="section-directions" id="section-directions"></section>
    <section class="practice-content" id="practice-content"></section>
  </main>

  <button class="question-nav-toggle" id="question-nav-toggle" type="button" aria-expanded="false" aria-controls="question-nav-panel">
    <span aria-hidden="true">☰</span>
    <span>Nomor Soal</span>
  </button>

  <aside class="question-nav-panel" id="question-nav-panel" aria-label="Navigasi nomor soal" hidden>
    <div class="question-nav-header">
      <div>
        <strong id="question-nav-title">Nomor Soal</strong>
        <span id="question-nav-subtitle">Loading...</span>
      </div>
      <button class="question-nav-close" id="question-nav-close" type="button" aria-label="Tutup navigasi soal">&times;</button>
    </div>
    <div class="question-nav-grid" id="question-nav-grid"></div>
  </aside>

  <button class="dashboard-scroll-top" id="dashboard-scroll-top" type="button" aria-label="Kembali ke atas">
    <span aria-hidden="true">&uarr;</span>
    <span>Kembali ke Atas</span>
  </button>

  <div class="dashboard-guard-toast" id="dashboard-guard-toast">Akses inspect dibatasi pada halaman ini.</div>

  <script src="/assets/practice-app.js" data-practice-id="${escapeHtml(practiceId)}"></script>
</body>
</html>`;
  }
}

module.exports = PracticeShellView;
