# DECISIONS

## Plan

- Ship a thin, end-to-end slice first (schema → API → list / create / detail), then add the AI step on top of it.
- Treat AI as enrichment, not a dependency: save the intake first, run Claude in the background, so any AI failure leaves the user's data intact.
- Make every state explicit (loading, empty, error), including the one most likely to bite in real use: the API key going bad.
- Verify as we go: unit tests on the risky logic, real runs against the app and the Claude API after each feature, docs updated alongside the code.

## Key decisions and why

- **Stack: Next.js (App Router) + Prisma + SQLite, in TypeScript** → The brief's recommended default. One process serves both the UI and the API, so it runs with one command, and TypeScript comes along for free.
- **Save the intake first, enrich with AI after** → The intake is stored immediately with `ai_status = PENDING`; Claude fills in summary, tags, and risks afterward (Next's `after()`). If the AI step fails, the user's input is never lost; the record shows `FAILED` and can be retried.
- **Claude (`claude-opus-5-5`) instead of the provided OpenAI key** → Team preference. Structured output via a Zod schema, so the summary/tags/risks come back as validated JSON instead of parsed free text. Effort set to `low`: triage is a short, simple task. Server-side refusal fallback (`fallbacks: "default"`) is on, so a safety decline is retried on another model instead of failing the intake.
- **`LLM_MODE` switch (`live` / `mock` / `fail`)** → Deterministic runs without a key, a reproducible way to show the error state, and reviewers can run the app without a key.
- **API key entered in the UI, verified before saving** → Users can drop in or rotate a key without editing `.env` or restarting. Verifying with a free `models.retrieve` call catches typos and revoked keys at the point of entry instead of on the next intake.
- **Expired key degrades AI only, never intake creation** → A 401/402/403 marks the key rejected, shows a site-wide banner, and records the intake as failed with a fixable message. We stop calling the API with a key we know is dead, and saving a working key automatically re-runs the intakes that failed because of it, so nothing is lost and nothing needs a manual retry.
- **Errors classified into stable codes with user-safe messages** → Every failure (auth, billing, rate limit, outage, network, refusal, bad output) maps to a code and a plain-English message. The UI decides what to offer (Retry vs. Update key) from the code, and raw provider errors never reach the user.
- **Client-side fetching + polling for the AI result** → The detail page polls every 2s only while the intake is `PENDING`, and stops as soon as it's done. Streaming or websockets would be overkill for a ~10s background job.
- **One validation schema (Zod) shared by form and API** → The browser gives instant per-field feedback; the server stays authoritative. Same messages in both places.
- **Budget and timeline as numbers, stored as strings** → The brief allows strings, but free text ("50-80k", "soon") is slow to type and inconsistent. The form takes a low/high dollar amount and a number + unit, the server validates them (high ≥ low, whole numbers), and stores readable strings like `$50,000–$80,000` and `6 weeks`. No schema change, and Claude reads the same clear text.
- **Stalled-job detection instead of a job queue** → `after()` runs in-process, so a server restart mid-call could leave an intake `PENDING` forever. Rather than add a queue, an intake pending for 3+ minutes is shown as stalled with a Retry button.
- **Hard delete behind a type-to-confirm dialog** → Deleting is permanent, so the user types `delete` first. An AI job still running on a deleted intake finishes quietly (its writes match no rows) instead of erroring or recreating the record.
- **Material 3 theme tokens, light + dark** → Colors come from M3's baseline color roles (primary, surface, on-surface, outline, error, …) defined once as CSS variables, with a dark set that follows the system. Components use the roles, never raw colors, so dark mode works everywhere and a rebrand is one file. A sun/moon toggle overrides the system choice and is remembered per browser; a tiny inline script applies it before first paint so there's no flash.
- **Docker + `requirements.txt` for reproducibility** → `docker compose up --build` runs the app with no local Node; the database sits in a volume and migrations run on start. `requirements.txt` is a plain checklist of prerequisites; exact library versions are pinned in `package-lock.json` (`npm ci`).
- **API key encrypted at rest** → A key saved in the app is stored as AES-256-GCM ciphertext; the master key comes from `APP_ENCRYPTION_KEY` and never touches the database. A leaked database file, backup, or zip is useless on its own. Without a master key the app refuses to store a key (it never falls back to plain text); `ANTHROPIC_API_KEY` and mock mode still work. A key saved before this change is encrypted the first time it's read. In production we'd go further: keep the key in a secrets manager and store only its status (see next steps).

## How we verified it works

- **Unit tests (44, `npm test`)** on the logic most likely to break: error classification (an expired key vs. a rate limit), AI output normalization, form/API validation, money / timeline parsing and formatting, and API key encryption (round-trip, fresh IV, wrong key and tampering rejected).
- **Key encryption through the real database layer** (on a copy of the DB): a legacy plain-text key was encrypted on first read and still decrypted correctly; a changed master key gave a clear "can't be decrypted" status instead of a crash; saving without a master key was refused (503). The live database's key was confirmed to be ciphertext.
- **Real Claude calls through the running app:** created an intake via the API and watched it go `PENDING` → `COMPLETE` in ~9s with an accurate summary, 3 tags, and 6 concrete risks. A retry while still running was correctly refused (409).
- **Expired-key path against the real API:** a fake key got a real 401; the intake failed with the "update your key" message, the key was marked rejected, a second intake failed in 5ms *without* calling the API, and saving a new key re-ran both to `COMPLETE`.
- **Key page:** malformed input is rejected locally; a well-formed fake key is rejected by Anthropic and not saved; a real key saved and showed "Working".
- **Edge cases via the API:** validation errors (400, per-field messages, including missing fields), unknown intake (404), high end below low end (400 on the high-end field), deleting an intake *while Claude was analyzing it* (204, record stayed deleted after the job finished, server healthy).
- **Every change:** typecheck, lint, and a production build. The build caught two real issues (Next 16 requires request-time data and `useParams` inside `<Suspense>`).
- **Reproducibility:** replayed the Docker steps on a clean copy (no `node_modules`, `.env`, or database): `npm ci` → `npm run build` → `prisma migrate deploy` on a fresh database → production start → created an intake end to end. Docker itself wasn't installed on the build machine, so the image wasn't built here.
- **By hand in the browser:** the flows in the README checklist, both themes, and the theme toggle.

## Tradeoffs: what we did not do, and why

- **No authentication or multi-user support.** It's a local internal tool for the exercise; auth would add a lot without changing the core slice.
- **No job queue.** `after()` keeps it to one process and one command; stalled-job detection + Retry covers the main failure (restart mid-call). A real deployment would use a queue with retries.
- **No editing of intakes**, and no search, filtering, or pagination. Create → list → detail → delete covers the slice; editing would also need a "re-run triage?" decision.
- **No dashboard or CSV export** (bonus items). Time went to AI reliability and UX states instead, which the brief weights more heavily.
- **Budget stored as a string, not numbers.** Keeps the schema simple and matches the brief; it means we can't sort or filter by budget yet.
- **No browser end-to-end tests.** Unit tests cover the logic; flows were verified by hand and through the API. Playwright would be next.
- **No evals for triage quality.** We validate the *shape* of Claude's output, not how good the summary and risks are.
- **Encryption at rest, not a secrets manager.** It protects the database file, not a compromised server: whoever has the server's env vars has the master key. No key rotation tooling either; changing `APP_ENCRYPTION_KEY` means re-adding the key.
- **Polling instead of streaming.** Simpler and good enough for a ~10s job.

## What we learned, or would do differently next time

- **Save-first made everything else easier.** Once the intake was safe before the AI call, every failure (bad key, outage, refusal, deleted mid-run) became "record a message and offer Retry" instead of a special case.
- **New framework versions bite.** Prisma 7 needs a config file and a driver adapter and no longer regenerates its client on migrate; `prisma init` also dropped agent-skill folders into the repo, which we removed. Next 16's Cache Components require request-time data inside `<Suspense>`. Reading the bundled docs first (Next ships them in `node_modules/next/dist/docs`) saved guesswork.
- **CSS layering matters.** The starter stylesheet's unlayered `body` rule overrode Tailwind's background class, which made text unreadable in dark mode. Defining theme tokens up front would have avoided it, and we'd start with them next time.
- **The dev server can serve stale CSS.** A theme change looked broken until the dev server was restarted; the production build was correct all along. Checking the build output first would have found that sooner.
- **Decide input formats before building the form.** Budget and timeline went free text → considered presets → numbers. Agreeing on the format first would have saved a rewrite.
- **Commit in small steps from the start**, so the history tells the story of the build.

## With one more day: next steps

- **Quality evals for triage:** a small golden set of intakes with expected tags and must-catch risks, scored on every prompt or model change.
- **Observability:** log latency, token usage, and cost per AI call, plus the model and raw response for debugging bad triage.
- **A real job queue** with retries and backoff, replacing `after()` + stalled detection.
- **Store budget and timeline as numbers** alongside the strings, then add the dashboard (counts by tag and status) and CSV export.
- **Edit an intake** with an option to re-run triage.
- **Playwright end-to-end tests** for create → detail → triage, the expired-key path, and delete; build the Docker image in CI.
- **Auth on the app, and the API key in a secrets manager** (AWS/GCP Secret Manager, Vault) with only its status in the database; master-key rotation.
- **Model choice by measurement:** compare a cheaper model against Opus on the eval set before changing the default.
