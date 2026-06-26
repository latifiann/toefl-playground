const fs = require("node:fs/promises");
const path = require("node:path");
const vm = require("node:vm");

const paths = require("../app/config/paths");

function parseLegacyTestData(html) {
  const start = html.search(/const\s+testData\s*=/);
  if (start === -1) {
    throw new Error("Could not find legacy testData block");
  }

  const objectStart = html.indexOf("{", start);
  if (objectStart === -1) {
    throw new Error("Could not find legacy testData object");
  }

  const objectEnd = findMatchingBrace(html, objectStart);
  const expression = html.slice(objectStart, objectEnd + 1);

  try {
    return JSON.parse(expression);
  } catch (_error) {
    return vm.runInNewContext(`(${expression})`, Object.create(null), {
      timeout: 1000,
    });
  }
}

function findMatchingBrace(source, startIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = startIndex; index < source.length; index++) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return index;
      }
    }
  }

  throw new Error("Could not parse legacy testData object");
}

function buildSourceMap(questions) {
  const map = new Map();

  for (const question of questions) {
    const sourceNumber = Number(question.id);
    if (!Number.isFinite(sourceNumber)) {
      continue;
    }

    map.set(sourceNumber, {
      prompt: question.question || `Question ${sourceNumber}`,
      options: Array.isArray(question.options) ? question.options : [],
    });
  }

  return map;
}

function normalizeChoices(choiceMap, legacyQuestion) {
  const entries = Object.entries(choiceMap || {});
  if (entries.length > 0) {
    return Object.fromEntries(entries);
  }

  const options = legacyQuestion?.options || [];
  return Object.fromEntries(
    options.map((option, index) => [String.fromCharCode(65 + index), option]),
  );
}

function normalizePrompt(prompt, sourceNumber) {
  const value = String(prompt || `Question ${sourceNumber}`).trim();
  return value.replace(/^Listening Question\s+\d+:\s*/i, "");
}

async function exportListening(practiceId) {
  const normalizedId = practiceId.toUpperCase();
  const practiceNumber = normalizedId.slice(1);
  const practiceSlug = `practice-${practiceNumber}`;

  const legacyPath = path.join(paths.PRACTICES_DIR, `${normalizedId}.html`);
  const listeningDir = path.join(paths.CONTENT_DIR, practiceSlug, "canonical", "listening");
  const outputPath = path.join(listeningDir, "questions.json");

  const html = await fs.readFile(legacyPath, "utf8");
  const legacyData = parseLegacyTestData(html);
  const listeningSourceMap = buildSourceMap(legacyData.listening || []);

  const partFiles = ["part-a.json", "part-b.json", "part-c.json"];
  const parts = {};

  for (const fileName of partFiles) {
    const filePath = path.join(listeningDir, fileName);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const partKey = parsed.part || fileName.replace(/^part-|\.json$/g, "").toUpperCase();

    parts[partKey] = {
      part: partKey,
      directions: parsed.directions || [],
      example_lines: parsed.example_lines || [],
      questions: (parsed.questions || []).map((question) => {
        const sourceNumber = Number(question.source_number);
        const legacyQuestion = listeningSourceMap.get(sourceNumber);

        return {
          id: question.id,
          source_number: sourceNumber,
          prompt: normalizePrompt(
            legacyQuestion?.prompt || question.prompt,
            sourceNumber,
          ),
          choices: normalizeChoices(question.choices, legacyQuestion),
        };
      }),
    };
  }

  const payload = {
    practice_id: normalizedId,
    section: "listening",
    exported_from: path.relative(paths.ROOT_DIR, legacyPath),
    exported_at: new Date().toISOString(),
    parts,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return outputPath;
}

async function main() {
  const practiceId = process.argv[2] || "P01";
  const outputPath = await exportListening(practiceId);
  console.log(`Exported listening canonical data to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
