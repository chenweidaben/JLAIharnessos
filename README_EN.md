<div align="center">

# jlmedaios · Jianlan Tech AI-Native Future Hospital Operating System

### Microservice Cloud-Native HIS·EMR Integrated Platform — The New Engine for High-Quality Smart-Hospital Development for the Next Fifteen Years

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

**jlmedaios** is the **AI-Native Future Hospital Operating System** built by Jianlan Tech (Hangzhou Jianlan Technology Co., Ltd.) for the next fifteen years of high-quality smart-hospital development: an open-source, free, production-grade hospital agent operating system on a microservice cloud-native architecture with integrated HIS·EMR.

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

## 🏃 Quick Start

**Requirements**: Bun ≥ 1.3, Node.js ≥ 18, Docker (optional, for one-command PostgreSQL/Redis).

```bash
git clone <repo-url>.git
cd jlmedaios
bun install
cp .env.example .env          # set JWT_SECRET, DATABASE_URL, LLM_API_KEY etc.

docker compose up -d postgres redis   # dependencies
bun run db:seed                       # drug/ICD/lab/clinical-pathway seeds

bun run bff                           # BFF: REST 8080 + WebSocket
cd web && bun install && bun run dev  # workbench at http://localhost:5173
```

**Container deployment**:

```bash
docker compose up -d                      # full stack (gateway+BFF+web+PG+Redis)
kubectl apply -f deploy/k8s/             # Kubernetes manifests
helm install jlmedaios deploy/helm/jlmedaios -n jlmedaios --create-namespace
```

> Zero-DB demo: start the BFF with `DEMO_MODE=1` to use in-memory data with a demo watermark (non-persistent) — demonstration only.

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
