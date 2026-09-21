# DAMO-RADAR Fusion Integration Guide

> Hangzhou Jianlan Technology Co., Ltd. · JLAIharnessos
> Version v0.2.0-radar ｜ 2026-09
> Audience: BFF backend engineers, frontend engineers, integration engineers, hospital IT

This is the **endpoint-by-endpoint integration manual** for DAMO-RADAR with JLAIharnessos. The single source of truth for fields, paths, and thresholds remains [`docs/RADAR_FUSION_CONTRACT.md`](../RADAR_FUSION_CONTRACT.md); this document adds copy-pasteable request/response samples, permission codes, and configuration.

---

## 1. Capability Contract: 18 Organs / 146 Findings

### 1.1 Model capability boundary

- Modality: **abdominal contrast-enhanced CT**;
- Output: **146 clinical findings** across 18 organs/anatomical structures, each with a probability `0.0~1.0`;
- Nature: **probabilities and structured findings** as a second-reader reference; no automatic diagnosis conclusion.

### 1.2 The 18 organs (Chinese key, fixed order, immutable)

| # | Organ key | # | Organ key |
|---|-----------|---|-----------|
| 1 | 主动脉 (Aorta) | 10 | 肾上腺 (Adrenal gland) |
| 2 | 十二指肠 (Duodenum) | 11 | 胃 (Stomach) |
| 3 | 大肠 (Large intestine) | 12 | 胆囊 (Gallbladder) |
| 4 | 小肠 (Small intestine) | 13 | 胰腺 (Pancreas) |
| 5 | 心脏 (Heart) | 14 | 脾 (Spleen) |
| 6 | 肋骨 (Ribs) | 15 | 膀胱 (Bladder) |
| 7 | 肝 (Liver) | 16 | 门静脉 (Portal vein) |
| 8 | 肺 (Lung) | 17 | 食管 (Esophagus) |
| 9 | 肾 (Kidney) | 18 | 骶骨 (Sacrum) |

> The full 146-finding list (`key / organ_zh / name_zh / name_en`) is parsed at service start from `app/data/radar_contract.json` (root `.radar-contract.json`). It is **not hand-copied here** to avoid drift from code. Call `GET /api/v1/radar/catalog` for the authoritative list during integration.

### 1.3 Single finding object

```json
{
  "key": "肝_肝细胞癌",
  "organ_zh": "肝",
  "name_zh": "肝细胞癌",
  "name_en": "Liver_Hepatocellular carcinoma",
  "probability": 0.87,
  "positive": true,
  "tier": "critical"
}
```

### 1.4 Positive rule and tiering

- **positive**: `probability >= RADAR_POSITIVE_THRESHOLD` (default `0.5`);
- **tier** (built-in curated set, a Python service constant, overridable by env):
  - `critical`: malignancies / acute emergencies. Built-in examples: hepatocellular carcinoma, cholangiocarcinoma, gallbladder cancer, pancreatic cancer, gastric cancer, colon cancer, rectal cancer, small-bowel lymphoma, renal cell carcinoma, renal-pelvis cancer, bladder cancer, splenic lymphoma, lung mass/lung metastasis, metastases to any organ, aortic dissection, appendicitis, splenic infarction, bowel perforation, intussusception, portal-vein thrombosis;
  - `major`: among remaining positives, those with `probability >= RADAR_MAJOR_THRESHOLD` (default `0.6`);
  - `minor`: the rest of the positives.

> Thresholds and the critical set **must** be overridable via env/config so the hospital can tune them to its own reading practice (see §5).

---

## 2. BFF ↔ Python Inference Contract (endpoint by endpoint)

The Python service defaults to port `8090`. Internal auth header: `X-Internal-Token: $RADAR_INTERNAL_TOKEN` (BFF and service share the same secret; if either is unset, non-local calls are rejected). Health endpoints are unauthenticated (for probes).

### 2.1 `GET /health/live`

Liveness probe, unauthenticated.

```
-> 200 {"status":"ok"}
```

### 2.2 `GET /health/ready`

Readiness probe, unauthenticated. Reports current mode and weight/GPU state.

```json
{
  "status": "ready | degraded",
  "mode": "demo | production",
  "weights_loaded": false,
  "gpu_available": false,
  "model": "damo-radar",
  "model_version": "eaec6129"
}
```

- `mode=demo` and `status=degraded`: no weights/GPU, precomputed CSV loaded;
- `mode=production` and `status=ready`: weights loaded, GPU available.

### 2.3 `GET /api/v1/radar/catalog`

Authenticated. Static catalog; the first-screen frontend render depends on it.

```json
{
  "organs": [
    { "key": "肝", "name_zh": "肝", "name_en": "Liver",
      "findings": [ { "key": "肝_肝细胞癌", "name_zh": "肝细胞癌", "name_en": "Liver_Hepatocellular carcinoma" } ] }
  ],
  "positive_threshold": 0.5,
  "critical_findings": ["肝_肝细胞癌", "胰_胰腺癌"]
}
```

### 2.4 `POST /api/v1/radar/jobs`

Authenticated. Submit an inference job.

Request:

```json
{ "study_uid": "...", "source": "pacs | upload | demo", "file_ref": "/path/or/uri/to.nii.gz" }
```

- `source=demo` ignores `file_ref` and returns a built-in demo case;
- `source=pacs|upload` requires `file_ref` to point to a converted NIfTI path/URI.

Response (`202`):

```json
{ "job_id": "job_xxx", "status": "queued | completed", "mode": "demo | production" }
```

> demo mode may complete synchronously; production queues asynchronously.

### 2.5 `GET /api/v1/radar/jobs/{job_id}`

Authenticated. Poll job status and result.

```json
{
  "job_id": "job_xxx",
  "status": "queued | running | completed | failed",
  "progress": 0.0,
  "mode": "demo | production",
  "study_uid": "...",
  "error": null,
  "result": { "RadarResult": "see §2.6" }
}
```

### 2.6 `RadarResult` (the result field)

```json
{
  "study_uid": "...",
  "model": "damo-radar",
  "model_version": "eaec6129",
  "mode": "demo | production",
  "generated_at": "2026-09-21T14:00:00+08:00",
  "positive_threshold": 0.5,
  "findings": [ { "see §1.3" } ],
  "summary": {
    "critical_count": 0,
    "major_count": 0,
    "minor_count": 0,
    "positive_count": 0,
    "critical_findings": [],
    "major_findings": []
  },
  "disclaimer": "This result is AI-assisted by DAMO-RADAR and serves only as a second-reader reference; the final diagnosis must be reviewed and signed off by a radiologist."
}
```

---

## 3. BFF-to-Frontend Contract (unified `/api/v1`)

The BFF reuses the existing `RouteDef / fail / ok / json / ErrorCode`. The frontend **only** talks to the BFF and never to Python directly.

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/v1/imaging/ai/catalog` | `imaging:view` | pass-through Python catalog; if Python is down, return **built-in static catalog** (frontend never blanks) |
| POST | `/api/v1/imaging/ai/jobs` | `imaging:ai:analyze` | body `{study_uid?, source?, file_ref?}` → `{job_id,status,mode}` |
| GET | `/api/v1/imaging/ai/jobs/:id` | `imaging:view` | pass-through job+result; if Python is down, return **deterministic mock** (same numbers as Python demo) |
| POST | `/api/v1/imaging/ai/jobs/:id/review` | `imaging:ai:review` | review & signature, writes audit |
| GET | `/api/v1/imaging/ai/jobs?patient_id=xxx` | `imaging:view` | patient's historical AI report list (mock store, memory + `data/imaging-ai-jobs.json`) |

### 3.1 Review & signature request/response

Request `POST /api/v1/imaging/ai/jobs/:id/review`:

```json
{
  "verdict": "approve | modify | reject",
  "comment": "optional comment",
  "report_text": "optional report body",
  "signer_id": "dr_1001",
  "signer_name": "Jane Doe",
  "ca_signature": "optional CA signature value"
}
```

Response:

```json
{ "reviewed_at": "2026-09-21T14:05:00+08:00", "signer_id": "dr_1001", "audit_id": "aud_xxx", "verdict": "approve" }
```

After submit, **resubmission is disabled**; the audit is written to the hash chain.

### 3.2 Unified response envelope

- Success: `{ "code": 0, "data": ..., "message": "ok", "traceId": "..." }`
- Failure: `{ "code": ..., "message": "...", "traceId": "..." }`
- **Never** leak stack traces / SQL / file paths to the frontend.

### 3.3 Critical-finding linkage

When a critical finding exists (e.g. suspected HCC, appendicitis, aortic dissection), the BFF reuses the existing critical-value alert channel (`/ws/chat` broadcast or alert aggregation) — no new alert subsystem is built.

---

## 4. Permission Codes (RBAC)

Three new permission points through the existing RBAC middleware:

| Permission | Meaning | Typical role |
|------------|---------|--------------|
| `imaging:view` | view imaging-AI reports and catalog | radiologist, imaging dept, authorized clinicians |
| `imaging:ai:analyze` | submit AI inference jobs (trigger compute) | radiologist, imaging technologist |
| `imaging:ai:review` | review and sign (close the loop, write audit) | radiologist (primary signatory) |

> Permissions tighten stepwise: `view < analyze < review`. Unauthorized access is denied by existing RBAC and audited.

---

## 5. Configuration

### 5.1 BFF side (talking to the inference service)

| Env var | Default | Description |
|---------|---------|-------------|
| `RADAR_INFERENCE_URL` | `http://localhost:8090` | Python inference service base URL |
| `RADAR_INTERNAL_TOKEN` | (empty) | shared internal secret; if either side is unset, non-loopback calls are rejected |

### 5.2 Python inference side

| Env var | Default | Description |
|---------|---------|-------------|
| `RADAR_PORT` | `8090` | service port |
| `RADAR_INTERNAL_TOKEN` | (empty) | internal token; unset allows loopback only |
| `RADAR_POSITIVE_THRESHOLD` | `0.5` | positive probability threshold |
| `RADAR_MAJOR_THRESHOLD` | `0.6` | major tier threshold |
| `RADAR_CRITICAL_FINDINGS` | built-in curated set | comma-separated, **fully replaces** the built-in critical set |
| `RADAR_MAX_CONCURRENCY` | `2` | inference concurrency semaphore cap |
| `RADAR_JOB_TIMEOUT` | `600` | job timeout seconds |
| `RADAR_WEIGHT_PATH` | `models/radar/checkpoint_radar_pretrain.pth` | weight path |

> Tuning note: in-hospital changes to thresholds and the critical set must go through config management and review, not direct edits to code constants; run local validation before and after (see the training/fine-tuning/reproduction guide).

---

## 6. Frontend Contract Highlights

- Routes: `/imaging/ai/report/:studyUid?`, plus an embedded panel in the patient-360 imaging tab;
- Layout: left 18-organ nav (positive-count badge per organ), right 146-finding list (positive highlighted, critical red bar, major orange, minor default; each row "name + confidence progress bar");
- Header: `AI-assisted report`, showing model / version / mode (demo|production) / time / disclaimer;
- Footer: "radiologist review" — approve/modify/reject + comment + signature (CA signature box or demo signature); after submit, audit is written and resubmission disabled;
- empty / loading / error-boundary / offline states present; when the inference service degrades, a "demo data" watermark is shown;
- no heavy new deps; does not break the existing 50+ routes or the antd v5-patch-for-react-19.

---

## 7. Integration Smoke Checklist

```bash
# 1) health
curl -s http://localhost:8090/health/ready

# 2) catalog (authenticated)
curl -s -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" http://localhost:8090/api/v1/radar/catalog

# 3) submit a demo job
curl -s -X POST http://localhost:8090/api/v1/radar/jobs \
     -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" -H "Content-Type: application/json" \
     -d '{"study_uid":"demo-study","source":"demo"}'

# 4) poll the result (replace job_id)
curl -s -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" \
     http://localhost:8090/api/v1/radar/jobs/job_xxx
```

Through the BFF:

```bash
# via BFF (needs JWT), should return {code:0,data:{...}} envelope
curl -s http://localhost:8080/api/v1/imaging/ai/catalog -H "Authorization: Bearer <JWT>"
```

---

*Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd. · DAMO-RADAR Fusion Integration Guide*
