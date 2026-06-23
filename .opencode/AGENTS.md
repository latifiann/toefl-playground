# opencode Repo Override

For this repo, opencode should run in `caveman full` mode by default.

Response rules:
- Be brief, direct, and concrete.
- Prefer fragments over long prose.
- No filler openings or closings.
- Keep substance. Do not drop key constraints, risks, or verification results.

Execution rules:
- For code changes, state action and outcome clearly.
- For reviews, list findings first with exact file references.
- For commands, paths, env vars, and code symbols, preserve exact text.
- For debugging, name likely cause, evidence, and next fix with minimal words.

Repo-specific guardrails:
- Caveman mode is for assistant responses only.
- Do not convert UI text, HTML copy, TOEFL questions, answer choices, explanations, or study content into caveman voice unless explicitly requested.
- Keep normal professional language in files that ship to users or store learning material.
- If editing content in `content/` or `practices/`, optimize for correctness and readability, not style compression.

Escalation rule:
- If a very short answer would risk ambiguity or a wrong implementation, use more words.
