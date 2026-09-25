# Strangler Incremental Refactoring Roadmap (English)

> Jianlan Technology (Hangzhou) · jlmedaios — Industrial-Grade Intelligent-Agent Operating System for Smart Hospitals
> Phased plan from a real outpatient closed loop to an AI-native integrated hospital platform
> v1.0　Date: 2026-09-25
> Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd.

---

## 1. Why the Strangler Pattern

Hospital systems are always-on, non-interruptible, and strongly regulated. Big-bang rewrites are high risk (all-or-nothing switch, hard rollback, lost data/processes). jlmedaios therefore uses the **Strangler Fig** pattern:

1. place a **facade/gateway** in front, gradually taking routing control;
2. incrementally build new services per domain, running in parallel with the old;
3. replace old implementations one by one and **switch traffic**;
4. **retire** old capabilities once fully replaced;
5. every step is runnable, verifiable, reversible.

Here the strangled targets are: (1) early in-memory mocks and hard-coded rules; (2) monolithic BFF logic not yet split by domain; (3) a hospital's legacy HIS/EMR modules in the future.

---

## 2. Baseline (M0, done & verified)

| Dimension | State |
|---|---|
| Real data | PostgreSQL 16 (port 5433, 5 schemas, 40 tables); outpatient chain truly persisted, survives restart |
| Real intelligence | DeepSeek streaming + ReAct tool loop; sessions/messages persisted |
| Data facade | `src/data/clinicalData.ts` unifies real/demo sources; 19 core tools use it |
| Outpatient | registration/queue/intake/AI record/diagnosis/orders/prescription/pharmacist review/AI streaming E2E |
| Quality gates | backend 1192 green, frontend 253 green, both tsc 0, coverage 86.29% |
| Imaging fusion | DAMO-RADAR standalone Python microservice (tag v0.2.0-radar) |
| Engineering | CI/CD, containers, ESLint/Prettier, test preload |

> M0 is the stable foundation; no later phase may break its real closed loop or quality gates.

---

## 3. Milestone Overview

```
M0 Real outpatient closed loop (done)
   └─ M1 Inpatient + Emergency core transactions
        └─ M2 Orders/Rx/Documentation/Pharmacy deepening + must-have skills (AI QC, voice EMR)
             └─ M3 Billing + insurance DRG-DIP + archive front page
                  └─ M4 Knowledge/RAG enhancement + low-code agent/skill orchestration
                       └─ M5 Multi-tenant/multi-campus + healthcare lakehouse/research cohorts
                            └─ M6 Cloud-native production (K8s/mesh) + MLPS L3/MFA/real system integration
```

| Milestone | Theme | Key Deliverables | Value |
|---|---|---|---|
| **M1** | Inpatient + Emergency | ADT, beds/wards, rounds/nursing, triage/green channel | major high-frequency scenarios |
| **M2** | Transaction deepening + skills | orders/Rx/pharmacy full flow, AI record QC, voice EMR, prescription review | reduce burden & errors |
| **M3** | Billing/insurance/archive | charges, DRG-DIP, receipts, front page & coding | business closure, compliance grading |
| **M4** | Knowledge + low-code | enhanced RAG, visual agent/skill/page assembly | hospital IT self-build, ecosystem |
| **M5** | Multi-tenant + big data | multi-campus, tenancy, lakehouse, cohorts, follow-up | group scale, research, RWE |
| **M6** | Production/integration | K8s/mesh, MLPS L3, MFA, real HIS/EMR/LIS/PACS integration | go-live in tertiary hospitals |

> Following "slow, careful work," each milestone completes when its DoD is met, not by a fixed date; extension is preferred over hidden risk.

---

## 4. Scope & Acceptance per Milestone

### M1 — Inpatient + Emergency
**Scope**
- Inpatient: ADT, beds/wards, inpatient encounters, rounds, nursing notes, inpatient order views;
- Emergency: triage levels (1–4), green channel, resuscitation notes, observation;
- Data: inpatient/emergency schema and seeds (multi-ward, bed map, today's patients);
- Frontend: bed map/rounds workstation, triage screen—de-mocked.

**DoD**
- real admission→bed→rounds→orders/records→discharge with psql evidence and restart survival;
- correct triage levels and closed-loop green channel;
- critical values closed from result to notification/acknowledgement;
- tsc 0, green tests with new coverage; correct authz/data scope.

### M2 — Orders/Rx/Documentation/Pharmacy + Must-Have Skills
**Scope**
- orders: long-term/one-time, order sets, execution sheets, stop/cancel (high-risk dual sign);
- Rx/pharmacy: full Rx flow, dispensing, inventory linkage, medication monitoring, interactions/allergy/dose;
- documentation: more document types, templates, three-level QC, signature chains;
- skills: **AI record QC (defects/timeliness/completeness), voice EMR, smart prescription review, result interpretation**.

**DoD**
- high-risk orders/Rx dual signature and pharmacist review; real inventory linkage;
- AI QC detects real defects with traceable basis; voice is structured into records;
- CDS intercept/alerts trigger in real flows; overrides logged;
- full tests + E2E (rounds, Rx review) pass.

### M3 — Billing + DRG-DIP + Archive
**Scope**
- outpatient/inpatient charges, line items, receipts, refunds (with compensation);
- insurance integration, **DRG/DIP grouping & settlement**, reconciliation;
- archive front page, archiving, ICD/procedure coding, reporting/QC.

**DoD**
- real "encounter/discharge→charges→settlement→receipt" closure; traceable amounts; compensated refunds;
- explainable, reviewable DRG/DIP grouping;
- front page auto-assembled from clinical data; verifiable coding;
- cross-service Saga consistency validated via failure/compensation drills.

### M4 — Knowledge/RAG + Low-Code Orchestration
**Scope**
- knowledge: bulk import of authoritative open knowledge, enhanced vector retrieval, versioning/permissions;
- low-code: **visual agent orchestration (drag-and-drop nodes), skill editor, page/form assembly**, publishing/versioning;
- hospital IT produces AI scribe, AI QC, voice EMR without deep coding.

**DoD**
- hospital IT builds and publishes a real usable agent from scratch (real data, real LLM, persisted);
- RAG answers carry citations and are traceable;
- orchestrated agents pass tests/authz; high-risk nodes force human review;
- outputs versioned and audited.

### M5 — Multi-Tenant/Multi-Campus + Lakehouse
**Scope**
- full tenancy/multi-campus (isolation, campus differentiation, group consolidation);
- CDC → lakehouse layers, MDM governance, research cohorts, follow-up;
- data quality, lineage, privacy tiers, masking.

**DoD**
- cross-tenant deny by default; isolation tests pass; campus-independent data with accurate group rollup;
- cohorts buildable for research;
- governance (quality/lineage/tiers) verifiable;
- performance meets targets under multi-campus volume via real load tests.

### M6 — Cloud-Native Production + Security/Integration
**Scope**
- K8s/service mesh/multi-cluster, canary release, observability, capacity/DR;
- full MLPS 2.0 L3 controls, **MFA**, key management;
- **real integration** of HIS/EMR/LIS/PACS (switch from Mock), real SSO;
- pre-go-live full acceptance and trial run.

**Go-Live Gate**
- MLPS L3 assessment passed (incl. MFA); no high-risk security findings;
- real external E2E integration passes; failover/degradation effective;
- production load tests meet capacity; fault drills (node/AZ/dependency) pass;
- backup/restore drills succeed; observability alerts close the loop;
- go-live checklist signed; rollback ready.

---

## 5. Standard Per-Domain Migration (Four Strangler Steps)

For any capability being replaced:

1. **Facade**: establish the single entry and contract (request/response/events) at the BFF/gateway; old implementation still serves behind it;
2. **Parallel**: implement the same contract in a new module/microservice with real PostgreSQL reads/writes; control old/new via **feature flags**;
3. **Compare & Switch**: compare old/new results for the same input (shadow traffic/parallel checks); once met, gray-switch by tenant/campus/ratio;
4. **Retire**: after stable observation, delete the old implementation and flags; update contracts/docs.

> Throughout: **real mode connects to real DB/LLM; failures are explicit**; demo data exists only under explicit `DEMO_MODE` with a watermark—never passed off as real.

---

## 6. Contract & Event Governance (preventing broken links)

- **contract first**: agree OpenAPI/type contracts and examples across services/frontend before parallel work; contracts are reviewed and auto-validated;
- **event schema registry**: name, fields, version, producers/consumers per event; backward-compatible evolution; breaking changes bump versions;
- **idempotency & consistency**: idempotent consumers (dedup keys); at-least-once + idempotency = effectively exactly-once; compensable Saga steps;
- **contract tests**: producer/consumer contract tests in CI to prevent "green alone, broken integrated."

---

## 7. Unified Definition of Done (all milestones)

A milestone is done only when:

1. data truly lands in PostgreSQL; key writes read back and **survive restart** (psql evidence);
2. real LLM streaming + ReAct loop, persisted; failures explicit; demo watermarked;
3. positive + exception business closure (unauthorized, timeout, compensation, degradation);
4. both tsc 0, green tests, coverage ≥85%, key E2E pass;
5. RBAC+ABAC, DataScope, tenant isolation tested; no high-risk findings;
6. deployable ("works on download"), observable, reversible;
7. bilingual docs and license SBOM synced.

---

## 8. Rollback Strategy

- **feature flag**: one-click return to old implementation (seconds, no redeploy);
- **version**: versioned images/config; gray anomalies roll back by ratio/campus;
- **data**: compatible changes (extend, don't break); reverse scripts for migrations; versions/traces retained;
- **transaction**: Saga failures trigger compensation to a consistent state;
- before each switch, define rollback triggers, owner, RTO, and RPO.

---

## 9. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| scope creep / one-step ambition | abandonment, lower quality | strict milestones, per-phase DoD, slow and correct |
| cross-service integration breaks | broken links | contract first, contract tests, event schema governance |
| insufficient high-concurrency performance | peak outages | stateless+cache+event leveling+real load tests |
| medical safety/compliance defects | errors, violations | dual signature, CDS, audit, MLPS, least privilege |
| external integration delays | blocked progress | adapters + explicit Mock first; hospital interfaces engaged early |
| data migration/consistency | data loss | compatible evolution, CDC verification, backup/restore drills |
| model unavailable/overreach | outage/risk | pluggable providers, degradation, human fallback, no autonomous practice |

---

## 10. Team Organization & Parallelism (Multi-Agent)

- shard by milestone/domain: **core transactions / AI capability / data platform / integration & standards / frontend experience / test quality / platform ops**;
- each domain agent/team owns end-to-end (implementation→tests→docs); contracts aligned across shards first;
- the lead handles architecture arbitration, DoD, real evidence, and final integration;
- unified branching, semantic commits, CI/CD, code review;
- on completion, sync GitHub + GitCode, verify three-way HEAD, and tag milestones (v0.3.0-m1 …).

---

## 11. Completion Criterion

> **Not "code written," but "runs for real, evidence complete, go-live/rollback ready."**
> jlmedaios advances steadily M0→M6, expanding the verified outpatient loop into a hospital-wide, AI-native, open-standards, multi-tenant platform co-built by hospitals nationwide and developers worldwide—realizing the "Android of medical AI."
