# DAMO-RADAR 工业级超融合 · 融合架构白皮书

> 杭州健澜科技有限公司 · JLAIharnessos 智慧医院操作系统
> 版本 v0.2.0-radar ｜ 2026-09
> 适用对象：架构师、医疗信息化（信息科）、影像科、SRE / 运维、合规与医疗器械管理人员

---

## 0. 文档定位与阅读须知

本文是 DAMO-RADAR（腹部增强 CT 视觉-语言大模型）以**微服务超融合**方式接入健澜 JLAIharnessos 智能体操作系统的**架构级事实说明**。它回答四件事：

1. **边界**：新增的 Python 推理服务、BFF 适配器、前端页面各自守在哪里，谁也不越界；
2. **数据流**：从 PACS 的 DICOM 到医师签名审计，一次完整推理请求如何贯通；
3. **原则**：为什么我们坚持「技术栈异构、契约先于代码」，而不是把 PyTorch 揉进 Bun 进程；
4. **韧性**：无权重、无 GPU、推理服务宕机时系统如何优雅降级而不白屏、不误导。

> 唯一契约事实来源（Single Source of Truth）为根目录兄弟文件 [`docs/RADAR_FUSION_CONTRACT.md`](../RADAR_FUSION_CONTRACT.md)。本文不重复定义字段；任何字段名、端点路径、阈值**以契约为准**，本文仅作架构解释。

> ⚕️ **医疗定位红线**：DAMO-RADAR 在本系统中是**第二阅片（second reader）/ 辅助决策**工具，输出为概率与结构化发现，**不构成自动诊断**，必须经放射科医师复核签名后方可进入正式报告。

---

## 1. 背景与目标

### 1.1 为什么要「超融合」而非「重写一个 AI 影像产品」

健澜 JLAIharnessos 已有完整的院内智能体底座：BFF（Bun.serve，REST + WebSocket）、RBAC + ABAC、四级数据分级、审计哈希链、危急值告警通道、Web 工作台（React 19 + AntD 5）。DAMO-RADAR 是一个**训练好的 Python / PyTorch 深度学习模型**，其生态（LAVIS、MONAI、nnU-Net、3D-ResNets 风格的滑窗推理）天然绑定 Python 栈。

「工业级超融合」的含义是：**不重写底座，也不把模型硬塞进 Node 进程**，而是用一条清晰的 HTTP 契约，把「AI 推理这一能力」作为一个独立微服务挂到现有底座上，复用底座的鉴权、审计、告警、前端、降级与运维体系。

### 1.2 设计目标（可验证）

| 目标 | 验收口径 |
|------|----------|
| 异构不硬糅 | 推理服务为独立 Python FastAPI 进程，BFF 仅通过 HTTP + 内部 token 调用，进程/运行时/语言解耦 |
| 零权重可演示 | 未下载权重、无 GPU 时系统仍可启动并展示完整 UI 与确定性 demo 结果 |
| 医师闭环 | AI 报告必须经「同意/修改/驳回 + 签名」落审计，禁止无签名进入正式报告 |
| 全链路可观测 | 健康/就绪探针、并发限流、作业超时、日志脱敏齐备 |
| 不回归 | 融合后全量测试不下降（见 §8 测试基线） |

---

## 2. 服务边界图（ASCII）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          院内网络 / 浏览器或院内客户端                          │
└─────────────────────────────────────────────────────────────────────────────┘
                  │  HTTPS  (JWT + RBAC 中间件)
                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BFF 层  (Bun.serve)                         端口 8080                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  路由 src/bff/routes/imaging.ts  (前缀 /api/v1/imaging/ai/*)          │  │
│  │  适配器 src/integration/adapters/radar/                                │  │
│  │     - 把前端请求翻译成 Python REST 调用                                 │  │
│  │     - 注入 X-Internal-Token                                            │  │
│  │     - 推理服务不可用时：catalog 回退内置静态目录 / jobs 回退确定性 mock  │  │
│  │     - RBAC 中间件：imaging:view / imaging:ai:analyze / imaging:ai:review│  │
│  │     - review 落审计（内存 + data/imaging-ai-jobs.json 持久化）          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                 │  HTTP + X-Internal-Token (仅内网/回环)
                                 │  RADAR_INFERENCE_URL (默认 http://localhost:8090)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  推理微服务 services/radar-inference/  (Python FastAPI)   端口 8090          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  main.py (FastAPI) / auth.py (内部 token) / catalog.py (18×146)      │  │
│  │  jobs.py (作业队列 + 并发信号量 RADAR_MAX_CONCURRENCY)                │  │
│  │  demo_engine.py      : 无权重 -> 加载预计算 CSV，确定性                 │  │
│  │  production_engine.py : 有权重+GPU -> 真实推理 (HU 裁剪/重采样/滑窗)    │  │
│  │  logging_redact.py   : 日志脱敏，绝不打印 PHI                          │  │
│  │  vendor/damo-radar/  : 上游代码 vendor（Apache-2.0，保留 LICENSE）     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                 │  读体数据 (NIfTI .nii.gz)
                                 ▼
        ┌─────────────────────────┴─────────────────────────┐
        │  PACS / 影像网关                                   │
        │  DICOM -> 院内转换层 -> NIfTI(.nii.gz)            │
        │  (转换属于集成层职责，不在本服务内重写)            │
        └───────────────────────────────────────────────────┘

  数据面另一条线（告警）：
     Python/BFF 发现 critical  ──► 复用现有 /ws/chat broadcast / 告警中心 ──► 危急值推送
```

**边界一句话总结**：BFF 不碰张量、不加载模型；Python 服务不碰 JWT、不碰院内用户体系；前端不直接调 Python 服务，一切经 BFF 收敛。

---

## 3. 端到端数据流（一次腹部增强 CT 的完整旅程）

下面是一次「医师调阅某腹部增强 CT → AI 辅助出报告 → 复核签名」的标准数据流：

```
① PACS 归档 DICOM
        │  (院内 DICOM 网关 / AET 自动或医师手动触发)
        ▼
② DICOM → NIfTI(.nii.gz) 转换           【集成层，复用既有 DICOM 适配能力】
        │  脱敏：去除/隔离患者身份字段，仅以 study_uid 引用
        ▼
③ POST /api/v1/imaging/ai/jobs          【前端经 BFF】
     body: { study_uid, source:"pacs|upload|demo", file_ref:"/path/to.nii.gz" }
        │  BFF 校验权限 imaging:ai:analyze，注入 X-Internal-Token
        ▼
④ POST /api/v1/radar/jobs               【BFF -> Python :8090】
     返回 202 { job_id, status, mode }
        │
        ▼
⑤ Python 推理引擎
     ├─ demo 模式：直接读取 vendor/damo-radar/RADAR_infer_results_demo.csv（确定性）
     └─ production 模式：按 inference_demo.py 预处理
            HU 裁剪 [-300, 400] → 重采样 ref_spacing (1,1,5)
            → ROI (96,256,384) 滑窗 → 18 器官 × 146 发现概率
        │  (并发受 RADAR_MAX_CONCURRENCY 信号量限流；超时 RADAR_JOB_TIMEOUT)
        ▼
⑥ 结构化 findings (146 条) + summary(critical/major/minor/positive 计数)
     每条: { key, organ_zh, name_zh, name_en, probability, positive, tier }
     positive = probability >= RADAR_POSITIVE_THRESHOLD(默认 0.5)
        │
        ▼
⑦ 前端 GET /imaging/ai/report/:studyUid   【BFF 透传 job 状态 + RadarResult】
     左侧 18 器官导航（每器官阳性数徽标）
     右侧 146 发现列表：阳性高亮 / critical 红 / major 橙 / minor 默认
     头部：model=damo-radar / model_version=eaec6129 / mode / 时间 / 免责声明
        │
        ├──► 若存在 critical 发现 ──► ⑧ 危急值推送（复用现有告警通道 /ws/chat broadcast）
        ▼
⑨ 医师复核签名  POST /api/v1/imaging/ai/jobs/:id/review
     body: { verdict:approve|modify|reject, comment?, report_text?,
             signer_id, signer_name, ca_signature? }   权限 imaging:ai:review
        │
        ▼
⑩ 审计留痕  { reviewed_at, signer_id, audit_id, verdict }
     写入审计（哈希链），持久化 data/imaging-ai-jobs.json；
     提交后禁用重复提交；结果方可进入正式报告。
```

**关键不变量**：
- 任何进入正式报告的 AI 内容，都必须在审计链上存在一条带签名的 `review` 记录；
- 原始 DICOM / NIfTI 不写入模型权重存储，也不回传任何「大数据」到外部；
- Python 服务只见到 `study_uid` 与 `file_ref`，不见患者姓名/ID 明文（脱敏在集成层完成）。

---

## 4. 技术栈异构、不硬糅的设计原则

这是本融合最容易被误读的地方，单列一节讲透。

### 4.1 原则一：进程边界 = 运行时边界

| 层 | 运行时 | 语言 | 职责 |
|----|--------|------|------|
| BFF / 编排 / 工具 | Bun | TypeScript | 鉴权、审计、路由、业务编排、WebSocket、RBAC |
| Web 工作台 | Node(Vite) | React 19 + TS | 展示、签名闭环、降级 UI |
| 推理微服务 | CPython | Python 3 / FastAPI | 张量计算、模型加载、滑窗推理、并发限流 |

**为什么不把模型用 nodebindings 塞进 Bun？**
- DAMO-RADAR 依赖 PyTorch、CUDA、LAVIS、MONAI 生态，与 Bun/Node 无成熟互操作；
- 一个 OOM 或 CUDA 驱动崩溃不应拖垮承载全院业务的 BFF 进程；
- GPU 资源调度、显存占用、批次并发天然属于独立服务的职责。

### 4.2 原则二：契约先于代码（Contract-first）

- 三方字段、端点、错误体、阈值**唯一**写在 `docs/RADAR_FUSION_CONTRACT.md`；
- BFF、Python、前端各自按契约独立开发、独立测试，通过 OpenAPI/JSON Schema 对齐；
- 改字段必须先改契约再改代码，禁止「前端先改、后端偷偷跟」。

### 4.3 原则三：单一责任、可替换

- BFF 适配器 `src/integration/adapters/radar/` 是**唯一**知道 Python 端点形状的地方；
- 未来若替换为别的影像模型，只需换适配器 + 后端服务，前端与鉴权体系不动；
- Python 服务 `demo_engine` 与 `production_engine` 实现同一 `RadarResult` 接口，可无痛替换后端引擎。

### 4.4 原则四：不新增重型前端依赖

前端只复用现有 React 19 + antd 5 + zustand，不引入新的深度学习 wasm、不在浏览器做推理；所有重活在 Python 服务内完成。

---

## 5. 降级策略（Graceful Degradation）

医疗系统的可靠性要求：**任何一环缺失，都不能让医师看到白屏或一份「看起来确定」的错误报告**。本融合设计了三级降级。

### 5.1 服务启动期降级：无权重自动降 demo

- 启动时检测 `models/radar/checkpoint_radar_pretrain.pth` 是否存在、torch/CUDA 是否可用；
- 缺权重 / 缺 GPU / 缺 torch → **自动以 demo 模式启动**，加载预计算 CSV，`/health/ready` 返回 `status:"degraded", mode:"demo"`；
- 同时在日志与就绪探针中明确打印许可证提示（权重为 CC BY-NC-SA 4.0 非商业）。

### 5.2 运行期降级：推理服务不可用

| 端点 | 正常 | 推理服务不可用时 BFF 行为 |
|------|------|--------------------------|
| `GET /imaging/ai/catalog` | 透传 Python catalog | 返回**内置静态 catalog**，保证前端不白屏 |
| `GET /imaging/ai/jobs/:id` | 透传 job + result | 返回**确定性 mock 结果**（与 Python demo 同源数值），前端显示「演示数据」水印 |
| `POST /imaging/ai/jobs` | 转发排队 | 优雅失败，结构化错误体（`{code,message,traceId}`），绝不泄露堆栈 |

### 5.3 前端降级

- 空态 / 加载态 / 错误边界 / 离线降级齐备；
- 任何降级态均带明确**水印或角标**（如「演示数据 demo data」），杜绝把 demo 误当真实诊断；
- 签名闭环在降级态下仍要求医师签名（demo 数据同样走审计，标记为演示）。

### 5.4 安全降级

- `RADAR_INTERNAL_TOKEN` 未配置时，Python 服务**仅允许回环（127.0.0.1）调用**；
- 任一未配置即拒绝跨主机调用，防止内网被绕过鉴权直连推理端口。

---

## 6. 端口矩阵

| 服务 | 进程/运行时 | 端口 | 协议 | 对外暴露 | 说明 |
|------|-------------|------|------|----------|------|
| BFF | Bun.serve | **8080** | HTTP + WebSocket | 浏览器/院内客户端唯一入口 | 收敛鉴权、路由、审计、告警 |
| Web 工作台 | Vite(dev) | **5173** | HTTP | 开发/内网 | 生产由静态托管/反向代理，不直出 5173 |
| radar-inference | Python Uvicorn/FastAPI | **8090** | HTTP | **仅内网/回环**，不直接暴露公网 | 健康探针不鉴权，业务端点需 `X-Internal-Token` |

> 生产部署应在反向代理 / 安全组层面**只放行 8080**（必要时 5173 仅开发），8090 仅允许 BFF 所在主机或内网网段访问。

---

## 7. 容器与部署形态（概览）

- docker-compose 提供两个 profile：
  - `demo`：CPU 镜像，**不挂载权重卷**，启动即 demo；
  - `gpu`：挂载 `./models/radar:/models`，要求权重就位 + GPU 运行时；
- 权重卷 `./models/radar/` 已 gitignore，**永不入库**；
- 根 compose 增加 `radar-inference` 服务，但默认不抢对外端口；
- BFF 通过 `RADAR_INFERENCE_URL`（默认 `http://localhost:8090`）与 `RADAR_INTERNAL_TOKEN` 与推理服务对接。

> 完整安装步骤、权重下载、内网离线部署见配套文档 [`docs/deployment/RADAR_部署安装手册.md`](../deployment/RADAR_部署安装手册.md)。

---

## 8. 测试基线（融合后真实数字）

本融合交付时，全量回归维持在以下真实基线（数字为当次实测，非目标值）：

| 测试套件 | 运行器 | 通过 |
|----------|--------|------|
| 后端单元/集成 | `bun test` | **1184** 通过 |
| 前端组件/交互 | `vitest` | **201** 通过 |
| 推理服务 | `pytest` | **19** 通过 |
| 类型检查 | `tsc` | **0 错误** |

推理服务 pytest 覆盖：健康检查、catalog 结构（18 器官 / 146 发现）、作业提交与状态查询、demo 结果契约 schema、无权重自动降级、内部 token 鉴权拒绝、日志脱敏、并发限流。

---

## 9. 与上游及开源生态的关系

- 上游：`alibaba-damo-academy/damo-radar`（Apache-2.0 代码），vendor 于 `services/radar-inference/vendor/damo-radar/`，保留其 `LICENSE` 与 `THIRD_PARTY_LICENSES.md`；
- 论文：Qi Zhang et al., *An expert-level generalist AI for abdominal CT diagnosis*, **Science 393(6817):eaec6129, 2026**, DOI 10.1126/science.aec6129；
- 模型权重 `checkpoint_radar_pretrain.pth`：**CC BY-NC-SA 4.0（非商业）**，约 5 GB，由部署方经 `download_weights.sh` 自行拉取；
- 传递依赖生态：LAVIS、nnU-Net、MONAI、3D-ResNets 风格滑窗推理等，署名与合规详见 [`docs/open-source/RADAR_许可与合规声明.md`](../open-source/RADAR_许可与合规声明.md)。

---

## 10. 配套文档导航

| 主题 | 文档 |
|------|------|
| 唯一契约事实来源 | [`docs/RADAR_FUSION_CONTRACT.md`](../RADAR_FUSION_CONTRACT.md) |
| BFF↔Python 端点 / 权限码 / 配置项 | [`docs/open-source/RADAR_融合集成说明.md`](../open-source/RADAR_融合集成说明.md) |
| 安装 / 权重 / 离线部署 / 硬件要求 | [`docs/deployment/RADAR_部署安装手册.md`](../deployment/RADAR_部署安装手册.md) |
| 双轨许可 / 商用授权 / 医疗器械合规 | [`docs/open-source/RADAR_许可与合规声明.md`](../open-source/RADAR_许可与合规声明.md) |
| 院内微调 / 本地验证 / 漂移监控 | [`docs/requirements/RADAR_训练微调评估复现指南.md`](../requirements/RADAR_训练微调评估复现指南.md) |

---

*Copyright (c) 2026 杭州健澜科技有限公司 · DAMO-RADAR 工业级超融合融合架构白皮书*

*本文档为架构说明，不构成医疗器械的诊断结论；任何 AI 输出须经放射科医师复核签名。*
