<div align="center">

# jlmedaios · Jianlan AI-Native Hospital OS

### Microservice Cloud-Native HIS·EMR Integrated Platform — The New Engine for High-Quality Smart-Hospital Development for the Next Fifteen Years

> Formal Chinese name: **健澜AI原生医院操作系统OS** · English name: **Jianlan AI-Native Hospital OS** · repository code name `jlmedaios`.

[![License](https://img.shields.io/badge/License-Apache--2.0-0A2540.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%20%2B%20TypeScript-0A2540.svg)](https://bun.sh/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20AntD%205-0A2540.svg)](https://react.dev/)
[![Database](https://img.shields.io/badge/DB-PostgreSQL%2016%20%2B%20pgvector-0A2540.svg)](https://www.postgresql.org/)
[![Cloud](https://img.shields.io/badge/Deploy-Docker%20%2F%20K8s%20%2F%20Helm-0A2540.svg)](deploy/)
[![Security](https://img.shields.io/badge/Security-Classified--Protection--Level--III-1B4F8B.svg)](SECURITY.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-2E6FB7.svg)](CONTRIBUTING.md)

> Brand primary color: **Deep Sea Blue** (`#0A2540`), used across all badges, branding assets and document visuals.

**An operating system where a hospital IT department can build its own agents: AI note drafting, medication-safety review, differential diagnosis, pathway recommendation, length-of-stay & cost prediction… on a microservice cloud-native foundation with an AI-native capability platform — private deployment, data never leaves the hospital.**

[简体中文](README.md) · [Positioning](#-positioning) · [Capability Matrix](#-core-capability-matrix) · [Quick Start](#-quick-start) · [Feature Panorama](#-feature-panorama) · [Open Collaboration](#-open-collaboration) · [Security](#-safety--medical-red-lines)

</div>

---

## 🧭 Positioning

**jlmedaios** (Jianlan AI-Native Hospital OS) is the AI-native hospital operating system built by Hangzhou Jianlan Technology Co., Ltd. for the next fifteen years of high-quality smart-hospital development: an open-source, production-grade hospital agent operating system on a microservice cloud-native architecture with integrated HIS·EMR.

It is not another point AI assistant. It deeply integrates the **core clinical transaction system** (outpatient, inpatient ADT, ED, orders, notes, pharmacy, billing, lab/imaging, surgery & anesthesia) with an **AI-native capability platform** (agent orchestration / skill marketplace / knowledge platform / CDS / RAG):

- **Downward**: unified clinical data, master index (EMPI) and external-system integration;
- **Core**: cloud-native microservices carry hospital transactions — state machines, row locks and idempotency guarantee concurrent safety;
- **Upward**: the AI platform crosscuts every clinical step with ready-to-use agents, physician review-and-sign, compliance built-in;
- **Throughout**: RBAC + ABAC, field-level encryption, tamper-evident audit hash chain, full traceability.

> 🔬 **Lab stage**: this project lives in the **Jianlan Tech Frontier Lab for Medical Large Models and Applications**. Universities, research institutes, peer vendors, hospital IT departments and clinical experts are all warmly invited to co-build and bring medical AI from the lab to scaled deployment.

> ⚕️ **Medical red line**: AI is always an assist (second opinion). Every legally binding write action — diagnosis, orders, prescriptions, note signatures — must be confirmed and e-signed by an authorized clinician. The system never practices autonomously.

---

## 🚀 Core Capability Matrix

| Domain | Modules | Description |
|---|---|---|
| 🧠 **Agent Orchestration** | Visual canvas · DAG workflow · Agent Package | Declarative DSL, human-in-the-loop, versioned & portable `agent.yaml` |
| 🛒 **Skill Marketplace** | Medical skill registry · risk-tiered · hot-reload | Install medical skills like apps, with unified permission model |
| 📚 **Knowledge Platform** | Ingestion · hybrid vector+keyword retrieval · citation trace | Parse → chunk → embed → store, RAG citations traceable |
| 💊 **CDS** | Medication-safety review · critical-value loop · hot rules | Active alerts + interrupt-on-confirm, deterministic rules |
| 📝 **EMR Tier-5 Documents** | Admission/progress/discharge/homepage/consent notes | Three-level signing, rejection-and-rectification state machine |
| 🌐 **Internet Hospital** | Slots · online reports · refill · payment · delivery · notifications | WeChat mini-program patient side, verified identity, field encryption |
| 🚑 **ED Green Channel** | Level triage · green channel · resuscitation · observation | Full-chain time-node QA state machine |
| 🩸 **Specialty QA** | VTE · AMS stewardship · infection control | Caprini/Padua scores, DDD metrics, infection dashboards |
| 🏥 **Surgery & Anesthesia** | Request · preop eval · intraop record · PACU dual-sign | Nine-state machine, triple-check, dual-nurse release |
| 🧪 **Lab & Imaging** | LIS workflow · RIS · AI-assisted interpretation | Specimen barcode loop, dual-sign report release, clinician-sign |
| 📱 **Mobile Nursing PDA** | Wristband scan · 5-rights check · vitals · SBAR handoff | Bedside execution, offline queue, manual conflict resolution |
| 🛡️ **Security & Compliance** | Class-Protected-Level-III design · MFA · audit hash chain · masking | AES-256-GCM, 16 PII classes masked, revocable JWT |
| 📦 **Cloud-Native Base** | Docker · K8s · Helm · HPA/PDB/NetworkPolicy | Non-root multi-stage images, optional mesh & canary rollout |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  L1 Access    Web Workbench (React19+AntD5) · PDA · Mini-Program │
├─────────────────────────────────────────────────────────┤
│  L2 Core Tx   Outpatient · ADT · ED · Orders · Notes     │
│               Pharmacy · Billing · Surgery · Lab · Nursing │
├─────────────────────────────────────────────────────────┤
│  L3 AI Platform  Orchestration · Skill Market · RAG KB   │
│                  CDS Rules · Voice ASR · Pluggable LLM    │
├─────────────────────────────────────────────────────────┤
│  L4 Data   PostgreSQL 16 (+pgvector) · Redis · Lakehouse │
├─────────────────────────────────────────────────────────┤
│  L5 Standards  HL7 v2 · FHIR R4 · DICOM · HIS/LIS/PACS adapters │
├─────────────────────────────────────────────────────────┤
│  L6 Security   RBAC+ABAC · Encryption/Masking · Audit Hash Chain │
└─────────────────────────────────────────────────────────┘
```

**Traits**: microservice cloud-native, front/back separation, unified BFF; TypeScript + Bun single language stack; transactions commit together with the audit hash chain; LLM pluggable via an OpenAI-compatible endpoint (DeepSeek or on-prem models interchangeable).

---

## 🧩 Architecture & Measured Inventory (local command statistics, reviewed 2026-10)

The mainline is the **Bun + TypeScript BFF (`src/bff/`, port 8080) + React workbench (`web/`)**. `services-java/`, `services-python/`, `services/radar-inference/` and `miniprogram/` are **sidecar / reference implementations**: they are kept in the repository, are not merged into the mainline, and are not started by the default compose orchestration.

| Component | Role | Stack | Measured scale | Port (container / host) |
|---|---|---|---|---|
| TS BFF | **Mainline** | Bun + TypeScript (`src/bff/`) | 5084 registered REST routes (unique method+path; 5211 expanded entries incl. 127 duplicate registrations pending cleanup); 2402 route files, 1945 aggregator pure-function modules (`audit-bff.mjs` static audit, snapshot 2026-10-25) | 8080 / `127.0.0.1:8080` |
| React workbench | **Mainline** | React 19 + Vite + AntD 5 (`web/`) | 3048 `<Route path=` mounts after closure dedup, 2847 distinct paths (`web/src/router/index.tsx`, snapshot 2026-10-25; pre-dedup snapshot 3052; mount count ≠ page count) | Container 8080; Vite dev 5173 |
| Java microservices | Sidecar / reference, excluded from default mainline orchestration | Spring Boot 3.3.5 + Spring Cloud 2024.0.0 + JDK 17 (aggregator); standalone monolith Boot 3.5.3 / JDK 21 | Aggregator: 14 modules, 15 `pom.xml`, 75 `.java`; standalone monolith: 1 `pom`, 767 `.java` (main 650 + tests 117); combined: 842 `.java`, 16 `pom.xml` | registry 8761, gateway 9000, services 9101–9112; monolith 9090 (host `127.0.0.1:19090`, `legacy` profile) |
| Python FastAPI | Sidecar / reference, `legacy` profile | FastAPI + Uvicorn (`services-python/`) | 92 source `.py` + 2 tests; 84 `APIRouter()` declarations, 103 route decorators (GET 16 / POST 87), 83 `include_router` mounts | 8000 / `127.0.0.1:8000` |
| Radar inference | Sidecar / reference, `demo` / `gpu` profile | FastAPI (`services/radar-inference/`) | 18 own `.py` (app 10 + tests 8); 5 endpoints (GET 4 / POST 1) | 8090 (internal expose only, not published to host) |
| WeChat mini-program | Sidecar / reference, native mini-program, not part of compose | Native mini-program (`miniprogram/`) | 8 pages; AppID placeholder `touristappid` | — |
| SQL migrations | Mainline companion | `deploy/postgres/init/**` | 354 scripts, sequence 01–385 (historical gaps and 5 duplicate sequence numbers remain cleanup backlog) | — |

**Standalone build prerequisites for sidecars**: Java aggregator needs Maven + JDK 17; the standalone monolith needs Maven + JDK 21; `services-python` needs a Python 3.11 virtualenv with `requirements.txt` installed; `radar-inference` demo mode needs the CPU requirements, production mode additionally needs `requirements-prod.txt` (GPU weights); the mini-program is built with WeChat DevTools. On this machine Maven and Docker are absent, the `services-python` dependencies are not installed, and no sidecar Docker image was built; the radar demo virtualenv exists locally for an import-level smoke check only.

---

## 🏃 Quick Start

**Requirements (verified on this machine, 2026-10)**: Node.js ≥ 18 (local v22.23.2), Bun ≥ 1.3 (note: the locally installed Bun 1.2.0 is below the `package.json` engines floor; upgrade before development), PostgreSQL 16 (compose default loopback port **5432**, database `jlmedaios`). Maven and Docker CLI are **not** installed on this machine: the Java/Python/radar sidecars cannot be built standalone locally, and `docker compose` cannot be executed locally. The mainline BFF and frontend commands below do not require Maven or Docker.

```bash
git clone https://gitcode.com/jlmedaios/jlmedaios-os.git   # GitHub mirror: https://github.com/chenweidaben/JLAIharnessos
cd jlmedaios-os
bun install
cp .env.example .env          # fill JWT_SECRET, DATABASE_URL, LLM_API_KEY etc.; sample values are never real secrets

docker compose up -d postgres redis   # dependencies (Docker required)
bun run db:seed                       # drug/ICD/lab/clinical-pathway seeds

bun run bff:watch                     # BFF dev watch mode: REST 8080 + WebSocket
cd web && bun install && bun run dev  # workbench at http://localhost:5173
```

**Mainline health probes** (BFF on port 8080):

| Endpoint | Method | Purpose |
|---|---|---|
| `http://localhost:8080/health` | GET | Liveness probe (always returns `ok`, no sensitive detail leaked) |
| `http://localhost:8080/ready` | GET | Readiness probe (checks database connectivity; returns 503 when dependencies are not ready) |
| `http://localhost:8080/metrics` | GET | Prometheus metrics |
| `http://localhost:8080/api/v1/system/health` | GET | Detailed system health |

**Key environment variables** (BFF runtime `.env`; full list and defaults in [`.env.example`](./.env.example)):

| Variable | Sample | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres@127.0.0.1:5432/jlmedaios` | Local PostgreSQL connection string |
| `HTTP_PORT` | `8080` | BFF port |
| `DEMO_MODE` | `0` | `0` = real database; `1` = in-memory demo only (must be `0` in production) |
| `JWT_SECRET` | `CHANGE_ME_jwt_secret_...` | HS256 signing secret (≥32 random bytes, required in production) |
| `ENCRYPTION_MASTER_KEY` | `CHANGE_ME_encryption_master_key_...` | Field-level AES-256-GCM master key (issued by KMS in production) |
| `REDIS_URL` / `KAFKA_BROKERS` / `ES_URL` | see `.env.example` | Internal cache / message bus / log-search connection placeholders |
| `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_BASE_URL` | `deepseek` / `sk-placeholder-...` | LLM provider (OpenAI-compatible protocol; prefer on-prem endpoints) |
| `RADAR_INFERENCE_URL` / `RADAR_INTERNAL_TOKEN` | `http://localhost:8090` / `CHANGE_ME_...` | Radar sidecar address and internal auth token |

**Container deployment** (Docker Engine + Compose plugin required; orchestration variables: see `.env.compose.example`):

```bash
docker compose up -d                      # mainline only; legacy/demo/gpu sidecars are NOT started by default
# sidecars are launched explicitly by profile, e.g.:
# docker compose --profile legacy up -d jlmedaios-monolith jlmedaios-ai
kubectl apply -f deploy/k8s/             # Kubernetes manifests
helm install jlmedaios deploy/helm/jlmedaios -n jlmedaios --create-namespace
```

> Zero-DB demo: start the BFF with `DEMO_MODE=1` to use in-memory data with a demo watermark (non-persistent) — demonstration only; this mode short-circuits authentication and must never be used for production or any externally exposed environment.

---

## 🧩 Feature Panorama

### The AI-Native Five Blades

| Agent | Capability | Landing point |
|---|---|---|
| 📄 Note Drafting | Auto-drafts admission/progress notes from visit context | Physician reviews then signs into chart |
| 💊 Medication Review | Interactions, incompatibilities, contraindications, dosing | Real-time alert/intercept at order & prescription |
| 🔍 Differential Diagnosis | Suggests differentials & workup from H&P | Reference only; never autonomous diagnosis |
| 🛤️ Pathway Recommendation | Standard pathway & variance management by diagnosis | Execution and deviations fully logged |
| 📈 LOS & Cost Prediction | Predicted length-of-stay and cost range | Bed scheduling & cost control support |

### MEDMUSE Role-Agent System (M89–M91)

| Milestone | Latest progress |
|---|---|
| **M89 Role-agent system** | 8 role-based agent personas (admin / doctor / nurse / pharmacist / finance / patient, etc.) with 14+ built-in role tools: pre-prescription review, DRG/DIP over-spend summary, follow-up reminders, nursing records, ward-round handoff reports; RBAC role/permission guards enforce the approval guardrail — critical-level items prohibit self-approval and require cross-role sign-off |
| **M90 Real data wired in** | AI note QC and nursing-plan recommendation now run on real visit / diagnosis data — no longer demo mock data |
| **M91 Deep-sea-blue VI** | Dashboard, patient, prescription and pharmacy UIs unified on the Deep Sea Blue palette `#0A2540` / `#1E5F8C` / `#4A90D9` |
| **/medmuse workbench** | The role-agent chat page embeds approval cards — clinicians and pharmacists can approve or reject pending items directly in the conversation flow |
| **Dual-platform sync** | Repository mirrored on both GitCode and GitHub |

### Clinical Business Lines

| Line | Closed-loop capabilities |
|---|---|
| **Outpatient** | Registration, triage, consultation, orders, pharmacist review, smart triage/pre-visit Q&A, satisfaction survey |
| **Inpatient ADT** | Admit/discharge/transfer, beds, rounds, nursing records, dual-sign order execution, discharge planning & follow-up |
| **Emergency** | Level 1–4 triage, green channel, resuscitation, observation, time-node QA |
| **Pharmacy** | Dispensing, inventory sync, prescription review, medication counseling |
| **EMR Tier-5** | Admission/surgery/progress/discharge notes, medical record homepage, consent forms; three-level sign, content QC, defect-rectification loop |
| **Insurance Dual-Track** | DRG + DIP local grouping, budgeting, cost attribution, settlement analytics & reports (local recomputable, no external insurance connection) |
| **Nursing** | Nurse station, nursing records, order execution, pressure-injury/fall/pain/Barthel scales, SBAR handoff, tube care, PDA mobile execution |
| **Internet Hospital** | Slot booking, online reports, refill consults, online payment & e-invoice, drug delivery (pickup/express), visit notifications |
| **Specialty QA** | VTE assessment & prevention loop, AMS antibiotic stewardship, infection-control dashboard, real-time critical-value event loop |
| **Surgery & Anesthesia** | Scheduling, preop assessment, triple-check, induction/intraop/maintenance, PACU scoring, dual-sign release |
| **Lab & Imaging** | LIS request-specimen-result-report loop, RIS scheduling, AI-assisted lab/imaging interpretation (effective after physician signature) |
| **Blood Bank** | Request-crossmatch-dispense-transfusion-reaction loop; utilization rationality & efficacy review |
| **Management & Data** | Multi-tenant/multi-campus, EMPI, research cohorts, lakehouse layering, data-quality & privacy-tier governance, executive dashboard |
| **System Admin** | Users/roles/permissions, audit & login logs, session management & JWT revocation, MFA |

---

## 🤝 Open Collaboration

The project is in the **Jianlan Tech Frontier Lab for Medical Large Models and Applications** stage, with a fully open posture:

- 🏥 **Hospitals**: IT depts & clinicians co-build scenario agents — private, auditable, data stays in-house;
- 🎓 **Universities & Research Institutes**: a complete medical-AI research base with simulated clinical data for projects, papers and joint training;
- 🧑‍💻 **Peers & Developers**: plug in via standard Agent Packages — a tool, a CDS rule, an agent template all count;
- 🧩 **Ecosystem Partners**: co-build HL7 / FHIR / DICOM adapters and medical model services.

Directions: joint labs, joint research, product co-creation, source contributions, academic publishing. Reach Jianlan Tech via an Issue or official channel.

---

## 🔒 Safety & Medical Red Lines

- AI output is advisory; **final clinical decisions rest with the treating physician**; all binding writes require e-signature;
- Classified-Protection-Level-III design: RBAC+ABAC, field-level AES-256-GCM, masking for 16 PII classes;
- Tamper-evident audit hash chain (BEFORE-INSERT trigger), business and audit commit in one transaction;
- DB-down fails loud with a watermark — never a white screen, never silent fake data; unauthorized access always 403;
- Report security issues privately per [SECURITY.md](SECURITY.md) — please do not open public issues.

---

## 📄 License & Copyright

- Code under [Apache License 2.0](LICENSE); data licensing is separate — read [DATA_LICENSES.md](DATA_LICENSES.md) before use;
- Third-party attributions: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) and [NOTICE](NOTICE);
- This software is an assistive decision-support and efficiency tool, not a diagnostic medical device. Deployers must complete data-compliance, security assessment and clinical validation under local law.

<div align="center">

**Hangzhou Jianlan Technology Co., Ltd. (Jianlan Tech) · Making Medical AI Simpler and Landable**

</div>
