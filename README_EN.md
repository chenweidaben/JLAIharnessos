<div align="center">

# jlmedaios · Industrial-Grade Agent OS for Smart Hospitals

### Hangzhou Jianlan Technology · Open-source foundation for AI-native hospitals (unified HIS + EMR)
#### Open-source, free, industrial-grade — Making medical AI simpler and more deployable, the "Android of Healthcare AI"

[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Language](https://img.shields.io/badge/TypeScript-6.0-3178c6.svg)](https://www.typescriptlang.org/)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-14151a.svg)](https://bun.sh/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Backend Tests](https://img.shields.io/badge/backend%20tests-1748-success.svg)](#quality)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-738-success.svg)](#quality)
[![DAMO-RADAR](https://img.shields.io/badge/DAMO--RADAR-Science%202026-blueviolet.svg)](https://doi.org/10.1126/science.aec6129)
[![RADAR Code](https://img.shields.io/badge/RADAR%20Code-Apache--2.0-success.svg)](services/radar-inference/vendor/damo-radar/LICENSE)
[![RADAR Weights](https://img.shields.io/badge/RADAR%20Weights-CC%20BY--NC--SA%204.0%20(non--commercial)-orange.svg)](#ai-imaging-assist-damo-radar-fusion)

**Let a hospital IT department build its own agents — AI medical-record writing, record quality control, voice medical records, prescription review, clinical decision support, closed-loop critical values — drag-and-drop, on-premise, with data never leaving the hospital.**

[中文](README.md) · [Quick Start](#quick-start) · [Closed Milestones](#closed-milestones-and-real-evidence) · [Build an Agent](#build-a-medical-agent-in-5-minutes) · [Architecture](#architecture) · [Docs](#docs) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

</div>

---

## Positioning

**jlmedaios is the "Android of medical AI"**: an open-source, free, industrial-grade hospital agent OS that hospital IT departments and global developers can assemble and extend, built for AI-native hospitals.

It is not another single AI assistant, but an integrated platform that deeply fuses the **core transactional systems (unified HIS + EMR)** with an **AI-native capability middle platform (agent orchestration / skills / knowledge / CDS / RAG)**:

- **Down**: unified clinical data, master data, and external-system connectivity;
- **Middle**: cloud-native microservices for registration, encounters, inpatient care, emergency, orders, prescriptions, documentation, pharmacy, billing, diagnostics, OR-anesthesia, and archiving;
- **Up**: an AI middle platform cross-cutting every workflow — AI scribe, AI QC, voice EMR, diagnosis/medication support, closed-loop critical values;
- **Throughout**: physician review/signature, configurable permissions, traceable data, built-in compliance.

> ⚕️ **Patient-safety red line (non-negotiable)**: AI is always assistive ("second reader / second opinion"). **All legally meaningful writes — diagnoses, orders, prescriptions, signed records — must be confirmed and e-signed by authorized clinicians.** The system does not practice autonomously. When the real DB/model is unreachable, it **reports an explicit error**; demo data exists only under explicit `DEMO_MODE` with a watermark.

---

## Why we built this

Large models are powerful, yet hospitals struggle to adopt them: **data is too sensitive to leave the premises, HIS/LIS/PACS systems are fragmented, clinical workflows have near-zero tolerance for error, vendor lock-in is pervasive, and there is no programmable agent foundation for IT departments.**

Jianlan Technology open-sources its unified HIS+EMR foundation and medical agent engine under **Apache-2.0**, with the mission of **making medical AI simpler and more deployable**:

- 🏥 **For hospitals**: IT teams orchestrate their own agents on a low-code canvas — private, auditable, compliance-ready.
- 🧩 **For developers**: an orchestration kernel, 38 medical tools, a knowledge platform, and integration adapters — extend like installing apps.
- 🌏 **For the ecosystem**: a portable, versioned **Agent Package** standard connecting hospitals, vendors, and the community.

---

## Closed Milestones and Real Evidence

The project advances incrementally with the **Strangler pattern**. Every milestone adheres to "real persistence, real evidence, physician signatures, reversible" — **mocks are never passed off as real**.

| Milestone | Slice | Content | Real evidence |
|---|---|---|---|
| **M0** | Outpatient | registration/queue/intake/AI record/diagnosis/orders/Rx/pharmacist review | truly in PostgreSQL, survives restart |
| **M1-A** | Inpatient ADT | admit/discharge/transfer, beds/wards | psql counts, hash-chained in-transaction |
| **M1-B1** | Emergency | triage levels 1–4, green channel, resuscitation, observation | concurrency no-dup, unauthorized 403 |
| **M1-B2** | Bedside stations | rounds/nursing/order administration | state machine + dual sign |
| **M2-A** | Pharmacy | dispensing, inventory linkage, health gate | concurrency no-dup, DB-outage error + watermark |
| **M2-B** | Record QC | three-level signature + return/rework/resubmit | state machine + signature chain |
| **M2-C** | Voice records | dictation → review → personally signed structured record | survives restart, pluggable ASR |
| **M3-A** | Front page | auto-aggregation, coding/QC/archiving state machine | idempotent, row locks, audit |
| **M3-B** | Billing settlement | fee items → settlement → invoice → refund Saga compensation | concurrency no-dup, state machine |
| **M3-C** | MFA | two-factor persistence and login enforcement | TOTP/backup codes |
| **M3-D** | DRG/DIP | local discharge-case grouping (no external insurance) | deterministic, recomputable |
| **M3-E** | Lab/imaging interpretation | AI-assisted interpretation skeleton + physician signature | deterministic engine |
| **M3-F** | Critical values | auto-reporting + receipt/handling state machine | full-chain trace |
| **M3-G** | Insurance reconciliation | local recomputation skeleton (no external insurance) | diff locatable |
| **M3-H** | OR & anesthesia | tertiary core clinical-domain state machine | state machine + records |
| **M3-I** | Appointment & follow-up | appointment/encounter linkage + follow-up plans/records | idempotent, state machine |
| **M3-J** | Internet hospital base | WeChat login/realname/online credentials/field encryption/mini-program | real HTTP + outage + watermark |
| **M3-K** | Text consultation | appointment + consultation session/messages, revisit eligibility gate, state machine | real HTTP + unauthorized 403 + outage |
| **M3-L** | Internet e-prescription | prescribing/review duty separation, no AI auto-prescribing, idempotency key, mandatory comment on reject/return | real HTTP + unauthorized 403 + state machine |
| **M3-M** | Online payment / e-invoice | pluggable payment channels (WeChat Pay v3/mock), local Medicare split, invoice reversal, finance refund in one transaction | real HTTP + outage 503 + unauthorized 403 + state machine |
| **M3-N** | Rx delivery / online reports | fulfillment of paid e-prescriptions (self-pick/express channels, tracking no., pickup-code redemption), online access to lab/imaging/AI interpretation | real HTTP + unauthorized 403 + audit-chain concurrency hardening |
| **M3-O** | Satisfaction surveys | patient multi-dimension star ratings (6 dimensions) + comments, staff entry on behalf, average/positive-rate stats, one survey per visit/consultation | real HTTP + idempotency + unauthorized 403 + outage 503 |
| **M3-P** | Smart triage / pre-consultation | symptom dialog → deterministic rule engine recommending departments (13 departments, emergency first), structured pre-consultation history → report for clinician to adopt | real HTTP + unauthorized 403 + restart persistence + outage 503 |
| **M3-Q** | Digital companion | family delegation (scopes explicitly granted, empty by default; payment/refund high-risk requires second confirmation) + full audit trail; eight-step companion guide with large-font accessibility | real HTTP + unauthorized 403 + restart persistence + outage 503 |
| **M3-R** | Bidirectional referral | incoming/outgoing referral orders, external document capture & storage, on acceptance external patient EMPI registration + local visit creation, reject/complete/cancel state machine; fills Smart Service Level 3 basic item [3 Referral] | 21 real HTTP checks + unauthorized 403 + restart persistence + outage 503 + watermark screenshots |
| **M4-A** | Knowledge platform (first slice) | knowledge base CRUD, document ingestion (parse → chunk → embed → persist; job-table pattern keeps `failed` on error), RAG hybrid retrieval (vector cosine 0.6 + keyword 0.4, Chinese medical query stop-word filtering); pluggable embedding provider (local deterministic / OpenAI-compatible), persisted in PostgreSQL and exposed via BFF + web UI | 13 real HTTP checks + unauthorized 403 + restart persistence + outage 503/500 + watermark screenshots |
| **M4-B** | Low-code agent builder | persisting canvas agent definitions (idempotent draft via `ON CONFLICT`), structural & semantic validation (zod schema + DSL checks for orphan edges/cycles/unreachability/tool & knowledge references), SemVer release management (major/minor/patch + SHA-256 checksum), owner/admin permissions and cascade delete; release and hash-chained audit run in one transaction (execution/run-instance persistence is left to a later slice) | 12 real HTTP checks + unauthorized 403/401 + restart persistence + outage 500 with traceId |
| **M4-C** | Agent runtime integration | triggering published agents (enabled only; a version newer than latest returns 409); a running `workflow_instances` row is inserted up-front for traceability, with `workflow_node_records` aggregated from recorder events (state/attempts/output/duration) and `agent_invocations` logs; result replay and mid-flight cancellation (abortable delay sleep); instances/invocations cascade-delete via foreign keys; execution and hash-chained audit run in one transaction | 6 real aggregator checks (success/replay/404/409/concurrent/cancel) + outage 500 with traceId + watermark |
| **M4-D** | Human-in-the-loop & task center | when a workflow reaches a human node (or a high-risk node forces manual review), the instance enters `waiting_human` and a review task is persisted; reviewers claim (CAS to prevent duplicates) and approve/reject with e-signature, then the workflow resumes or terminates; cancellation/overall timeout syncs open tasks to a terminal state with no leftovers; `PersistentHumanTaskHandler` suspends in memory while persisting to the DB, and a BFF restart can be handled by the recovery flow; BFF `/human-tasks` endpoints + frontend task center (watermark/outage gate) | 13 real integration cases + 403 unauthorized + 409 duplicate + restart persistence + outage 503/500 with traceId + UI screenshots |
| **M5-A** | Multi-tenant registry persistence | persist the hospital→campus registry to `iam.tenants` (hierarchy CHECK, partial indexes, soft-delete, default hospital protected); the BFF hydrates the in-memory registry at startup, admin writes are write-through (persist first, then memory); admin tree reads come straight from the DB; row-level isolation of business tables is a later slice | 12 real integration cases + 403 unauthorized/401 + restart persistence + outage 500 with traceId |
| **M5-B** | Research cohort | define a cohort (disease + include/exclude criteria jsonb) → publish → a deterministic rule engine scans patients and auto-enrolls matches (age/gender/diagnosis/tag/lab, exclusion first); member snapshots are de-identified (no name/phone/ID); cohort statistics (gender/age buckets/top tags) and de-identified dataset export; archive state machine; every action on the audit hash chain | real HTTP + 403/401 unauthorized + restart persistence + outage 503/500 with traceId + logged root cause |
| **M5-C** | EMPI (Enterprise Master Patient Index) | cross-domain identifier registration (ID card / insurance / phone / WeChat / external — raw values hashed, only last 4 kept) → a deterministic matching engine scans patient pairs and produces suspected duplicates (no auto-merge) → manual review: confirm creates a logical master/linked link inside a transaction (**no physical merge, no migration of 40+ foreign keys**), reject marks it; 409 if either patient is already linked to prevent conflicts; master chosen by creation time/ID; audit hash chain | real HTTP 18 items + 403/401 + 404/400/409 + restart persistence + outage 503/500 traceId + logged root cause + watermark screenshots |
| **M5-D** | Lakehouse layering & incremental processing | adds dwd/dws/ads/meta schemas: DWD incrementally extracts by source `updated_at` watermark (idempotent UPSERT, re-runnable), DWS recomputes dept daily summaries for affected dates (delete-then-insert), ADS recomputes hospital daily metrics; **watermark is computed and stored entirely in the database (microsecond precision), each job completes extract/write/registration inside one transaction**, whose snapshot keeps watermark and extraction consistent; job run history, data lineage, metric queries; processing requires admin, queries require read | real HTTP 14 items + 403/401 + 400 + restart persistence + outage 503/500 traceId + logged root cause + watermark screenshots; DWD=ADS=clinical cross-check reconciled |
| **M5-E** | Data quality monitoring & privacy classification governance | adds quality rule/run/result and field-classification ledgers in meta: the engine runs **five-dimension quality checks** over real tables (completeness not_null, uniqueness unique, validity valid_values/valid_regex, consistency fk_exists, timeliness conditional_not_null), with qi() escaping for schema/table/column, bound parameters for allowed values/regex, and fixed built-in condition text; per-rule total/failed rows and failed samples are recorded with a quality score and trend; privacy classification auto-scans information_schema columns (DataClassifier, never overwriting manual fixes), and manual fixes are audit-trailed (conflict if either side is already linked, master or linked). Runs/scans/fixes require admin, queries require read | real HTTP 12 items + 403/401 + 404/400 + restart persistence + outage 503/500 traceId + logged root cause + watermark screenshots; review fixed missing result ruleName/dimension/severity/target and an EMPI conflict check that only queried linked and missed master |
| **M6-A** | Cloud-native containerization & K8s deployment | multi-stage images (non-root Bun backend + non-root Nginx frontend), a production-grade `docker-compose` full stack (postgres/redis/kafka/edge gateway/observability with health checks, dependency ordering, resource quotas, hardening), and a **Kubernetes all-in-one manifest set** (namespace/configmap/secret, postgres/redis StatefulSets+PVC, bff/web Deployments+HPA+PDB, TLS Ingress, zero-trust NetworkPolicy); the BFF auto-migrates on startup and boots from an empty database | all K8s/compose YAML passes syntax validation; referenced deployment files verified; review fixed a startup bug where the backend runtime image lacked `deploy/postgres/init`, causing an ENOENT during auto-migration |
| **M6-B** | Parameterized Helm Chart | builds on the K8s manifests with a production-grade Helm Chart: images, replicas, resources, storage classes, domains, and internal/external PostgreSQL·Redis are fully parameterized; Secret/Ingress/NetworkPolicy/HPA/PDB can be toggled, and external secret systems are supported | ran `lint` with helm v3.18 (passed); default `template` renders 23 docs matching the K8s manifests; production (external DB + external secrets), hybrid, and image-override combinations all render correctly |
| **M6-C** | Service mesh & canary release | provides Istio resources as optional Chart templates: `PeerAuthentication` (namespace mTLS), `DestinationRule` (connection pool, outlier detection, canary subsets), `VirtualService` (unified entry, timeout/retries, weighted canary routing) | helm `lint` passed; `template` verified: nothing rendered by default, and mTLS/traffic policies, Gateway entry, and 80/20 weighted routing with stable/canary subsets all render correctly when enabled |
| **M7-A** | Unified idempotency-key framework | adds `clinical.idempotency_keys` table (migration 81), recording the first request's method/path/body fingerprint (SHA-256) and response per "user + key"; `withIdempotency` middleware executes and caches on first call, safely replays repeats (`Idempotent-Replay` header), returns 409 for in-flight concurrency or fingerprint mismatch, 400 for invalid key length, and scopes anonymous requests by client IP; rawBody is pre-read so the fingerprint matches the handler | real HTTP evidence (first/replay/mismatch/no-duplicate) + 9 green integration tests + restart persistence + outage 500 traceId; code review fixed idempotency errors returning HTML instead of a structured envelope (error handler moved outside idempotency) |
| **M7-B** | Critical-value realtime event loop | `alertBus` standardized event layer: `buildCriticalAlertPayload` builds a payload matching the frontend Alert contract with a stable, unique event id (no duplicates on reconnect replay); scan pushes `critical:alert` over WebSocket in real time, and acknowledge/resolve status changes broadcast `critical:status`; `scanAndRaise` returns full alerts and batch-loads masked names; the frontend `useAlert` deduplicates by id (no duplicate entries, no latest overwrite) and syncs business status, while `RealtimeAlertBridge` closes the corresponding strong notification on status | real WS evidence: 85 scanned pushed 85 in real time, all ids unique, counts match; repeated scan does not re-push; ack/resolve HTTP 200 with WS status broadcast; restart persistence (status distribution kept) + outage 503/500 traceId; adds 8 alertBus unit + 4 critical-realtime integration tests, backend 1908 / frontend 844 all green |
| **M7-C** | Transactional Outbox | Adds the `clinical.event_outbox` table (migration 82); business transactions and domain events are written in the same transaction (atomic commit), solving event loss on a crash between "business persisted" and "push delivered"; the `OutboxRelay` polls with an at-least-once state machine `pending → processing → published` to publish over WebSocket: `claimBatch` (FOR UPDATE SKIP LOCKED, load-balanced across instances), `markPublished`, `resetToPending` (failure increments attempts and retries), `reclaimStale` (reclaims processing rows whose claim crashed once they time out); the critical-value aggregator no longer pushes in-memory and instead `appendEvent` in the same transaction; consumers are idempotent by the stable event_id (frontend already dedups by id, so duplicates are safe) | real WS evidence: 87 scanned all published via the outbox with unique ids and the outbox fully published; restart persistence (87 event_ids kept, BFF auto-reconnects); on outage the BFF stays alive, ready=503, the relay polls without crashing and resumes after recovery; adds 6 event-outbox integration + 4 outboxRelay unit tests, backend 1919 / frontend 844 all green, both tsc clean |
| **M7-D** | Dead-Letter Queue & Outbox Metrics | Events whose publish fails `maxAttempts` (default 5) times no longer retry forever and move to the dead-letter state `dead` (migration 83: extends the status CHECK, adds `last_error`/`dead_at` columns and a dead-letter partial index, and adds the `outbox:manage` permission granted only to admin); `outboxRepo` adds `markDead`, `listDeadLetters` (paged), `requeueDeadLetter` (dead→pending, clears error/attempts), `oldestPendingAgeSeconds`; the `OutboxRelay` splits dead-letter vs retry by `attempts+1`, adds an `onDeadLetter` callback and `updateMetrics()`; admin BFF routes `GET /api/v1/outbox/dead-letters` and `POST /api/v1/outbox/requeue/:id` (requeue writes an `outbox.requeue` audit); `/metrics` exposes two gauges: `gangos_outbox_events` (by status) and `gangos_outbox_oldest_pending_age_seconds` | real-DB evidence: markDead records error/dead time, listDeadLetters paging, requeueDeadLetter reset, doctor 403 / unauthenticated 401 / 404 / 400; event-outbox integration 6→10, outboxRelay unit 4→5 (3 consecutive failures enter the dead letter exactly on the 3rd and are no longer claimed), new outbox-admin routes 7; backend 1931 / frontend 844 all green, both tsc clean |
| **M7-E** | Gap Recovery / Replay | WebSocket does not guarantee offline messages, so events that occur while the client is disconnected are lost after reconnect. The server-side `outboxRepo` adds `listEventsAfter(afterId, limit)` (returns only `published` events with `id > afterId`, ascending by id, limit capped at 200) and the recovery route `GET /api/v1/outbox/events?after_id=&limit=` (any logged-in user, same scope as the WS broadcast; invalid after_id returns 400); relay-published WS frames carry the numeric primary key `seq` (`OutboxPublisher` gains meta). The frontend `wsClient` tracks the last received `lastSeq`, and after a reconnect (not the first connection) pages through the recovery endpoint, converting missed events into WS messages and skipping events overlapping with realtime frames (`id <= lastSeq`) so they are not delivered twice; recovery failures (outage/unauthorized) are silently abandoned and retried on the next reconnect without affecting the realtime channel | adds 4 frontend websocket recovery tests (no recovery on first connect, recovery by lastSeq after reconnect, skip id<=lastSeq, silent failure); backend event-outbox adds a listEventsAfter case and outbox-admin adds 4 recovery-route cases (regular doctor can recover, invalid param 400, unauthenticated 401); backend 1936 / frontend 848 all green, both tsc clean |
| **M7-F** | Server-side Sessions & JWT Revocation | JWTs are stateless and remain valid until expiry by default—on a shared hospital workstation, merely clearing the token on the frontend cannot stop an already-issued token from being used. Migration 84 creates `clinical.user_sessions` (unique jti/refresh_jti, access and refresh expiry, revocation time and reason, IP/UA, partial index on active sessions); logins (including the MFA second factor) write a session when tokens are issued, and `signJwt` auto-injects a `jti`; a new `sessionGuard` middleware verifies session state after authentication (active sessions pass, revoked ones clear `ctx.user`; in-process cache 30s active / 5min revoked, fail-open on DB hiccups with the health check exposing the real state); logout revokes by jti and marks it immediately; refresh rotates (validates the old refresh session, revokes the old session, registers a new one, and invalidates the old access token immediately); admin endpoints `GET /api/v1/admin/sessions` (filterable by user) and `POST /api/v1/admin/sessions/revoke` (revoke by jti or force a user offline, audit `session.revoke` / `session.force_user_offline`; the `session:manage` permission is granted to admin only) | real HTTP evidence: login persists a session, after logout both old access and refresh return 401, after refresh rotation the old access returns 401 / new access 200, after admin force-offline the access returns 401, doctor forbidden 403 / unauthenticated 401 / missing param 400 / revoking a nonexistent jti 404; psql verifies sessions, revocation reasons and audit entries; adds 14 backend integration tests (10 real-mode, 4 default-mode) and 6 frontend page tests; backend 1940 / frontend 865 all green, both tsc clean |
| **M8-A** | User Administration | The system-admin "User Management" page previously used local mock data. Migration 85 adds `gender/email/phone/position` to `iam.users`, adds `leave` to `status` (alongside active/disabled/locked; departure uses soft-delete via `deleted_at`), and introduces the `user:manage` permission granted to admin only; `adminUserRepo` provides a paged list (keyword matches name/username/employee_no/phone, plus department and status filters), PBKDF2-SHA512 hashed account creation, transactional replacement of roles and data scopes (`user_roles`), status changes, password reset, and soft-delete; `adminUserAggregator` runs all writes in transactions that commit together with the hash-chain audit, and revokes the target user's sessions (force logout) on disable/delete/reset; guards: cannot change/delete self, last-active-admin protection, unique username/employee_no conflict → 409; the BFF `/api/v1/admin/users` exposes 7 endpoints, all gated by `user:manage` with Zod validation; the frontend page is de-mocked (health gate, watermark, outage Alert, table / create-edit modal / detail drawer) | adds 16 backend integration tests, 8 frontend page tests, 15 store tests; backend 1956 (baseline 1940+16) / frontend 888 all green, both tsc clean; coverage Stmts/Lines 92.03, Branch 78.74, Funcs 84.62 passes the gate; test fixture accounts are hard-deleted in afterAll (0 residual) |
| **M8-B** | Role & Permission Administration | The system-admin "Role Management" and "Permission Management" pages previously used local mock data. Migration 86 introduces the `role:manage` permission granted to admin only (all role-management endpoints are gated by it; the read-only permission catalog uses the existing `system:perm:manage`); core design: permission points are defined solely by migrations/code and are read-only in the admin UI — **runtime creation of permissions is not accepted** (no permission create/update/delete endpoints); `roleAdminRepo` provides a role list (system roles first, with batched permission codes and user counts), role detail / associated users, grouped permission catalog, custom-role creation (23505→409), editing (COALESCE name/description), full permission replacement (validate that codes exist else 400, then DELETE + per-row INSERT), and deletion (system role → 400, users still associated → 409, then clean role_permissions and roles); `roleAdminAggregator` runs every write in a `begin` transaction that commits together with the hash-chain audit (role.create/update/assign_permissions/delete; assign and delete are riskLevel=high); the BFF exposes 7 endpoints under `/api/v1/admin/roles` and `/api/v1/admin/permissions` with Zod validation; the frontend de-mocks role management (table / create-edit / permission tree / detail drawer / delete) and permission management (permission catalog tree + role-permission matrix), with health gate, watermark, and outage Alert | adds 17 backend integration tests, 18 frontend store tests, 9 role-page tests, 3 permission-page tests; backend 1973 (baseline 1956+17) / frontend 918 all green, both tsc clean; coverage Stmts/Lines 92.19, Branch 78.99, Funcs 84.66 (no regression vs M8-A) passes the gate |
| **M8-C** | Audit & Login Logs | The system-admin "Audit Logs" and "Login Logs" pages previously used local mock data. Migration 87 adds the `iam.login_attempts` ledger (id/username/user_id/success/fail_reason/ip/user_agent/created_at, with partial indexes on user-time and failures); `auditLogRepo` provides multi-criteria search (actor, action, resource type, result, risk level, time range; page size capped at 100), overview, action distribution, and daily trend (`generate_series` LEFT JOIN, default 7 days, max 90); `loginAttemptRepo` records successful/failed logins and JOINs active sessions to mark online status; successful logins are uniformly recorded via `registerSession` (MFA included), failures use a single "invalid username or password" message to prevent enumeration; the BFF exposes 5 audit-log endpoints (`system:audit:view`), 3 login-log GET endpoints (`system:loginlog:view`) and force-logout (`session:manage`, revoking sessions and writing a high-risk audit in one transaction); **fixes a real missing-login-IP defect for direct connections**: the runtime injects the socket IP via `server.requestIP`, using the first `x-forwarded-for` entry behind a proxy; the two frontend pages are de-mocked with health gate, watermark, and outage Alert | adds 20 backend integration tests, 18 frontend store tests, 21 page tests; backend 1993 (baseline 1973+20) / frontend 957 all green, both tsc clean; coverage Stmts/Lines 92.44, Branch 79.29, Funcs 84.73 (no regression vs M8-B) passes the gate; 20 HTTP evidence cases, restart persistence, outage 500/503 (logs record the real cause ECONNREFUSED 5433), and 403 unauthorized cases all pass; evidence fixtures and temporary sessions are cleaned with zero residue |
| **M9-A** | Executive Dashboard | The admin "Workbench/Executive Dashboard" previously used hardcoded fake data on both frontend and backend (today's outpatient 2136, inpatients 86, alerts 7, Agent calls 1240, critical-value handling 96.4, etc.). A new `dashboardStatsRepo` uses a single SQL statement with multiple subqueries to count today's outpatient/emergency visits, current inpatients, today's admissions/discharges, pending orders/prescriptions, unresolved critical alerts, and bed capacity with occupancy rate (zero-division guard, one decimal place); `generate_series` builds the N-day outpatient/emergency and admission/discharge trend (default 14, max 90, min 1); it also provides inpatient department distribution (COALESCE unassigned) and latest critical alerts; all read-only, with limit/days as bound parameters (no SQL injection), throwing on failure and never returning fabricated numbers. The `dashboardAggregator` is rewritten: the DEMO-mode branch is removed so it queries the real database like standard business aggregators, running the four queries in parallel with `Promise.all`; the BFF `/api/v1/dashboard/stats` enforces auth and parses days (invalid falls back to 14, over-limit truncates to 90). The frontend workbench has a health gate, outage Alert + Watermark, four real stat cards and outpatient/emergency, admission/discharge, and department charts, plus a to-do area, with load failures shown by an error Alert. **Also fixes the root cause of the EMPI flaky test** where full-scan candidates accumulated across runs (`listCandidates` gains a patientId filter and afterAll clears candidates) | adds 8 backend integration tests and 4 frontend page tests; backend 2001 (baseline 1993+8) / frontend 961 (baseline 957+4) all green, both tsc clean; coverage Stmts/Lines 92.5, Branch 79.38, Funcs 84.84 (no regression vs M8-C) passes the gate; HTTP evidence (200/days bounds/401), psql cross-checks, restart persistence (stats retained, BFF auto-reconnect), and outage 503 (code 50300) + stats 500 with traceId (logs record the real cause ECONNREFUSED 5433 by the same traceId) all pass; M9-A is read-only with no business fixtures, and temporary evidence scripts are cleaned |
| **M9-B** | Quality Rectification Workflow | After a QC doctor finds a medical-record defect, the responsible doctor rectifies it through the "pending → in_progress → rectified → reviewed" state machine; the QC review can **reject and require resubmission**, with full audit trail and fail-closed authorization. Migration 88 adds `quality.rectification_tasks` (four-state machine, defect_type integrity/standardization/logic/timeliness, defect_level minor/major/critical, unique constraint record_id+defect_rule_id, idempotent ON CONFLICT DO NOTHING + re-query) plus permission codes `quality:rectify`/`quality:review` (admin×2, doctor×1); `rectificationRepo` (idempotent create with re-query, FOR UPDATE row lock via getTaskForUpdate, list view joining patient/visit/assignee/QC doctor, stats); `rectificationAggregator` (issue/submit/review with hash-chain audit **in the same transaction**, illegal state transitions → 409, doctor data isolation by assigneeId, review rejection without reason → 400); BFF `/api/v1/rectifications` 6 endpoints with unified error envelope; the frontend rectification center is de-mocked (stats cards, overdue alert, pending/in_progress/rectified/reviewed tabs, submit drawer, review modal) with health gate + Watermark + outage Alert | adds 10 backend integration tests and 3 frontend store tests; backend 2022 (baseline 2001 + new cases all green; the only failure was an EMPI scan 30s environment timeout, re-run 15/15 pass) / frontend 962 all green, both tsc clean; coverage All files Stmts/Lines 92.47, Branch 79.36, Funcs 84.89 (no regression vs M9-A) passes the gate; HTTP evidence 24/24 (401 / permission 403 / issue 200 / idempotent created:false / state machine 409 / reject-and-resubmit / review approve / audit chain with all four actions), psql cross-checks, restart persistence (tasks retained, BFF auto-reconnect), outage health 503 + rectifications 500 (logs record the real cause ECONNREFUSED 5433) all pass; M9B_EVIDENCE fixtures cleaned, rectification tasks back to zero |
| **M9-C** | Surgery & Anesthesia Workstation | The backend `src/bff/routes/surgery.ts` (12 endpoints) + `surgeryAggregator` state machine (requested→scheduled→prechecked→induction→maintenance→recovery→pacu→discharged; illegal transitions → 409, powered fail + ErrorCode + traceId) and migration 61 (surgery_requests/anesthesia_records/intraop_events/pacu_assessments; intraop event_type CHECK enum, PRECHECK_KEYS six items, dual-signature discharge) were already ready but had zero frontend usage. This milestone completes the frontend loop: `surgeryStore` rewritten (health gate + SURGERY_STATUS_META 9-state full-lifecycle actions), `services/api/surgery.ts` extended with submit/stage/event/cancel (relative paths), `pages/surgery` workstation (health-gate Tag / outage Alert+Watermark / new-request Modal / refresh probe), `SurgeryQueue` (status tab filtering) and `SurgeryDetailPanel` (schedule→precheck→induction→intraop event/stage→PACU score→dual signature→discharge/cancel; missing items 400, duplicate signature 409, terminal-state re-operation 409), lazy route + sidebar entry "手术麻醉" (surgery:view). Also fixes the rectification integration test recordType 'inpatient'→'admission' (valid enum) and adds refresh/new-request page cases with explicit timeouts to avoid high-load flakiness | frontend store 16, page 10 (+2); backend 2011 (baseline 2022 minus 11 skips from missing DB is the normal gate scope; real-DB scope fully green) / frontend serial full run 985 green (96 files, baseline 983 +2), both tsc clean; coverage All files Stmts/Lines 92.6, Branch 79.34, Funcs 84.9 (Functions not below M9-B's 84.89; pages/surgery function coverage 12.5%→75%) gate passes; HTTP evidence 37/37 (401/403, idempotent created:false, missing-items/Aldrete 400, full state machine, illegal transition 409, duplicate signature 409, terminal-state 409, psql status/dual signatures/anesthesia notes/2 events/2 PACU scores/audit-chain actions), outage health 503 + business 500 with traceId no fake success (auto-reconnect db up after restore), restart persistence (3 surgeries/4 events/6 PACU rows retained) all pass; M9C_EVIDENCE fixtures cleaned to zero (0/0/0), 39 audit entries retained |
| **M10-A** | Blood Transfusion Workstation | A three-A-hospital-mandatory blood safety closed loop. Migration 89 adds `clinical.blood_transfusion_requests / blood_stock / blood_transfusions / blood_transfusion_reactions` (unique request_no, status-machine CHECK, component/ABO/urgency/reaction-severity enums, stock batches) with 8 blood-bank stock seeds and permission codes `blood:apply/crossmatch/dispense/transfuse/review` (admin×5, doctor=apply, technician=crossmatch+dispense, nurse=transfuse); `transfusionRepo` (idempotent ON CONFLICT re-query, FOR UPDATE row locks); `transfusionAggregator` (CDS evaluateIndication advisory stored, non-blocking; state machine requested→crossmatched→dispensed→transfusing→completed/cancelled with illegal → 409; dispense deducts stock by expiry ASC inside the transaction; dual-checker same-person → 400; UUID input validation → 400; reaction severity/action); BFF `/api/v1/transfusions` 10 endpoints with unified error envelope + traceId; frontend transfusion workstation (queue status tabs / apply modal with CDS suggestion / detail full actions / reaction modal / health gate + outage Alert + watermark) de-mocked | backend unit 8 + integration 12, frontend page 12 + store 5; backend full serial run 2031 (baseline 2022 +9; parallel multi-worker flakiness in critical-value outbox/concurrent audit is known, serial is the gate baseline) pass/0 fail, both tsc clean; frontend full run 1002 pass (98 files, baseline 985 +17), coverage All files Stmts/Lines 92.67, Branch 79.25, Funcs 85.02 (Functions not below M9-C's 84.9) gate passes; HTTP evidence 15 items (3-role login, apply 200 / idempotent no duplicate DB rows, CDS suggestion text stored, nurse apply 403, unauthenticated 401, crossmatch/dispense/dual-signature 200, same-person dual check 400, stop-after-complete 409, reaction 200, concurrent dispense 6 calls → exactly 1 success + 5×409, psql 1 transfusion / 3 requests / 29 audit entries / no negative stock, stock delta matches units); outage health 503 + list/apply 500 with traceId no fake success (auto-reconnect db up after restore, rows retained), restart persistence all pass; M10A_EVIDENCE fixtures cleaned to zero (patients/requests/transfusions/reactions 0/0/0/0), stock restored to seed 20 |
| **M10-B** | Blood Utilization Quality | Per the *Clinical Blood Utilization Management Measures* and three-A grade review, closes the post-transfusion quality loop for M10-A. Migration 90 adds `clinical.transfusion_efficacy_assessments` (UNIQUE transfusion_id) and `clinical.blood_utilization_reviews` (UNIQUE request_id) with permission codes `blood:assess/audit` (admin×2, doctor=assess, technician×2); rule engine `bloodUtilizationQuality` (pure, deterministic: expected efficacy RBC 1U→Hb+10 g/L, platelets 1 therapeutic dose→PLT+20, cryo 1U→Fib+0.3 g/L, plasma targets INR≤1.5; grading effective/partial/ineffective/indeterminate; strict indications RBC Hb<70, plasma INR>1.7, platelets PLT<50, cryo Fib<1.0, whole blood blood loss>1500 or shock; dosage reasonableness with emergency exemption; 7 pre-transfusion test completeness; conclusion rational/largely/irrational with failed indication veto; metrics component-transfusion rate / indication-compliance rate / pre-test rate / adverse-reaction rate / efficacy-assessment rate / inpatient-transfusion rate with numerator & denominator); `bloodQualityRepo` (idempotent efficacy/review upsert, auto-matching lab metrics within time window); `bloodQualityAggregator` (manual value priority, manual indication confirmation must record basis, inpatient discharges from admissions); BFF `/api/v1/blood-quality` 6 endpoints (permission + DataScope + unified error envelope); frontend blood-quality workstation (metrics dashboard RangePicker + 6 metric cards / efficacy / utilization three tabs, health gate + watermark + outage Alert) de-mocked | rule-engine unit 37, integration 16, frontend page 5; backend full 2095 pass/0 fail, both tsc clean; frontend full 1007 pass (99 files), coverage All files Stmts/Lines 92.71, Branch 79.18, Funcs 85.07 gate passes; HTTP evidence (auto efficacy Hb65→86=effective, manual Hb65→73=partial, idempotent re-assess, utilization rational/largely with 6 missing tests, metrics math correct, nurse assess 403, doctor review 403, unauthenticated 401, detail 404); psql 2 eff/2 util, dedicated batch 100→96 delta 4U matches, audit hash chain blood.efficacy/utilization recorded; outage health 503 + 6 endpoints 500 with top-level code=50000 unique traceId no fake success, BFF logs root cause ECONNREFUSED; restart persistence rows retained with auto-reconnect; M10B_HTTP fixtures cleaned to zero (patients/efficacy/reviews/batch 0), global blood-bank stock restored to seed (O-type RBC 20); also fixes the M10-A stock-restore SQL defect where UPDATE...FROM updates only once for multiple requests on the same row (now GROUP BY SUM aggregation) |
| **M11-A** | Laboratory Information System (LIS) Workflow | Full request→specimen→result→report chain; previously only item-level `clinical.lab_results` existed. Migration 91 adds seven tables `clinical.lab_items / lab_panels / lab_panel_items / lab_requests / lab_request_items / lab_specimens / lab_reports` (unique numbers, state-machine CHECK, specimen-type/urgency/flag enums), extends `lab_results` with `request_id/specimen_id/report_id/entered_by` and write-back triggers; seeds technicians `tech_lab/tech_lab2`, CBC/BIO/COAG three panels, 13 items, 13 panel-item mappings; permission codes `lis:catalog/request/collect/receive/enter/review/publish` (admin×7, doctor=request, nurse=collect, technician=catalog/receive/enter/review/publish). Rule engine `lisWorkflow` (pure, deterministic: specimen registered→collected→received→tested/rejected and report draft→reviewing→approved→published/returned transition tables; evaluateItem judges HH/LL/H/L/N in critical→abnormal→normal order with strict inequality boundaries, text/blank degraded to N; assertSeparation enterer≠reviewer); `lisRepo` (idempotent catalog/request/specimen/report upsert with ON CONFLICT re-read, FOR UPDATE row locks, array-parameterized IN); `lisAggregator` (request state machine requested→accepted→specimen_collected→in_progress→completed/cancelled; barcode generation/collection/receipt/rejection/analysis; result entry requires received specimen and reuses the existing `criticalValueRepo.scanAndRaise` in the same transaction; report submit/review/return/publish with e-signatures, self-review rejected 409, **empty reports or unreceived specimens cannot be submitted**, request completes once all its reports are published); BFF `/api/v1/lab` 22 endpoints with unified error envelope + traceId; frontend LIS workstation (health gate + watermark + outage Alert + four tabs, check-box catalog selection, write buttons hidden by lis:perm) de-mocked | unit 23, integration 9, page 8; backend full 2127 (baseline 2095+32) / 2116 pass / 11 skip / 0 fail (TEST_REAL=1), both tsc clean; frontend full 1015 pass (100 files, baseline 1007+8), coverage All files Stmts/Lines 92.66, Branch 79.18, Funcs 85.1 (thresholds unchanged, no regression) gate passes; HTTP evidence 28/28 (login, request/specimen creation, collect/receive/reject, result entry, report dual-sign publish/return, self-review 409 separation, over-privilege 403/401/404); psql verifies 3 requests/3 specimens/2 dual-signed published reports/4 results/1 critical alert, audit hash chain 98068 rows with zero broken links; outage ready 503 (code 50300) + endpoints 500 with top-level code=50000 unique traceId no fake success, BFF logs root cause ECONNREFUSED 5433; restart persistence rows retained with auto-reconnect; M11A_HTTP fixtures cleaned in one transaction to zero (patients/requests/specimens/reports/alerts 0); a real medical-safety gap found during evidence (empty reports/unreceived specimens could be submitted and published) is fixed with a guard plus integration test |
| **M11-B** | Radiology Information System / Picture Archiving and Communication System (RIS/PACS) Workflow | Full request→schedule→perform→report chain; previously only report-level `clinical.imaging_reports` and a file-backed DAMO-RADAR AI analysis existed. Migration 92 adds seven tables `clinical.imaging_exams / imaging_devices / imaging_device_slots / imaging_requests / imaging_request_items / imaging_appointments / imaging_studies` (unique numbers, three state-machine CHECKs, modality/urgency enums), extends `imaging_reports` with 14 columns: `report_no/status`, `request_id/appointment_id/study_id/exam_id`, `written_by/submitted_at`, `reviewed_by/reviewed_at`, `published_by/published_at`, `returned_by/returned_at/return_reason` (unique index on report_no); seeds radiology accounts `rad_tech/rad_doc/rad_doc2` (technician/physician/chief), 4 devices, 6 exams, 60 future slots; permission codes `ris:catalog/request/schedule/perform/report/review/publish` (admin×7, doctor=request, technician=schedule/perform/report/review/publish). Rule engine `risWorkflow` (pure, deterministic: request requested→scheduled→arrived→in_progress→completed/cancelled, appointment booked→arrived→done/cancelled/no_show, report draft→reviewing→approved→published/returned — three transition tables; genStudyUid deterministically builds a 2.25. DICOM UID; assertSeparation writer≠reviewer; hasReportContent empty-report guard); `risRepo` (idempotent catalog/request/schedule/study/report upsert, FOR UPDATE row locks, parameterized IN, date/time columns cast to ::text); `risAggregator` (booking locks the slot row and validates capacity with full 409, cancel releases via GREATEST, checkin/perform creates the study, image references; a report can only be created after the exam is performed, empty findings/impression cannot be submitted, AI via RadarAdapter only writes ai_findings without touching body/status, self-review 409, request completes once all reports are published); BFF `/api/v1/ris` 26 endpoints with unified error envelope + traceId; frontend RIS workstation (health gate + watermark + outage Alert + five tabs, AI assist read-only, write buttons hidden by ris:perm) de-mocked | unit 23, integration 9, page 9; backend full 2159 (baseline 2127+32) / 2098 pass (TEST_REAL=1; the 61 failures are pre-existing concurrency flakes reproduced identically on a clean HEAD, zero new failures), both tsc clean; frontend full 1024 pass (101 files, baseline 1015+9), coverage All files Stmts/Lines 92.61, Branch 79.09, Funcs 85.25 (thresholds unchanged, no regression) gate passes; HTTP evidence 27/27 (login, request/appointment/checkin/perform/images, draft/empty-report guard/writing/AI assist/submit, self-review 409/other-reviewer/return/publish, full-slot/cancel-release, 401/403/404); psql verifies the audit hash chain 101828 rows with zero broken links; outage health 200 + ready 503 (code 50300) + endpoints 500 with top-level code=50000 unique traceId no fake success, BFF logs root cause ECONNREFUSED 5433; restart persistence rows retained with auto-reconnect; M11B_HTTP fixtures cleaned in one transaction to zero (patients/requests/appointments/studies/reports/future-slots 0, 60 seed slots retained); a jsonb double-encoding defect found during evidence (setReportAiFindings wrongly passed a JSON.stringify string so ai_findings was stored as a string) is fixed using a plain toJson object |
| **M12-A** | AI Interpretation of Lab & Imaging Results | Layers a pluggable LLM deep-interpretation on top of the M3-E rule-only interpretation, adds imaging-report interpretation and a doctor/patient dual view. Migration 93 extends `clinical.lab_interpretations` with nine columns `audience/overall_impression/item_explanations/trends/recommendations/plain_language_summary/deep_source/model/llm_status` and replaces the former `visit_id` unique constraint with `(visit_id, audience)` (one row per doctor/patient view); adds the `clinical.imaging_interpretations` table (unique per report×view, 23 columns including explained_findings/overall_direction); adds permission codes `imaging:interpret:view/sign` (admin×4, doctor=lab+imaging view/sign, technician=imaging two codes). Rule engine `interpretEngine` (pure, deterministic: abnormal/critical recognition, `computeTrends` per-item historical comparison delta/pct/rising/falling/stable/no_history, dual-view prompt building, `safeParseLlmJson` strips fences and takes the first/last braces while validating shape per view, patient-view safety rules); `llmClient` (OpenAI-compatible `${baseURL}/chat/completions`, AbortController timeout, `LlmNotConfiguredError/LlmTransportError`, reads LLM_API_KEY/LLM_BASE_URL/LLM_MODEL); extends `labInterpretRepo` (adds `listLabHistoryByPatient`, result_time cast to ::text) and adds `imagingInterpretRepo`; extends `labInterpretAggregator` and adds `imagingInterpretAggregator` (**LLM three-state degradation**: llm_ok / llm_not_configured with rules plus an explicit label / llm_error with rule fallback; mode=llm forces 503 when unconfigured or failed; hardcoded text is never passed off as LLM output; only published imaging reports can be interpreted; the LLM only explains without changing raw values or abnormal flags; interpretations take effect only after a physician signs, with object ownership constrained by DataScope); BFF `/api/v1/lab-interpret` and `/api/v1/imaging-interpret` each expose five symmetric endpoints with unified error envelope + traceId; frontend AI interpretation workstation (health gate + watermark + outage Alert + view/mode switch, three tabs lab/imaging/review-queue, patient view hides the queue and signing and shows only plain-language explanation, sign buttons hidden by interpret:sign) de-mocked | unit 16, integration 10, page 9, store 7; backend full 2185 (baseline 2159+26) / 2124 pass (TEST_REAL=1; the 61 failures are pre-existing concurrency flakes reproduced identically on a clean HEAD, zero interpret failures), both tsc clean; frontend full 1040 pass (103 files, baseline 1024+16), coverage All files Stmts/Lines 92.55, Branch 78.82, Funcs 85.07 (thresholds 80/70/80 unchanged, no regression) gate passes; HTTP evidence LLM-OK 34/34 (lab/imaging × doctor/patient four combos, llm_ok + model label, overall impression/item explanations/finding explanations/tiered recommendations, WBC 9→12 rising delta=3 pct=33.33, critical count, sign/return, view isolation, 403/401/404); unconfigured-LLM degradation 8/8 (auto degrades to llm_not_configured labeled "LLM not configured", mode=llm returns 503 code=50300); unreachable-LLM degradation 8/8 (auto degrades to llm_error/llm_fallback, mode=llm 503, message contains the real reason Unable to connect); outage 11/11 (health always 200, ready 503 code=50300, authenticated endpoints 500 with top-level code=50000 unique traceId no fake success, BFF logs root cause ECONNREFUSED 5433); psql independently recomputes the audit hash chain 104100 rows with zero broken links; restart persistence rows retained with BFF auto-reconnect; M12A_HTTP fixtures cleaned in one transaction to zero (patients/interpretations/orphan rows 0); a cross-date lexicographic-comparison defect found during evidence (postgres.js returns timestamptz as a Date, and String(Date) with a weekday prefix made computeTrends wrongly skip historical rows and report no_history) is fixed by casting result_time to ::text for ISO strings in both places |
| **M13-A** | VTE Intelligent Prevention (Venous Thromboembolism) | Required by the national Pulmonary Embolism and Deep-Vein Thrombosis Prevention Capability Building Program (VTE Prevention Center); the database previously had no VTE/thrombosis/anticoagulation tables. Migration 94 adds three tables: `clinical.vte_assessments` (versioned VTE + bleeding assessment, multiple versions per visit, assessment_no unique), `clinical.vte_preventions` (mechanical/pharmacological prevention, one row per measure, state-machine audit trail), `clinical.vte_outcomes` (DVT/PE/bleeding/anticoagulation-related adverse events), plus indexes; permission codes `vte:read/assess/prevent/execute/audit` (admin×5, doctor=read/assess/prevent, nurse=read/execute, technician=read). Rule engine `vteRisk` (pure, deterministic: **Caprini** for surgery, 24 factors including age strata, major surgery >45 min, bed rest, prior VTE, cancer, pregnancy/contraceptives/HRT, four tiers low 0-1/medium 2/high 3-4/very-high ≥5; **Padua** for medical patients, 11 factors including active cancer, prior VTE, bed rest ≥3 days, acute infection, MI/stroke, age ≥70, heart/respiratory failure, obesity, hormones, two tiers <4 low/≥4 high; **bleeding risk** with 9 factors, any hit = high; deterministic recommendPrevention gives high-risk pharmacologic + mechanical IPC, medium only mechanical, low early mobilization, and defers drugs with high bleeding risk in favor of mechanical; detectPreventionMismatch warns on high-risk without prevention; computeVteMetrics yields assessment rate, high-risk prevention rate, and hospital-acquired VTE rate with numerators/denominators); optional LLM factor extraction `vteFactorExtract` (reuses the M12-A llmClient, off by default, pending confirmation, injectable fetch, throws LlmNotConfiguredError when no key is configured rather than faking results); `vteRepo` (three-table CRUD, CAS state machine, jsonb plain objects); `vteAggregator` (**the AI never autonomously prescribes anticoagulants**: assessment only creates suggested drafts; pharmacologic prevention requires vte:prevent physician confirmation, which creates a drug order and electronically signs it review→active; high-bleeding drugs are blocked with 409 by default and require override + reason; mechanical prevention is executed by a vte:execute nurse who creates a nursing task and signs it; PE follows the existing critical-value loop); BFF `/api/v1/vte` 15 endpoints (collection routes before :id) with unified error envelope + traceId; frontend VTE prevention workstation (health gate + watermark + outage Alert + four tabs: risk assessment with Checkboxes live-tallying score/level/bleeding/recommendations, high-risk board with mismatch alerts, visit detail with assessment history + mechanical execution + pharmacologic confirmation + outcome recording, and quality metrics with numerators/denominators vs targets) de-mocked | unit 28, integration 11, page 6, frontend pure-function 15; backend full 2224 (baseline 2185+39) / 2163 pass (TEST_REAL=1; the 61 failures are pre-existing concurrency flakes reproduced identically on clean HEAD 41adebe, name-by-name comparison shows zero new VTE failures), both tsc clean; frontend full 1061 pass (105 files, baseline 1040+21), coverage All files Stmts/Lines 92.5, Branch 78.87, Funcs 84.55 (thresholds 80/70/80 unchanged, no regression) gate passes; HTTP evidence 24/24 (Caprini score=6 very-high with alertRaised + mechanical/pharmacologic suggested + mismatch, Padua high, nurse executes mechanical to executed + nursing task, physician confirms drug to confirmed + order drug/active/signed, high-bleeding drug 409 → confirmed after override + reason, board mismatch cleared after intervention, DVT outcome, quality metrics, nurse-confirm-drug / doctor-execute-mechanical / nurse-assess 403 code=40300, unauthenticated 401 code=40100, missing visit 404 code=40400); psql independently recomputes the audit hash chain 107564 rows with zero broken links (bad_hash/bad_prev both 0); restart persistence (stop/start PG, audit 107564/assessment 8/prevention 15/outcome 1 and content MD5 identical row by row, BFF auto-reconnects); outage evidence (health always 200, ready 503 code=50300 "database unavailable", authenticated endpoints 500 with top-level code=50000 unique traceId no fake success, BFF logs root cause ECONNREFUSED 127.0.0.1:5433); M13A_HTTP fixtures cleaned in one transaction to zero (patients/assessments/preventions/outcomes 0) |
| **M15-A** | Clinical Pathway Management Closed Loop | Aligned with the national Clinical Pathway Management Guidelines, EMR Level-5, and tertiary-hospital review; the database previously had only the knowledge base `knowledge.clinical_pathways` (77 rows of summary text, not structured per-day order forms). Migration 96 adds five tables: `clinical.pathway_definitions` (unique pathway code, ICD, applicable departments jsonb, standard LOS, structured inclusion/exclusion/discharge criteria jsonb, version, status, source_knowledge_id back-referencing the knowledge base), `clinical.pathway_form_items` (per-day/per-stage forms, unique (pathway_id,stage_day,item_code), seven item_type enums, required/optional), `clinical.pathway_enrollments` (enrollment records, enrollment_no unique, (visit_id,pathway_id) unique, state machine in_path→completed/withdrawn, with enroll/complete/withdraw signers and actual LOS/fee and discharge-check results), `clinical.pathway_executions` (form-item execution, (enrollment_id,form_item_id) unique, status pending/executed/skipped/replaced, bound to a real order), and `clinical.pathway_variations` (variation records, variation_no unique, positive/negative + seven category enums), plus indexes/CHECK/updated_at triggers; permission codes `pathway:read/manage/execute/audit` (admin×4, doctor=read/manage/execute, nurse=read/execute, technician/pharmacist=read); seeds structure three representative diseases into pathway forms — community-acquired pneumonia (J18.9), acute COPD exacerbation (J44.0, faithfully from the knowledge base), and type-2 diabetes (E11.9) — with 29 per-day form items total, all source_knowledge_id values matching the knowledge base. Rule engine `pathwayRules` (pure, deterministic: currentStageDay counts the admission day as day 1; icdMatches uses bidirectional prefix matching to support more specific codes; matchPathway finds the first active pathway; evaluateCriteria checks criteria item by item giving met/unmet; hasExclusion matches any exclusion; classifyVariation treats early discharge as positive and the rest negative; negativeVariationSuggestsWithdraw flags complications/diagnosis changes for withdrawal; computePathwayMetrics provides enrollment/completion/variation/withdrawal rates, average LOS, average fee, and variation-category distribution with numerators/denominators and divide-by-zero protection; buildOrderFromFormItem maps a form item to a pending order draft without writing); `pathwayRepo` (five-table CRUD, CAS state machine, idempotent upserts, jsonb plain objects, dynamic-condition fragments, eligible-candidate and metrics-window aggregation); `pathwayAggregator` (**the AI never autonomously orders or diagnoses**: only in-hospital inpatients can enroll; the diagnosis ICD must match, exclusion hits block enrollment, and inclusion criteria must all be met; one-click placement is essentially createInpatientOrder landing as pending_review followed by the acting clinician's own reviewOrder e-signature (active); skip/replace requires a reason; completing requires item-by-item discharge-criteria checks; all key actions land on the hash-chain audit); BFF `/api/v1/pathway` 15 endpoints (collection routes before :id) with unified error envelope + traceId; frontend clinical pathway workstation (health gate + watermark + outage Alert with no fake data + six tabs: definitions, eligible/enrollment, per-day form execution, variation recording, discharge evaluation, and quality metrics; write buttons hidden by pathway:* codes) de-mocked | unit 18, integration 12, page 10, frontend pure-function 23; backend full 2289 (baseline 2259+30) / 2289 pass / 0 fail (TEST_REAL=1), both tsc clean; frontend full 1136 pass (109 files, baseline 1103+33), coverage All files Stmts/Lines 92.29, Branch 78.84, Funcs 83.49 (thresholds 80/70/80 unchanged, no regression) gate passes; HTTP evidence 21/21 (three-role login, definition list, eligible matching, confirmed enrollment in_path, duplicate enrollment 409, partially met inclusion criteria 409, enrollment detail, one-click placement of a real active order with reviewer_id equal to the acting clinician (psql confirms signed_by_doctor_chen=t), duplicate execution 409, form-item replacement, positive/negative variations (complication suggests withdrawal), partially met discharge criteria 409, complete with all criteria met completed, post-completion variation 409, enroll-then-withdraw withdrawn, quality metrics with numerators/denominators, nurse enrollment 403, no token 401 code=40100, unknown enrollment 404 code=40400); psql independently recomputes the audit hash chain 38 pathway.* rows all match / zero broken links (broken_prev/broken_hash both 0), built-in audit.verify_chain() returns no anomaly; restart persistence (stop/start PG, definitions 3/form items 29/enrollments/executions/audit 38 retained row by row, BFF auto-reconnects db=up); outage evidence (health always 200 body ok, ready 503 code=50300 "database unavailable", authenticated endpoints 500 with top-level code=50000 unique traceId no fake success, BFF logs root cause ECONNREFUSED 127.0.0.1:5433); M15A_HTTP fixtures cleaned in one transaction to zero (patients/visits/enrollments/executions/variations 0) |
| **M16-A** | AI Mobile Nursing (PDA Execution Core Closed Loop) | Based on the "Mobile Nursing System Technical Development Document for Large Tertiary Hospitals" (four domains / 505 items / 8 agents), the **tech stack stays aligned with the existing TS+Bun+React+PostgreSQL**: the mobile side is a React mobile H5/PWA (dedicated mobile layout, bottom tabs, card-style large touch-friendly buttons) under the separate route prefix `/m/*`, with no PC sidebar, hostable in a PDA browser / Android WebView / HarmonyOS WebView — **no separate Java Spring Boot / uni-app**. Scope is cut to the "mobile nursing PDA" P0 (the nursing-management back office's 505 items, smart-ward hardware, 8 agents, and RocketMQ/Flowable are out of scope). **Zero new business tables, zero added columns**: migration 97 only registers one permission code `mobile_nursing:execute` and grants it to nurse/doctor/admin (idempotent; the second run yields INSERT 0 0). **Barcodes reuse existing unique numbers**: patient wristband = `visits.visit_no` (IP), specimen = `lab_specimens.specimen_no` (SM), medication = `drug_catalog.drug_code` (D+three digits). Pure-function module `src/medical-tools/nursing/mobileNursing.ts` (nine deterministic functions: `parseBarcode` for wristband/specimen/medication prefixes; `verifyFiveRights` for the five rights — bed/name/medication/dose/time — each emitting {ok,expected,actual}, plus allOk and mismatches; `scoreBraden` (six sub-items: ≤9 high / 10-12 medium / 13-14 low / ≥15 none) for pressure ulcers; `scoreMorse` (≥45 high / 25-44 medium / <25 low) for falls; `scoreBarthel` (≤40 severe / 41-60 moderate / 61-99 mild / 100 independent); `painLevel` (NRS 0-10); `nutritionRisk` (simplified NRS2002, ≥3 high risk); `buildSbarSections` (S/B/A/R structured); `detectSyncConflict` (a medication-execution record already present for the same slot -> conflict requiring manual confirmation)); `mobileNursingRepo` (wristband/specimen/medication resolution, batch pending counts, latest risks, SBAR aggregation reads); `mobileNursingAggregator` (maximally reuses the existing `inpatientCareAggregator` createNursingCareRecord/signNursingCareRecord/createCareTask/executeCareTask/administerInpatientOrder/canAccessVisit; **the AI never autonomously orders or creates nursing actions**: scan-to-administer first runs the five-rights check, and a failure throws MobileVerifyError → 409 with structured mismatches; success then calls administerInpatientOrder (high-risk medication double-check / idempotency / hash-chain audit); vitals/assessments/records/handoff all carry the nurse's own signature); BFF `/api/v1/m/*` 10 endpoints (bed-board, scan, orders/:id/verify, orders/:id/administer, vitals, tasks/:id/execute, assessments, records, sbar, sbar/sign; collection routes before :id, unified error envelope + traceId). Frontend: `MobileLayout` (top bar with ward/nurse/offline status + bottom large-button tabs) + six pages (login/Patients board/BedSide workstation/Tasks/Handoff/Me); a lightweight manual PWA (`public/manifest.webmanifest` + `public/sw.js` for app-shell and GET runtime caching with offline fallback, `registerSW` with browser guards, and `offlineQueue` IndexedDB local cache + sync queue where medication-execution conflicts require manual confirmation and are never auto-overwritten); the health gate reuses getSystemHealth, and when db!=='up' a red Alert + watermark is shown with no business data rendered; write buttons hidden by the mobile_nursing:execute code | backend unit 20, integration 13; frontend pure-function 20, offlineQueue 5, page 9; backend full 2322 (baseline 2289+33) / 2322 pass / 0 fail (TEST_REAL=1), both tsc clean; frontend full 1170 pass (112 files, baseline 1136+34), coverage All files Stmts/Lines 91.96, Branch 78.49, Funcs 82.48 (thresholds 80/70/80 unchanged, no regression) gate passes; HTTP evidence (nurse login, bed-board listing, wristband scan resolution, unknown code 400, medication scan with visit resolving an active order, five-rights wrong patient 409 code=40900 with "patient identity mismatch", matching normal medication 200, high-risk medication missing checkedBy 400, double-check medication 200 with checked_by = second nurse, vitals temp=36.6, task execution done, Braden all-1 pressure_sore_risk=high, nursing record ai_assisted, SBAR draft + own signature signed, doctor medication 403 separation of duties, no token 401, unknown task 404); psql independently recomputes the audit hash chain across the full table of 132482 rows with all hash/prev matching and zero broken links; restart persistence (stop/start PG, the fixture's 4 records / 2 administrations / 1 task match the row-by-row checksum edcf27de before and after, BFF auto-reconnects with bed-board 200); outage evidence (health always 200, ready 503 code=50300 "database unavailable", authenticated endpoints 500 with top-level code=50000 unique traceId no fake success, BFF logs root cause ECONNREFUSED 127.0.0.1:5433); M16A_HTTP fixtures cleaned in one transaction to zero (patients/visits/orders/administrations/records/tasks 0) |



**Four kinds of real evidence (not demos)**:

1. **Real database**: local PostgreSQL 16 (port 5433), **156 business base tables** across 10 schemas (iam 11 / clinical 109 / agent 8 / knowledge 14 / audit 2 / dwd 2 / dws 1 / ads 1 / meta 7 / quality 1; plus the `public.schema_migrations` migration-infrastructure table); key writes read back and **survive restart**.
2. **Real LLM**: DeepSeek streaming + ReAct tool calls (OpenAI-compatible); sessions/messages/invocations persisted; models are pluggable via the `LLM_PROVIDER` factory.
3. **Hash-chained audit**: `audit.audit_logs` is maintained by a BEFORE INSERT trigger that builds the `seq/prev_hash/hash` chain; business changes and audits commit in the same transaction, making the chain internally tamper-evident.
4. **Concurrency/failure resilience**: concurrent writes never duplicate (unique constraints + state machines + row/advisory locks); on DB outage the system returns a unified error envelope with a watermark — no blank screens, no silent empty arrays; out-of-scope access returns 403.

---

## Capabilities

| Capability | Description |
|------|------|
| 🧠 **Agent orchestration kernel** | Declarative YAML/JSON DSL + DAG engine; 12 node types (LLM, tool, RAG, condition, loop, parallel, human, sub-agent, code, delay…); a custom **safe expression sandbox** (no `eval`), human-in-the-loop suspension, cancellation, breakpoints, traceable records |
| 🛠️ **Low-code agent factory** | React Flow visual canvas: drag-and-drop, live DAG validation, one-click `agent.yaml` import/export, undo/redo, a marketplace — **no coding required** |
| 📚 **Medical knowledge platform** | parsing → chunking → hybrid retrieval (vector + keyword, RRF fusion + reranking) with citations; terminology/graph/guideline/TCM knowledge; a **compliant fetcher for 26 authoritative open sources** (see [DATA_LICENSES.md](DATA_LICENSES.md)) |
| 🩺 **Must-have agents** | AI scribe, record QC, voice EMR, diagnosis assistance, prescription review, lab/imaging interpretation, medical coding & DRG/DIP, follow-up, triage/pre-consultation, medical-affairs reporting |
| 🔧 **38 medical tools** | patients, records, QC, drugs/prescriptions, CDS, labs/imaging, orders, patient services, operations, integration — with unified risk levels and permissions |
| 💊 **Clinical Decision Support** | 43 out-of-the-box rules (drug interactions, critical values, care standards) with proactive alerts and blocking confirmation |
| 🎙️ **Voice medical records** | ASR provider abstraction + medical speech post-processing (filler removal, term normalization, dosage/frequency detection that annotates but never alters numbers) |
| 🌐 **Internet hospital base** | WeChat mini-program patient app (login/profiles/realname/detail), WeChat code login, realname verification (ID checksum/third-party gateway), clinician online-credential state machine; AES-256-GCM field encryption for name/phone/ID, aligned with Smart Service Level 3 |
| 🔐 **Healthcare-grade security** | MLPS Level-3 design, RBAC+ABAC, 16 masking rules, AES-256-GCM, hash-chained audit, multi-layer prompt-injection defense, verified JWT, MFA, security headers, CSRF |
| 🔌 **Interoperability** | HIS/EMR/LIS/PACS adapters (retry/circuit-breaker/timeout), HL7 v2.x (16 messages), FHIR R4 (22 resources), DICOM (DICOMWeb), Kafka event bus (planned), major-vendor skeletons |
| 🖥️ **Web console + terminal** | React 19 + Ant Design 5 with 50+ routes; outpatient/inpatient/emergency/pharmacy/QC/voice scenarios; plus an Ink terminal UI |
| 🗄️ **Production infrastructure** | PostgreSQL 16 + pgvector (120 tables, hash-chained audit, PITR), Redis (distributed lock/rate-limit/session/cache), Docker Compose, observability, CI/CD |

---

## Architecture

```mermaid
flowchart TB
    subgraph Access["L1 Access"]
        WEB["Web console (React19 + AntD5)"]
        CLI["Terminal CLI (Ink)"]
        API["API Gateway / BFF / WebSocket"]
    end
    subgraph Biz["L2 Core Transactions (unified HIS+EMR)"]
        OUT["Outpatient"]
        INP["Inpatient ADT"]
        EM["Emergency"]
        ORD["Orders & Rx"]
        DOC["Documentation"]
        PHA["Pharmacy"]
        BIL["Billing/Archive"]
    end
    subgraph AI["L3 AI Capability Middle Platform"]
        ENGINE["Agent orchestration (DAG)"]
        TOOLS["38 medical tools"]
        CDS["CDS rules"]
        RAG["Knowledge / RAG"]
        VOICE["Voice ASR"]
    end
    subgraph Data["L4/L5 Data & Integration"]
        PG[("PostgreSQL+pgvector")]
        REDIS[("Redis")]
        KB[("Knowledge/terminology/graph")]
        INT["HIS/EMR/LIS/PACS · HL7/FHIR/DICOM"]
    end
    subgraph Sec["L6 Security (cross-cutting)"]
        RBAC["RBAC+ABAC"]
        MASK["Masking/crypto"]
        AUDIT["Hash-chained audit"]
    end

    WEB --> API
    API --> OUT & INP & EM & ORD & DOC & PHA & BIL
    BIL -.calls.-> AI
    AI --> TOOLS & CDS & RAG & VOICE
    TOOLS --> INT
    RAG --> KB
    Biz --> PG
    AI --> PG & REDIS
    Sec -.-> Biz & AI & Data
```

**Six layers**: L1 Access · L2 Core Transactions (unified HIS+EMR microservices) · L3 AI Capability Middle Platform · L4 Data Platform · L5 Integration & Standards (FHIR/openEHR/HL7/DICOM) · L6 Platform & Security. See the [Top-Level Design](docs/ai-native-hospital/01-top-level-design.en.md).

The workflow graph is always a DAG (loop bodies and parallel branches use structured sub-paths), enabling static analysis, auditing, and guaranteed termination (iteration caps). Each agent is a portable, versioned **Agent Package** (`agent.yaml` + prompts + knowledge references + checksum).

---

## Quick Start

**Requirements:** [Bun](https://bun.sh/) ≥ 1.3, Node.js ≥ 18, Docker for dependencies (or a local PostgreSQL).

```bash
# 1. Clone & install
git clone https://github.com/chenweidaben/JLAIharnessos.git
cd JLAIharnessos
bun install

# 2. Config & database
cp .env.example .env                 # set JWT_SECRET, LLM_API_KEY, DATABASE_URL
docker compose up -d postgres redis  # or use a local PostgreSQL
bun run db:seed                      # curated seeds (drugs/ICD/labs/pathways/TCM)

# 3. Backend & frontend
bun run bff                          # BFF: REST 8080 + WebSocket /ws/chat
cd web && bun install && bun run dev # http://localhost:5173

# 4. Verify
bun run typecheck                    # backend tsc 0
bun test                             # backend 1936 tests (1 skip)
cd web && bunx vitest run            # frontend 848 tests
cd web && npx tsc --noEmit           # frontend tsc 0
```

> No-DB demo: set `DEMO_MODE=1` to run the BFF with in-memory data and a watermark (not persistent), for demos only.

### 5. One-command containerized / cloud-native deployment

```bash
# Docker Compose full stack (edge gateway + BFF + frontend + PostgreSQL + Redis + Kafka + observability)
cp .env.compose.example .env        # all placeholder passwords/keys must be replaced
docker compose build
docker compose up -d                # open https://localhost

# Kubernetes all-in-one deployment (HPA/PDB/Ingress/NetworkPolicy; see deploy/k8s/README.md)
kubectl apply -f deploy/k8s/

# Parameterized Helm deployment (recommended for production; external DB, external secrets,
# replicas/resources), see deploy/helm/jlmedaios/README.md
helm install jlmedaios deploy/helm/jlmedaios --namespace jlmedaios --create-namespace
```

> Production configuration, cloud-managed database replacement, and secret management
> (External Secrets/Vault) are covered in [deploy/k8s/README.md](deploy/k8s/README.md),
> [deploy/helm/jlmedaios/README.md](deploy/helm/jlmedaios/README.md), and
> [docs/deployment/](docs/deployment/).

---

## AI Imaging Assist (DAMO-RADAR Fusion)

We fused Alibaba DAMO Academy's **DAMO-RADAR** — a visual-language foundation model for contrast-enhanced abdominal CT (Science 393(6817):eaec6129, 2026) — into the imaging workstation as a **second-reader / decision-support** capability.

| Capability | Description |
|------|------|
| 🫀 **18 organs / 146 findings** | one CT covers 18 structures (aorta, liver, stomach, pancreas, kidneys, lungs, …) and outputs probabilities (0–1) for 146 findings |
| 🎯 **Second-reader positioning** | positive findings are localized; critical (malignancy/acute events) are flagged red and routed to the critical-value channel; **final diagnosis requires radiologist review-and-signature** |
| 🧪 **Dual demo / production mode** | `demo` (CPU, no weights, deterministic) and `production` (real inference, ~5 GB weights + CUDA); auto-degrades when weights are absent |
| 🛡️ **Degrade without blank screens** | when the service is unavailable, fall back to deterministic mock with a "demo data" watermark |

> The weights `checkpoint_radar_pretrain.pth` (~5 GB, **CC BY-NC-SA 4.0, non-commercial**) are never committed; deployers download and mount them. See [`services/radar-inference/README.md`](services/radar-inference/README.md) and [`docs/RADAR_FUSION_CONTRACT.md`](docs/RADAR_FUSION_CONTRACT.md).

**Citation**: [Science 393(6817):eaec6129, 2026 · doi:10.1126/science.aec6129](https://doi.org/10.1126/science.aec6129). Code is vendored from [damo-radar](https://github.com/alibaba-damo-academy/damo-radar) (Apache-2.0) and stands on LAVIS, nnU-Net, and MONAI.

---

## Build a Medical Agent in 5 Minutes

**No-code (for hospital IT)**: open the **Agent Factory** in the sidebar → pick a template → drag nodes (`start → RAG → QC tool → human review → archive`) → configure tools/knowledge/risk → live **Validate** → **Export** an `agent.yaml` → deploy.

**Code (for developers)**:

```yaml
packageFormatVersion: '1.0.0'
agent:
  id: demo-record-qc
  name: Demo Record QC
  version: 1.0.0
  riskLevel: low
  entryWorkflow: main
  tools: [medical_record_quality_check, sync_to_his]
  workflows:
    - meta: { id: main }
      nodes:
        - { id: start, type: start }
        - { id: qc, type: tool, config: { toolName: medical_record_quality_check,
            inputMapping: { recordContent: input.recordText } } }
        - { id: review, type: human, config: { title: Confirm QC, assigneeRoles: [doctor] } }
        - { id: end, type: end, config: { outputMapping: { report: nodes.qc.output } } }
      edges:
        - { source: start, target: qc }
        - { source: qc, target: review }
        - { source: review, target: end }
  disclaimer: Outputs are assistive suggestions; the treating clinician makes the final decision.
```

```ts
import { createMockOrchestrator } from './src/orchestrator';
const orch = createMockOrchestrator();
await orch.loadAllAgents('./agents');
const result = await orch.invoke('demo-record-qc', { recordText: '…' });
```

The must-have agents in [`agents/`](agents/) are ready-to-edit templates.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Microservices / BFF | **TypeScript + Bun** (Bun.serve, zero extra deps) |
| Frontend | React 19 + Vite + Ant Design 5 + Zustand + React Flow |
| OLTP DB | **PostgreSQL 16** (JSONB, partitioning, pgvector) |
| Cache | Redis (sessions, cache, rate limiting, distributed lock) |
| Event streaming | Kafka (Redpanda-compatible; planned to replace in-memory buses) |
| Model services | Python (FastAPI) standalone (imaging/AI, contract-based) |
| LLM | DeepSeek (OpenAI-compatible; multi-provider pluggable via `LLM_PROVIDER`) |
| Standards | FHIR R4, openEHR (evolution), HL7 v2, DICOM |
| Observability/Deploy | Prometheus, OpenTelemetry (in progress), Grafana, Docker/K8s |

---

## Project Structure

```
jlmedaios/
├── src/
│   ├── bff/               # Bun.serve BFF (REST + WebSocket + middleware + routes/aggregators)
│   ├── orchestrator/      # Agent orchestration kernel (DSL/DAG/sandbox/human/triggers/packaging)
│   ├── medical-tools/     # 38 medical tools and registry
│   ├── knowledge/         # RAG retrieval + CDS rules (43)
│   ├── knowledge-platform/# Knowledge platform (terminology/graph/tenant/version/hybrid retrieval)
│   ├── voice/             # ASR abstraction + medical speech post-processing
│   ├── internet-hospital/ # Realname/WeChat login providers (local demo + real)
│   ├── security/          # Masking/audit/RBAC/crypto/field encryption/input security/MFA/MLPS
│   ├── integration/       # HIS/EMR/LIS/PACS, FHIR/HL7/DICOM, adapters, monitoring
│   ├── resilience/        # Rate limiter/circuit breaker/bulkhead/concurrency/async queue
│   ├── cache/             # Redis abstraction/distributed lock/rate-limit/session/cache
│   ├── core/              # Agent loop, LLM clients, context, sessions
│   ├── db/                # Pool/migrator + repositories data-access layer
│   └── ui/                # Ink terminal UI
├── agents/                # Must-have agent packages (agent.yaml + prompts + examples)
├── web/                   # React19 + Vite + AntD5 console and low-code canvas
├── miniprogram/           # WeChat mini-program patient app (login/profiles/realname/detail)
├── services/              # Standalone Python model services (e.g. radar-inference)
├── deploy/postgres/init/  # 87 tables, layered schemas + seeds (SQL migrations)
├── scripts/               # Knowledge seeds/fetcher, DB import/check/backup
├── docs/                  # Architecture/AI-native/API/deployment/ops/users/ADR
├── examples/              # API/streaming/WebSocket/orchestration examples
└── tests/                 # Backend tests
```

---

## Quality

- **Backend 1870 and frontend 826 unit/integration tests green** (7440 backend assertions, 1 skip); backend coverage ~**87%**, frontend coverage gate passed (Lines 92.18 / Branch 78.55 / Funcs 84.13), only increasing.
- **Zero type errors** in strict TypeScript for both frontend and backend; ESLint 0 errors.
- E2E clinical scenarios: outpatient, inpatient ADT/rounds, emergency triage/green channel, critical values, prescription review, pharmacy dispensing, record QC, voice records, front page, billing/refunds, OR-anesthesia, appointments/follow-up, internet-hospital realname, text consultation, e-prescription/pharmacist review, online payment/e-invoice/finance refund.
- Security tests for prompt injection, SQL/XSS/command injection, authz, data scope, and security headers.
- GitHub Actions CI: typecheck → lint → tests+coverage → integration → security audit → build (incl. web).

```bash
bun run ci                 # full backend gate
cd web && bun run build    # frontend production build
```

---

## Docs

- **AI-native hospital series** ([docs/ai-native-hospital/](docs/ai-native-hospital/)):
  - [00 Open-Source Research](docs/ai-native-hospital/00-open-source-research.en.md)
  - [01 Top-Level Design](docs/ai-native-hospital/01-top-level-design.en.md)
  - [02 Strangler Roadmap](docs/ai-native-hospital/02-strangler-roadmap.en.md)
  - [03 Architecture Expert Review](docs/ai-native-hospital/03-architecture-review.en.md)
  - [04 Internet Hospital Platform](docs/ai-native-hospital/04-internet-hospital-platform.en.md)
- Deployment, operations, API, ADR, requirements, testing, and user docs are under [docs/](docs/).

---

## Roadmap

```
M0 Outpatient ✅ → M1 Inpatient+Emergency ✅ → M2 Pharmacy/Documentation/QC/Voice ✅
   → M3 Archive/Billing/Insurance/OR/Appointments/Internet-hospital base (core slices closed, deepening)
        → M4 Knowledge/RAG + low-code orchestration
             → M5 Multi-tenant/multi-campus + lakehouse/research cohorts
                  → M6 Cloud-native production (K8s/mesh) + MLPS L3/MFA/real integration
```

- [x] Orchestration kernel + safe sandbox + human-in-the-loop
- [x] Low-code agent factory (canvas + marketplace + `agent.yaml`)
- [x] 38 tools + 43 CDS rules + must-have agents
- [x] Knowledge platform + compliant source fetcher
- [x] Voice records, PostgreSQL/Redis foundation, web console
- [x] M3 front page / billing-refunds / DRG-DIP local grouping / OR-anesthesia / appointments-follow-up
- [x] MFA, critical-value closed loop, lab/imaging interpretation, reconciliation skeleton, RBAC backfill
- [x] Internet hospital base (WeChat mini-program, realname, online credentials, field encryption)
- [x] M5-A Multi-tenant/multi-campus registry persistence (iam.tenants, startup hydrate, write-through, default tenant protection)
- [x] M5-B Research cohort (define → publish → deterministic rule matching → de-identified member snapshots → stats & dataset export → archive)
- [x] M5-C EMPI (cross-domain hashed identifiers → deterministic match candidates → manual review → logical master/linked links, no physical merge)
- [x] M5-D Lakehouse layering & incremental processing (DWD watermark increment → DWS dept daily → ADS hospital daily metrics, idempotent in transactions, lineage traceable)
- [x] M5-E Data quality monitoring & privacy classification governance (five-dimension checks → score/trend, field-level privacy auto-scan + audit-trailed manual fixes)
- [ ] Internet hospital online consultation/e-prescription flow/online insurance pay/drug delivery
- [ ] Unified Idempotency-Key framework, Kafka replacing in-memory buses, real load baseline
- [ ] CI/local consistency (master branches, DB in CI, full gate)
- [ ] Full MFA coverage, SM2/SM3/SM4, MLPS L3 assessment
- [ ] Multi-tenant/multi-campus, lakehouse incremental scheduling (CDC/Kafka), EMPI, multimodal/federated, internationalization

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md); ensure `bun run typecheck && bun test` and frontend `vitest` pass and add tests. Report vulnerabilities privately per [SECURITY.md](SECURITY.md), and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

Together, let's build the **Android of healthcare AI**.

---

## Contributors Wall

| <a href="https://github.com/chenweidaben"><img src="https://github.com/chenweidaben.png" width="80" height="80" alt="chenweidaben"/></a><br/><sub><b>chenweidaben</b></sub><br/><sub>Founder · Architecture · Medical AI</sub> |
|:---:|

> **Become a contributor**: submit a PR, fix a bug, add a CDS rule, write an agent template, translate a document — your name will be here.

---

## License & Disclaimer

- Code: [Apache License 2.0](LICENSE). Third-party notices: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md), [NOTICE](NOTICE).
- **Data licenses are separate from the code license** — read [DATA_LICENSES.md](DATA_LICENSES.md).
- This software is an assistive tool, not a medical-device diagnosis, and does not replace a licensed clinician. Deployers are responsible for local legal, data-compliance, security, and clinical validation.

<div align="center">

**Jianlan Technology (Hangzhou Jianlan Technology Co., Ltd.) · Making medical AI simpler and more deployable**

</div>
