# Intake Triage

A small internal tool for triaging inbound project requests quickly and consistently. Log a request, and Claude summarizes it, tags it, and flags delivery risks.

> All commands below run from the project root (the folder that contains `package.json`, one level above this `Documents/` folder). See also [DECISIONS.md](DECISIONS.md).

## A — How to run

### Prerequisites

Summarized in [`requirements.txt`](../requirements.txt). Either:

- **Docker** (Docker Desktop or Engine with Compose v2). Nothing else needed. Or:
- **Node.js 20.19+** and npm 10+ (tested on Node 20.20 and 22).

For the AI feature you need a **Claude API key** (console.anthropic.com). You can paste it into the app (key icon in the header), set `ANTHROPIC_API_KEY`, or set `LLM_MODE=mock` to run without one.

### Option 1: Docker (one command)

```bash
docker compose up --build
```

Open http://localhost:3000. The database lives in a Docker volume (`intake-data`), so intakes survive restarts; migrations are applied on every start. To pass a key or mode without the UI:

```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build   # or LLM_MODE=mock
```

To save a key in the app (rather than passing `ANTHROPIC_API_KEY`), also pass a master key: `APP_ENCRYPTION_KEY=$(openssl rand -base64 32) docker compose up --build`, and reuse the same value on later runs.

### Option 2: Node locally

```bash
npm ci                 # exact versions from package-lock.json; also generates the Prisma client
cp .env.example .env   # then set APP_ENCRYPTION_KEY to the output of: npm run gen:secret
npm run db:migrate     # creates ./dev.db and applies migrations
npm run dev            # frontend + API in one Next.js process
```

Open http://localhost:3000.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes (defaulted) | SQLite file. `file:./dev.db` locally (from `.env.example`); `file:/data/intake.db` in Docker. |
| `APP_ENCRYPTION_KEY` | To save a key in the app | 32 random bytes, base64 (`npm run gen:secret`). Encrypts the API key in the database. Without it, the app refuses to store a key and you use `ANTHROPIC_API_KEY` instead. Keep it out of git; changing it makes a saved key unreadable (delete and re-add it). |
| `ANTHROPIC_API_KEY` | No | Fallback Claude key. A key saved in the app takes precedence. |
| `ANTHROPIC_MODEL` | No | Model to call. Default `claude-opus-5-5`. |
| `LLM_MODE` | No | `live` calls Claude (default); `mock` returns a canned triage, no key needed; `fail` always errors, to demo the error state. |

### Other commands

```bash
npm test          # unit tests (Vitest)
npm run lint      # ESLint
npm run build     # production build
npm run db:reset  # wipe and recreate the local database
npm run gen:secret # print a new APP_ENCRYPTION_KEY
```

## B — What we built

### Overview

- Log an inbound project request: title, description, industry, a budget (low and high dollar amounts), and a timeline (number + unit). It's saved to SQLite immediately.
- Claude then generates a 2–3 sentence summary, three tags, and a risk checklist, stored on the intake and shown in the UI.
- Built to degrade gracefully: if the AI step fails (including an expired API key), the intake is never lost and the user is told exactly what to do.

### Flow

1. **Create** (`/intakes/new`): title, description, industry, budget low/high (`50k` / `1.2m` shorthand works, tidied to `50,000`), timeline (number + days / weeks / months / years). A preview shows exactly what will be saved. Validated in the browser and again on the server. You land on the new intake's detail page.
2. **Detail** (`/intakes/[id]`): shows the intake immediately; the AI triage section shows "Claude is reading the request…" and polls every 2s until the summary, tags, and risk checklist arrive (~10s).
3. **List** (`/`): all intakes, newest first, with status (Analyzing / Triaged / AI failed) and tags. Refreshes itself while anything is still being analyzed.
4. **Delete**: trash icon on each list card and on the detail page. You type `delete` to confirm.

The browser talks to Next.js Route Handlers:

| Endpoint | Purpose |
|---|---|
| `GET /api/intakes` · `POST /api/intakes` | List · create (then triage in the background) |
| `GET /api/intakes/:id` · `DELETE /api/intakes/:id` | Detail · delete |
| `POST /api/intakes/:id/retry` | Re-run the AI triage |
| `GET` · `PUT` · `DELETE /api/settings/llm` | Key status · verify and save a key · remove it |

### Data model

One `intakes` table (Prisma + SQLite): the user's fields (`title`, `description`, `budget_range`, `timeline`, `industry`, `created_at`) plus the AI results (`ai_status` PENDING/COMPLETE/FAILED, `summary`, `tags` and `risks` as JSON, `ai_error`, `ai_error_code`, `ai_attempts`). A single-row `llm_settings` table holds the key entered in the app and its last known health.

### AI feature

**Triage per intake.** On create, the intake is saved first; after the response is sent (Next's `after()`), Claude returns a 2–3 sentence summary, exactly 3 lowercase tags, and a risk checklist as schema-validated JSON (structured output against a Zod schema). The intake text is passed as data in tags, with an instruction to ignore any instructions inside it. Output is normalized (trimmed, tags deduplicated and lowercased, capped at 3 tags / 8 risks) and rejected if unusable. If anything fails, the intake keeps its data and shows the reason plus **Retry analysis**. An intake stuck in "Analyzing" for over 3 minutes (e.g. the server restarted mid-call) is shown as stalled and can be retried.

**API key management (key icon in the header → `/settings`)**

- Paste a Claude API key in the app. It's checked with Anthropic (a free `models.retrieve` call) before it's saved, so a typo or revoked key is rejected up front.
- The key is **encrypted at rest** (AES-256-GCM, master key from `APP_ENCRYPTION_KEY`) and never sent back to the browser; the UI shows only the last 4 characters, where it came from (the app vs. `ANTHROPIC_API_KEY`), and its status.
- **When a key expires or is revoked:** the AI call gets a 401, the intake is still saved but marked failed with "update your key", the key is marked rejected, and a banner appears on every page. Later intakes don't call the API with the dead key. Saving a working key automatically re-runs every intake that failed because of the key.
- Out of credits (402) and no access to the model (403) are handled the same way. Rate limits and outages are retried by the SDK and are *not* treated as key problems.

### UX states

| State | Where | Behavior |
|---|---|---|
| Loading | List, detail | Skeleton placeholders while fetching. |
| Loading | Detail (AI) | "Claude is reading the request…" with a pulsing placeholder; polls until done. |
| Loading | Create form | Button shows "Saving…", fields disabled (no double submit). |
| Loading | API key page | "Verifying with Anthropic…" while a key is checked. |
| Empty | List | "No intakes yet" with a button to create the first one. |
| Error | Create form | Per-field messages; server/network errors keep everything the user typed. |
| Error | Detail (AI) | Reason for the failure, Retry analysis, and "Update API key" when the key is the problem. |
| Error | Every page | Banner when the Claude key is missing or rejected; intakes still save. |
| Error | List, detail | Couldn't reach the server (with Try again) / intake not found. |

UI follows Material 3 (color roles, pill buttons, outlined fields, Roboto) in light and dark mode; it follows the system theme, and the sun/moon button in the header overrides it.

## C — Verification

### Tests

```bash
npm test
```

44 unit tests on the logic most likely to break:

- `tests/ai-errors.test.ts`: every API failure maps to the right code; an expired key (401) is a key problem, rate limits/outages are retryable, raw error text never reaches the user.
- `tests/intake.test.ts`: form/API validation (friendly messages even for missing fields, high end ≥ low end, whole-number timeline, valid units), money shorthand parsing (`50k`, `$1.2m`), and the stored budget/timeline strings.
- `tests/secrets.test.ts`: the API key encryption round-trips, never stores the plain text, uses a fresh IV each time, and rejects a wrong master key or a tampered value.
- `tests/triage.test.ts`: model output is trimmed, tags lowercased and capped at 3, bad output rejected.

Beyond unit tests, the flows were checked against the running app and the real Claude API (see "How we verified it works" in [DECISIONS.md](DECISIONS.md)).

### Manual verification checklist

- [ ] Empty list shows "No intakes yet" and a create button.
- [ ] Submit an empty form: every field shows its own message; nothing is sent.
- [ ] Budget: type `50k` and tab away → `50,000`; high end below low end → error on the high end. Timeline `1` + months → "Saved as 1 month".
- [ ] Create a valid intake: lands on detail, "Claude is reading…", then summary / 3 tags / risks appear (~10s) without reloading.
- [ ] List shows the intake with "Analyzing…" then "Triaged" and its tags.
- [ ] `LLM_MODE=fail`, create an intake: detail shows the error and Retry; set back to `live`, Retry → completes.
- [ ] Delete from the list and from the detail page: Delete stays disabled until you type `delete`; the intake disappears.
- [ ] Open `/intakes/does-not-exist`: "This intake doesn't exist".
- [ ] Stop the server while on the list, click Try again: clear "couldn't reach the server" message.
- [ ] API key page with no key: banner "AI analysis is paused: no Claude API key is set" on every page.
- [ ] Paste `hello`: rejected as not an Anthropic key. Paste a well-formed fake key: Anthropic rejects it. Nothing saved either time.
- [ ] Paste a real key: the page switches to "Current key" (status "Working", last 4 characters only), the header dot turns green, the banner disappears. Replace key swaps back to the form (Cancel returns); Delete key asks to confirm, then the page shows "Add a key" again and the dot turns red.
- [ ] Expired key: set a fake `ANTHROPIC_API_KEY` with no key saved in the app, create an intake → it fails with "update it in Settings" and the banner appears; save a real key → the intake re-runs and completes.
- [ ] Theme: with the system in dark mode the app is dark; the sun/moon button switches and survives a reload. Check the timeline dropdown and the delete dialog in both themes.
