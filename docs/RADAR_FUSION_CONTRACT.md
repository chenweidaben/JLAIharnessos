# DAMO-RADAR 工业级超融合 —— 统一契约规范（所有子代理必须严格遵守）

本文件是 Python 推理服务、BFF 集成层、前端三者之间的唯一契约事实来源。不得臆造字段，不得改名。

## 0. 来源与合规（已核实）
- 上游仓库：`alibaba-damo-academy/damo-radar`（官方当前 404，可访问镜像 `jhuanglabai/damo-radar`，Apache-2.0 代码）。
- 论文：Qi Zhang et al., "An expert-level generalist AI for abdominal CT diagnosis", Science 393(6817):eaec6129, 2026, DOI 10.1126/science.aec6129。
- 能力：腹部增强 CT 视觉-语言模型；**18 个器官/解剖结构 + 146 项临床发现**；输出概率 0~1。
- 代码已 vendor 到 `services/radar-inference/vendor/damo-radar/`（保留其 LICENSE / THIRD_PARTY_LICENSES.md）。
- 真实推理需 CUDA + 约 5GB 权重 `checkpoint_radar_pretrain.pth`（HuggingFace `radar-generalist`，CC BY-NC-SA 4.0 非商业）。**权重严禁入库**，由部署方用官方 download_scripts 自行拉取。
- 双模式：`demo`（无权重/GPU，加载 `vendor/damo-radar/RADAR_infer_results_demo.csv` 预计算结果，确定性）与 `production`（真实推理，需权重+GPU）。服务启动检测权重，缺失自动降级为 demo。
- 定位：**第二阅片/辅助决策**，必须有放射科医师复核签名闭环，不得自动诊断。

## 1. 18 器官（中文 key，顺序固定）
主动脉、十二指肠、大肠、小肠、心脏、肋骨、肝、肺、肾、肾上腺、胃、胆囊、胰腺、脾、膀胱、门静脉、食管、骶骨

## 2. 146 发现字段结构
每项 findings 由上游 CSV 表头解析，完整清单见 `.radar-contract.json`（项目根）。每项：
```
{
  "key": "肝_肝细胞癌",
  "organ_zh": "肝",
  "name_zh": "肝细胞癌",
  "name_en": "Liver_Hepatocellular carcinoma",
  "probability": 0.0~1.0,
  "positive": true|false,
  "tier": "critical" | "major" | "minor"
}
```
- positive 判定：probability >= 阈值（默认 0.5，可配 `RADAR_POSITIVE_THRESHOLD`）。
- tier 规则（内置 curated 集合，写入 Python 服务常量）：
  - critical：恶性肿瘤/急重症 —— 肝细胞癌、胆管癌、胆囊癌、胰腺癌、胃癌、结肠癌、直肠癌、小肠淋巴瘤、肾细胞癌、肾盂癌、膀胱癌、脾脏淋巴瘤、肺占位/肺转移、各器官转移瘤、主动脉夹层、阑尾炎、脾梗死、肠穿孔、肠套叠、门静脉栓塞。
  - major：较大占位/出血/梗阻/积液等 —— 其余 positive 中 probability>=0.6 者。
  - minor：其余 positive。
- 阈值与 critical 集合必须可通过环境变量/配置覆盖，便于院内调参。

## 3. Python 推理服务 ↔ BFF 契约
服务端口默认 `8090`。内部鉴权头：`X-Internal-Token: $RADAR_INTERNAL_TOKEN`（BFF 与服务共享同一 secret；任一未配置则拒绝非本地调用）。

### 3.1 GET /health/live
→ `200 {"status":"ok"}`

### 3.2 GET /health/ready
```json
{"status":"ready|degraded","mode":"demo|production","weights_loaded":false,"gpu_available":false,"model":"damo-radar","model_version":"eaec6129"}
```

### 3.3 GET /api/v1/radar/catalog
→ 静态目录：`{organs:[{key,name_zh,name_en,findings:[{key,name_zh,name_en}]}], positive_threshold:0.5, critical_findings:[...]}`

### 3.4 POST /api/v1/radar/jobs
请求：`{"study_uid":"...","source":"pacs|upload|demo","file_ref":"/path/or/uri/to.nii.gz"}`
- source=demo 时忽略 file_ref，返回内置 demo 病例结果。
响应：`202 {"job_id":"job_xxx","status":"queued|completed","mode":"demo|production"}`
（demo 模式可同步完成；production 异步排队）

### 3.5 GET /api/v1/radar/jobs/{job_id}
```json
{
  "job_id":"job_xxx",
  "status":"queued|running|completed|failed",
  "progress":0.0~1.0,
  "mode":"demo|production",
  "study_uid":"...",
  "error": null | {"code":"...","message":"..."},
  "result": { RadarResult } | null
}
```

### 3.6 RadarResult
```json
{
  "study_uid":"...",
  "model":"damo-radar","model_version":"eaec6129",
  "mode":"demo|production",
  "generated_at":"2026-09-21T14:00:00+08:00",
  "positive_threshold":0.5,
  "findings":[ {见 §2} ],
  "summary": {"critical_count":0,"major_count":0,"minor_count":0,"positive_count":0,"critical_findings":[],"major_findings":[]},
  "disclaimer":"本结果由 DAMO-RADAR AI 模型辅助生成，仅作第二阅片参考，最终诊断须由放射科医师复核签名。"
}
```

## 4. BFF 对前端契约（统一 /api/v1，复用现有 RouteDef/fail/ok/json/ErrorCode）
- `GET  /api/v1/imaging/ai/catalog` → 透传 Python catalog；推理服务不可用时返回内置静态 catalog（保证前端不白屏）。
- `POST /api/v1/imaging/ai/jobs` body `{study_uid?, source?, file_ref?}` → `{job_id,status,mode}`。
- `GET  /api/v1/imaging/ai/jobs/:id` → 透传 job 状态+result；推理服务不可用时返回**确定性 mock 结果**（与 Python demo 同源数值）。
- `POST /api/v1/imaging/ai/jobs/:id/review` body `{verdict:"approve|modify|reject", comment?, report_text?, signer_id, signer_name, ca_signature?}` → 写审计留痕，返回 `{reviewed_at, signer_id, audit_id, verdict}`。权限码 `imaging:ai:review`。
- `GET  /api/v1/imaging/ai/jobs?patient_id=xxx` → 该患者历史 AI 报告列表（mock 存储，内存+持久化到 `data/imaging-ai-jobs.json`）。
- 所有响应体结构化：成功 `{code:0,data,message:"ok",traceId}`；失败 `{code,message,traceId}`，**绝不泄露堆栈**。
- 权限：查看需 `imaging:view`；提交需 `imaging:ai:analyze`；审核签名需 `imaging:ai:review`。走现有 RBAC 中间件。
- critical 发现（如疑似肝癌/阑尾炎）触发现有告警中心危急值通道（复用 `/ws/chat` broadcast 或告警聚合）。

## 5. 前端契约（React 19 + antd 5 + zustand）
- 路由：`/imaging/ai/report/:studyUid?` 与患者360 影像 tab 内嵌面板。
- 组件：左侧 18 器官导航（含每器官阳性数徽标），右侧 146 发现列表（阳性高亮、critical 红色警示条、major 橙色、minor 默认；每行 名称+置信度进度条）。
- 操作条：「AI 辅诊报告」头部显示 model/版本/模式(demo|production)/时间/免责声明；底部「放射科医师复核」：同意/修改/驳回 + 意见 + 签名（CA 签名框或演示签名），提交后审计留痕并禁用重复提交。
- 空态/加载态/错误边界/离线降级齐备；推理服务降级时显示「演示数据」水印。
- 不新增重型依赖；不破坏现有 50+ 路由与 antd v5-patch-for-react-19。

## 6. 容器与端口
- 新增 `radar-inference` 服务（FastAPI，端口 8090）。
- docker-compose：profile `demo`（CPU，无权重，加载 demo CSV）与 `gpu`（挂载 `./models/radar:/models`，需权重）。
- 权重卷 `./models/radar/`（gitignore），缺失权重自动以 demo 模式启动并打印 license 提示。
- 根 compose 增加该服务但默认不抢端口；BFF 通过 `RADAR_INFERENCE_URL`（默认 `http://localhost:8090`）与 `RADAR_INTERNAL_TOKEN` 配置。

## 7. 测试要求
- Python：pytest，覆盖 健康检查/catalog/jobs 提交/状态查询/降级(无权重)/internal token 鉴权/脱敏/并发限流/契约 schema。
- BFF：bun test 新增路由用例（catalog/jobs/review/RBAC/降级 mock/错误体结构）。
- 前端：vitest 新组件渲染与签名闭环用例。
- 全量回归不得下降（基线：bun test 1175 通过；vitest 189 通过；tsc 0 错误）。
