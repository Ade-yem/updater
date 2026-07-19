Welcome to the team! This onboarding guide will walk you through the core concepts, architecture, and engineering design choices of the project.

At its core, this platform is an automated, intelligent backend pipeline coupled with an offline-ready frontend shell. It acts as an **AI-powered Daily Digest Agent** that securely monitors user email mailboxes, extracts valuable information, dynamically visits and scrapes external links found within those messages, and synthesizes everything into a cleanly formatted Markdown summary.

---

## The Core Product Value

As professionals, our email inboxes are flooded daily with newsletters, platform updates, and notifications containing external reference hyperlinks. Manually opening every message, clicking every link, reading through bloated web pages, and taking notes is a massive time sink.

Our platform automates this entire loop in the background:

1. It wakes up at the user's preferred hour of the day.
2. It fetches all email messages arriving within that current calendar block.
3. It finds links embedded inside those emails, automatically scrapes those target web spaces, and strips out layout noise.
4. It passes all compiled information to a Large Language Model (LLM).
5. The LLM generates a single, clean, hyperlinked Markdown overview that updates the user's dashboard instantly via real-time network streaming.

---

## System Integration Workflow

The following conceptual workflow demonstrates the path information follows from raw email arrival down to frontend consumption:

---

## Deep-Dive into Component Responsibilities

The codebase is organized as a decoupled multi-tier architecture, dividing tasks cleanly between our **NestJS Backend** and our **React PWA Frontend**.

### 1. The Operational Control Hub (NestJS Backend)

Our backend is entirely stateless, utilizing an external scheduler task manager to trigger calculations on a rolling queue based on each user's localized timezone preferences:

* **The Hourly Window Filter Engine:** An external cron runner pings our secure `/digest/update` endpoint every hour. The server checks the current UTC hour block ($0 \le h \le 23$) and retrieves only the subset of users who configured that specific hour as their delivery slot. This prevents CPU and token memory starvation on the server.
* **Security & Encryption Isolation Layer:** We handle OAuth2 on the backend. When a user authenticates, their Google `refresh_token` is immediately encrypted at rest using **AES-256-GCM** before hitting our PostgreSQL database via Prisma. This protects user data from accidental leaks during generic database queries.
* **The Extractor & Dom-Scraper Node:** The system logs in to Gmail, gathers today's emails, and extracts text payloads. A regular-expression engine compiles a unique list of found hyperlinks. An automated crawler uses `axios` and `cheerio` to fetch webpage text, aggressively stripping away non-semantic tags like `<script>`, `<style>`, `<nav>`, and `<footer>` to optimize LLM input processing tokens.
* **The Agentic LLM Architecture:** A structured generative engine takes the aggregated context blocks and synthesizes a structured markdown document containing key takeaways and categorized external reference links.
* **Server-Sent Events (SSE) Streaming:** Instead of relying on traditional HTTP polling, the backend implements an active RxJS streaming gateway. The instant a user's digest finishes processing, the system fires a notification packet down the open socket connection to update the frontend client instantly.

### 2. The Presentation Layer (React PWA Frontend)

The frontend is built to be resilient, lightning-fast, and completely operational regardless of network state:

* **Service Worker Asset Cache:** Configured via Vite, the app shell handles asset bundles using a **Stale-While-Revalidate** strategy, allowing the client interface to load instantly without hitting our servers.
* **Data Minimization & Local Cache (IndexedDB):** The interface strictly concerns itself with displaying **only the current day summary** and a historical archive list. Upon boot, the view data is rendered immediately from local IndexedDB storage, eliminating empty loading flashes.
* **Live Broadcast Receiver:** The app opens a connection to our backend SSE endpoint. When a background summary finishes processing mid-session, the interface catches the data, updates the reactive UI components smoothly, and updates IndexedDB to maintain offline storage parity.

---

## Getting Around the Codebase

As a developer on this project, your development loop is supported by isolated integration scripts. You don't need to boot up the entire backend server cluster to work on or test individual features.

Look at the root-level `scripts/` directory:

* `scripts/test-crypto.ts`: Standalone verification to test the AES-256-GCM encryption and decryption pipelines.
* `scripts/test-prisma-schema.ts`: Directly seeds mock records into PostgreSQL via Prisma to evaluate relationship bindings.
* `scripts/test-hourly-matching.ts`: Tests the hourly time-window calculation and distribution engine queries.
* `scripts/test-gmail-extraction.ts`: Connects directly to Google's API via raw terminal scripts using a decrypted token to print today's mailbox payloads.

Welcome aboard! Let us know if you have any questions as you dive into the implementation files.