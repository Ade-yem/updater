# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
An email-digest app in early development. Goal: OAuth into a user's Gmail, pull the day's emails, summarize them with an LLM (following any links found via web search/scraping), and push the summary to a PWA frontend via SSE. A cron job (not the frontend) triggers the summarization endpoint daily; the frontend just displays history and the current day's summary. See [todo.md](todo.md) for the current feature checklist — update it as work progresses.

Detailed information about what the project is about is in [ABOUT.md](ABOUT.md)

## Structure

pnpm workspace monorepo:
- `apps/api` — NestJS backend (feature-module structure under `src/features/*`)
- `apps/client` — React 19 + Vite + Tailwind v4 frontend (PWA)
- `packages/shared` — `@repo/shared`, common TS types/interfaces used by both apps; edit `packages/shared/src/index.ts` and rebuild to propagate changes

## Commands

Run from repo root unless noted.

```bash
pnpm install                # install all workspace deps

pnpm dev:api                 # start API dev server (watch mode)
pnpm dev:client              # start client dev server (Vite)

pnpm build                   # build api then client
pnpm build:api
pnpm build:client

pnpm start:api                # run built API (production)
pnpm start:client             # preview built client

pnpm lint                    # eslint across the whole repo
pnpm lint:fix
pnpm format                  # prettier --write .
pnpm format:check
```

API tests (run from `apps/api`, uses Jest):
```bash
pnpm test                    # all unit tests (*.spec.ts)
pnpm test -- users.spec      # run a single spec file by name pattern
pnpm test:watch
pnpm test:cov
pnpm test:e2e                # e2e tests via test/jest-e2e.json
```

`packages/shared` must be built (`pnpm --filter @repo/shared build`) before its type/JS changes are visible to `apps/api`/`apps/client`, since it's consumed via `workspace:*` from `dist/`.

## API architecture (`apps/api`)

- Nest feature-module convention: each feature lives in `src/features/<name>/` with `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.spec.ts`. Register new feature modules in `src/app.module.ts`'s `imports`.
- `src/config/env.ts` exports a single `ENV` object reading `process.env` — add new environment variables here rather than calling `process.env` directly in feature code.
- `src/common/` holds shared low-level clients: `openai-client.ts` (OpenAI SDK client pointed at Gemini's OpenAI-compatible endpoint via `ENV.GEMINI_API_URL`/`GEMINI_API_KEY`) and `gmail.ts` (googleapis Gmail client, currently scoped to `gmail.readonly`).
- Path alias `@/` maps to `src/` (configured in `apps/api/tsconfig.json` and `tsconfig-build.json`) — import internal modules as `@/config/env`, `@/common/gmail`, etc.
- The LLM is actually Gemini, accessed through the OpenAI-compatible SDK/baseURL, not OpenAI directly — keep this in mind when reasoning about model names/capabilities.
- Per todo.md: one-off/manual test scripts for new integrations (Gmail, LLM calls, scraping) belong in a `scripts` directory before writing them into code. Then we run full tests individually for each feature through Jest, to validate implementations after wiring them into endpoints. `tsconfig-build.json` already excludes `scripts` from the Nest build.

## Backend Status

**Phase 1: Complete** ✅
- All modules registered and boot cleanly
- Config centralized via `ENV` object in `src/config/env.ts`
- No circular dependencies

**Phase 2/3: In Progress** 🚀
- ✅ Core bugs fixed: `AuthService.register()`, `handleGoogleCallback()`, `UserService.upsertUser()`
- ✅ Shared types finalized: `UserDto`, `SSEEvent`, `DigestDto`, `LinkSummary` (with Zod schemas)
- ✅ Prisma migrated: `DigestStatus` enum added, `findUsersDueForDigest()` implemented
- ✅ Utility layer: `retry.ts` (exponential backoff), `concurrency.ts` (bounded worker pool)
- ✅ Agent module: `AgentService` (LLM summarization via Gemini), `ScraperService` (URL scraping with cheerio)
- ✅ Auth guards: `JwtAuthGuard`, `AuthenticatedRequest` type
- ✅ Build: Full backend compiles cleanly

**Remaining Phase 2/3 work (in order):**
1. Move `digest-orchestrator.service.ts` from `src/features/cron/` to `src/features/digest/`
2. Create `DigestService` (persistence: `findToday`, `findMany`, `findById`, `upsertForUser`)
3. Implement full `DigestOrchestratorService` orchestration logic (email→summary→scrape→persist→SSE)
4. Create `DigestController` with protected endpoints (`GET /digests`, `/digests/today`, `/digests/:id`)
5. Create global exception filter + update `main.ts` (CORS to `FRONTEND_URL`, error normalization)
6. Update `SseModule` with token-based JWT auth (replaces `?userId=` with `?token=`)
7. Comprehensive test suite (unit + integration)

**Current API endpoints** (working):
- `POST /auth/register` — create account
- `POST /auth/login` — login
- `GET /auth/google` — Google OAuth redirect
- `GET /auth/google/callback` — OAuth callback
- `POST /digest/update` (secret header) — cron trigger (stub, no-op)
- `GET /events/stream?userId=` — SSE stream (unprotected, needs auth work)

**Planned API endpoints** (not yet implemented):
- `GET /digests/today?userId=` → `ApiResponse<DigestDto | null>` (JWT protected)
- `GET /digests?userId=&skip=&take=` → `ApiResponse<{items: DigestDto[], total: number}>` (JWT protected)
- `GET /digests/:id` → `ApiResponse<DigestDto>` (JWT protected)

## Client architecture (`apps/client`)

- Vite + React 19 (using the React Compiler babel plugin) + Tailwind v4 (via `@tailwindcss/vite`).
- Currently a blank scaffold: only `src/App.tsx` (empty) and `src/main.tsx` (bootstrap).
- Planned as a PWA showing two views: today's digest summary and digest history.
- **Frontend plan**: Comprehensive plan documented in `/home/lanke/.claude/plans/frontend-plan.md`

**Planned frontend features:**
1. **Auth system** (Phase 1) — register, login, Google OAuth, JWT persistence
2. **Digest views** (Phase 2) — today's digest (auto-poll every 5s) + paginated history
3. **Real-time progress** (Phase 3) — SSE stream shows digest.started → digest.completed/failed status
4. **PWA features** (Phase 4) — installable, offline support, dark mode, accessibility

**Frontend state architecture:**
- `AuthContext` — user + JWT management (localStorage persistence)
- `DigestContext` — current digest + history + polling
- `DigestProgressContext` — SSE event handling for real-time status
- React Router v7 — two main routes: `/digest/today` and `/digest/history`

**API consumption:**
- `POST /auth/register`, `POST /auth/login` — credentials auth
- `GET /auth/google` → browser redirects → `GET /auth/google/callback` → frontend intercepts callback with JWT
- `GET /digests/today?userId=X` — fetch today's digest (poll every 5s)
- `GET /digests?userId=X&skip=0&take=10` — fetch digest history (paginated)
- `GET /events/stream?token=<jwt>` — SSE for real-time digest progress events
