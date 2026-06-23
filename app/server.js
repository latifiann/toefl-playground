const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const APP_DIR = __dirname;
const ROOT_DIR = path.resolve(APP_DIR, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content");
const PRACTICES_DIR = path.join(ROOT_DIR, "practices");
const PUBLIC_DIR = path.join(APP_DIR, "public");
const PORT = Number(process.env.PORT || 3000);

const SECURITY_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function send(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": contentType,
  });
  response.end(body);
}

async function readDashboardCss() {
  return fs.readFile(path.join(PUBLIC_DIR, "dashboard.css"), "utf8");
}

async function getPractices() {
  const entries = await fs.readdir(PRACTICES_DIR, { withFileTypes: true });

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

function getPracticeContentSlug(practiceId) {
  return `practice-${practiceId.slice(1)}`;
}

function sortPassageQuestionFiles(left, right) {
  const leftNumber = Number(left.match(/passage-(\d+)\.questions\.json$/i)?.[1] || 0);
  const rightNumber = Number(right.match(/passage-(\d+)\.questions\.json$/i)?.[1] || 0);
  return leftNumber - rightNumber;
}

function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replaceAll("</script", "<\\/script")
    .replaceAll("<!--", "<\\!--");
}

async function getReadingPresentationData(practiceId) {
  const readingDir = path.join(
    CONTENT_DIR,
    getPracticeContentSlug(practiceId),
    "canonical",
    "reading",
  );

  let entries;
  try {
    entries = await fs.readdir(readingDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }

  const questionFiles = entries
    .filter(
      (entry) =>
        entry.isFile() && /^passage-\d+\.questions\.json$/i.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort(sortPassageQuestionFiles);

  const passages = await Promise.all(
    questionFiles.map(async (fileName, index) => {
      const filePath = path.join(readingDir, fileName);
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);

      return [
        `passage${index + 1}`,
        {
          lineMap: Array.isArray(parsed.line_map) ? parsed.line_map : [],
          paragraphRanges: Array.isArray(parsed.paragraph_ranges)
            ? parsed.paragraph_ranges
            : [],
        },
      ];
    }),
  );

  return Object.fromEntries(passages);
}

function getDashboardHtml(practices) {
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

function getProtectionInjection(practiceId, readingPresentationData) {
  const practiceNumber = practiceId.slice(1);
  const serializedReadingPresentationData = serializeForInlineScript(
    readingPresentationData,
  );
  return `
<style>
  .dashboard-return-link {
    position: fixed;
    left: 20px;
    top: 20px;
    z-index: 99999;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.92);
    color: #fff;
    text-decoration: none;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.28);
    backdrop-filter: blur(8px);
  }

  .dashboard-return-link:hover {
    background: rgba(37, 99, 235, 0.96);
  }

  .dashboard-guard-toast {
    position: fixed;
    left: 50%;
    bottom: 24px;
    z-index: 100000;
    transform: translateX(-50%) translateY(20px);
    padding: 12px 16px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.94);
    color: #fff;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.28);
  }

  .dashboard-guard-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .dashboard-scroll-top {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 100000;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 999px;
    border: none;
    background: rgba(37, 99, 235, 0.96);
    color: #fff;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 16px 32px rgba(37, 99, 235, 0.32);
    opacity: 0;
    transform: translateY(12px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .dashboard-scroll-top.show {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .passage-card {
    width: 100%;
  }

  .passage-text {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    max-width: 720px;
  }

  .passage-line {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    column-gap: 12px;
    align-items: start;
  }

  .passage-line + .passage-line {
    margin-top: 2px;
  }

  .passage-line-paragraph-end {
    margin-bottom: 14px;
  }

  .passage-line-number {
    color: #94a3b8;
    font-size: 0.82em;
    font-weight: 700;
    line-height: 1.7;
    text-align: right;
    user-select: none;
  }

  .passage-line-text {
    display: block;
  }

  @media (max-width: 640px) {
    .dashboard-return-link {
      left: 12px;
      top: 12px;
      padding: 10px 14px;
      font-size: 13px;
    }

    .dashboard-guard-toast {
      width: calc(100% - 24px);
      border-radius: 16px;
      text-align: center;
    }

    .dashboard-scroll-top {
      right: 12px;
      bottom: 12px;
      padding: 10px 14px;
      font-size: 13px;
    }

    .passage-card {
      max-width: 100%;
    }

    .passage-text {
      max-width: 100%;
    }

    .passage-line {
      grid-template-columns: 30px minmax(0, 1fr);
      column-gap: 10px;
    }

    .passage-line-number {
      font-size: 0.75em;
    }
  }
</style>
<a class="dashboard-return-link" href="/" aria-label="Kembali ke dashboard">
  <span aria-hidden="true">←</span>
  <span>Kembali ke Dashboard</span>
</a>
<button class="dashboard-scroll-top" id="dashboard-scroll-top" type="button" aria-label="Kembali ke atas">
  <span aria-hidden="true">↑</span>
  <span>Kembali ke Atas</span>
</button>
<div class="dashboard-guard-toast" id="dashboard-guard-toast">Akses inspect dibatasi pada halaman ini.</div>
<script>
  (() => {
    const toast = document.getElementById('dashboard-guard-toast');
    const scrollTopButton = document.getElementById('dashboard-scroll-top');
    let hideTimer;

    const showToast = () => {
      if (!toast) {
        return;
      }

      toast.classList.add('show');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        toast.classList.remove('show');
      }, 1800);
    };

    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      showToast();
    });

    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const blocked =
        event.key === 'F12' ||
        (ctrlOrMeta && key === 'u') ||
        (ctrlOrMeta && event.shiftKey && ['i', 'j', 'c'].includes(key));

      if (!blocked) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      showToast();
    }, true);

    const nearBottomThreshold = 300;

    const updateScrollTopVisibility = () => {
      if (!scrollTopButton) {
        return;
      }

      const scrollPosition = window.scrollY || window.pageYOffset || 0;
      const totalHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      const viewportHeight = window.innerHeight || 0;
      const distanceToBottom = Math.max(0, totalHeight - (scrollPosition + viewportHeight));

      if (distanceToBottom <= nearBottomThreshold) {
        scrollTopButton.classList.add('show');
      } else {
        scrollTopButton.classList.remove('show');
      }
    };

    window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
    window.addEventListener('resize', updateScrollTopVisibility);
    updateScrollTopVisibility();

    if (scrollTopButton) {
      scrollTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  })();
</script>
<script>
  (() => {
    const readingPresentationData = ${serializedReadingPresentationData};
    const lineLabelStep = 5;

    const escapePassageHtml = (value) => String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

    const getPassageOrder = () => {
      if (!readingPassageStarts || typeof readingPassageStarts !== 'object') {
        return [];
      }

      return Object.entries(readingPassageStarts)
        .sort((left, right) => Number(left[0]) - Number(right[0]))
        .map((entry) => entry[1]);
    };

    const applyReadingPresentationData = () => {
      if (!readingPassages || typeof readingPassages !== 'object') {
        return;
      }

      Object.entries(readingPresentationData).forEach(([passageKey, value]) => {
        if (!readingPassages[passageKey]) {
          return;
        }

        readingPassages[passageKey].lineMap = Array.isArray(value.lineMap) ? value.lineMap : [];
        readingPassages[passageKey].paragraphRanges = Array.isArray(value.paragraphRanges)
          ? value.paragraphRanges
          : [];
      });
    };

    const renderPassageLines = (passage) => {
      if (!passage || !Array.isArray(passage.lineMap) || passage.lineMap.length === 0) {
        return Array.isArray(passage?.paragraphs)
          ? passage.paragraphs.map((paragraph) => '<p>' + paragraph + '</p>').join('')
          : '';
      }

      const paragraphEnds = new Set(
        (Array.isArray(passage.paragraphRanges) ? passage.paragraphRanges : [])
          .map((range) => Number(range && range.end))
          .filter((lineNumber) => Number.isFinite(lineNumber) && lineNumber > 0),
      );

      return passage.lineMap
        .map((entry) => {
          const lineNumber = Number(entry.line);
          const showLineNumber = Number.isFinite(lineNumber) && lineNumber % lineLabelStep === 0;
          const lineClass = paragraphEnds.has(lineNumber)
            ? 'passage-line passage-line-paragraph-end'
            : 'passage-line';

          return '<div class="' + lineClass + '">' +
            '<span class="passage-line-number">' + (showLineNumber ? lineNumber : '&nbsp;') + '</span>' +
            '<span class="passage-line-text">' + escapePassageHtml(entry.text || '') + '</span>' +
            '</div>';
        })
        .join('');
    };

    const patchRenderedPassages = () => {
      const order = getPassageOrder();
      if (order.length === 0) {
        return;
      }

      document
        .querySelectorAll('#reading-questions .passage-card .passage-text')
        .forEach((element, index) => {
          const passageKey = order[index];
          const passage = passageKey ? readingPassages[passageKey] : null;

          if (!passage) {
            return;
          }

          element.innerHTML = renderPassageLines(passage);
        });
    };

    applyReadingPresentationData();

    const originalRenderQuestions = typeof renderQuestions === 'function' ? renderQuestions : null;
    if (originalRenderQuestions) {
      renderQuestions = function patchedRenderQuestions(section) {
        const result = originalRenderQuestions.apply(this, arguments);

        if (section === 'reading') {
          patchRenderedPassages();
        }

        return result;
      };
    }

    patchRenderedPassages();

    const sectionNames = ['listening', 'structure', 'reading'];
    const answerStorageKey = 'toefl_practice_${practiceNumber}_answers';
    const uiStorageKey = 'toefl_practice_${practiceNumber}_ui';

    const createEmptyAnswers = () => ({ listening: {}, structure: {}, reading: {} });
    const createEmptyUiState = () => ({
      currentSection: 'listening',
      scrollBySection: {
        listening: 0,
        structure: 0,
        reading: 0
      }
    });

    const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

    const readJson = (key, fallback) => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        return fallback;
      }
    };

    const normalizeAnswers = (value) => {
      const normalized = createEmptyAnswers();
      if (!isObject(value)) {
        return normalized;
      }

      sectionNames.forEach((section) => {
        if (isObject(value[section])) {
          normalized[section] = value[section];
        }
      });

      return normalized;
    };

    const normalizeUiState = (value) => {
      const normalized = createEmptyUiState();
      if (!isObject(value)) {
        return normalized;
      }

      if (sectionNames.includes(value.currentSection)) {
        normalized.currentSection = value.currentSection;
      }

      if (isObject(value.scrollBySection)) {
        sectionNames.forEach((section) => {
          const scrollValue = Number(value.scrollBySection[section]);
          normalized.scrollBySection[section] = Number.isFinite(scrollValue) && scrollValue >= 0 ? scrollValue : 0;
        });
      }

      return normalized;
    };

    let uiState = normalizeUiState(readJson(uiStorageKey, createEmptyUiState()));
    answers = normalizeAnswers(readJson(answerStorageKey, answers));

    if (!sectionNames.includes(currentSection)) {
      currentSection = 'listening';
    }

    if (sectionNames.includes(uiState.currentSection)) {
      currentSection = uiState.currentSection;
    }

    uiState.currentSection = currentSection;

    const persistAnswers = () => {
      try {
        window.localStorage.setItem(answerStorageKey, JSON.stringify(answers));
      } catch (error) {
      }
    };

    const persistUiState = () => {
      try {
        window.localStorage.setItem(uiStorageKey, JSON.stringify(uiState));
      } catch (error) {
      }
    };

    const getSectionButton = (section) => {
      const index = sectionNames.indexOf(section);
      return index >= 0 ? document.querySelectorAll('.section-btn')[index] || null : null;
    };

    const syncActiveState = (section) => {
      document.querySelectorAll('.section').forEach((element) => element.classList.remove('active'));
      document.querySelectorAll('.section-btn').forEach((element) => element.classList.remove('active'));

      const activeSection = document.getElementById(section);
      const activeButton = getSectionButton(section);

      if (activeSection) {
        activeSection.classList.add('active');
      }

      if (activeButton) {
        activeButton.classList.add('active');
      }
    };

    const saveScrollFor = (section) => {
      if (!sectionNames.includes(section)) {
        return;
      }

      uiState.scrollBySection[section] = Math.max(0, window.scrollY || window.pageYOffset || 0);
    };

    const restoreScrollFor = (section) => {
      const targetScroll = uiState.scrollBySection[section] || 0;
      window.requestAnimationFrame(() => {
        window.scrollTo(0, targetScroll);
      });
    };

    const rerenderCurrentSection = () => {
      if (typeof renderQuestions === 'function') {
        renderQuestions(currentSection);
      }

      if (typeof updateStats === 'function') {
        sectionNames.forEach((section) => updateStats(section));
      }

      syncActiveState(currentSection);
    };

    const originalSelectAnswer = typeof selectAnswer === 'function' ? selectAnswer : null;
    if (originalSelectAnswer) {
      selectAnswer = function patchedSelectAnswer(section, questionId, optionIndex) {
        const currentY = window.scrollY || window.pageYOffset || 0;
        const result = originalSelectAnswer.apply(this, arguments);
        currentSection = section;
        uiState.currentSection = section;
        persistAnswers();

        window.requestAnimationFrame(() => {
          window.scrollTo(0, currentY);
          saveScrollFor(section);
          persistUiState();
        });

        return result;
      };
    }

    const originalSwitchSection = typeof switchSection === 'function' ? switchSection : null;
    if (originalSwitchSection) {
      switchSection = function patchedSwitchSection(section, btn) {
        const previousSection = currentSection;
        saveScrollFor(previousSection);
        persistUiState();

        const result = originalSwitchSection.apply(this, arguments);
        currentSection = section;
        uiState.currentSection = section;
        syncActiveState(section);
        persistUiState();
        restoreScrollFor(section);
        return result;
      };
    }

    const originalResetAllAnswers = typeof resetAllAnswers === 'function' ? resetAllAnswers : null;
    if (originalResetAllAnswers) {
      resetAllAnswers = function patchedResetAllAnswers() {
        const beforeReset = JSON.stringify(answers);
        const result = originalResetAllAnswers.apply(this, arguments);
        const afterReset = JSON.stringify(answers);
        const isFullyReset = sectionNames.every((section) => Object.keys(answers[section] || {}).length === 0);

        if (beforeReset !== afterReset && isFullyReset) {
          try {
            window.localStorage.removeItem(answerStorageKey);
          } catch (error) {
          }

          uiState.scrollBySection = createEmptyUiState().scrollBySection;
          uiState.currentSection = currentSection;
          persistUiState();

          window.requestAnimationFrame(() => {
            window.scrollTo(0, 0);
          });
        } else {
          persistAnswers();
          persistUiState();
        }

        return result;
      };
    }

    let scrollSaveTimer;
    window.addEventListener('scroll', () => {
      window.clearTimeout(scrollSaveTimer);
      scrollSaveTimer = window.setTimeout(() => {
        saveScrollFor(currentSection);
        persistUiState();
      }, 120);
    }, { passive: true });

    window.addEventListener('beforeunload', () => {
      uiState.currentSection = currentSection;
      saveScrollFor(currentSection);
      persistAnswers();
      persistUiState();
    });

    rerenderCurrentSection();
    persistAnswers();
    persistUiState();
    restoreScrollFor(currentSection);
  })();
</script>`;
}

async function injectProtection(html, practiceId) {
  const readingPresentationData = await getReadingPresentationData(practiceId);
  const injection = getProtectionInjection(practiceId, readingPresentationData);

  if (html.includes("</body>")) {
    return html.replace("</body>", `${injection}</body>`);
  }

  return `${html}${injection}`;
}

async function serveDashboard(response) {
  const practices = await getPractices();
  send(response, 200, getDashboardHtml(practices), "text/html; charset=utf-8");
}

async function servePractice(response, practiceId) {
  if (!/^P\d{2}$/i.test(practiceId)) {
    send(response, 404, "Practice not found", "text/plain; charset=utf-8");
    return;
  }

  const normalizedId = practiceId.toUpperCase();
  const practicePath = path.join(PRACTICES_DIR, `${normalizedId}.html`);

  try {
    const html = await fs.readFile(practicePath, "utf8");
    const hydratedHtml = await injectProtection(html, normalizedId);
    send(
      response,
      200,
      hydratedHtml,
      "text/html; charset=utf-8",
    );
  } catch (error) {
    if (error && error.code === "ENOENT") {
      send(response, 404, "Practice not found", "text/plain; charset=utf-8");
      return;
    }

    throw error;
  }
}

async function serveAsset(response, assetPath) {
  if (assetPath !== "/assets/dashboard.css") {
    send(response, 404, "Asset not found", "text/plain; charset=utf-8");
    return;
  }

  const css = await readDashboardCss();
  send(response, 200, css, "text/css; charset=utf-8");
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    );
    const pathname = requestUrl.pathname;

    if (pathname === "/" || pathname === "/dashboard") {
      await serveDashboard(response);
      return;
    }

    if (pathname === "/favicon.ico") {
      response.writeHead(204, SECURITY_HEADERS);
      response.end();
      return;
    }

    if (pathname.startsWith("/assets/")) {
      await serveAsset(response, pathname);
      return;
    }

    if (pathname.startsWith("/practice/")) {
      const practiceId = pathname.slice("/practice/".length);
      await servePractice(response, practiceId);
      return;
    }

    send(response, 404, "Page not found", "text/plain; charset=utf-8");
  } catch (error) {
    console.error(error);
    send(response, 500, "Internal server error", "text/plain; charset=utf-8");
  }
});

server.listen(PORT, () => {
  console.log(`TOEFL dashboard running at http://localhost:${PORT}`);
});
