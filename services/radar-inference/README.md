# RADAR-Fusion — DAMO-RADAR Abdominal CT Inference Service

Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.

工业级 FastAPI 推理微服务，把达摩院 **DAMO-RADAR**（腹部增强 CT 视觉-语言模型，
Science 393(6817):eaec6129, 2026）封装为可被 BFF 调用的 HTTP 服务。
**定位为第二阅片 / 辅助决策**，最终诊断必须由放射科医师复核签名。

> Second-reader / decision-support only. Final diagnosis requires a
> radiologist review-and-signature loop. This service does not auto-diagnose.

---

## 1. 双模式（Dual mode）

| 模式 mode | 触发条件 | 行为 |
|-----------|----------|------|
| `demo`（默认） | 无权重 / 无 torch / 无 GPU | 加载 `vendor/damo-radar/RADAR_infer_results_demo.csv` 预计算结果，**确定性**，CPU 即可跑；`/health/ready` 返回 `degraded` |
| `production` | 存在 `models/radar/checkpoint_radar_pretrain.pth` 且 torch+CUDA 可用 | 按 `vendor/damo-radar/RADAR_inference/inference_demo.py` 的真实预处理（HU 裁剪 [-300,400]、ref_spacing (1,1,5)、ROI (96,256,384) 滑动窗）推理；`/health/ready` 返回 `ready` |

服务启动时自动检测权重，**缺失即自动降级 demo**，无需手动切换。

---

## 2. 快速启动（demo / CPU）

```bash
cd services/radar-inference
pip install -r requirements.txt

# 开发启动（端口 8090）
uvicorn app.main:app --host 0.0.0.0 --port 8090
```

Windows：

```powershell
cd services\radar-inference
C:\Python314\python.exe -m pip install -r requirements.txt
C:\Python314\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8090
```

---

## 3. 生产模式（下载权重）

权重来自 HuggingFace `radar-generalist/RADAR`，文件 `checkpoint_radar_pretrain.pth`
（约 5 GB），许可 **CC BY-NC-SA 4.0（非商业）**。**严禁入库**，由部署方自行下载：

```bash
# 默认下载到 ./models/radar/，走国内镜像 hf-mirror.com
bash download_weights.sh
# 或指定目录
bash download_weights.sh /data/models/radar
```

同时安装可选推理依赖：

```bash
pip install -r requirements-prod.txt
```

挂载 `./models/radar:/models/radar` 并使用 GPU 镜像（见 Dockerfile 中 `prod` 段）后重启，
`GET /health/ready` 应返回 `{"mode":"production","status":"ready",...}`。

---

## 4. 环境变量（可覆盖）

| 变量 | 默认 | 说明 |
|------|------|------|
| `RADAR_PORT` | `8090` | 服务端口 |
| `RADAR_INTERNAL_TOKEN` | （空） | 内部鉴权 token；未配置时仅允许回环地址 |
| `RADAR_POSITIVE_THRESHOLD` | `0.5` | positive 概率阈值 |
| `RADAR_MAJOR_THRESHOLD` | `0.6` | major 分级阈值 |
| `RADAR_CRITICAL_FINDINGS` | 内置 curated 集合 | 逗号分隔，**整体替换**内置 critical 集合 |
| `RADAR_MAX_CONCURRENCY` | `2` | 并发推理信号量上限 |
| `RADAR_JOB_TIMEOUT` | `600` | 作业超时秒数 |
| `RADAR_WEIGHT_PATH` | `models/radar/checkpoint_radar_pretrain.pth` | 权重路径 |

---

## 5. 端点（契约 §3）

```
GET  /health/live                      -> {"status":"ok"}
GET  /health/ready                     -> {status,mode,weights_loaded,gpu_available,model,model_version}
GET  /api/v1/radar/catalog             -> 18 器官 + 146 发现目录（鉴权）
POST /api/v1/radar/jobs                -> {study_uid,source,file_ref} -> {job_id,status,mode}（鉴权）
GET  /api/v1/radar/jobs/{job_id}       -> 作业状态 + RadarResult（146 findings / summary）（鉴权）
```

鉴权：`X-Internal-Token: $RADAR_INTERNAL_TOKEN`。健康检查端点不鉴权（供探针使用）。

```bash
curl -s http://localhost:8090/health/ready
curl -s -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" http://localhost:8090/api/v1/radar/catalog
curl -s -X POST http://localhost:8090/api/v1/radar/jobs \
     -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" -H "Content-Type: application/json" \
     -d '{"study_uid":"demo-study","source":"demo"}'
```

---

## 6. 运行测试

```bash
cd services/radar-inference
pytest -q
```

覆盖：健康检查、catalog 结构（18 器官 / 146 发现）、作业提交与状态、
demo 结果契约 schema、无权重自动降级、internal token 鉴权拒绝、日志脱敏、并发限流。

---

## 7. License / 合规

- 本服务代码：Apache-2.0（见仓库根 LICENSE）。
- 上游 DAMO-RADAR 代码：Apache-2.0（保留 `vendor/damo-radar/LICENSE` 与
  `THIRD_PARTY_LICENSES.md`）。
- **模型权重 `checkpoint_radar_pretrain.pth`：CC BY-NC-SA 4.0（非商业用途）**，
  商业使用前须取得相应授权。
- 本服务为**第二阅片辅助**，不构成自动诊断；任何输出须经放射科医师复核签名后方可进入报告。

---

## English summary

A production-grade FastAPI service wrapping DAMO-RADAR for abdominal CT.
Runs in **demo** mode (deterministic pre-computed CSV, CPU) by default and
**production** mode once the ~5 GB non-commercial weights are downloaded.
Bounded concurrency, internal-token auth, PII redaction in logs, and strict
alignment with `docs/RADAR_FUSION_CONTRACT.md`.
