## 1. Complete System Architecture Overview

The platform uses an **Asymmetric Orchestration Pattern**, which decouples user-facing web states from heavy processing cycles.

Instead of running an intensive global database sweep once a day, processing loads are distributed evenly across **24 distinct hourly execution buckets**. An external cron worker pings the system every hour, acting as the primary catalyst to advance the pipeline.

```
 ┌────────────────────────────────────────────────────────┐
 │                   REACT FRONTEND PWA                   │
 └───────┬───────────────────▲────────────────────▲───────┘
         │                   │                    │
  (Auth Redirect)       (SSE Stream)        (REST Read)
         │                   │                    │
 ┌───────▼───────────────────┴────────────────────┴───────┐
 │                     NESTJS BACKEND                     │
 │                                                        │
 │   [POST /digest/update] <─── (Every 1 Hour) ─── [External Cron]
 │            │                                           │
 │            ▼                                           │
 │   [Scan Current UTC Hour]                              │
 │            │                                           │
 │            ▼                                           │
 │   [Fetch Filtered Users] ───(Reads/Writes)───► [Prisma DB]
 │            │                                           │
 │     (Decrypts Tokens)                                  │
 │            ▼                                           │
 │   [Gmail API Service]                                  │
 │            │ (Extracts URLs)                           │
 │            ▼                                           │
 │   [LLM Agent + Scraper] ───────────────────────────────┘
 │            │                                           
 │     (Emits Success)                                    
 │            ▼                                           
 │   [SSE Gateway Stream] ────────────────────────────────► (Live Sync to PWA)
 └────────────────────────────────────────────────────────┘

```

---

## 2. Backend Domain Architecture (NestJS)

The backend code is divided into modular domains to keep individual components completely testable using the project's standalone scripts wrapper.

### Core Architecture Modules

* **`AuthModule` & `GoogleAuthRepository**`: Generates secure Google OAuth endpoints. When the backend receives the authorization code via the redirect callback, it extracts and encrypts the Google `refresh_token` using **AES-256-GCM** before writing it to PostgreSQL via Prisma. It then establishes a stateless user app session using secure `HttpOnly` cookies.
* **`CronModule` (`/digest/update`)**: Exposes a single secure gateway endpoint guarded by an operational payload signature header (`x-cron-secret`). It evaluates the exact runtime window hour ($0 \le Hour \le 23$) using normalized server UTC time.
* **`OrchestrationModule`**: Pulls active profiles matching the current hourly bucket from the database. It handles batch isolation, mapping matching user loops into individual async processing threads to avoid blocking the main runtime.
* **`GmailModule`**: Takes the encrypted credentials for targeted users, decrypts them on the fly, authenticates with Google, and queries all messages received since the current day boundary query limit ($StartOfDay$).
* **`AgentModule` (LLM + Website Scraper)**:
* **Parser Component**: Scans raw email blocks to isolate external hyperlinks.
* **Scraper Worker**: Uses `axios` and `cheerio` to fetch webpage text, stripping heavy structural tags (`<script>`, `<style>`, `<nav>`, `<footer>`) to minimize token sizes.
* **LLM Interface**: Passes the cleaned webpage content alongside the source email context to an LLM, generating a clean Markdown summary structure containing verified embedded links.


* **`SseModule` (Server-Sent Events)**: Uses an RxJS-backed Subject mechanism. The moment a user thread completes successfully, it fires a notification packet downstream to broadcast updates directly to any active, connected PWA web instances.

---

## 3. Database Schema Modeling (Prisma)

The schema isolates application properties from security credentials and organizes summaries for efficient historical retrieval.

* **`User`**: Tracks identity parameters and includes the core **`digestTime`** routing column (stored as an integer from `0` to `23` representing the delivery hour).
* **`GoogleAuth`**: An isolated credential table holding the encrypted `refreshToken` strings. Keeping this separate protects secrets from being accidentally exposed during generic user data lookups.
* **`Digest`**: An application caching table that stores the generated Markdown text block and a raw JSON structure (`linksProcessed`). It enforces a composite index constraint `@@unique([userId, digestDate])`, ensuring users get exactly one summary record per calendar day.

---

## 4. Frontend Client Architecture (React PWA)

The React client app functions as a lightweight, consumption-optimized shell designed to store data locally and work seamlessly offline.

```
+-------------------------------------------------------+
|                 React UI Components                   |
+-------------------------------------------------------+
                           │
             (Reads Directly from State/Cache)
                           ▼
+-------------------------------------------------------+
|                IndexedDB (Local Store)                |
+-------------------------------------------------------+
                           ▲
                           │ (On Message / Overnight Sync)
+-------------------------------------------------------+
|               SSE Listener Service / SW               |
+-------------------------------------------------------+
                           ▲
                           │ (Streaming Connection)
                  [NestJS SSE Stream]

```

### Core Architecture Layers

* **Application Shell (PWA Enabler)**: Managed via `vite-plugin-pwa`. It configures background service workers to cache layout bundles using a **Stale-While-Revalidate** network strategy, ensuring the web interface launches instantly without a network connection.
* **Offline Cache (IndexedDB Layer)**: Powered by a lightweight library like `idb`. The frontend stores only **today's summary** and a rolling window of **historical entries**. When launched, it loads layout states from local cache first, completely eliminating loading states.
* **Live Synchronization Worker**:
1. The frontend maintains an open connection to the backend SSE endpoint (`/api/sse/stream`).
2. When the external cron job triggers a processing cycle and the user's summary finishes updating, the backend pushes a data packet across the connection.
3. The application intercepts the payload, triggers a reactive state refresh to update the UI components smoothly, and updates **IndexedDB** to keep the local offline cache perfectly in sync.



---

## 5. End-to-End Execution Sequence

```
[ External Cron Trigger ]
           │ (Hourly POST Ping with Security Token)
           ▼
[ NestJS /digest/update ]
           │ (Calculates Current System UTC Hour Loop)
           ▼
[ Database Query Pass ] ──► Extracts Users matching current hour bucket
           │
           ▼
[ Decryption Utility ]  ──► Rebuilds plain-text Google credentials using AES-256-GCM
           │
           ▼
[ Gmail API Engine ]   ──► Downloads matching message headers & body strings
           │
           ▼
[ Token URL Filter ]   ──► Extracts target links ──► Launches Axios Scraper
           │
           ▼
[ LLM Generation Pass ] ──► Builds summary Markdown & logs analytical array metadata
           │
           ▼
[ Write Database Sync ] ──► Upserts Digest record state ──► Sets state status to 'completed'
           │
           ▼
[ SSE Broadcast Stream ]──► Pushes live update event to client ──► Refresh PWA UI & IDb Cache

```

