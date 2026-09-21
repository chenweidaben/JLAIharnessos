# DAMO-RADAR Fusion License & Compliance Statement

> Hangzhou Jianlan Technology Co., Ltd. · JLAIharnessos
> Version v0.2.0-radar ｜ 2026-09
> Audience: compliance/legal, medical-device registration & clinical-validation leads, hospital IT, business

This statement covers the **dual-track licensing**, **medical-device compliance positioning**, **data-privacy boundaries**, and **open-source attribution** involved in the DAMO-RADAR hyper-fusion. It must be reviewed by compliance and legal before external delivery.

> ⚕️ Bottom line: **the code is commercially usable open source (Apache-2.0), but the accompanying model weights are non-commercial (CC BY-NC-SA 4.0); the two must be understood and handled separately.**

---

## 1. Dual-Track License: Code ≠ Weights

| Asset | License | Commercially usable? | Handling |
|-------|---------|----------------------|----------|
| Jianlan JLAIharnessos code (BFF adapter, frontend, inference service scaffold) | **Apache-2.0** | yes | open-sourced with the repo |
| Upstream `damo-radar` code | **Apache-2.0** | yes | vendored at `services/radar-inference/vendor/damo-radar/`, keeping its `LICENSE` and `THIRD_PARTY_LICENSES.md` |
| Model weights `checkpoint_radar_pretrain.pth` (~5 GB) | **CC BY-NC-SA 4.0 (Attribution-NonCommercial-ShareAlike)** | **non-commercial (NC)** | **never commit, never ship in images**; deployer pulls it via the official script |

### 1.1 Why "open-source code" does not mean "commercially usable AI model"

- Apache-2.0 covers **code only**;
- the weights are a separately distributed data/model asset under **CC BY-NC-SA 4.0**, whose **NC (NonCommercial)** clause explicitly excludes commercial use;
- therefore you may lawfully **read, modify, and commercially use Jianlan's and the upstream code**, but you **may not directly use this pretrained weight for commercial purposes** unless separately licensed.

### 1.2 Path to commercial licensing

To use this pretrained weight in a **commercial product / profit-making in-hospital service**:

1. Contact the weight copyright holder (the institution behind the paper/model card) to obtain a **commercial license** overriding the NC term of CC BY-NC-SA 4.0;
2. Or train/fine-tune on **your own hospital data** per the training/fine-tuning/reproduction guide, so weight ownership and the licensing chain are clear and traceable;
3. Until written authorization is in hand, run production only in **demo mode** or for non-commercial research/teaching.

> Hangzhou Jianlan Technology Co., Ltd. does not endorse commercial redistribution of the upstream weights; due diligence on licensing before commercial use is the deployer's/user's responsibility.

---

## 2. Second-Reader Positioning and Medical-Device Compliance

### 2.1 Product positioning

In this system DAMO-RADAR is strictly positioned as a **second reader / decision support**:

- output is **probabilities and structured findings**, **not an automatic diagnosis**;
- every AI report must be **reviewed and signed off by a radiologist** (`POST /imaging/ai/jobs/:id/review`) before entering the official report;
- the system always shows a disclaimer in the UI and in `RadarResult.disclaimer`, forbidding AI output from being treated as a final draft.

### 2.2 In-hospital validation (must precede go-live)

Before any real case goes live, the deployer must complete:

- **institutional data validation**: on the hospital's own retrospective abdominal contrast CTs and gold-standard reports, evaluate finding-level sensitivity/specificity/AUC (methodology in the training/fine-tuning guide);
- **localized thresholds**: tune `RADAR_POSITIVE_THRESHOLD`, `RADAR_MAJOR_THRESHOLD`, and `RADAR_CRITICAL_FINDINGS` to local reading practice and keep a record;
- **process validation**: run through the physician signature loop, critical-value push, and false-positive/false-negative SOP;
- **drift monitoring**: continuously monitor input and output distribution drift after go-live.

### 2.3 Medical-device compliance note

- This delivery is a **software integration and engineering framework** and does not replace any medical-device certificate;
- If it is to be marketed as a **medical device** in a target country/region, the responsible party must complete registration/filing, clinical evaluation, and quality-system inspection under local regulations (e.g. China NMPA AI medical-device software review, US FDA, EU MDR/AI Act);
- The "second-reader, human-review, no-auto-diagnosis" design is an important precondition for reducing regulatory risk, but **does not by itself constitute medical-device certification**; the exact classification and pathway must be judged by a registration specialist for the target market.

---

## 3. Data Privacy and Security Boundaries

| Requirement | How the fusion enforces it |
|-------------|----------------------------|
| Redaction | DICOM→NIfTI conversion strips/isolate patient identity in the integration layer; the Python service only sees `study_uid` and `file_ref`, never plaintext name/ID |
| Log redaction | `logging_redact.py` ensures no PHI is logged; failures return only a structured error body + traceId, never stack/SQL/path |
| Audit | review signature is written to the audit (tamper-evident hash chain), persisted to `data/imaging-ai-jobs.json`; resubmission disabled |
| No weights/data egress | weights are **never committed, never shipped in images**; inference runs **locally in-hospital**, no DICOM/big data uploaded externally; see the deployment guide for offline |
| Network convergence | inference port 8090 is intranet/loopback only, business endpoints require `X-Internal-Token`; only BFF 8080 is exposed publicly |

> Collection, storage, sharing, and cross-border of patient data must still comply with PIPL, DSL, in-hospital cybersecurity rules, and classified-protection (等保) requirements; the fusion defaults to "data stays inside the hospital," but compliance responsibility rests with the deployer.

---

## 4. Open-Source Attribution and Acknowledgements

This fusion builds on the open-source community and academic work; attribution must be kept:

- **DAMO-RADAR** (Alibaba DAMO Academy): upstream code Apache-2.0, vendored at `services/radar-inference/vendor/damo-radar/`, keeping its `LICENSE` and `THIRD_PARTY_LICENSES.md`; paper Qi Zhang et al., *An expert-level generalist AI for abdominal CT diagnosis*, **Science 393(6817):eaec6129, 2026**, DOI 10.1126/science.aec6129;
- **LAVIS**: part of the upstream vision-language training/inference framework;
- **nnU-Net**: self-configuring medical-image segmentation paradigm (sliding-window / resampling ideas);
- **MONAI**: medical-image deep-learning ecosystem;
- **3D-ResNets**: 3D residual backbone ideas;
- **TotalSegmentator V1**: if you preprocess yourself, used to generate 104-structure segmentation masks (see the reproduction guide).

> The complete third-party dependency license list is governed by the repo-root `THIRD_PARTY_LICENSES.md` and `vendor/damo-radar/THIRD_PARTY_LICENSES.md`. When redistributing, attach each license notice.

---

## 5. Compliance Go-Live Checklist (excerpt)

- [ ] Code Apache-2.0 vs weights CC BY-NC-SA 4.0 distinguished; weights not committed/imaged;
- [ ] commercial use has obtained / will obtain weight commercial authorization;
- [ ] second-reader positioning, physician signature loop, and disclaimer are enforced in UI and API;
- [ ] in-hospital finding-level sensitivity/specificity validation done and recorded;
- [ ] thresholds and the critical set are configured (not hard-coded) after review;
- [ ] log redaction, audit hash-chain, and network convergence (8090 not public) accepted;
- [ ] medical-device registration / clinical-evaluation pathway assessed by the responsible party.

---

*Copyright (c) 2026 Hangzhou Jianlan Technology Co., Ltd. · DAMO-RADAR Fusion License & Compliance Statement*

*This is not legal advice; consult professional legal/registration counsel before commercial use and medical-device registration.*
