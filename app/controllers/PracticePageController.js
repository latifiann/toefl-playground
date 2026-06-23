const fs = require("node:fs/promises");
const path = require("node:path");
const paths = require("../config/paths");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replaceAll("</script", "<\\/script")
    .replaceAll("<!--", "<\\!--");
}

async function getReadingPresentationData(practiceId) {
  const readingDir = path.join(
    paths.CONTENT_DIR,
    `practice-${practiceId.slice(1)}`,
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
    .sort((left, right) => {
      const leftNumber = Number(left.match(/passage-(\d+)\.questions\.json$/i)?.[1] || 0);
      const rightNumber = Number(right.match(/passage-(\d+)\.questions\.json$/i)?.[1] || 0);
      return leftNumber - rightNumber;
    });

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

class PracticePageController {
  constructor(responseWriter) {
    this.responseWriter = responseWriter;
  }

  setRequest(res) {
    this._res = res;
  }

  async handle(practiceId) {
    if (!/^P\d{2}$/i.test(practiceId)) {
      this.responseWriter.writeError(this._res, 404, "Practice not found");
      return;
    }

    const normalizedId = practiceId.toUpperCase();
    const practicePath = path.join(paths.PRACTICES_DIR, `${normalizedId}.html`);

    try {
      const html = await fs.readFile(practicePath, "utf8");
      const hydratedHtml = await this._injectProtection(html, normalizedId);
      this.responseWriter.write(this._res, 200, hydratedHtml, "text/html; charset=utf-8");
    } catch (error) {
      if (error && error.code === "ENOENT") {
        this.responseWriter.writeError(this._res, 404, "Practice not found");
        return;
      }
      throw error;
    }
  }

  async _injectProtection(html, practiceId) {
    const readingPresentationData = await getReadingPresentationData(practiceId);
    const injection = getProtectionInjection(practiceId, readingPresentationData);

    if (html.includes("</body>")) {
      return html.replace("</body>", `${injection}</body>`);
    }

    return `${html}${injection}`;
  }
}

module.exports = PracticePageController;
