# JUPEB Study Guide — Agent Instructions

## gstack Skills Available

gstack is installed globally at `~/.config/opencode/skills/*/SKILL.md`.
47 skills available. Key ones:

### Plan Phase (run before building)
- `/office-hours` — Product reframe / brainstorming
- `/plan-ceo-review` — Strategic product review
- `/plan-eng-review` — Architecture + data flow lock-in
- `/plan-design-review` — Design audit (0-10 scoring)
- `/autoplan` — One command: CEO → design → eng review

### Build Phase
- `/design-shotgun` — Visual design exploration (4-6 variants)
- `/design-html` — Production HTML/CSS from mockups
- `/pair-agent` — Share browser with remote AI agents

### Review Phase
- `/review` — Staff engineer code review
- `/codex` — Second opinion via OpenAI Codex
- `/investigate` — Systematic root-cause debugging
- `/design-review` — Live-site visual audit + fix loop

### Test Phase
- `/qa` — Real browser QA (find bugs, fix, re-verify)
- `/qa-only` — QA report without code changes
- `/benchmark` — Performance regression detection

### Ship Phase
- `/ship` — Tests → review → PR → deploy
- `/land-and-deploy` — Merge → deploy → verify
- `/document-release` — Auto-update docs after shipping

### Security
- `/cso` — OWASP Top 10 + STRIDE security audit
- `/careful` — Warn before destructive commands
- `/guard` — Full safety mode

### Operations
- `/retro` — Weekly engineering retrospective
- `/learn` — Cross-session memory management
- `/context-save` / `/context-restore` — Session persistence
- `/gstack-upgrade` — Update gstack itself

### Browser Tools
- `/browse` — Headless Chromium (~100ms/command)
- `/gstack-browse` — Browser interaction (snapshot, click, screenshot)
- `/open-gstack-browser` — Launch visible GStack Browser
- `/setup-browser-cookies` — Import cookies for auth testing

### Skill Loading
Skills auto-discover from `~/.config/opencode/skills/`. Load with:
`skill({ name: "skill-name" })`

Use the **Skill tool** (`<skill>` block in tool calls) to load and invoke skills.
When a task matches a skill's purpose, INVOKE the skill via the Skill tool.
