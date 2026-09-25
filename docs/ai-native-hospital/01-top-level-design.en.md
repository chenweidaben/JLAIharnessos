# Top-Level Design for an AI-Native Integrated Hospital Platform (English)

> Jianlan Technology (Hangzhou) · jlmedaios — Industrial-Grade Intelligent-Agent Operating System for Smart Hospitals
> New-Generation Cloud-Native Microservice HIS + EMR Unification · An Integrated Platform Under an AI Middle Platform
> v1.0 (design)　Date: 2026-09-25
> Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd.

---

## 1. Vision & Positioning

**Vision**: make medical AI simpler and more deployable. Build jlmedaios as the "Android of medical AI"—an open-source, free, industrial-grade hospital agent OS that hospital IT departments and global developers can assemble and extend, powering **AI-native hospitals for the next 15 years**.

**Positioning**: not another single AI assistant, but an integrated platform that deeply fuses the **core transactional systems (unified HIS + EMR)** with an **AI-native capability middle platform (agent orchestration / skills / knowledge / CDS / RAG)**:

- Down: unified clinical data, master data, and external-system connectivity;
- Middle: cloud-native microservices for registration, encounters, orders, prescriptions, documentation, billing, pharmacy, diagnostics, OR-anesthesia, and archiving;
- Up: an AI middle platform cross-cutting every workflow—AI scribe, AI QC, voice EMR, diagnosis/medication support, closed-loop critical values;
- Throughout: physician review/signature, configurable permissions, traceable data, built-in compliance.

**AI boundary (non-negotiable)**: AI is always assistive ("second reader / second opinion"). **All legally meaningful writes—diagnoses, orders, prescriptions, signed records—must be confirmed and e-signed by authorized clinicians.** The system does not practice autonomously.

---

## 2. Design Principles

1. **AI-Native**: data and flows are designed from the start for agent consumption, tool calls, context building, and human-AI collaboration.
2. **Transaction/intelligence separation, contract decoupling**: core transactions guarantee ACID; AI inference is fail/retry/degrade-able; AI outages never block care.
3. **Open standards, dual-track modeling**: FHIR externally; an evolvable clinical model (toward openEHR) internally; HL7 v2, DICOM, SNOMED/LOINC/ICD supported.
4. **Domain-driven microservices**: split by bounded context; independently deployable and scalable.
5. **Secure by design**: MLPS 2.0 Level 3, least privilege, masking by default, full audit, tenant isolation from day one.
6. **Strangler evolution**: no big-bang; replace by domain; every step runnable and reversible.
7. **High concurrency & availability**: stateless services, elastic scaling, event load-leveling, circuit breaking/rate limiting.
8. **Assemblable & extensible**: low-code for hospital IT to orchestrate agents, skills, and pages; contributable ecosystem.

---

## 3. Overall Architecture (Six Layers)

```
┌──────────────────────────────────────────────────────────────────────┐
│ L1 Access   API Gateway / BFF / Micro-frontends (Module Federation) / Clients │
├──────────────────────────────────────────────────────────────────────┤
│ L2 Core Transaction Layer (unified HIS+EMR cloud-native microservices, DDD)    │
│   Outpatient · Inpatient · Orders&Rx · Documentation · Billing · Pharmacy ·     │
│   Diagnostics · OR-Anesthesia · Archive · Scheduling                            │
├──────────────────────────────────────────────────────────────────────┤
│ L3 AI-Native Capability Middle Platform (cross-cutting)                        │
│   Agent Orchestration · Skills Marketplace · Knowledge · CDS · RAG · Voice · Imaging AI │
├──────────────────────────────────────────────────────────────────────┤
│ L4 Data Platform                                                                │
│   Clinical OLTP (PostgreSQL) · Lakehouse · MDM · Governance · Research Cohorts · Follow-up │
├──────────────────────────────────────────────────────────────────────┤
│ L5 Integration & Standards                                                      │
│   FHIR R4/R5 · openEHR · HL7 v2.x · DICOM · Adapters · Event Bus (Kafka)       │
├──────────────────────────────────────────────────────────────────────┤
│ L6 Platform & Security                                                          │
│   Identity & Authz (RBAC+ABAC) · Multi-tenant/Multi-campus · Observability · MLPS/Audit/Crypto │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. L2 Unified HIS + EMR Microservices

DDD by bounded context. Each service owns its data and logic; strong consistency inside a service; cross-service collaboration via **Saga / events with compensation**.

| Microservice | Responsibilities | Key Aggregates/Entities | Events (examples) |
|---|---|---|---|
| **Outpatient** | registration, triage, queues, encounters, outpatient diagnosis/record | Patient(light), Visit, QueueTicket, Diagnosis | `visit.registered/started/completed` |
| **Inpatient** | ADT, beds, wards, rounds, nursing | Admission, Bed, Ward, CarePlan | `patient.admitted/transferred/discharged` |
| **Orders & Rx** | order lifecycle, prescribing/review, execution, stop | Order, Prescription, Item | `order.placed` `rx.submitted/approved` `order.cancelled` |
| **Documentation** | records, documents, templates, signatures, QC | MedicalRecord, Template, Signature | `record.drafted/signed/quality-flagged` |
| **Billing** | charges, insurance, DRG-DIP settlement, receipts | Invoice, ChargeItem, Claim, Settlement | `charge.created` `claim.submitted` `settlement.completed` |
| **Pharmacy** | drug catalog, inventory, dispensing, monitoring | DrugCatalog, Inventory, Dispense, Audit | `drug.dispensed` `inventory.low` `interaction.warned` |
| **Diagnostics** | lab/imaging orders, reports, critical values, viewing | LabOrder/Result, ImagingOrder/Report | `result.available` `critical.value` |
| **OR-Anesthesia** | surgery booking, anesthesia eval/records, intra-op | SurgeryBooking, AnesthesiaRecord | `surgery.scheduled` `anesthesia.started` |
| **Archive** | front page, archiving, ICD/procedure coding, reporting | FrontPage, ArchivedCase, Coding | `case.archived` `coding.completed` |
| **Scheduling** | slots, rosters, beds/equipment/OR resources | Schedule, Slot, Resource | `slot.opened` `appointment.booked` |

> EMPI and org/staff/department master data are governed centrally (L4 MDM + L6 identity); services reference identifiers.

**Consistency**: local DB transactions within a service; orchestrated Sagas across services with compensations; critical medical writes use **state machines + dual signature** (e.g., high-risk Rx: prescribe → pharmacist review → execute).

---

## 5. L3 AI-Native Capability Middle Platform

Organized as **Capability + Skill + Tool**, embedded by the orchestrator, never holding final transaction authority.

### 5.1 Agent Orchestration
- multi-agent: single task agent, supervisor routing, sequential/parallel/master-slave, **MDT consultation**;
- intent classification → routing → context build → ReAct loop → aggregation;
- human-in-the-loop: high-risk actions become HumanTasks for approval/signature;
- sessions/messages/invocations persisted (`agent.*`).

### 5.2 Skills System & Marketplace
- a Skill is a packaged, versioned, hot-pluggable unit (prompt + tools + knowledge refs + I/O contract + risk level);
- built-in must-have packs: **AI scribe, AI record QC, voice EMR, smart triage, diagnosis support, medication/prescription review, critical-value management, result interpretation, follow-up, DRG-DIP coding assist, patient education**;
- low-code skill editor + marketplace: hospital IT builds/imports/publishes (private or community);
- skill signing & grading; high-risk skills force human confirmation and audit.

### 5.3 Medical Knowledge Middle Platform
- five knowledge levels: public → institutional/pathways → department → personal → patient instance;
- five-stage RAG: query understanding → hybrid retrieval (keyword+vector) → RRF fusion → rerank (authority/timeliness) → cited context;
- vector store + parsing/chunking + versioning; authoritative open knowledge continuously imported.

### 5.4 CDS
- rule engine: condition trees (AND/OR/NOT) + actions (alert/intercept/suggest/compute/fill-form);
- drug interactions, critical values, care standards, allergy/contraindications, dose checks;
- **active (non-blocking) alerts** and **blocking confirmations** (high-risk; reason + signature; override by authorized staff is logged).

### 5.5 Voice & Imaging AI
- voice EMR: real-time ASR + medical-term correction + structured entry;
- imaging AI: standalone model microservices (e.g., fused DAMO-RADAR abdominal CT), invoked via standard contracts; results are a "second reader," clinician-reviewed and signed.

> **Iron rule**: AI-generated writes first pass CDS/risk and authorization, then enter transaction services as "pending drafts/suggestions"; they become official only after clinician e-signature. AI never directly creates effective orders/prescriptions/diagnoses.

---

## 6. L4 Data Platform

### 6.1 Dual-Track Clinical Model
- **OLTP**: PostgreSQL relational model (5 schemas, 40 tables) for high concurrency;
- **High-fidelity (evolution)**: align to openEHR archetypes/templates—new concepts without schema changes;
- **Exchange**: map to FHIR R4/R5;
- bidirectional mapping ensures "capture once, use across standards."

### 6.2 Healthcare Lakehouse
- **lakehouse**: CDC → lake (ODS/DWD/DWS/ADS) → research/analytics;
- **MDM**: EMPI, org/staff/departments, drugs, billable items, terminology;
- **governance**: metadata, quality, lineage, standard coding, privacy tiers (L1–L4);
- **research cohorts & follow-up**: cohort building, disease-specific datasets, long-term follow-up for RWE.

### 6.3 Lifecycle
- classify on write; mask by default for display/export;
- versioned/time-aware records (full audit trail);
- backup/restore: full + WAL archiving + periodic restore drills.

---

## 7. L5 Integration, Standards & Event-Driven

- **standards**: FHIR (REST/subscription/bulk), openEHR REST + AQL, HL7 v2.x (ADT/ORM/ORU/MDM…), DICOM (C-STORE/C-MOVE, DICOMWeb QIDO/WADO/STOW);
- **adapter framework**: HIS/EMR/LIS/PACS adapters with retry, circuit breaker, timeout, field mapping, vendor profiles; explicit Mock before real integration (`INTEGRATION_USE_MOCK`);
- **event-driven**: Kafka (or viable broker) replacing the in-memory bus—topics, partitions, consumer groups, dead-letter queues, delayed delivery, idempotent consumption, transactional messages;
- **integration monitoring**: probes, success rate, P95, alerts, Prometheus export.

---

## 8. Multi-Tenancy & Multi-Campus

- **tenant isolation**: group/hospital as tenant; configurable row/schema isolation;
- **multi-campus**: campus tags on wards, departments, devices/beds; slots, inventory, rosters, reports per campus, consolidated at group level;
- **DataScope**: self/dept/campus/hospital/group enforced per query and UI via RBAC+ABAC;
- config/dictionaries/skills/knowledge support "group default + campus override."

---

## 9. High Concurrency & Availability

- **stateless** services; sessions externalized (Redis/DB); horizontal autoscaling;
- **traffic governance**: gateway rate limiting, circuit breaking, degradation; Redis for read-heavy paths;
- **load leveling**: peaks (registration, report returns, critical values) buffered via queues;
- **DB**: connection pools, read replicas, partitioning/index tuning, slow-query control;
- **resilience**: replicas, health checks, auto failover, canary/blue-green, rollback;
- **capacity**: designed for multi-campus tertiary hospitals (thousands of staff, tens of thousands of daily visits, thousands of concurrent), validated by real load tests, not theory.

---

## 10. Security & Compliance

| Area | Design |
|---|---|
| Authentication | unified identity, strongly signed/verified JWT, SSO; **MFA** (MLPS L3; UI ready, phase-2 integration) |
| Authorization | **RBAC + ABAC/DataScope**, configurable, least privilege, separation of duties (prescriber/reviewer) |
| Data protection | AES-256-GCM at rest, TLS in transit, **16 masking rules**, field-level permissions |
| Input security | multi-layer prompt-injection defense (100% on test set), SQL/XSS/command injection, parameterization |
| Audit | **hash-chained tamper-evident logs**, login logs, anomaly detection, record trace |
| Compliance | MLPS 2.0 L3, EMR grading, interoperability maturity, privacy/data export |
| Tenancy | tenant isolation, cross-tenant deny, tenant audit |

---

## 11. Cloud-Native Deployment

- **containers**: fixed-tag OCI images (non-root, minimal, SBOM);
- **orchestration**: Kubernetes (Deployment/StatefulSet, HPA, anti-affinity, PDB, NetworkPolicy); managed/StatefulSet for PG/broker/cache;
- **mesh/gateway**: Ingress/API gateway for TLS, routing, rate limiting; optional service mesh (mTLS, traffic, observability);
- **observability**: unified logs (auto-masked), metrics (Prometheus), tracing (OpenTelemetry/Jaeger), alerts;
- **delivery**: dev/test/prod separation, GitOps, IaC, CI/CD (typecheck → unit/coverage → integration → security scan → build → release);
- **three forms**: single-machine demo (docker-compose), private cloud (K8s), group multi-campus (multi-cluster/federation).

---

## 12. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Microservices/BFF | **TypeScript + Bun/Node** | same stack as frontend, fast, type-safe |
| Frontend | React 19 + Vite + Ant Design 5 + Zustand + Module Federation | micro-frontends, enterprise components |
| OLTP DB | **PostgreSQL 16** | reliable, JSONB, partitioning, extensions |
| Cache | Redis | sessions, cache, rate limiting, coordination |
| Event streaming | Kafka (RedPanda-compatible) | throughput, leveling, decoupling, event sourcing |
| Model services | Python (FastAPI) standalone | AI/imaging ecosystem; contract-based, no hard merge |
| Standards | FHIR R4/R5, openEHR, HL7 v2, DICOM | interoperability |
| Observability/Deploy | OpenTelemetry, Prometheus, Grafana, Jaeger, K8s | industrial ops |
| LLM | DeepSeek (pluggable providers) | real inference, abstracted/swappable |

---

## 13. Quality & Definition of Done (per milestone)

A milestone is done only when (**no mock/demo passed off as real**):

1. data truly lands in PostgreSQL; key writes read back and **survive restart** (psql evidence);
2. real LLM loop: streaming, tool calls (ReAct), persisted; clear errors when DB/LLM unavailable; demo only under explicit `DEMO_MODE` with watermark;
3. E2E positive + exception loops; unauthorized/timeout handled;
4. zero type errors, green unit/integration tests with coverage (≥85%), key E2E scenarios;
5. authorization/DataScope/tenant isolation tested; no high-risk security findings;
6. deployable (images/orchestration/docs; "works on download"), observable, reversible;
7. bilingual docs synced; license SBOM complete.

> Sequencing, scope per phase, acceptance, and rollback are detailed in the **Strangler Refactoring Roadmap**.
