# DAMO-RADAR 融合部署安装手册

> 杭州健澜科技有限公司 · JLAIharnessos
> 版本 v0.2.0-radar ｜ 2026-09
> 适用对象：医院信息科、运维 / SRE、实施工程师

本手册覆盖 DAMO-RADAR 推理微服务 `services/radar-inference/` 从「CPU 一键演示」到「GPU 生产」再到「内网离线」的完整安装路径。字段与契约以 [`docs/RADAR_FUSION_CONTRACT.md`](../RADAR_FUSION_CONTRACT.md) 为准。

> ⚕️ 权重 `checkpoint_radar_pretrain.pth` 许可为 **CC BY-NC-SA 4.0（非商业）**，严禁入库、严禁随镜像分发。生产商用前请先阅读 [`docs/open-source/RADAR_许可与合规声明.md`](../open-source/RADAR_许可与合规声明.md)。

---

## 1. 部署形态总览

| 形态 | 是否需要 GPU | 是否需要权重 | 用途 | 启动 profile |
|------|--------------|--------------|------|--------------|
| CPU demo | 否 | 否 | 演示、联调、无卡环境验证 UI 与契约 | `demo` |
| GPU production | 是（建议） | 是（约 5 GB） | 真实推理 | `gpu` |
| 内网离线 | 视生产/演示而定 | 离线介质导入 | 无外网医院 | 见 §6 |

服务**启动自动检测**：有权重 + torch + CUDA → `production`；否则自动降为 `demo`，`/health/ready` 报 `degraded`。无需手动切换。

---

## 2. 硬件要求

### 2.1 CPU demo（最低）

- CPU：x86_64，4 核以上；
- 内存：8 GB 以上（加载预计算 CSV 与 FastAPI 即可）；
- 磁盘：代码 + 依赖约 2–4 GB；
- 无需 GPU、无需 CUDA。

### 2.2 GPU production（建议）

- GPU：NVIDIA，建议 **A100 / A800 / H20** 一类显存充裕的计算卡；上游论文训练用 24×A100/H20，**推理单卡即可**；
- 显存：权重约 **5 GB**，加上运行时与滑窗缓冲，建议单卡显存 **≥ 16 GB** 以保证并发余量；
- 驱动：CUDA 可用版本（与 PyTorch 发行版匹配）；
- 内存：32 GB 以上；
- 磁盘：权重 5 GB + 临时 NIfTI 空间，建议预留 ≥ 50 GB。

> 以上为建议口径，非硬性认证指标。真实院内并发量下的显存/吞吐应在试点阶段压测（见训练微调复现指南）。

---

## 3. CPU demo 一键起（无需权重 / GPU）

### 3.1 直接命令行（开发/调试）

```bash
cd services/radar-inference
pip install -r requirements.txt

# 启动（端口 8090）
uvicorn app.main:app --host 0.0.0.0 --port 8090
```

Windows PowerShell：

```powershell
cd services\radar-inference
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8090
```

启动后自检：

```bash
curl -s http://localhost:8090/health/ready
# 期望：{"status":"degraded","mode":"demo","weights_loaded":false,"gpu_available":false,...}
```

提交一个内置 demo 作业：

```bash
curl -s -X POST http://localhost:8090/api/v1/radar/jobs \
     -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" -H "Content-Type: application/json" \
     -d '{"study_uid":"demo-study","source":"demo"}'
```

### 3.2 docker compose demo profile

```bash
# 在仓库根目录，只起 demo profile（CPU，不挂载权重）
docker compose --profile demo up -d radar-inference
```

demo 模式加载 `vendor/damo-radar/RADAR_infer_results_demo.csv`，结果**确定性**，可用于前端联调与验收。

---

## 4. GPU 生产模式（下载约 5 GB 权重）

### 4.1 下载权重

权重来自 HuggingFace 模型仓 `radar-generalist/RADAR`，文件 `checkpoint_radar_pretrain.pth`（约 5 GB）。脚本默认走国内镜像 `hf-mirror.com`：

```bash
cd services/radar-inference

# 默认下载到 ./models/radar/，HF_ENDPOINT 默认 https://hf-mirror.com
bash download_weights.sh

# 或指定目标目录
bash download_weights.sh /data/models/radar
```

脚本同时会拉取 tokenizer 所需的 `bert-base-chinese` 到 `vendor/damo-radar/ckpt/bert-base-chinese`。

如需显式指定镜像：

```bash
export HF_ENDPOINT=https://hf-mirror.com
bash download_weights.sh
```

> 网络不通时可在有外网的机器下载后**离线搬运**到 `./models/radar/`，见 §6。

### 4.2 安装生产推理依赖

```bash
pip install -r requirements-prod.txt
```

### 4.3 docker compose gpu profile

```bash
# 仓库根目录，gpu profile 挂载 ./models/radar:/models/radar，并使用 GPU 运行时
docker compose --profile gpu up -d radar-inference
```

### 4.4 验证 production 就绪

```bash
curl -s http://localhost:8090/health/ready
# 期望：{"status":"ready","mode":"production","weights_loaded":true,"gpu_available":true,...}
```

---

## 5. 从 demo 切换到 production 的标准步骤

1. 下载权重到 `models/radar/checkpoint_radar_pretrain.pth`（§4.1）；
2. 确认主机 GPU / CUDA 可用并装好 `requirements-prod.txt`；
3. （容器场景）用 `--profile gpu` 重启，并挂载 `./models/radar:/models/radar`；
4. `GET /health/ready` 确认 `mode=production, status=ready`；
5. 用一个已知 NIfTI 跑一遍真实作业，核对 146 findings 结构与 summary；
6. 前端确认报告页头部 `mode` 角标由 `demo` 变为 `production`，且「演示数据」水印消失；
7. 按院内流程开启医师签名闭环与 critical 告警推送。

> 反向回退（production → demo）：移除/卸载权重后重启即可自动降级；这是安全行为，不影响 BFF 与前端。

---

## 6. 内网离线部署（无外网医院）

医院内网通常无法直连 HuggingFace。按以下离线流程：

1. **在外网跳板机**执行下载：
   ```bash
   bash download_weights.sh /tmp/radar-offline
   ```
   产物：`checkpoint_radar_pretrain.pth`（约 5 GB）+ `bert-base-chinese`。
2. **校验和**（见 §7 模型清单）后，用加密介质/院内摆渡机制拷贝到目标服务器 `models/radar/`；
3. 推理依赖（`requirements-prod.txt`）建议在外网 `pip download -d wheels/ -r requirements-prod.txt` 后离线 `pip install --no-index --find-links wheels/ -r requirements-prod.txt`；
4. Docker 场景：在外网 `docker compose --profile gpu build` 后 `docker save` 镜像，内网 `docker load`；
5. 启动时确认 `HF_ENDPOINT` 不被强制访问外网——离线环境无需联网，权重已在本地。

---

## 7. 模型清单与校验和（占位，部署时填写）

> 以下校验和为**占位**。首次部署时请在实际下载后用 `sha256sum`（Linux）或 `Get-FileHash -Algorithm SHA256`（Windows）计算并回填，作为院内验收基线。

| 文件 | 来源 | 大小（约） | 许可 | SHA256（占位，部署时回填） |
|------|------|-----------|------|----------------------------|
| `checkpoint_radar_pretrain.pth` | HF `radar-generalist/RADAR` | 5 GB | CC BY-NC-SA 4.0（非商业） | `<待回填>` |
| `bert-base-chinese/` | HF `bert-base-chinese` | ~0.4 GB | 见其模型卡 | `<待回填>` |

回填后请把本表同步到院内部署验收单，并在每次权重升级时重新校验。

---

## 8. 端口与网络

| 服务 | 端口 | 暴露建议 |
|------|------|----------|
| BFF | 8080 | 反向代理 / 院内客户端入口 |
| Web | 5173 | 仅开发；生产静态托管 |
| radar-inference | 8090 | **仅内网/回环**，不暴露公网；业务端点需 `X-Internal-Token` |

安全组/防火墙应只放行 8080（必要时 5173），8090 仅允许 BFF 主机或指定内网段访问。

---

## 9. 环境变量速查

BFF 侧：

| 变量 | 默认 |
|------|------|
| `RADAR_INFERENCE_URL` | `http://localhost:8090` |
| `RADAR_INTERNAL_TOKEN` | （空，必须与 Python 一致） |

Python 侧：`RADAR_PORT=8090`、`RADAR_INTERNAL_TOKEN`、`RADAR_POSITIVE_THRESHOLD=0.5`、`RADAR_MAJOR_THRESHOLD=0.6`、`RADAR_CRITICAL_FINDINGS`（覆盖式）、`RADAR_MAX_CONCURRENCY=2`、`RADAR_JOB_TIMEOUT=600`、`RADAR_WEIGHT_PATH=models/radar/checkpoint_radar_pretrain.pth`。

---

## 10. 部署后自检

```bash
# 1) 健康
curl -s http://localhost:8090/health/ready

# 2) 服务内测试
cd services/radar-inference && pytest -q
# 期望：19 项通过

# 3) BFF 联通（需 JWT）
curl -s http://localhost:8080/api/v1/imaging/ai/catalog -H "Authorization: Bearer <JWT>"

# 4) 前端
#    打开 /imaging/ai/report/<studyUid>，确认 18 器官导航 + 146 发现 + 签名闭环
```

---

*Copyright (c) 2026 杭州健澜科技有限公司 · DAMO-RADAR 融合部署安装手册*
