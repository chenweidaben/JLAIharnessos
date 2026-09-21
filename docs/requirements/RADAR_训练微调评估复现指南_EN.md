# DAMO-RADAR Training / Fine-Tuning / Evaluation / Reproduction Guide

> Hangzhou Jianlan Technology Co., Ltd. · JLAIharnessos
> Version v0.2.0-radar ｜ 2026-09
> Audience: algorithm / imaging research, hospital IT, in-hospital AI pilot teams

This guide is compiled from the upstream vendor docs under `services/radar-inference/vendor/damo-radar/docs/` (`TRAINING.md` / `INFERENCE.md` / `PREPROCESS.md`). It explains how to fine-tune DAMO-RADAR on **in-hospital private data**, run local validation, monitor drift, and reproduce the built-in demo inference flow.

> ⚕️ The licensing chain of any new weights you train/fine-tune must be clarified by yourself; directly using the upstream `checkpoint_radar_pretrain.pth` remains under **CC BY-NC-SA 4.0 (non-commercial)**. Commercial and medical-device compliance is in [`docs/open-source/RADAR_LICENSE_COMPLIANCE_EN.md`](../open-source/RADAR_许可与合规声明_EN.md).

---

## 1. Upstream Training Pipeline at a Glance

| Item | Description (from vendor docs) |
|------|-------------------------------|
| Training data | MERLIN-CT-Train (Stanford AIMI Shared Datasets, apply to download); the repo also ships a few `data/merlin_data_train_demo/` cases to verify the pipeline runs |
| Preprocessing | TotalSegmentator V1 generates 104-structure masks → mapped to 36 major anatomies → image and mask resampled to spacing `[1,1,5]` |
| Vision backbone | VisionBranch is a UNet/RESUNet-style 3D architecture (pretrained `checkpoint_unet.pth`); sliding window at inference |
| Text side | Chinese BERT tokenizer (`bert-base-chinese`) |
| Training entry | `RADAR_train/train.py` |
| Distributed | single GPU `python train.py`; multi-GPU `torchrun --nproc_per_node=8 train.py`; upstream trained on 24×A100/H20, total batch 48 |
| Global alignment | `radar_plus` (default True) toggles the RADAR+ global-alignment module; set False to disable |
| Fine-tune switch | `radar_ft=True` fine-tunes from a pretrained RADAR checkpoint; default False (train from scratch) |
| Evaluation | `RADAR_train/calc_metrics.py` |

> These are the upstream public reproduction settings. With limited in-hospital compute, **fine-tune from the pretrained checkpoint** (`radar_ft=True`) rather than training from scratch.

---

## 2. Reproduce the Built-In Demo Inference (no weights needed)

This is the **safest first step**: no weight download, no GPU, just verify the service and pipeline are in place.

```bash
cd services/radar-inference
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8090
```

Submit a built-in demo job:

```bash
curl -s -X POST http://localhost:8090/api/v1/radar/jobs \
     -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" -H "Content-Type: application/json" \
     -d '{"study_uid":"demo-study","source":"demo"}'
```

The service loads `vendor/damo-radar/RADAR_infer_results_demo.csv` (upstream's precomputed result on a demo NIfTI) and returns 146 findings **deterministically**. This validates the **contract and frontend loop**, not model accuracy.

Upstream raw demo reproduction (needs weights + GPU, see vendor `docs/INFERENCE.md`):

```bash
cd services/radar-inference/vendor/damo-radar/RADAR_inference
python inference_demo.py     # produces RADAR_infer_results_demo.csv
```

---

## 3. Fine-Tuning on In-Hospital Private Data

> This section describes the **process and interfaces**; in-hospital data may only be used after ethics approval, de-identification, and a data-use authorization.

### 3.1 Prepare data

1. Obtain the hospital's own abdominal contrast CTs (DICOM) and corresponding radiology reports;
2. **External preprocessing** (reuse upstream `PREPROCESS.md`):
   - use TotalSegmentator V1 to generate raw 104-structure masks;
   - `RADAR_train/preprocess_code/process_img_mask.py` merges 104 structures into 36 major ones and resamples image+mask to spacing `[1,1,5]`:
     ```bash
     cd RADAR_train/preprocess_code
     python process_img_mask.py --src-dir /path/to/totalsegmentator_masks --root-dir /path/to/merlin_data_root
     ```
   - if masks are ready and you only need to resample images: `process_img.py`;
3. Report structuring (optional, uses an LLM to split free-text reports into anatomy-level supervision): run `check_organ_mention.py` → `report_parsing.py` → `report_parsing_normal.py` in order (outputs `merlin_report_mention.json` / `merlin_report_organ_report_v1.json` / `merlin_report_organ_normal_v1.json`).

### 3.2 Prepare weights and support files

| File | Purpose | Destination |
|------|---------|-------------|
| `bert-base-chinese` | Chinese tokenizer | `ckpt/bert-base-chinese` |
| `checkpoint_unet.pth` | pretrained VisionBranch (UNet/RESUNet) | `ckpt/checkpoint_unet.pth` |
| `checkpoint_radar_pretrain.pth` | pretrained RADAR (fine-tune start) | `ckpt/` (see the deployment guide for weight download) |

> Strongly recommend starting from `checkpoint_radar_pretrain.pth` for fine-tuning rather than training from scratch.

### 3.3 Start fine-tuning

```bash
cd services/radar-inference/vendor/damo-radar/RADAR_train

# key config (radar_config.yaml):
#   radar_ft: True   -> fine-tune from the pretrained RADAR checkpoint
#   radar_plus: True -> keep the RADAR+ global-alignment module

# single GPU (small validation)
python train.py

# multi-GPU (recommended)
torchrun --nproc_per_node=8 train.py
```

Adjust `vis_root` (training data root) and batch to your data scale; upstream reference is 24×A100/H20, total batch 48 — scale down by VRAM in-house.

---

## 4. Local Validation (finding-level sensitivity / specificity)

After fine-tuning and before go-live, run finding-level evaluation on a **held-out in-hospital test set**.

### 4.1 Produce an inference CSV

```bash
cd RADAR_train
python infer_merlin_anatomy.py     # anatomy-level findings
python infer_merlin_whole.py       # whole-image findings
# multi-GPU: torchrun --nproc_per_node=8 infer_merlin_anatomy.py
```

Results are saved as CSV.

### 4.2 Compute metrics

```bash
cd RADAR_train
python calc_metrics.py            # uses the inference CSV and label file
```

### 4.3 Acceptance criteria within this fusion

- report **per-finding** sensitivity, specificity, AUC across the 146 findings;
- focus on **critical findings' miss rate** (sensitivity first);
- tune `RADAR_POSITIVE_THRESHOLD` / `RADAR_MAJOR_THRESHOLD` / `RADAR_CRITICAL_FINDINGS` so critical recall meets target while controlling major/minor false-positive burden;
- record test-set size, gold-standard source, threshold version, and result snapshot in the in-hospital validation report.

> Upstream reports an overall AUC of about **0.883** on its external MERLIN test set (see vendor `INFERENCE.md`). This is an **upstream public number**, **not** your hospital's go-live performance; your number comes from your own held-out set.

### 4.4 Silent (shadow) mode recommendation

When a new weight or threshold first goes live, run it in **silent/shadow mode**: AI results are only compared in the background, not pushed to the radiologist workbench or into reports. After parallel accumulation against the gold standard confirms stable distribution and no obvious critical misses, open it to radiologists as a second reader.

---

## 5. Drift Monitoring

After go-live, monitor continuously to avoid silent performance degradation from distribution shift:

| Target | Metric | Action |
|--------|--------|--------|
| Input distribution | CT scanner/slice thickness/contrast phase/ROI coverage changes | trigger re-evaluation, rebuild validation set if needed |
| Output distribution | positive rate, critical proportion drift over time | compare to baseline, alert beyond threshold |
| Threshold calibration | per-finding predicted-probability histogram drift | recalibrate positive/major thresholds |
| Clinician feedback | modify/reject ratio, missed/false-positive cases | sample review, feed next fine-tune round |

Wire these metrics into existing monitoring (BFF `/metrics`, Grafana dashboards) and observe them alongside `RADAR_MAX_CONCURRENCY` and job latency.

---

## 6. Key Reproduction Commands Cheat-Sheet

```bash
# A. contract-level demo (no weights)
cd services/radar-inference && uvicorn app.main:app --port 8090

# B. preprocess image+mask
cd services/radar-inference/vendor/damo-radar/RADAR_train/preprocess_code
python process_img_mask.py --src-dir /path/to/masks --root-dir /path/to/data

# C. fine-tune (multi-GPU)
cd ../ && torchrun --nproc_per_node=8 train.py

# D. inference + evaluation
python infer_merlin_anatomy.py && python calc_metrics.py

# E. fusion service unit tests
cd ../../../ && pytest -q     # expect 19 passing
```

---

## 7. Risks and Boundaries

- Training/fine-tuning belongs to **algorithmic research and in-hospital validation**; produced weights are not automatically commercializable or marketable;
- any fine-tuned weight must repeat §4 local validation and §5 drift-monitoring design before go-live;
- upstream dependencies (TotalSegmentator, DashScope/Qwen or other LLM APIs) are not bundled and need their own license/key;
- command paths follow the vendor upstream layout; when upgrading upstream, defer to its latest `docs/`.

---

*Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd. · DAMO-RADAR Training / Fine-Tuning / Evaluation / Reproduction Guide*
