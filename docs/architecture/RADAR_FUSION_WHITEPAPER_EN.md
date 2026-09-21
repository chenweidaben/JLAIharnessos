# DAMO-RADAR Industrial-Scale Hyper-Fusion — Fusion Architecture Whitepaper

> Hangzhou Jianlan Technology Co., Ltd. · JLAIharnessos Smart-Hospital Operating System
> Version v0.2.0-radar ｜ 2026-09
> Audience: architects, hospital IT (information department), radiology, SRE/ops, compliance & medical-device officers

---

## 0. Purpose and How to Read This Document

This is the **architecture-level authoritative description** of how DAMO-RADAR (an abdominal contrast-enhanced CT vision-language foundation model) is integrated into the Jianlan JLAIharnessos agent operating system as a **microservice hyper-fusion**. It answers four questions:

1. **Boundaries**: where the new Python inference service, the BFF adapter, and the frontend page each stop;
2. **Data flow**: how one full inference request travels from PACS DICOM to physician signature and audit;
3. **Principles**: why we keep the stacks heterogeneous and "contract before code", instead of embedding PyTorch into the Bun process;
4. **Resilience**: how the system degrades gracefully — never showing a blank screen or a confidently wrong result — when weights are missing, there is no GPU, or the inference service is down.

> The single source of truth is the sibling file [`docs/RADAR_FUSION_CONTRACT.md`](../RADAR_FUSION_CONTRACT.md). This document does not redefine fields; any field name, endpoint path, or threshold is **governed by the contract**. This document only explains the architecture.

> ⚕️ **Clinical red line**: in this system DAMO-RADAR is a **second reader / decision-support** tool. Its output is probabilities and structured findings. It does **not** auto-diagnose. It must be reviewed and signed off by a radiologist before entering the official report.

---

## 1. Background and Goals

### 1.1 Why "hyper-fusion" instead of "rewriting an AI radiology product"

JLAIharnessos already ships a complete in-hospital agent foundation: a BFF (Bun.serve, REST + WebSocket), RBAC + ABAC, four-tier data classification, audit hash-chains, a critical-value alert channel, and a web workbench (React 19 + AntD 5). DAMO-RADAR is a **trained Python / PyTorch deep-learning model** whose ecosystem (LAVIS, MONAI, nnU-Net, 3D-ResNet-style sliding-window inference) is natively bound to the Python stack.

"Industrial hyper-fusion" means: **neither rewrite the foundation nor force the model into the Node process**, but attach the "AI inference capability" as an independent microservice through a clean HTTP contract, reusing the foundation's auth, audit, alerting, frontend, degradation, and ops tooling.

### 1.2 Design goals (verifiable)

| Goal | Acceptance criterion |
|------|----------------------|
| Heterogeneous, not welded | Inference is a separate Python FastAPI process; BFF calls it only over HTTP + an internal token; process/runtime/language are decoupled |
| Zero-weight demo | Without weights or a GPU the system still boots and renders the full UI with deterministic demo results |
| Physician loop | AI reports must pass "approve/modify/reject + signature" into audit; an unsigned report may not enter the official record |
| End-to-end observability | Liveness/readiness probes, concurrency limiting, job timeout, log redaction in place |
| No regression | Full test suite does not drop after fusion (see §8) |

---

## 2. Service Boundary Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          In-hospital network / browser or in-hospital client │
└─────────────────────────────────────────────────────────────────────────────┘
                  │  HTTPS  (JWT + RBAC middleware)
                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BFF layer  (Bun.serve)                      port 8080                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Route src/bff/routes/imaging.ts  (prefix /api/v1/imaging/ai/*)       │  │
│  │  Adapter src/integration/adapters/radar/                              │  │
│  │     - translates frontend requests into Python REST calls             │  │
│  │     - injects X-Internal-Token                                        │  │
│  │     - on Python down: catalog falls back to built-in static catalog   │  │
│  │                       jobs fall back to deterministic mock            │  │
│  │     - RBAC middleware: imaging:view / imaging:ai:analyze / review    │  │
│  │     - review writes audit (memory + data/imaging-ai-jobs.json)        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                 │  HTTP + X-Internal-Token (intranet/loopback only)
                                 │  RADAR_INFERENCE_URL (default http://localhost:8090)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Inference microservice services/radar-inference/  (Python FastAPI) :8090    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  main.py (FastAPI) / auth.py (internal token) / catalog.py (18x146)  │  │
│  │  jobs.py (queue + concurrency semaphore RADAR_MAX_CONCURRENCY)       │  │
│  │  demo_engine.py      : no weights -> precomputed CSV, deterministic    │  │
│  │  production_engine.py: weights+GPU -> real inference (HU clip/resample/│  │
│  │                        sliding window)                                │  │
│  │  logging_redact.py  : log redaction, never print PHI                 │  │
│  │  vendor/damo-radar/  : upstream code vendor (Apache-2.0, LICENSE kept)│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                 │  read volume (NIfTI .nii.gz)
                                 ▼
        ┌─────────────────────────┴─────────────────────────┐
        │  PACS / imaging gateway                           │
        │  DICOM -> in-hospital conversion -> NIfTI(.nii.gz) │
        │  (conversion belongs to integration layer; not     │
        │   re-implemented in this service)                 │
        └───────────────────────────────────────────────────┘

  Secondary channel (alert):
     Python/BFF detects critical ──► reuse existing /ws/chat broadcast / alert center
                                  ──► critical-value push
```

**Boundary in one sentence**: the BFF never touches tensors or loads a model; the Python service never touches JWT or the in-hospital user system; the frontend never calls Python directly — everything is converged through the BFF.

---

## 3. End-to-End Data Flow (one abdominal contrast CT, start to finish)

Below is the standard flow: a radiologist opens an abdominal contrast CT → AI assists the report → review and signature.

```
① DICOM archived in PACS
        │  (in-hospital DICOM gateway / AET auto, or triggered manually by radiologist)
        ▼
② DICOM -> NIfTI(.nii.gz) conversion     [integration layer, reuses DICOM adapter]
        │  De-identification: isolate patient identity fields; reference by study_uid only
        ▼
③ POST /api/v1/imaging/ai/jobs           [frontend via BFF]
     body: { study_uid, source:"pacs|upload|demo", file_ref:"/path/to.nii.gz" }
        │  BFF checks imaging:ai:analyze, injects X-Internal-Token
        ▼
④ POST /api/v1/radar/jobs                [BFF -> Python :8090]
     returns 202 { job_id, status, mode }
        │
        ▼
⑤ Python inference engine
     ├─ demo mode: read vendor/damo-radar/RADAR_infer_results_demo.csv (deterministic)
     └─ production mode: preprocess per inference_demo.py
            HU clip [-300, 400] -> resample ref_spacing (1,1,5)
            -> ROI (96,256,384) sliding window -> 18 organs x 146 finding probs
        │  (bounded by RADAR_MAX_CONCURRENCY semaphore; timeout RADAR_JOB_TIMEOUT)
        ▼
⑥ Structured findings (146) + summary(critical/major/minor/positive counts)
     each: { key, organ_zh, name_zh, name_en, probability, positive, tier }
     positive = probability >= RADAR_POSITIVE_THRESHOLD (default 0.5)
        │
        ▼
⑦ Frontend GET /imaging/ai/report/:studyUid  [BFF passes through job + RadarResult]
     left: 18-organ nav (positive-count badge per organ)
     right: 146 findings list; positive highlighted / critical red / major orange
     header: model=damo-radar / model_version=eaec6129 / mode / time / disclaimer
        │
        ├──► if any critical finding ──► ⑧ critical-value push (reuse alert channel /ws/chat)
        ▼
⑨ Radiologist review & signature  POST /api/v1/imaging/ai/jobs/:id/review
     body: { verdict:approve|modify|reject, comment?, report_text?,
             signer_id, signer_name, ca_signature? }   perm imaging:ai:review
        │
        ▼
⑩ Audit trail  { reviewed_at, signer_id, audit_id, verdict }
     written to audit (hash chain), persisted to data/imaging-ai-jobs.json;
     resubmission disabled after submit; only then may content enter the official report.
```

**Key invariants**:
- Any AI content entering the official report must have a signed `review` record on the audit chain;
- Raw DICOM / NIfTI are never written into model-weight storage, nor is any "big data" sent externally;
- The Python service only sees `study_uid` and `file_ref`, never plaintext patient name/ID (de-identification happens in the integration layer).

---

## 4. Heterogeneous Stacks Without Welding: Design Principles

This is the most commonly misunderstood part of the fusion; it deserves its own section.

### 4.1 Principle 1: process boundary = runtime boundary

| Layer | Runtime | Language | Responsibility |
|-------|---------|----------|----------------|
| BFF / orchestration / tools | Bun | TypeScript | auth, audit, routing, business orchestration, WebSocket, RBAC |
| Web workbench | Node (Vite) | React 19 + TS | presentation, signature loop, degraded UI |
| Inference microservice | CPython | Python 3 / FastAPI | tensors, model loading, sliding-window inference, concurrency limiting |

**Why not bind the model into Bun via native addons?**
- DAMO-RADAR depends on PyTorch, CUDA, LAVIS, and the MONAI ecosystem — there is no mature interop with Bun/Node;
- An OOM or CUDA driver crash must not take down the BFF process that carries hospital-wide business;
- GPU scheduling, VRAM, and batching are inherently a separate service's job.

### 4.2 Principle 2: contract before code

- Fields, endpoints, error bodies, and thresholds for the three parties are written **only** in `docs/RADAR_FUSION_CONTRACT.md`;
- BFF, Python, and frontend develop and test independently, aligned via the contract (JSON Schema / OpenAPI);
- Changing a field means changing the contract first, then the code — no "frontend changes first, backend quietly follows".

### 4.3 Principle 3: single responsibility, replaceable

- The BFF adapter `src/integration/adapters/radar/` is the **only** place that knows the Python endpoint shape;
- If a different imaging model replaces DAMO-RADAR later, only the adapter + backend service change — frontend and auth are untouched;
- `demo_engine` and `production_engine` implement the same `RadarResult` interface, so the backend engine can be swapped painlessly.

### 4.4 Principle 4: no heavy new frontend deps

The frontend reuses existing React 19 + antd 5 + zustand only; no new deep-learning wasm, no in-browser inference. All heavy lifting stays inside the Python service.

---

## 5. Degradation Strategy

A medical system must ensure: **when any piece is missing, the clinician never sees a blank screen or a result that looks certain but is wrong**. The fusion has three tiers of degradation.

### 5.1 Startup-time degradation: missing weights auto-demo

- On boot the service detects whether `models/radar/checkpoint_radar_pretrain.pth` exists and whether torch/CUDA are available;
- Missing weights / GPU / torch → **automatically start in demo mode**, load the precomputed CSV, and `/health/ready` returns `status:"degraded", mode:"demo"`;
- The license notice (weights are CC BY-NC-SA 4.0 non-commercial) is logged and exposed in the readiness probe.

### 5.2 Runtime degradation: inference service unavailable

| Endpoint | Normal | BFF behavior when Python is down |
|----------|--------|----------------------------------|
| `GET /imaging/ai/catalog` | pass-through Python catalog | return **built-in static catalog** so the frontend never blanks |
| `GET /imaging/ai/jobs/:id` | pass-through job + result | return **deterministic mock** (same numbers as Python demo); UI shows a "demo data" watermark |
| `POST /imaging/ai/jobs` | forward to queue | graceful failure, structured error body (`{code,message,traceId}`), never leak stack traces |

### 5.3 Frontend degradation

- Empty / loading / error-boundary / offline states are all present;
- Every degraded state carries an explicit **watermark or badge** (e.g. "demo data"), preventing demo output from being mistaken for a real diagnosis;
- The signature loop still requires a radiologist signature in degraded mode (demo data is also audited, flagged as demo).

### 5.4 Security degradation

- When `RADAR_INTERNAL_TOKEN` is unset, the Python service **only accepts loopback (127.0.0.1) calls**;
- If either side is unconfigured, cross-host calls are rejected, preventing intranet bypass of auth to the inference port.

---

## 6. Port Matrix

| Service | Process / runtime | Port | Protocol | Exposure | Notes |
|---------|-------------------|------|----------|----------|-------|
| BFF | Bun.serve | **8080** | HTTP + WebSocket | sole entry for browser/in-hospital client | converges auth, routing, audit, alerting |
| Web workbench | Vite (dev) | **5173** | HTTP | dev / intranet only | in prod served statically / via reverse proxy; 5173 not exposed |
| radar-inference | Python Uvicorn/FastAPI | **8090** | HTTP | **intranet/loopback only**, never public | health probes unauthenticated; business endpoints require `X-Internal-Token` |

> In production, the reverse proxy / security group should **only allow 8080** (and 5173 for dev only); 8090 should be reachable only from the BFF host or an intranet segment.

---

## 7. Containers and Deployment Shapes (overview)

- docker-compose ships two profiles:
  - `demo`: CPU image, **no weight volume mounted**, boots straight into demo;
  - `gpu`: mounts `./models/radar:/models`, requires weights in place + GPU runtime;
- The weight volume `./models/radar/` is gitignored and **never committed**;
- The root compose adds the `radar-inference` service but does not grab an external port by default;
- The BFF talks to it via `RADAR_INFERENCE_URL` (default `http://localhost:8090`) and `RADAR_INTERNAL_TOKEN`.

> Full install steps, weight download, intranet/offline deployment, and hardware requirements are in the companion [`docs/deployment/RADAR_DEPLOYMENT_INSTALL_EN.md`](../deployment/RADAR_部署安装手册_EN.md).

---

## 8. Test Baseline (real post-fusion numbers)

At the time of this fusion delivery, the full regression stayed at the real baseline below (numbers are the measured run, not targets):

| Suite | Runner | Passing |
|-------|--------|---------|
| Backend unit/integration | `bun test` | **1184** passing |
| Frontend components/interaction | `vitest` | **201** passing |
| Inference service | `pytest` | **19** passing |
| Type check | `tsc` | **0 errors** |

The inference-service pytest covers: health checks, catalog structure (18 organs / 146 findings), job submission and status polling, demo-result contract schema, auto-degradation without weights, internal-token auth rejection, log redaction, and concurrency limiting.

---

## 9. Relationship to Upstream and the Open-Source Ecosystem

- Upstream: `alibaba-damo-academy/damo-radar` (Apache-2.0 code), vendored at `services/radar-inference/vendor/damo-radar/`, keeping its `LICENSE` and `THIRD_PARTY_LICENSES.md`;
- Paper: Qi Zhang et al., *An expert-level generalist AI for abdominal CT diagnosis*, **Science 393(6817):eaec6129, 2026**, DOI 10.1126/science.aec6129;
- Weights `checkpoint_radar_pretrain.pth`: **CC BY-NC-SA 4.0 (non-commercial)**, ~5 GB, downloaded out-of-band by the deployer via `download_weights.sh`;
- Transitive ecosystem: LAVIS, nnU-Net, MONAI, 3D-ResNet-style sliding-window inference. Attribution and compliance are detailed in [`docs/open-source/RADAR_LICENSE_COMPLIANCE_EN.md`](../open-source/RADAR_许可与合规声明_EN.md).

---

## 10. Companion Documentation Index

| Topic | Document |
|-------|----------|
| Single contract source of truth | [`docs/RADAR_FUSION_CONTRACT.md`](../RADAR_FUSION_CONTRACT.md) |
| BFF↔Python endpoints / permission codes / config | [`docs/open-source/RADAR_FUSION_INTEGRATION_EN.md`](../open-source/RADAR_融合集成说明_EN.md) |
| Install / weights / offline deploy / hardware | [`docs/deployment/RADAR_DEPLOYMENT_INSTALL_EN.md`](../deployment/RADAR_部署安装手册_EN.md) |
| Dual-track license / commercial licensing / device compliance | [`docs/open-source/RADAR_LICENSE_COMPLIANCE_EN.md`](../open-source/RADAR_许可与合规声明_EN.md) |
| In-house fine-tuning / local validation / drift monitoring | [`docs/requirements/RADAR_TRAIN_FINETUNE_EVAL_REPRO_EN.md`](../requirements/RADAR_训练微调评估复现指南_EN.md) |

---

*Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd. · DAMO-RADAR Industrial Hyper-Fusion Architecture Whitepaper*

*This document is an architecture description and does not constitute a medical-device diagnosis conclusion; any AI output must be reviewed and signed off by a radiologist.*
