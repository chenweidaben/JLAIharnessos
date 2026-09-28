# Architecture Expert Review (English)

> Jianlan Technology (Hangzhou) · jlmedaios — Industrial-Grade Intelligent-Agent Operating System for Smart Hospitals
> A six-perspective expert review of the "00 Open-Source Research / 01 Top-Level Design / 02 Strangler Roadmap"
> v1.0　Date: 2026-09-29
> Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd.

---

## Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Method & Scope](#2-method--scope)
- [3. Six-Perspective Findings](#3-six-perspective-findings)
- [4. Master Issue & Risk Table](#4-master-issue--risk-table)
- [5. Recommendations & Adoption](#5-recommendations--adoption)
- [6. Impact on the Design and Roadmap](#6-impact-on-the-design-and-roadmap)

---

## 1. Executive Summary

The review assesses the **00 Open-Source Research**, **01 Top-Level Design**, and **02 Strangler Roadmap** from **six engineering perspectives** (cloud-native & CI/CD, data platform, AI platform, business platform, security & compliance, high-concurrency consistency), cross-checking documents against the real code and database.

**Overall verdict: the architecture direction is correct, the skeleton is real, and the engineering baseline is honest. Continue along the roadmap.**

1. **The direction is backed by code**: unified HIS+EMR, a cross-cutting AI platform, transaction/intelligence separation, assistive-only AI with physician signatures, real PostgreSQL persistence, hash-chained audit, and rate limiting/circuit breaking all have **real code and tests**, not slideware.
2. **The closed-loop scope is solid**: M0 outpatient, M1-A inpatient ADT, M1-B1 emergency, M1-B2 bedside stations, M2-A pharmacy dispensing, M2-B record QC, M2-C voice records; **1428 backend tests green**.
3. **The main risks are in engineering execution, not architecture**: the two top-priority items are both in CI/CD — **pipeline branch filters do not match the actual default branch (`master`)**, and **CI does not start a real database to reproduce the integration loop**. Others include openEHR being vision-only, MFA not persisted/enforced, in-memory event buses, and the lack of a unified idempotency-key framework and real load tests.
4. **No critical (blocking) architecture defect**; most risks are "medium," with two CI issues rated "high" (they do not affect local correctness but disable the team-level quality gate).

**This round**: the two high-risk items and several medium items are fixed in the documentation (see §5); code-level remediation follows the revised roadmap, starting with the next milestone (first M3 slice).

---

## 2. Method & Scope

- **Objects**: `00-open-source-research`, `01-top-level-design`, `02-strangler-roadmap` (both languages).
- **Method**: for each perspective, the domain expert first reads the claims, then **samples the real code and database evidence**, and judges whether each claim holds; issues carry a risk level, priority, and actionable recommendation.
- **Key evidence**:
  - Real DB: **61 base tables** across 5 schemas (iam 7 / clinical 30 / agent 8 / knowledge 14 / audit 2), no views.
  - Backend **1428 pass / 0 fail (120 files)**; frontend **509 tests** (5 timing timeouts under full load, passing in isolation — flakiness).
  - **38** medical tools, **43** CDS rules, **22** FHIR resource types, **16** HL7 messages, **26** authoritative knowledge sources.
  - **Zero** openEHR/AQL/archetype references in code; event buses are in-process/in-memory.
- **Risk**: High / Medium / Low; **Priority**: P1 (immediate) / P2 (within milestone) / P3 (scheduled).

---

## 3. Six-Perspective Findings

### 3.1 Cloud-Native Microservices / Observability / Elasticity / CI-CD

**Assessment**: the BFF unifies `/api/v1` with a middleware chain (auth/rate-limit/CSRF/security-headers/tenant/logging/error envelope), a good base for modular-monolith → microservices; `src/resilience` provides RateLimiter, CircuitBreaker, Bulkhead, ConcurrencyLimiter, AsyncQueue; the BFF exposes `/metrics` (Prometheus); 3 GitHub Actions workflows exist.

| # | Issue | Risk | Priority |
|---|---|---|---|
| A1 | **CI branch filters don't match the default branch**: `ci.yml` triggers on `main/develop`, but the default branch is `master`; pushes to master don't run the pipeline — the team quality gate is ineffective | High | P1 |
| A2 | **CI does not reproduce the real-DB loop**: no PostgreSQL service container; `integration-test` runs without a DB (skipped via `|| echo`); many DB-backed tests among the 1428 cannot be verified in CI | High | P1 |
| A3 | Observability is mostly custom metrics; traceId is propagated but there is no OpenTelemetry/OTLP export; LLM/agent metrics (time-to-first-token, token cost, tool success) are not unified | Medium | P2 |
| A4 | Still a single BFF process (modular monolith); no independently deployable processes; K8s/HPA/mesh are docs only (fits the current phase) | Medium | P3 |
| A5 | CI pins Bun 1.3.11 vs local 1.4.2 | Low | P3 |

**Recommendations**: fix `ci.yml` branches to include `master`; add a PostgreSQL service container with `DATABASE_URL`, run the full `bun test` and web `vitest`, plus a web coverage gate; add an OTel Collector for traces/metrics/LLM metrics.

**Evidence**: `.github/workflows/ci.yml` (branches, no services), `src/bff/server.ts`, `src/bff/observability/metrics.ts`, `src/resilience/`.

---

### 3.2 Data Platform (Master Data / Governance / FHIR·openEHR / Lakehouse / Multi-Campus)

**Assessment**: 61 real tables across 5 schemas with a unified `repositories` layer; FHIR has real code (Builder/Parser/Client/Resource, 22 resources); HL7 (16 messages) and DICOM (DICOMWeb QIDO/WADO/STOW) are implemented; tenant middleware and DataScope are active in the request chain.

| # | Issue | Risk | Priority |
|---|---|---|---|
| D1 | **Zero openEHR code**: the docs present "FHIR externally, openEHR internally" as a dual-track core, but there is no openEHR/AQL/archetype implementation; §6.1 can read as if it exists | Medium | P2 |
| D2 | Stale table count: docs say "5 schemas, 40 tables," actual **61** | Low | P2 |
| D3 | No independent EMPI/master-data merge service (patient index is spread across patientRepo; no cross-identifier match/merge) | Medium | P2 |
| D4 | Lakehouse/CDC, metadata/lineage/data quality are docs only (planned for M5) | Medium | P3 |

**Recommendations**: state clearly in the design that **openEHR is an M5 evolution direction and only FHIR is implemented today**; sync the real table count; put EMPI matching/merging and the lakehouse in M5, starting with a minimal EMPI service (identifier registry + matching + audited merge).

**Evidence**: `src/integration/protocols/fhir/`, `src/db/repositories/patientRepo.ts`, live table counts, zero openEHR full-text matches.

---

### 3.3 Medical AI Platform (Model Gateway / Tool Orchestration / ReAct / Guardrails / Pluggability)

**Assessment**: models are pluggable (`LLM_PROVIDER` factory + OpenAI-compatible DeepSeekProvider; ASR has a provider abstraction too); the orchestrator is a complete DAG engine (29 files; DSL/nodes/runtime/human/recorder/triggers; 12 node types); the chat aggregator runs real streaming + ReAct tools + persisted messages; guardrails include prompt-injection defense, CDS interception, permission codes, risk grading, and AI drafts requiring physician signatures.

| # | Issue | Risk | Priority |
|---|---|---|---|
| I1 | The real LLM loop is mostly **single-round ReAct**; multi-step/multi-tool chains and Supervisor/MDT multi-agent flows exist in the engine but lack real closed loops | Medium | P2 |
| I2 | The model gateway is mostly a "factory selection," lacking gateway-level **quotas/cost metering, automatic multi-provider failover, response caching, unified streaming timeouts** | Medium | P2 |
| I3 | The "100% prompt-injection detection" is on a specific set; there is no continuous adversarial regression; structured schema validation of AI outputs can be strengthened | Medium | P2 |
| I4 | The real "IT publishes → runs" loop for hot-pluggable skills/marketplace (pack) awaits M4 | Medium | P3 |

**Recommendations**: add a unified model gateway (token metering/quota/failover/cache/timeout); extend multi-round ReAct and multi-agent loops; put adversarial sets in CI; enforce schema validation on tool results and reject out-of-scope tools.

**Evidence**: `src/core/agent/providers/`, `src/orchestrator/`, `src/bff/aggregators/chatAggregator.ts`, `src/security/input/`.

---

### 3.4 Business Platform (HIS·EMR Core Flows / Clinical Safety / Reuse)

**Assessment**: seven slices are truly closed with consistent state machines and signature chains; clinical writes are personally signed and AI is assistive; routes use a unified `guarded` wrapper with permission codes and a common error envelope.

| # | Issue | Risk | Priority |
|---|---|---|---|
| B1 | Known observation items: **duplicate stacking of critical-value alerts** (no idempotency key) and **in_consult stored only in zustand** (queue reverts after refresh; clinical artifacts are not lost) are not fully closed | Medium | P2 |
| B2 | Billing/insurance/archive, medical-tech LIS/PACS, OR-anesthesia, and appointment/follow-up are not closed (M3+) | Medium | P3 |
| B3 | Cross-service Saga/compensation is docs and a few patterns; few real cross-aggregate examples | Medium | P2 |
| B4 | Each route re-implements the `guarded` wrapper; a common BFF base class could be extracted | Low | P3 |

**Recommendations**: close critical-value idempotency (unique event ID + frontend de-dup) and the server-side in_consult state machine first; build one real Saga example before M3 billing/refunds; extract a common `guarded`.

**Evidence**: `02-strangler-roadmap §2.5.3`, `src/bff/routes/`, `src/bff/aggregators/`.

---

### 3.5 Security & Compliance (MLPS / Privacy / Hash-Chained Audit / Permissions / Tenancy / EMR Grading)

**Assessment**: the hash-chained audit is real (`audit.audit_logs` BEFORE INSERT trigger maintains seq/prev_hash/hash, with lock and chain-state migrations); audits are written in the same transaction as business changes; JWT HS256 with timing-safe comparison; RBAC+ABAC+permission codes+DataScope; 16 masking rules, AES-256-GCM; security headers, CSRF; MFA has a TOTP self-service implementation.

| # | Issue | Risk | Priority |
|---|---|---|---|
| S1 | **MFA is not persisted/enforced at login**: defaults to an in-memory store; the hard MLPS L3 requirement is not closed (docs list M6; recommend advancing) | Medium | P2 |
| S2 | MLPS L3 is "design-aligned," not formally assessed; Chinese commercial cryptography (SM2/SM3/SM4) is not implemented (M6) | Medium | P2 |
| S3 | The chain is "internally tamper-evident," but there is no **chain-integrity inspection** or periodic anchoring (external notarization) | Medium | P3 |
| S4 | Tenant isolation partly relies on the application layer; RLS enforcement needs per-table verification | Medium | P2 |

**Recommendations**: advance MFA persistence (PgMfaStore) + login enforcement **as a standalone security slice**; add chain-integrity inspection and periodic anchoring; verify and complete RLS per table for "RLS + DataScopeGuard" defense in depth.

**Evidence**: `src/security/mfa/`, `deploy/postgres/init/50–52 audit*.sql`, `src/db/repositories/auditChainRepo.ts`, `src/bff/middleware/tenant.ts`.

---

### 3.6 High-Concurrency Consistency (Rate Limiting / Breaking / Retry / Pool / Leveling / Idempotency / Safety)

**Assessment**: the five resilience primitives + BFF rate limiting; a configurable pool (`PG_POOL_MAX=20`); many UNIQUE/ON CONFLICT in SQL plus `FOR UPDATE`/`pg_advisory`/`LOCK TABLE`; state machines + unique constraints; the audit chain has a dedicated lock migration.

| # | Issue | Risk | Priority |
|---|---|---|---|
| C1 | Event buses are **in-process/in-memory** (AgentEventBus/alertBus/IntegrationBus); multi-instance scaling cannot deliver across processes, limiting load-leveling | High | P2 |
| C2 | No unified **client Idempotency-Key framework**; safe retries across timeout/retry are inconsistent (per-table unique constraints exist, but no global mechanism) | Medium | P2 |
| C3 | Retries exist in adapters but lack unified backoff and retry-storm protection (Bulkhead partly covers it) | Medium | P3 |
| C4 | Capacity targets (thousands concurrent / tens of thousands daily visits) require real load tests; k6 scripts exist but no recent real baseline | Medium | P2 |

**Recommendations**: add a unified Idempotency-Key middleware + idempotency-record table; replace in-memory buses with Kafka per M5 (high-responsibility events such as critical values need acknowledgement loops); run real k6 load tests and keep a baseline; unify exponential backoff with jitter.

**Evidence**: `src/core/events/`, `src/bff/alertBus.ts`, `src/integration/middleware/IntegrationBus.ts`, `src/db/pool.ts`, `deploy/postgres/init/`.

---

## 4. Master Issue & Risk Table

| ID | Perspective | Issue | Risk | Priority |
|---|---|---|---|---|
| A1 | Cloud/CI | CI branch filters don't match master | High | P1 |
| A2 | Cloud/CI | CI doesn't start a real DB; integration loop not reproduced | High | P1 |
| C1 | Concurrency | In-memory event buses; no cross-process delivery | High | P2 |
| D1 | Data | openEHR has zero code, vision-only | Medium | P2 |
| D2 | Data | Stale table count (40→61) | Low | P2 |
| D3 | Data | No independent EMPI merge service | Medium | P2 |
| D4 | Data | Lakehouse/CDC/lineage not implemented | Medium | P3 |
| I1 | AI | Single-round ReAct; multi-agent not really closed | Medium | P2 |
| I2 | AI | Gateway lacks metering/quota/failover | Medium | P2 |
| I3 | AI | Adversarial regression & output schema validation weak | Medium | P2 |
| I4 | AI | Skill publish→run loop awaits M4 | Medium | P3 |
| B1 | Business | Critical-value duplication / in_consult not persisted | Medium | P2 |
| B2 | Business | Billing/medical-tech/OR not closed | Medium | P3 |
| B3 | Business | No real Saga example | Medium | P2 |
| B4 | Business | Duplicated guarded wrapper | Low | P3 |
| S1 | Security | MFA not persisted/enforced | Medium | P2 |
| S2 | Security | MLPS not assessed / SM crypto missing | Medium | P2 |
| S3 | Security | No chain inspection/anchoring | Medium | P3 |
| S4 | Security | RLS needs per-table verification | Medium | P2 |
| A3 | Cloud | No unified OTel export | Medium | P2 |
| A4 | Cloud | No independent processes (phase) | Medium | P3 |
| A5 | Cloud | CI/local Bun version mismatch | Low | P3 |
| C2 | Concurrency | No unified idempotency-key framework | Medium | P2 |
| C3 | Concurrency | Retry backoff not unified | Medium | P3 |
| C4 | Concurrency | No recent real load-test baseline | Medium | P2 |

> Counts: 3 high (A1, A2, C1), 18 medium, 4 low. No critical (blocking) architecture defect.

---

## 5. Recommendations & Adoption

### 5.1 Adopted now (fixed in documentation)

| Recommendation | Adoption |
|---|---|
| D1 clarify openEHR boundary | Design marks openEHR as an M5 evolution item; only FHIR is implemented today |
| D2 sync real table count | "40 tables" corrected to "61 tables" (5 schemas) in 01/02 |
| A1/A2 expose CI gaps | 01/02 add a "CI/local consistency" risk and remediation (branch master, DB service) |
| S1 advance MFA | Roadmap moves MFA persistence + login enforcement from M6 to a standalone security slice |
| C1/C2 events & idempotency | 02 states the sequencing for Kafka replacement and a unified Idempotency-Key |
| B1 observation items | Kept as pre-M3 mandatory tests with idempotency-key and server-side state-machine directions |

### 5.2 Scheduled (code-level, per revised roadmap)

- **P1 (first)**: A1 fix CI branches, A2 add a real PostgreSQL to CI and run the full gate.
- **P2 (with milestones)**: M3 first slice (front page/billing), unified idempotency key, critical-value idempotency, model-gateway metering, MFA, real load tests.
- **P3 (scheduled)**: openEHR/lakehouse/EMPI (M5), K8s/mesh/SM crypto/MLPS assessment (M6), guarded extraction and version alignment.

---

## 6. Impact on the Design and Roadmap

1. **The overall architecture and six layers are unchanged**: the review validates the layering and the "cross-cutting AI platform, transaction/intelligence separation" approach; no redesign needed.
2. **Factual corrections**: tables 40→61; openEHR marked as an evolution item; FHIR noted as the only implemented standard today.
3. **Roadmap reinforcement (M0→M6 axis unchanged)**:
   - list **CI/local consistency (A1/A2)** as the first engineering prerequisite;
   - advance **MFA persistence/enforcement** from M6;
   - state the engineering points for **Kafka replacing in-memory buses, unified idempotency keys, and real load tests**;
   - M3 focuses on billing/insurance/archive front page, building a real Saga example before billing/refunds.
4. **Next milestone**: in milestone order, the first M3 slice is the **inpatient medical-record front page (v0.3.0-m3a)** — auto-assembled from closed clinical data, ICD/procedure coding, an archive state machine, and physician review/signature, supporting EMR grading and front-page reporting; the billing/insurance slice follows.

> **Verdict**: continue the roadmap, but first close the CI/CD "team-level quality gate," and keep the definition of done at every milestone — real persistence, real evidence, physician signatures, reversible.
