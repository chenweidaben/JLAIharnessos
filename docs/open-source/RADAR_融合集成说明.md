# DAMO-RADAR 融合集成说明

> 杭州健澜科技有限公司 · JLAIharnessos
> 版本 v0.2.0-radar ｜ 2026-09
> 适用对象：BFF 后端工程师、前端工程师、集成/联调工程师、信息科

本文是 DAMO-RADAR 与 JLAIharnessos 集成的**逐端点对接手册**。字段、路径、阈值的唯一事实来源仍是 [`docs/RADAR_FUSION_CONTRACT.md`](../RADAR_FUSION_CONTRACT.md)；本文在此基础上给出可直接复制的请求/响应样例、权限码与配置项。

---

## 1. 能力契约：18 器官 / 146 发现

### 1.1 模型能力边界

- 适用模态：**腹部增强 CT**（contrast-enhanced abdominal CT）；
- 输出：18 个器官/解剖结构下共 **146 项临床发现**，每项输出概率 `0.0~1.0`；
- 输出性质：**概率与结构化发现**，供第二阅片参考；不输出自动诊断结论。

### 1.2 18 个器官（中文 key，顺序固定，不可改）

| # | 器官 key | # | 器官 key |
|---|----------|---|----------|
| 1 | 主动脉 | 10 | 肾上腺 |
| 2 | 十二指肠 | 11 | 胃 |
| 3 | 大肠 | 12 | 胆囊 |
| 4 | 小肠 | 13 | 胰腺 |
| 5 | 心脏 | 14 | 脾 |
| 6 | 肋骨 | 15 | 膀胱 |
| 7 | 肝 | 16 | 门静脉 |
| 8 | 肺 | 17 | 食管 |
| 9 | 肾 | 18 | 骶骨 |

> 完整 146 发现清单（`key / organ_zh / name_zh / name_en`）由服务启动时从 `app/data/radar_contract.json`（项目根 `.radar-contract.json`）解析，**不在文档中逐条手抄**，以避免与代码漂移。联调时调用 `GET /api/v1/radar/catalog` 取权威清单。

### 1.3 单条发现的数据结构

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

### 1.4 阳性判定与分级（tier）

- **positive**：`probability >= RADAR_POSITIVE_THRESHOLD`（默认 `0.5`）；
- **tier**（内置 curated 集合，写入 Python 服务常量，可经环境变量覆盖）：
  - `critical`：恶性肿瘤 / 急重症。内置集合示例：肝细胞癌、胆管癌、胆囊癌、胰腺癌、胃癌、结肠癌、直肠癌、小肠淋巴瘤、肾细胞癌、肾盂癌、膀胱癌、脾脏淋巴瘤、肺占位/肺转移、各器官转移瘤、主动脉夹层、阑尾炎、脾梗死、肠穿孔、肠套叠、门静脉栓塞；
  - `major`：其余 positive 中 `probability >= RADAR_MAJOR_THRESHOLD`（默认 `0.6`）者；
  - `minor`：其余 positive。

> 阈值与 critical 集合**必须**可通过环境变量/配置覆盖，便于院内按本院读片习惯调参（见 §5）。

---

## 2. BFF ↔ Python 推理服务契约（逐端点）

Python 服务默认端口 `8090`。内部鉴权头：`X-Internal-Token: $RADAR_INTERNAL_TOKEN`（BFF 与服务共享同一 secret；任一未配置则拒绝非本地调用）。健康检查端点不鉴权（供探针使用）。

### 2.1 `GET /health/live`

存活探针，不鉴权。

```
-> 200 {"status":"ok"}
```

### 2.2 `GET /health/ready`

就绪探针，不鉴权。反映当前模式与权重/GPU 状态。

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

- `mode=demo` 且 `status=degraded`：无权重/GPU，加载预计算 CSV；
- `mode=production` 且 `status=ready`：权重已加载、GPU 可用。

### 2.3 `GET /api/v1/radar/catalog`

鉴权。静态目录，前端首屏渲染依赖。

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

鉴权。提交一次推理作业。

请求：

```json
{ "study_uid": "...", "source": "pacs | upload | demo", "file_ref": "/path/or/uri/to.nii.gz" }
```

- `source=demo` 时忽略 `file_ref`，返回内置 demo 病例结果；
- `source=pacs|upload` 时 `file_ref` 指向已转换好的 NIfTI 路径/URI。

响应（`202`）：

```json
{ "job_id": "job_xxx", "status": "queued | completed", "mode": "demo | production" }
```

> demo 模式可同步完成；production 异步排队。

### 2.5 `GET /api/v1/radar/jobs/{job_id}`

鉴权。轮询作业状态与结果。

```json
{
  "job_id": "job_xxx",
  "status": "queued | running | completed | failed",
  "progress": 0.0,
  "mode": "demo | production",
  "study_uid": "...",
  "error": null,
  "result": { "RadarResult": "见 §2.6" }
}
```

### 2.6 `RadarResult`（result 字段结构）

```json
{
  "study_uid": "...",
  "model": "damo-radar",
  "model_version": "eaec6129",
  "mode": "demo | production",
  "generated_at": "2026-09-21T14:00:00+08:00",
  "positive_threshold": 0.5,
  "findings": [ { "见 §1.3" } ],
  "summary": {
    "critical_count": 0,
    "major_count": 0,
    "minor_count": 0,
    "positive_count": 0,
    "critical_findings": [],
    "major_findings": []
  },
  "disclaimer": "本结果由 DAMO-RADAR AI 模型辅助生成，仅作第二阅片参考，最终诊断须由放射科医师复核签名。"
}
```

---

## 3. BFF 对前端契约（统一 `/api/v1`）

BFF 复用现有 `RouteDef / fail / ok / json / ErrorCode`。前端**只**与 BFF 对话，不直连 Python 服务。

| 方法 | 路径 | 权限码 | 说明 |
|------|------|--------|------|
| GET | `/api/v1/imaging/ai/catalog` | `imaging:view` | 透传 Python catalog；推理服务不可用时返回**内置静态 catalog**（前端不白屏） |
| POST | `/api/v1/imaging/ai/jobs` | `imaging:ai:analyze` | body `{study_uid?, source?, file_ref?}` → `{job_id,status,mode}` |
| GET | `/api/v1/imaging/ai/jobs/:id` | `imaging:view` | 透传 job 状态+result；Python 不可用时返回**确定性 mock**（与 Python demo 同源数值） |
| POST | `/api/v1/imaging/ai/jobs/:id/review` | `imaging:ai:review` | 复核签名，写审计留痕 |
| GET | `/api/v1/imaging/ai/jobs?patient_id=xxx` | `imaging:view` | 该患者历史 AI 报告列表（mock 存储，内存+`data/imaging-ai-jobs.json` 持久化） |

### 3.1 复核签名请求/响应

请求 `POST /api/v1/imaging/ai/jobs/:id/review`：

```json
{
  "verdict": "approve | modify | reject",
  "comment": "可选意见",
  "report_text": "可选报告正文",
  "signer_id": "dr_1001",
  "signer_name": "张某某",
  "ca_signature": "可选 CA 签名值"
}
```

响应：

```json
{ "reviewed_at": "2026-09-21T14:05:00+08:00", "signer_id": "dr_1001", "audit_id": "aud_xxx", "verdict": "approve" }
```

提交后**禁用重复提交**；审计写入哈希链。

### 3.2 统一响应信封

- 成功：`{ "code": 0, "data": ..., "message": "ok", "traceId": "..." }`
- 失败：`{ "code": ..., "message": "...", "traceId": "..." }`
- **绝不**向前端泄露堆栈 / SQL / 文件路径。

### 3.3 critical 发现联动

存在 critical 发现（如疑似肝癌、阑尾炎、主动脉夹层等）时，BFF 复用现有告警中心危急值通道（`/ws/chat` broadcast 或告警聚合）推送，不新建告警子系统。

---

## 4. 权限码（RBAC）

走现有 RBAC 中间件，新增三个权限点：

| 权限码 | 含义 | 典型角色 |
|--------|------|----------|
| `imaging:view` | 查看影像 AI 报告与目录 | 放射科医师、影像科、有授权的临床医师 |
| `imaging:ai:analyze` | 提交 AI 推理作业（触发计算） | 放射科医师、影像科技师 |
| `imaging:ai:review` | 复核并签名（闭环、落审计） | 放射科医师（主签） |

> 三权限逐级收紧：`view < analyze < review`。未授权访问按现有 RBAC 拒绝并记审计。

---

## 5. 配置项

### 5.1 BFF 侧（对接推理服务）

| 环境变量 | 默认 | 说明 |
|----------|------|------|
| `RADAR_INFERENCE_URL` | `http://localhost:8090` | Python 推理服务基地址 |
| `RADAR_INTERNAL_TOKEN` | （空） | 内部鉴权 secret，BFF 与 Python 共享；任一未配置则拒绝非回环调用 |

### 5.2 Python 推理服务侧

| 环境变量 | 默认 | 说明 |
|----------|------|------|
| `RADAR_PORT` | `8090` | 服务端口 |
| `RADAR_INTERNAL_TOKEN` | （空） | 内部鉴权 token；未配置时仅允许回环 |
| `RADAR_POSITIVE_THRESHOLD` | `0.5` | positive 概率阈值 |
| `RADAR_MAJOR_THRESHOLD` | `0.6` | major 分级阈值 |
| `RADAR_CRITICAL_FINDINGS` | 内置 curated 集合 | 逗号分隔，**整体替换**内置 critical 集合 |
| `RADAR_MAX_CONCURRENCY` | `2` | 并发推理信号量上限 |
| `RADAR_JOB_TIMEOUT` | `600` | 作业超时秒数 |
| `RADAR_WEIGHT_PATH` | `models/radar/checkpoint_radar_pretrain.pth` | 权重路径 |

> 调参建议：阈值与 critical 集合的院内变更必须走配置管理与评审，不直接改代码常量；变更前后各跑一次本地验证（见训练微调复现指南）。

---

## 6. 前端契约要点

- 路由：`/imaging/ai/report/:studyUid?`，并在患者 360 影像 tab 内嵌面板；
- 布局：左侧 18 器官导航（每器官阳性数徽标），右侧 146 发现列表（阳性高亮，critical 红条、major 橙、minor 默认；每行「名称 + 置信度进度条」）；
- 头部：`AI 辅诊报告`，显示 model / 版本 / 模式（demo|production）/ 时间 / 免责声明；
- 底部：「放射科医师复核」——同意/修改/驳回 + 意见 + 签名（CA 签名框或演示签名），提交后审计留痕并禁用重复提交；
- 空态/加载态/错误边界/离线降级齐备；推理服务降级时显示「演示数据」水印；
- 不新增重型依赖；不破坏现有 50+ 路由与 antd v5-patch-for-react-19。

---

## 7. 联调自检清单

```bash
# 1) 健康
curl -s http://localhost:8090/health/ready

# 2) 目录（鉴权）
curl -s -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" http://localhost:8090/api/v1/radar/catalog

# 3) 提交 demo 作业
curl -s -X POST http://localhost:8090/api/v1/radar/jobs \
     -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" -H "Content-Type: application/json" \
     -d '{"study_uid":"demo-study","source":"demo"}'

# 4) 轮询结果（替换 job_id）
curl -s -H "X-Internal-Token: $RADAR_INTERNAL_TOKEN" \
     http://localhost:8090/api/v1/radar/jobs/job_xxx
```

通过 BFF 验证：

```bash
# 经 BFF（需 JWT），应得到 {code:0,data:{...}} 信封
curl -s http://localhost:8080/api/v1/imaging/ai/catalog -H "Authorization: Bearer <JWT>"
```

---

*Copyright (c) 2026 杭州健澜科技有限公司 · DAMO-RADAR 融合集成说明*
