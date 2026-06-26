(function bootstrapPracticeApp() {
  const script = document.currentScript;
  const practiceId = script?.dataset.practiceId;
  const sectionNames = ["listening", "structure", "reading"];
  const sectionTitles = {
    listening: "Listening Comprehension",
    structure: "Structure and Written Expression",
    reading: "Reading Comprehension",
  };
  const sectionLabels = {
    listening: "🎧 Listening",
    structure: "✏️ Structure",
    reading: "📖 Reading",
  };
  const answerStorageKey = `toefl_practice_${practiceId}_answers`;
  const uiStorageKey = `toefl_practice_${practiceId}_ui`;
  const lineLabelStep = 5;
  const mobileQuestionNavQuery = "(max-width: 768px)";

  const state = {
    bootstrap: null,
    sections: {},
    answers: createEmptyAnswers(),
    results: createEmptyResults(),
    ui: createEmptyUiState(),
    currentSection: "listening",
    currentQuestionId: null,
    questionObserver: null,
  };

  function createEmptyAnswers() {
    return { listening: {}, structure: {}, reading: {} };
  }

  function createEmptyResults() {
    return { listening: {}, structure: {}, reading: {} };
  }

  function createEmptyUiState() {
    return {
      currentSection: "listening",
      scrollBySection: { listening: 0, structure: 0, reading: 0 },
    };
  }

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function normalizeAnswers(value) {
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
  }

  function normalizeUiState(value) {
    const normalized = createEmptyUiState();

    if (!isObject(value)) {
      return normalized;
    }

    if (sectionNames.includes(value.currentSection)) {
      normalized.currentSection = value.currentSection;
    }

    if (isObject(value.scrollBySection)) {
      sectionNames.forEach((section) => {
        const numericValue = Number(value.scrollBySection[section]);
        normalized.scrollBySection[section] =
          Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
      });
    }

    return normalized;
  }

  function persistAnswers() {
    try {
      window.localStorage.setItem(answerStorageKey, JSON.stringify(state.answers));
    } catch (error) {
    }
  }

  function persistUiState() {
    try {
      window.localStorage.setItem(uiStorageKey, JSON.stringify(state.ui));
    } catch (error) {
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function questionAnchorId(questionId) {
    return `question-${String(questionId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function sectionQuestionCount(section) {
    const sectionData = state.sections[section];
    if (!sectionData) {
      return 0;
    }
    return flattenQuestions(sectionData, section).length;
  }

  function flattenQuestions(sectionData, section) {
    if (section === "listening") {
      return (sectionData.parts || []).flatMap((part) => part.questions || []);
    }
    if (section === "structure") {
      return (sectionData.subtypes || []).flatMap((subtype) => subtype.questions || []);
    }
    return sectionData.questions || [];
  }

  async function hydrateAnsweredResults() {
    await Promise.all(sectionNames.map(async (section) => {
      const sectionData = state.sections[section];
      const savedAnswers = state.answers[section] || {};
      if (!sectionData || Object.keys(savedAnswers).length === 0) {
        return;
      }

      const validAnswers = {};
      flattenQuestions(sectionData, section).forEach((question) => {
        if (savedAnswers[question.id]) {
          validAnswers[question.id] = savedAnswers[question.id];
        }
      });

      if (Object.keys(validAnswers).length === 0) {
        return;
      }

      const response = await fetch(`/api/practice/${practiceId}/sections/${section}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: validAnswers }),
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      state.results[section] = {
        ...state.results[section],
        ...Object.fromEntries((payload.results || []).map((item) => [item.questionId, item])),
      };
    }));
  }

  function buildSectionNav() {
    const nav = document.getElementById("section-nav");
    nav.innerHTML = "";

    sectionNames.forEach((section) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `section-btn${state.currentSection === section ? " active" : ""}`;
      button.dataset.section = section;
      button.textContent = `${sectionLabels[section]} (${sectionQuestionCount(section)} Q)`;
      button.addEventListener("click", function onSwitch() {
        switchSection(section);
      });
      nav.appendChild(button);
    });

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "reset-btn";
    resetButton.textContent = "🔄 Reset All";
    resetButton.addEventListener("click", resetAllAnswers);
    nav.appendChild(resetButton);
  }

  function questionNavButtonClass(question) {
    const result = state.results[state.currentSection][question.id];
    const hasAnswer = Boolean(state.answers[state.currentSection][question.id]);
    const classes = ["question-nav-number"];

    if (result) {
      classes.push(result.isCorrect ? "correct" : "incorrect");
    } else if (hasAnswer) {
      classes.push("answered");
    }

    if (state.currentQuestionId === question.id) {
      classes.push("current");
    }

    return classes.join(" ");
  }

  function setCurrentQuestion(questionId) {
    state.currentQuestionId = questionId;
    document.querySelectorAll(".question-nav-number").forEach((button) => {
      button.classList.toggle("current", button.dataset.questionId === questionId);
    });
  }

  function closeQuestionNavigator() {
    const panel = document.getElementById("question-nav-panel");
    const toggle = document.getElementById("question-nav-toggle");

    if (panel) {
      panel.hidden = true;
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function openQuestionNavigator() {
    const panel = document.getElementById("question-nav-panel");
    const toggle = document.getElementById("question-nav-toggle");

    if (panel) {
      panel.hidden = false;
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", "true");
    }
  }

  function toggleQuestionNavigator() {
    const panel = document.getElementById("question-nav-panel");
    if (!panel) {
      return;
    }

    if (panel.hidden) {
      openQuestionNavigator();
    } else {
      closeQuestionNavigator();
    }
  }

  function scrollToQuestion(questionId) {
    const card = document.getElementById(questionAnchorId(questionId));
    if (!card) {
      return;
    }

    card.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentQuestion(questionId);

    if (window.matchMedia(mobileQuestionNavQuery).matches) {
      closeQuestionNavigator();
    }
  }

  function renderQuestionNavigator() {
    const grid = document.getElementById("question-nav-grid");
    const title = document.getElementById("question-nav-title");
    const subtitle = document.getElementById("question-nav-subtitle");
    const sectionData = state.sections[state.currentSection];

    if (!grid || !title || !subtitle || !sectionData) {
      return;
    }

    const questions = flattenQuestions(sectionData, state.currentSection);
    title.textContent = sectionTitles[state.currentSection];
    subtitle.textContent = `${questions.length} soal`;
    grid.innerHTML = "";

    questions.forEach((question, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = questionNavButtonClass(question);
      button.textContent = String(question.sourceNumber || index + 1);
      button.dataset.questionId = question.id;
      button.addEventListener("click", () => {
        scrollToQuestion(question.id);
      });
      grid.appendChild(button);
    });
  }

  function refreshQuestionObserver() {
    if (state.questionObserver) {
      state.questionObserver.disconnect();
      state.questionObserver = null;
    }

    const cards = Array.from(document.querySelectorAll(".question-card[data-question-id]"));
    if (cards.length === 0) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      if (!state.currentQuestionId) {
        setCurrentQuestion(cards[0].dataset.questionId);
      }
      return;
    }

    state.questionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible[0]?.target?.dataset.questionId) {
        setCurrentQuestion(visible[0].target.dataset.questionId);
      }
    }, {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0.01,
    });

    cards.forEach((card) => state.questionObserver.observe(card));

    if (!state.currentQuestionId || !cards.some((card) => card.dataset.questionId === state.currentQuestionId)) {
      setCurrentQuestion(cards[0].dataset.questionId);
    }
  }

  function wireQuestionNavigator() {
    const toggle = document.getElementById("question-nav-toggle");
    const close = document.getElementById("question-nav-close");

    if (toggle) {
      toggle.addEventListener("click", toggleQuestionNavigator);
    }

    if (close) {
      close.addEventListener("click", closeQuestionNavigator);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeQuestionNavigator();
      }
    });
  }

  function renderDirections(section) {
    const sectionData = state.sections[section];
    const container = document.getElementById("section-directions");
    const blocks = [];

    blocks.push(`<h2>${escapeHtml(sectionTitles[section])}</h2>`);

    if (sectionData.timeLabel) {
      blocks.push(`<p><strong>${escapeHtml(sectionData.timeLabel)}</strong></p>`);
    }

    const directions = Array.isArray(sectionData.directions) ? sectionData.directions : [];
    if (directions.length > 0) {
      blocks.push(`<ul>${directions.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`);
    }

    if (section === "reading") {
      if (Array.isArray(sectionData.samplePassageLines) && sectionData.samplePassageLines.length > 0) {
        blocks.push(renderSamplePassage(sectionData.samplePassageLines));
      }
      if (Array.isArray(sectionData.examples) && sectionData.examples.length > 0) {
        blocks.push(sectionData.examples.map(renderReadingExampleCard).join(""));
      }
    }

    if (section === "structure") {
      const intros = (sectionData.subtypes || []).flatMap((subtype) => subtype.intro || []);
      if (intros.length > 0) {
        blocks.push(`<p>${intros.map(escapeHtml).join("<br>")}</p>`);
      }
    }

    if (section === "listening") {
      const firstPart = (sectionData.parts || [])[0];
      if (firstPart && Array.isArray(firstPart.exampleLines) && firstPart.exampleLines.length > 0) {
        blocks.push(`<div class="sample-card"><h3>Sample Prompt</h3><p>${firstPart.exampleLines.map(escapeHtml).join("<br>")}</p></div>`);
      }
    }

    container.innerHTML = blocks.join("");
  }

  function renderSamplePassage(lines) {
    return `<div class="sample-card"><h3>Sample Passage</h3><p>${lines.map(escapeHtml).join("<br>")}</p></div>`;
  }

  function renderReadingExampleCard(example) {
    const choices = example.choices || {};
    const correctAnswer = example.correctAnswer ? String(example.correctAnswer) : null;
    const checkedAnswer = correctAnswer && choices[correctAnswer] ? correctAnswer : null;
    return `<div class="example-card"><h3>${escapeHtml(example.title || "Example")}</h3><p>${escapeHtml(example.stem || "")}</p>${renderChoicesPrefilled(choices, checkedAnswer, exampleInputName("reading", example))}<p>${(example.explanation_lines || []).map(escapeHtml).join("<br>")}</p></div>`;
  }

  function renderStructureExampleCard(example) {
    const stem = example.stem
      ? `<p>${escapeHtml(example.stem)}</p>`
      : example.sentence_segments
        ? `<p class="structure-segments">${renderSentenceSegments(example.sentence_segments)}</p>`
        : "";

    const choices = example.choices || {};
    const correctAnswer = example.correctAnswer ? String(example.correctAnswer) : null;
    const checkedAnswer = correctAnswer && choices[correctAnswer] ? correctAnswer : null;
    return `<div class="example-card"><h3>${escapeHtml(example.title || "Example")}</h3>${stem}${renderChoicesPrefilled(choices, checkedAnswer, exampleInputName("structure", example))}<p>${(example.explanation_lines || []).map(escapeHtml).join("<br>")}</p></div>`;
  }

  function exampleInputName(prefix, example) {
    const segmentText = (example.sentence_segments || [])
      .map((segment) => `${segment.marker || ""}-${segment.text || ""}`)
      .join("-");
    const raw = [prefix, example.title, example.stem, segmentText]
      .filter(Boolean)
      .join("-");

    return `example-${raw.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 100) || prefix}`;
  }

  function renderSentenceSegments(segments) {
    return (segments || [])
      .map((segment) => {
        const text = escapeHtml(segment.text || "");
        const marker = segment.marker ? `<span class="structure-marker">(${escapeHtml(segment.marker)})</span>` : "";
        if (segment.underlined) {
          return `<span class="structure-segment-underlined">${text}${marker}</span>`;
        }
        return `<span>${text}</span>`;
      })
      .join("");
  }

  function renderChoicesPrefilled(choices, checkedAnswer, inputName) {
    return `<div class="options-grid">${Object.entries(choices || {}).map(([key, value]) => {
      const isCorrect = key === checkedAnswer;
      const optionClass = isCorrect ? "option correct disabled" : "option disabled";
      const checkedAttr = isCorrect ? "checked" : "";
      const disabledAttr = "disabled";
      return `<label class="${optionClass}"><input type="radio" name="${escapeHtml(inputName || "example")}" value="${escapeHtml(key)}" ${checkedAttr} ${disabledAttr}><span>${escapeHtml(key)}) ${escapeHtml(value)}</span></label>`;
    }).join("")}</div>`;
  }

  function renderPassageLines(passage) {
    if (!Array.isArray(passage?.lineMap) || passage.lineMap.length === 0) {
      return `<p>${escapeHtml(passage?.markdown || "")}</p>`;
    }

    const paragraphEnds = new Set(
      (Array.isArray(passage.paragraphRanges) ? passage.paragraphRanges : [])
        .map((range) => Number(range && range.end))
        .filter((lineNumber) => Number.isFinite(lineNumber) && lineNumber > 0),
    );

    return passage.lineMap.map((entry) => {
      const lineNumber = Number(entry.line);
      const showLineNumber = Number.isFinite(lineNumber) && lineNumber % lineLabelStep === 0;
      const lineClass = paragraphEnds.has(lineNumber)
        ? "passage-line passage-line-paragraph-end"
        : "passage-line";

      return `<div class="${lineClass}"><span class="passage-line-number">${showLineNumber ? lineNumber : "&nbsp;"}</span><span class="passage-line-text">${escapeHtml(entry.text || "")}</span></div>`;
    }).join("");
  }

  function renderChoices(choices, question, disabled) {
    return `<div class="options-grid">${Object.entries(choices || {}).map(([key, value]) => {
      const answerValue = key;
      const userAnswer = question ? state.answers[state.currentSection][question.id] : null;
      const result = question ? state.results[state.currentSection][question.id] : null;
      const answered = Boolean(result);
      let optionClass = "option";

      if (answered) {
        optionClass += " disabled";
        if (result.correctAnswer === answerValue) {
          optionClass += " correct";
        } else if (userAnswer === answerValue && !result.isCorrect) {
          optionClass += " incorrect selected-wrong";
        }
      }

      const checked = userAnswer === answerValue ? "checked" : "";
      const disabledAttr = disabled || answered ? "disabled" : "";

      return `<label class="${optionClass}"><input type="radio" name="${question ? escapeHtml(question.id) : "example"}" value="${escapeHtml(answerValue)}" ${checked} ${disabledAttr}><span>${escapeHtml(answerValue)}) ${escapeHtml(value)}</span></label>`;
    }).join("")}</div>`;
  }

  function renderFeedback(questionId) {
    const result = state.results[state.currentSection][questionId];
    if (!result) {
      return "";
    }

    const cardClass = result.isCorrect ? "feedback-card" : "feedback-card incorrect";
    const heading = result.isCorrect ? "✓ Correct Answer!" : "✗ Incorrect";
    const yourAnswer = result.userAnswer ? `<p><strong>Your answer:</strong> ${escapeHtml(result.userAnswer)}</p>` : "";
    const correctAnswer = result.correctAnswer ? `<p><strong>Correct answer:</strong> ${escapeHtml(result.correctAnswer)}</p>` : "";
    const explanation = result.explanation ? `<p><strong>Explanation:</strong><br>${escapeHtml(result.explanation)}</p>` : `<p><strong>Explanation:</strong><br>No explanation available.</p>`;
    const grammarRule = result.grammarRule ? `<div class="grammar-rule"><strong>Grammar Rule:</strong> ${escapeHtml(result.grammarRule)}</div>` : "";
    const evidenceQuote = result.evidenceQuote ? `<div class="evidence-quote"><strong>Evidence Quote:</strong> ${escapeHtml(result.evidenceQuote)}</div>` : "";

    return `<div class="${cardClass}"><h4>${heading}</h4><div class="feedback-meta">${yourAnswer}${correctAnswer}${explanation}${grammarRule}${evidenceQuote}</div></div>`;
  }

  function renderQuestionCard(question) {
    const result = state.results[state.currentSection][question.id];
    const userAnswer = state.answers[state.currentSection][question.id];
    const isUnanswered = !result || !result.userAnswer;
    const statusClass = isUnanswered ? "status-unanswered" : result.isCorrect ? "status-correct" : "status-incorrect";
    const statusText = isUnanswered ? "⏳ Unanswered" : result.isCorrect ? "✓ Correct" : "✗ Incorrect";

    const questionBody = state.currentSection === "structure" && Array.isArray(question.renderSegments) && question.renderSegments.length > 0
      ? `<div class="question-text structure-segments">${renderSentenceSegments(question.renderSegments)}</div>`
      : `<div class="question-text${state.currentSection === "reading" ? " reading-prompt" : ""}">${escapeHtml(question.prompt || `Question ${question.sourceNumber || question.id}`)}</div>`;

    const card = document.createElement("div");
    card.className = "question-card";
    card.id = questionAnchorId(question.id);
    card.dataset.questionId = question.id;
    card.innerHTML = `<div class="question-header"><div class="question-number">Q${escapeHtml(question.sourceNumber || question.id)}</div><div class="question-status ${statusClass}">${statusText}</div></div>${questionBody}${renderChoices(question.choices || {}, question, false)}${renderFeedback(question.id)}`;

    if (isUnanswered) {
      card.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.addEventListener("change", function onSelect() {
          selectAnswer(state.currentSection, question.id, input.value);
        });
      });
    } else if (userAnswer) {
      const checkedInput = Array.from(card.querySelectorAll('input[type="radio"]')).find(
        (input) => input.value === userAnswer,
      );
      if (checkedInput) {
        checkedInput.checked = true;
      }
    }

    return card;
  }

  function renderListeningSection(sectionData) {
    return (sectionData.parts || []).map((part) => {
      const section = document.createElement("section");
      section.className = "content-group";
      section.innerHTML = `<div class="content-group-header"><div><h2>Part ${escapeHtml(part.part || "")}</h2><p class="inline-note">${(part.directions || []).map(escapeHtml).join("<br>")}</p></div></div>`;

      part.questions.forEach((question) => {
        section.appendChild(renderQuestionCard(question));
      });

      return section;
    });
  }

  function renderStructureSection(sectionData) {
    return (sectionData.subtypes || []).map((subtype) => {
      const section = document.createElement("section");
      section.className = "content-group";
      const examples = Array.isArray(subtype.examples) && subtype.examples.length > 0
        ? `<div class="content-group-examples">${subtype.examples.map(renderStructureExampleCard).join("")}</div>`
        : "";
      section.innerHTML = `<div class="content-group-header"><div><h2>${escapeHtml(subtype.type || "Structure")}</h2><p class="inline-note">${(subtype.directions || []).map(escapeHtml).join("<br>")}</p>${examples}</div></div>`;

      subtype.questions.forEach((question) => {
        section.appendChild(renderQuestionCard(question));
      });

      return section;
    });
  }

  function renderReadingSection(sectionData) {
    const fragment = [];
    const questionsByPassage = new Map();

    (sectionData.questions || []).forEach((question) => {
      if (!questionsByPassage.has(question.passageId)) {
        questionsByPassage.set(question.passageId, []);
      }
      questionsByPassage.get(question.passageId).push(question);
    });

    (sectionData.passages || []).forEach((passage, index) => {
      const group = document.createElement("section");
      group.className = "content-group";
      const label = passage.questionRangeLabel || `Passage ${index + 1}`;
      group.innerHTML = `<div class="content-group-header"><div><h2>${escapeHtml(label)}</h2><p class="inline-note">${escapeHtml(passage.title || `Passage ${index + 1}`)}</p></div></div>`;

      const passageCard = document.createElement("div");
      passageCard.className = "passage-card";
      passageCard.innerHTML = `<div class="passage-label">${escapeHtml(label)}</div><div class="passage-title">${escapeHtml(passage.title || "Reading Passage")}</div><div class="passage-text">${renderPassageLines(passage)}</div>`;
      group.appendChild(passageCard);

      (questionsByPassage.get(passage.id) || []).forEach((question) => {
        group.appendChild(renderQuestionCard(question));
      });

      fragment.push(group);
    });

    return fragment;
  }

  function renderQuestions(section) {
    const sectionData = state.sections[section];
    const container = document.getElementById("practice-content");
    container.innerHTML = "";

    let nodes = [];
    if (section === "listening") {
      nodes = renderListeningSection(sectionData);
    } else if (section === "structure") {
      nodes = renderStructureSection(sectionData);
    } else if (section === "reading") {
      nodes = renderReadingSection(sectionData);
    }

    nodes.forEach((node) => container.appendChild(node));
  }

  function updateStats(section) {
    const questions = flattenQuestions(state.sections[section], section);
    const results = state.results[section];
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach((question) => {
      const result = results[question.id];
      if (!result || !result.userAnswer) {
        unanswered++;
      } else if (result.isCorrect) {
        correct++;
      } else {
        incorrect++;
      }
    });

    document.getElementById("active-correct").textContent = correct;
    document.getElementById("active-incorrect").textContent = incorrect;
    document.getElementById("active-unanswered").textContent = unanswered;
    document.getElementById("active-section-title").textContent = sectionTitles[section];
  }

  function syncActiveState(section) {
    document.querySelectorAll(".section-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.section === section);
    });
  }

  function saveScrollFor(section) {
    state.ui.scrollBySection[section] = Math.max(0, window.scrollY || window.pageYOffset || 0);
  }

  function restoreScrollFor(section) {
    const targetScroll = state.ui.scrollBySection[section] || 0;
    window.requestAnimationFrame(() => {
      window.scrollTo(0, targetScroll);
    });
  }

  function rerenderCurrentSection() {
    const previousQuestionId = state.currentQuestionId;
    renderDirections(state.currentSection);
    renderQuestions(state.currentSection);
    state.currentQuestionId = previousQuestionId;
    renderQuestionNavigator();
    updateStats(state.currentSection);
    syncActiveState(state.currentSection);
    refreshQuestionObserver();
  }

  function selectAnswer(section, questionId, answerValue) {
    state.answers[section][questionId] = answerValue;
    delete state.results[section][questionId];
    persistAnswers();
    rerenderCurrentSection();
    submitQuestion(section, questionId);
  }

  async function submitQuestion(section, questionId) {
    const userAnswer = state.answers[section][questionId];
    if (!userAnswer) {
      return;
    }

    const response = await fetch(`/api/practice/${practiceId}/sections/${section}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { [questionId]: userAnswer } }),
    });

    if (!response.ok) {
      window.alert("Submit gagal. Coba lagi.");
      return;
    }

    const payload = await response.json();
    const result = (payload.results || []).find((item) => item.questionId === questionId);
    if (result) {
      state.results[section][questionId] = result;
    }

    rerenderCurrentSection();
  }

  function switchSection(section) {
    if (!sectionNames.includes(section) || state.currentSection === section) {
      return;
    }

    saveScrollFor(state.currentSection);
    state.currentSection = section;
    state.currentQuestionId = null;
    state.ui.currentSection = section;
    persistUiState();
    rerenderCurrentSection();
    restoreScrollFor(section);
  }

  function resetAllAnswers() {
    if (!window.confirm("Are you sure you want to reset ALL answers? This action cannot be undone.")) {
      return;
    }

    state.answers = createEmptyAnswers();
    state.results = createEmptyResults();
    state.currentQuestionId = null;
    state.ui.scrollBySection = createEmptyUiState().scrollBySection;

    try {
      window.localStorage.removeItem(answerStorageKey);
    } catch (error) {
    }

    persistUiState();
    rerenderCurrentSection();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function wirePageGuards() {
    const toast = document.getElementById("dashboard-guard-toast");
    const scrollTopButton = document.getElementById("dashboard-scroll-top");
    let hideTimer;

    const showToast = function showToast() {
      if (!toast) {
        return;
      }

      toast.classList.add("show");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        toast.classList.remove("show");
      }, 1800);
    };

    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      showToast();
    });

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const blocked =
        event.key === "F12" ||
        (ctrlOrMeta && key === "u") ||
        (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key));

      if (!blocked) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      showToast();
    }, true);

    const nearBottomThreshold = 300;
    const updateScrollTopVisibility = function updateScrollTopVisibility() {
      const scrollPosition = window.scrollY || window.pageYOffset || 0;
      const totalHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      const viewportHeight = window.innerHeight || 0;
      const distanceToBottom = Math.max(0, totalHeight - (scrollPosition + viewportHeight));

      if (distanceToBottom <= nearBottomThreshold) {
        scrollTopButton.classList.add("show");
      } else {
        scrollTopButton.classList.remove("show");
      }
    };

    window.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
    window.addEventListener("resize", updateScrollTopVisibility);
    updateScrollTopVisibility();

    scrollTopButton.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function loadBootstrap() {
    const response = await fetch(`/api/practice/${practiceId}/bootstrap`);
    if (!response.ok) {
      throw new Error("Bootstrap request failed");
    }

    const payload = await response.json();
    state.bootstrap = payload;
    state.sections = payload.sections || {};
  }

  async function init() {
    if (!practiceId) {
      return;
    }

    state.answers = normalizeAnswers(readJson(answerStorageKey, createEmptyAnswers()));
    state.ui = normalizeUiState(readJson(uiStorageKey, createEmptyUiState()));
    state.currentSection = state.ui.currentSection;

    await loadBootstrap();
    if (!state.sections[state.currentSection]) {
      state.currentSection = "listening";
      state.ui.currentSection = "listening";
    }
    await hydrateAnsweredResults();

    buildSectionNav();
    rerenderCurrentSection();
    restoreScrollFor(state.currentSection);
    wirePageGuards();
    wireQuestionNavigator();

    let scrollSaveTimer;
    window.addEventListener("scroll", () => {
      window.clearTimeout(scrollSaveTimer);
      scrollSaveTimer = window.setTimeout(() => {
        saveScrollFor(state.currentSection);
        persistUiState();
      }, 120);
    }, { passive: true });

    window.addEventListener("beforeunload", () => {
      state.ui.currentSection = state.currentSection;
      saveScrollFor(state.currentSection);
      persistAnswers();
      persistUiState();
    });
  }

  init().catch((error) => {
    const container = document.getElementById("practice-content");
    if (container) {
      container.innerHTML = `<div class="question-card"><div class="question-text">Gagal memuat practice shell.</div><p class="inline-note">${escapeHtml(error.message)}</p></div>`;
    }
    console.error(error);
  });
})();
