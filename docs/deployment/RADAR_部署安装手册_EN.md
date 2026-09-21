# DAMO-RADAR Fusion Deployment & Installation Guide

> Hangzhou Jianlan Technology Co., Ltd. · JLAIharnessos
> Version v0.2.0-radar ｜ 2026-09
> Audience: hospital IT, ops/SRE, implementation engineers

This guide covers the full install path for the DAMO-RADAR inference microservice `services/radar-inference/`: from "one-click CPU demo" to "GPU production" to "intranet offline". Fields and contracts are governed by [`docs/RADAR_FUSION_CONTRACT.md`](../RADAR_FUSION_CONTRACT.md).

> ⚕️ The weights `checkpoint_radar_pretrain.pth` are licensed **CC BY-NC-SA 4.0 (non-commercial)**. They must never be committed to the repo or shipped inside images. Before commercial production use, read [`docs/open-source/RADAR_LICENSE_COMPLIANCE_EN.md`](../open-source/RADAR_许可与合规声明_EN.md).

---

## 1. Deployment Shapes at a Glance

| Shape | Needs GPU | Needs weights | Purpose | Compose profile |
|-------|-----------|---------------|---------|-----------------|
| CPU demo | no | no | demo, integration, UI/contract validation on CPU | `demo` |
| GPU production | yes (recommended) | yes (~5 GB) | real inference | `gpu` |
| Intranet offline | depends on demo/prod | imported offline | hospitals without internet | see §6 |

The service **auto-detects** on start: weights + torch + CUDA → `production`; otherwise it auto-degrades to `demo`, and `/health/ready` reports `degraded`. No manual switch needed.

---

## 2. Hardware Requirements

### 2.1 CPU demo (minimum)

- CPU: x86_64, 4+ cores;
- RAM: 8 GB+ (enough for the precomputed CSV and FastAPI);
- Disk: code + deps ~2–4 GB;
- no GPU, no CUDA required.

### 2.2 GPU production (recommended)

- GPU: NVIDIA, VRAM-rich compute cards such as **A100 / A800 / H20**; the upstream paper trained on 24×A100/H20, but **a single GPU is enough for inference**;
- VRAM: weights are ~**5 GB**; with runtime and sliding-window buffers, a card with **≥ 16 GB VRAM** is recommended for concurrency headroom;
- Driver: a CUDA version compatible with the PyTorch distribution;
- RAM: 32 GB+;
- Disk: 5 GB weights + temp NIfTI space; reserve ≥ 50 GB.

> These are recommendations, not hard certified thresholds. Real VRAM/throughput under in-hospital concurrency should be load-tested during the pilot (see the training/fine-tuning/reproduction guide).

---

## 3. CPU Demo One-Click (no weights / GPU)

### 3.1 Direct CLI (dev/debug)

```bash
cd services/radar-inference
pip install -r requirements.txt

# start (port 8090)
uvicorn app.main:app --host 0.0.0.0 --port 8090
```

Windows PowerShell:

```powershell
cd services\radar-inference
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8090
```

Self-check after start:

```bash
curl -s http://localhost:8090/health/ready
# expect: {"status":"degraded","mode":"demo","weights_loaded":false,"gpu_available":false,...}
```

Submit a built-in demo job:

```bash
curl -s -X POST http://localhost:8090/api/v1/radar/jobs \
     -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" -H "Content-Type: application/json" \
     -d '{"study_uid":"demo-study","source":"demo"}'
```

### 3.2 docker compose demo profile

```bash
# repo root; start only the demo profile (CPU, no weight mount)
docker compose --profile demo up -d radar-inference
```

Demo mode loads `vendor/damo-radar/RADAR_infer_results_demo.csv`; results are **deterministic**, suitable for frontend integration and acceptance.

---

## 4. GPU Production Mode (download ~5 GB weights)

### 4.1 Download weights

Weights come from the HuggingFace model repo `radar-generalist/RADAR`, file `checkpoint_radar_pretrain.pth` (~5 GB). The script defaults to the China mirror `hf-mirror.com`:

```bash
cd services/radar-inference

# default download to ./models/radar/, HF_ENDPOINT defaults to https://hf-mirror.com
bash download_weights.sh

# or specify a target directory
bash download_weights.sh /data/models/radar
```

The script also pulls `bert-base-chinese` (used by the tokenizer) into `vendor/damo-radar/ckpt/bert-base-chinese`.

To pin the mirror explicitly:

```bash
export HF_ENDPOINT=https://hf-mirror.com
bash download_weights.sh
```

> If the network is unreachable, download on an internet-connected machine and **transfer offline** to `./models/radar/` (see §6).

### 4.2 Install production inference deps

```bash
pip install -r requirements-prod.txt
```

### 4.3 docker compose gpu profile

```bash
# repo root; gpu profile mounts ./models/radar:/models/radar and uses the GPU runtime
docker compose --profile gpu up -d radar-inference
```

### 4.4 Verify production readiness

```bash
curl -s http://localhost:8090/health/ready
# expect: {"status":"ready","mode":"production","weights_loaded":true,"gpu_available":true,...}
```

---

## 5. Standard Steps to Switch demo → production

1. Download weights to `models/radar/checkpoint_radar_pretrain.pth` (§4.1);
2. Confirm the host GPU / CUDA is available and `requirements-prod.txt` is installed;
3. (container) restart with `--profile gpu` and mount `./models/radar:/models/radar`;
4. Confirm via `GET /health/ready` that `mode=production, status=ready`;
5. Run a real job on a known NIfTI and verify the 146-finding structure and summary;
6. Confirm the frontend report header flips its `mode` badge from `demo` to `production` and the "demo data" watermark disappears;
7. Enable the physician signature loop and critical-value push per in-hospital process.

> Reverse rollback (production → demo): uninstall/remove the weights and restart; the service degrades automatically. This is safe and does not affect the BFF or frontend.

---

## 6. Intranet Offline Deployment (no internet)

Hospital intranets usually cannot reach HuggingFace directly. Follow this offline flow:

1. **On an internet jump host** run the download:
   ```bash
   bash download_weights.sh /tmp/radar-offline
   ```
   Artifacts: `checkpoint_radar_pretrain.pth` (~5 GB) + `bert-base-chinese`.
2. After checksumming (see §7), copy to the target server `models/radar/` via encrypted media / in-hospital ferry;
3. For inference deps, on the internet machine run `pip download -d wheels/ -r requirements-prod.txt`, then offline `pip install --no-index --find-links wheels/ -r requirements-prod.txt`;
4. Docker case: on the internet machine `docker compose --profile gpu build`, then `docker save` the image; on the intranet `docker load`;
5. At start, ensure `HF_ENDPOINT` is not forced to reach the internet — offline needs no network because weights are local.

---

## 7. Model Manifest and Checksums (placeholders; fill at deploy)

> The checksums below are **placeholders**. At first deploy, compute them after actual download with `sha256sum` (Linux) or `Get-FileHash -Algorithm SHA256` (Windows) and fill them in as the in-hospital acceptance baseline.

| File | Source | Size (~) | License | SHA256 (placeholder, fill at deploy) |
|------|---------|----------|---------|-------------------------------------|
| `checkpoint_radar_pretrain.pth` | HF `radar-generalist/RADAR` | 5 GB | CC BY-NC-SA 4.0 (non-commercial) | `<to be filled>` |
| `bert-base-chinese/` | HF `bert-base-chinese` | ~0.4 GB | see its model card | `<to be filled>` |

Once filled, sync this table to your in-hospital acceptance sheet and re-checksum on every weight upgrade.

---

## 8. Ports and Network

| Service | Port | Exposure guidance |
|---------|------|-------------------|
| BFF | 8080 | reverse proxy / in-hospital client entry |
| Web | 5173 | dev only; static hosting in prod |
| radar-inference | 8090 | **intranet/loopback only**, never public; business endpoints need `X-Internal-Token` |

The security group/firewall should only allow 8080 (and 5173 for dev); 8090 should be reachable only from the BFF host or a designated intranet segment.

---

## 9. Environment Variables at a Glance

BFF side:

| Var | Default |
|-----|---------|
| `RADAR_INFERENCE_URL` | `http://localhost:8090` |
| `RADAR_INTERNAL_TOKEN` | (empty; must match Python) |

Python side: `RADAR_PORT=8090`, `RADAR_INTERNAL_TOKEN`, `RADAR_POSITIVE_THRESHOLD=0.5`, `RADAR_MAJOR_THRESHOLD=0.6`, `RADAR_CRITICAL_FINDINGS` (full-replace), `RADAR_MAX_CONCURRENCY=2`, `RADAR_JOB_TIMEOUT=600`, `RADAR_WEIGHT_PATH=models/radar/checkpoint_radar_pretrain.pth`.

---

## 10. Post-Deployment Self-Check

```bash
# 1) health
curl -s http://localhost:8090/health/ready

# 2) service tests
cd services/radar-inference && pytest -q
# expect: 19 passing

# 3) BFF connectivity (needs JWT)
curl -s http://localhost:8080/api/v1/imaging/ai/catalog -H "Authorization: Bearer <JWT>"

# 4) frontend
#    open /imaging/ai/report/<studyUid>, confirm 18-organ nav + 146 findings + signature loop
```

---

*Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd. · DAMO-RADAR Fusion Deployment & Installation Guide*
