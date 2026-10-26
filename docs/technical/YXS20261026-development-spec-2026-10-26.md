# 健澜AI原生医院操作系统OS —— 医疗大模型多智能体系统开发技术文档

> 文档编号：JL-DEV-SPEC-20261026-01
> 对标方案：《医院医疗大模型多智能体系统-项目总体方案》（方案编号 YXS20261026，内部存档 `docs/refs/YXS20261026-医院医疗大模型多智能体系统-项目总体方案.docx`，提取文本 `docs/refs/YXS20261026-plan-extracted.txt`）
> 配套差距矩阵：`docs/research/YXS20261026-gap-matrix-2026-10-26.md`（以下简称"差距矩阵"）
> 编制单位：杭州健澜科技有限公司
> 产品正式名称：**健澜AI原生医院操作系统OS**（Jianlan AI-Native Hospital OS）
> 仓库：`jlmedaios`（BFF/后端）、`jlmedaios-web`（前端）
> 版本：v0.1.0-dev ｜ 编制日期：2026-10-26 ｜ 状态：开发基线（待评审）

---

## 1. 概述

### 1.1 文档目的

本文档依据方案 YXS20261026 的建设目标、总体架构、功能要求与升级体系，结合健澜AI原生医院操作系统OS 现有代码基线（2026-10-26 静态取证，见差距矩阵），给出可落地的开发设计：模块划分、数据模型、接口契约、关键流程、分期路线、测试与验收标准。本文档是后续开发切片（S-01 ~ S-23，编号与差距矩阵第 5 章一致）的设计依据，代码实现必须与本文档的接口契约、风险分级、审计要求保持一致。

### 1.2 范围

**本文档覆盖**：

- 平台六子系统：网关管理、模型管理、RAG 私域知识库、提示词工程管理、智能体管理、安全审计；
- 六类临床文书智能体：门诊病历、住院病历、手术记录、会诊记录、护理记录、病历内涵质控；
- RAG 知识加工七环节、六知识域与患者数据隔离；
- 提示词四层结构与资产生命周期；
- 编排层九项能力与智能体全生命周期；
- 版本升级体系（四线版本、灰度、回滚、环境隔离、接口兼容、业务连续性）；
- 安全合规五道防线与等保/数据安全要求的落地设计。

**本文档不覆盖**：

- 医院现有 HIS/EMR/LIS/PACS 等核心业务系统的内部改造（方案明确边界：不改、不替换核心系统，本平台仅通过接口/视图/消息对接）；
- 面向患者的互联网端应用（方案明确不含）；
- 医院现有算力基础设施采购与机房改造（方案明确利旧，不新增算力采购）；
- 既有电子病历合规生产化六项 P0 的整改细节（引用 `docs/research/emr-gap-matrix-2026-10-25.md`，本文档仅做联动接口设计）。

### 1.3 术语与命名口径

| 术语 | 定义 |
|---|---|
| 平台 | 健澜AI原生医院操作系统OS 中承载本次方案能力的软件集合（BFF + 前端 + 编排层 + 知识中台 + 安全域） |
| 智能体（Agent） | 面向特定临床文书/质控场景、由模型 + 提示词 + 工具 + 知识 + 工作流组成的可发布单元 |
| 工作流（Workflow） | 声明式 DAG，描述智能体一次执行的节点序列、分支、人工确认与降级路径 |
| 模型卡片（Model Card） | 模型注册表中描述模型身份、能力、参数、风险、责任人与版本的结构化档案 |
| 知识块（Chunk） | 经采集、解析、清洗、切分后进入检索索引的最小知识单元 |
| 引用溯源（Provenance） | 知识块到原始文档、章节、页码、来源机构、生效日期的可回溯链路 |
| 影子模式（Shadow Mode） | 新模型/新提示词并行接收相同请求但不对外输出，仅用于质量比对的运行模式 |
| 五维灰度 | 按科室、医师、文书类型、患者、流量比例五个维度控制新版本发布范围 |
| 四维留痕 | 一次病历生成绑定模型版本、知识版本、提示词版本、平台发布版本，供法律举证追溯 |
| 人工在环（Human-in-the-loop, HITL） | 智能体输出必须经医师确认/修改/拒绝后方可回写病历的运行模式 |

**品牌口径（零容忍）**：产品名一律使用「健澜AI原生医院操作系统OS」；署名「杭州健澜科技有限公司」；禁止出现"健澜科技杠OS""杠OS""建兰""gang-os""Gang-OS""数智医院操作系统"等旧称或错称；部署医院名称、其他厂商名称不进入本系列交付文档正文与代码注释。

### 1.4 与既有文档的关系

| 文档 | 关系 |
|---|---|
| `docs/research/YXS20261026-gap-matrix-2026-10-26.md` | 现状取证与差距评级基线，本文档第 3~9 章的现状描述均引用其结论，不重复静态取证 |
| `docs/research/emr-gap-matrix-2026-10-25.md` | 电子病历合规 29 流程域矩阵与六项生产化 P0，本文档第 9 章做接口联动，整改实施以该文档为准 |
| `docs/COMPLIANCE_BLUEPRINT.md`、`docs/COMPLIANCE.md` | 既有合规蓝图，本文档安全章节与其保持一致并补充 AI 专项要求 |
| `docs/technical/01-系统总体架构设计.md` ~ `05-开发任务分解与团队协作规范.md` | 既有架构与规范底稿，模块命名、代码风格、目录约定沿用既有规范 |

### 1.5 设计原则

1. **不侵入核心系统**：本平台只做"外挂式智能辅助"，所有临床数据经既有系统接口/视图/消息获取，不绕过核心系统写库；病历回写走既有 EMR 授权接口并记录审计。
2. **医师最终决策**：所有 AI 输出为辅助参考，不构成诊断或处方依据；中风险以上智能体强制人工确认后回写；高风险结论须专家复核。
3. **系统越用越聪明**：采纳、修改、拒绝、反馈数据按智能体/场景/版本沉淀，驱动提示词、知识与模型版本迭代；数据资产归属医院。
4. **可追溯、可回滚**：模型、知识、提示词、平台程序四条版本线独立演进；任意一次病历生成可回溯四维版本；任何新版本先验证、后灰度、可回滚。
5. **安全内建（Security by Design）**：输入、提示词、知识、输出、审计五道防线贯穿所有智能体；默认最小权限、默认脱敏、默认留痕。
6. **可插拔、可替换**：模型供应商、Embedding 供应商、重排模型、ASR/OCR 组件均经抽象接口接入，不绑定单一供应商；规则引擎与大模型混合，确定性规则优先用于时限、格式、编码等场景。
7. **演示态与生产态分离**：开发演示模式（`DEMO_MODE`）仅用于本地联调；生产部署必须关闭演示模式，接入真实身份、真实数据库与真实审计链（合规 P0-①）。

---

## 2. 总体架构

### 2.1 五横两纵落地映射

方案"五横两纵"六层架构与现有代码目录的对应关系如下（现状基线见差距矩阵 2.2 节）：

| 方案层 | 职责 | 现有代码落点 | 本期补齐方向 |
|---|---|---|---|
| 基础设施层 | 医院现有服务器、GPU/CPU、网络、存储利旧；本平台不新增算力采购 | 部署文档 `docs/DEPLOYMENT_GUIDE.md`、`docker-compose` 栈、Kubernetes 清单、Helm Chart（M6-A/M6-B/M6-C） | 资源规格基线、容器化资源配额、模型推理资源隔离方案随部署手册固化 |
| 数据与接入层 | 业务系统 API/视图/消息接入；语音采集；文档接入（PDF/Word/OFD/Markdown/扫描件 OCR）；数据治理（主数据字典映射、EMPI、脱敏、质量校验、血缘） | `src/integration/`（50 文件，HL7/FHIR/适配器）；`src/bff/routes/fhir*.ts`；`src/knowledge-platform/sources/connectors.ts`；EMPI 域（M5-C）；脱敏 `src/security/desensitization/`；数据质量（M5-E）；血缘（M5-D） | 接入系统台账（S-21）、OFD/OCR 接入器（S-22）、治理动作统一视图（S-23） |
| 模型管理层 | 模型注册、健康检查、版本回滚、A-B 测试；策略路由；主备切换；会话粘性；三层模型（主力/辅助/专用） | `src/bff/agents/modelProvider.ts`（单实例工厂 + 熔断重试）；`src/core/agent/providers/`；`src/bff/llm/llmAdapter.ts`；Embedding/Reranker/规则引擎分散实现 | 模型注册表与卡片（S-02）、策略路由与主备切换（S-03）、三层模型分层注册 |
| 智能体应用层 | 六智能体 + 运行框架（意图识别/任务规划/工具调用/上下文管理/多智能体协同/人工确认/结果回写） | `src/orchestrator/`（DSL + 引擎 + 状态机 + 记录器 + 人工挂起）；`agents/` 10 个声明包；`src/bff/agents/` 岗位注册表与执行引擎；`src/medical-tools/` 190+ 工具 | 编排九能力补齐（S-05）、六智能体独立声明包（S-09/S-10/S-14/S-15/S-16/S-17）、智能体准入评测门禁（S-06） |
| 用户与场景层 | 场景注册；科室级/人员级模型切换热更新；调用量、Token 成本、满意度监控 | 前端 `agent-manager`、`agent-adoption`、`agent-health`、`muse-ab`；BFF `agentManagerV8.ts`、`personalAgentAdoption.ts`、`workflowMonitorV6.ts` | 场景三维注册表（科室 × 人员 × 文书类型）、Token 成本与满意度看板（S-05、S-06） |
| 纵一：安全保障体系 | 等保 2.0、健康医疗数据安全、分级分类、加密、脱敏、审计、RBAC/ABAC、输入/输出防护 | `src/security/` 十子域；`src/tenant/`；审计 WORM 与哈希链 | 输出侧校验器（S-01）、AI 审计四元组（S-08）、患者级隔离（S-13）；合规 P0 六项按既有矩阵整改 |
| 纵二：标准规范与运营体系 | 接口规范、提示词/知识/规则资产规范、评测规范、升级发布规范、运营培训与台账 | `docs/technical/01~05` 既有规范；`agents/manifest.json`；版本/灰度零散实现 | 四线版本台账（S-07）、提示词/知识资产规范（S-04、S-11）、评测规范（S-06）、升级 SOP（S-07） |

### 2.2 部署形态（本地开发态基线，生产态另见部署手册）

```text
┌──────────────────────────────────────────────────────────────────┐
│ 浏览器工作台（React 19 + Vite，端口 5173）                          │
│  - 临床文书工作台 / 智能体管理 / 知识中台 / 提示词治理 / 审计看板      │
└───────────────┬──────────────────────────────────────────────────┘
                │ /api 代理（不 rewrite）、/ws 代理
┌───────────────▼──────────────────────────────────────────────────┐
│ BFF / 后端服务（Bun + TypeScript，端口 8080）                        │
│  ├─ 路由层：临床业务路由 / 平台六子系统路由 / 审计路由                │
│  ├─ 聚合器层：页面数据聚合、权限与数据范围过滤、脱敏出口              │
│  ├─ 编排层：DSL 校验 → 引擎解释执行 → 人工挂起 → 事件记录            │
│  ├─ 智能体层：声明式注册表 + 岗位注册表（过渡期双轨，S-06 合并）      │
│  ├─ 知识中台：接入 → 加工 → 索引 → 混合检索 → 术语/图谱/版本          │
│  ├─ 模型层：注册表 → 策略路由 → Provider 适配 → 熔断/重试/主备切换    │
│  └─ 安全域：身份鉴权 / RBAC+ABAC / 输入防护 / 输出校验 / 审计 WORM   │
└───────────────┬──────────────────────────────────────────────────┘
                │ OpenAI 兼容接口 / FHIR / HL7 / 消息总线 / 文件存储
┌───────────────▼──────────────────────────────────────────────────┐
│ 医院现有系统（不改不替换）：HIS / EMR / LIS / RIS-PACS / 手麻 / 输血 │
│ 以及模型供应商、Embedding/重排/ASR/OCR 外部组件（经抽象接口接入）    │
└──────────────────────────────────────────────────────────────────┘
```

**本地开发态实测基线**（2026-10-26，仅用于联调，不代表生产配置）：Node v22.23.2、npm 10.9.8、Bun 1.2.0；BFF `bun run src/bff/server.ts`（`HTTP_PORT=8080`）；前端 `node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 --strictPort`；演示模式 `DEMO_MODE=1`，不校验真实口令；无本地 PostgreSQL/Redis/真实 LLM 凭证保证。生产部署要求见第 10 章与 `docs/DEPLOYMENT_GUIDE.md`。

### 2.3 关键架构决策（ADR 摘要）

| 编号 | 决策 | 理由 | 关联切片 |
|---|---|---|---|
| ADR-01 | 过渡期保留两套智能体注册表（岗位内存注册表 + 声明式多版本注册表），S-06 统一为"DB 权威 + 内存缓存"单模型 | 现状两套并存、字段不对齐；一次性合并涉及既有 BFF 调用面，风险大，分两步迁移 | S-06 |
| ADR-02 | 模型层先建注册表与策略路由骨架，主备切换、影子模式、五维灰度在 S-03/S-07 分阶段接入；现有单实例 provider 默认行为保持不变 | 不破坏既有临床链路；新能力以可选配置上线 | S-02、S-03、S-07 |
| ADR-03 | 患者诊疗数据禁止进入向量库；患者实时信息由工具节点按就诊标识从业务系统实时获取；历史相似病例另建患者级隔离索引 | 方案明确要求；满足健康医疗数据最小化与隔离合规 | S-13、S-12 |
| ADR-04 | 输出侧校验器为纯函数规则集，不依赖数据库与网络；先落地骨架与规则集，后续再接入模型级语义比对与临床专家规则库 | 双 tsc 风险最低、可单测闭环；语义增强留待临床盲评后迭代 | S-01 |
| ADR-05 | 编排引擎保持无状态设计（实例态经 PathDeps 显式传递）；断点快照持久化由独立快照仓储承担，不挂引擎实例字段 | 沿用现有引擎设计约束，保证多实例并发与可恢复性 | S-05 |
| ADR-06 | 知识中台（`src/knowledge-platform`）为平台 RAG 唯一门面；运行时 RAG（`src/knowledge`）保留临床规则与既有工具，逐步向中台收敛 | 现状双引擎并存；避免一次性重构破坏既有测试与业务链路 | S-11、S-12 |
| ADR-07 | 所有 AI 生成记录必须绑定四维版本（模型/知识/提示词/平台发布版本）并写入审计链；版本快照不可被后续升级覆盖 | 病历法律举证可追溯；满足方案四维留痕要求 | S-08、S-07 |

### 2.4 非功能约束基线

| 类别 | 约束 |
|---|---|
| 语言/框架 | 后端 Bun + TypeScript（strict）；前端 React 19 + TypeScript + Vite；测试 `bun test`；类型检查双门禁（web `bun x tsc --noEmit`；根 `node node_modules/typescript/bin/tsc --noEmit`） |
| 代码规范 | 沿用 `docs/technical/00-开发规范与代码规范.md`；新增后端模块公共符号挂接对应域 `index.ts` 统一出口；单测落 `tests/unit/<domain>/` |
| 依赖约束 | 不引入未安装依赖；外部模型/组件一律经既有抽象接口适配；禁止在代码、文档、日志中硬编码密码、token、密钥 |
| 数据边界 | 演示模式仅用于本地；生产态必须关闭；患者数据最小化、字段级脱敏、多租户隔离 |
| 兼容性 | 既有 BFF 路由与前端页面不被本轮改造破坏；接口演进执行"版本化、字段只增不删、弃用提前公告、双版本并行"四策略（见 10.6 节） |

---

## 3. 平台六子系统详细设计

### 3.1 网关管理子系统

#### 3.1.1 现状基线

FHIR 资源与网关路由已具备：`src/bff/routes/fhir.ts`、`fhirGatewayV5.ts`、`fhirGatewayDetail.ts`、`fhirGatewayDetail2.ts`、`fhirOperationsRoutes.ts`、`fhirResources.ts`；前端 `fhir-gateway`、`hl7-integration`、`interop-*`；集成测试覆盖 HL7 构建/解析、基础适配器、供应商适配器、FHIR。接入适配器注册表位于 `src/integration/`。缺口：无"接入系统台账 + 接口清单 + 字段映射 + 健康状态 + 配额限流 + 消息订阅状态"的统一管理模型（差距矩阵 G-01 ~ G-05）。

#### 3.1.2 目标模型

**接入系统台账（ConnectedSystem）**

```text
ConnectedSystem {
  id: string                          // 稳定 ID，如 his-core / emr-core / lis / pacs / anesthesia
  name: string                        // 系统中文名称（医院内部命名，不对外品牌化）
  category: 'HIS' | 'EMR' | 'LIS' | 'PACS' | 'OR' | 'TRANSFUSION' | 'NURSING' | 'OTHER'
  mode: 'api' | 'view' | 'message'   // 接口 / 数据库视图 / 消息总线
  owner: string                       // 院内对接责任部门
  contact: string                     // 对接联系人（不存储个人证件信息）
  endpoints: EndpointBinding[]
  subscriptions: SubscriptionBinding[]
  fieldMappings: FieldMapping[]
  health: SystemHealthSnapshot
  rateLimit: { callsPerMinute: number; concurrency: number }
  status: 'registered' | 'connected' | 'degraded' | 'offline' | 'deprecated'
  enabled: boolean
  createdAt: string; updatedAt: string; version: number
}

EndpointBinding {
  id: string; systemId: string
  kind: 'rest' | 'hl7v2' | 'fhir' | 'view' | 'db'
  path: string                        // 相对路径或视图名；凭据引用密钥管理，不落台账明文
  authRef: string                    // 密钥引用标识，不存 token/密码
  timeoutMs: number; retry: number
  operations: string[]                // 允许的操作：read / write / subscribe
  healthCheck: { intervalSec: number; method: string; expected: string }
}

SubscriptionBinding {
  id: string; systemId: string
  topic: string; channel: 'mq' | 'ws' | 'outbox-relay'
  filter: Record<string, unknown>
  consumerGroup: string; dlqPolicy: 'retry' | 'dead-letter'
  status: 'active' | 'paused' | 'error'
  lastEventAt?: string; lag?: number
}

FieldMapping {
  id: string; systemId: string
  sourceSystemField: string; targetPlatformField: string
  standardCode?: string               // LOINC / ICD-10 / ICD-9-CM-3 / SNOMED / ATC 等标准编码
  transform: 'direct' | 'unit' | 'dictionary' | 'desensitize' | 'code-mapping'
  dictionaryRef?: string
  required: boolean
}

SystemHealthSnapshot {
  checkedAt: string; reachable: boolean; latencyMs?: number;
  lastError?: string; consecutiveFailures: number
}
```

#### 3.1.3 模块划分与接口契约

| 模块 | 路径（建议） | 职责 | 关键接口 |
|---|---|---|---|
| 台账仓储 | `src/bff/gateway/systemRegistry.ts` | 系统/端点/订阅/映射 CRUD、启用禁用、健康快照读写 | `listSystems(filter)`、`getSystem(id)`、`registerSystem(input)`、`updateHealth(id, snapshot)` |
| 适配器工厂 | `src/integration/adapterFactory.ts`（复用既有 `src/integration/`） | 按系统类别获取既有适配器实例，统一超时/重试/熔断装饰 | `getAdapter(systemId)` |
| 网关看板路由 | `src/bff/routes/gatewayDashboardV1.ts`（新增版本号路由，不改动既有 fhir 路由） | 台账查询、健康聚合、订阅滞后、限流配额统计 | `GET /api/v1/gateway/systems`、`GET /api/v1/gateway/systems/:id`、`GET /api/v1/gateway/health` |
| 前端管理台 | `web/src/pages/gateway-admin/` | 台账录入、端点健康、订阅状态、字段映射查看 | 复用既有 `interop-*` 页面组件，不新增重复页面 |

#### 3.1.4 关键流程

1. **接入登记**：管理员录入系统台账 → 选择适配器类别 → 绑定端点与凭据引用 → 配置字段映射与限流 → 启用后健康探针按间隔执行 → 看板展示可达性与时延。
2. **运行取数**：智能体工具节点按台账 `systemId` 获取适配器；所有取数走台账登记的端点与字段映射；未登记系统拒绝调用；超限流参数返回 429 并记录审计。
3. **消息订阅**：事件总线订阅状态纳入台账看板；消费滞后（lag）超阈值告警；失败事件进入死信队列并在看板可见。

#### 3.1.5 验收标准（S-21）

- 台账 CRUD 通过单测；未登记系统调用被拒绝并留审计；健康快照按探针间隔刷新；看板展示系统状态、时延、订阅滞后与限流配置；既有 FHIR/HL7 集成测试不回归。

### 3.2 模型管理子系统

#### 3.2.1 现状基线

`src/bff/agents/modelProvider.ts`（375 行）为单一 OpenAI 兼容工厂：显式配置端点走 `OpenAICompatibleModelProvider`（30s 超时、3 次指数退避 1/2/4s、连续 3 次失败熔断 60s、模板兜底降级），否则 `TemplateFallbackProvider`；`getModelInfo()` 仅回显端点、模型名、超时、重试、熔断状态、演示模式。`AgentDefinition.model{provider,model,temperature}` 为声明元数据，运行时不据此路由。缺口（M-01 ~ M-09）：注册表/模型卡片、健康探针台账、版本回滚、A-B 流量权重、影子加载、场景策略路由、主备切换、会话粘性、三层模型分层登记、宽接口抽象。

#### 3.2.2 模型卡片与注册表设计

```text
ModelCard {
  id: string                          // 稳定标识，如 deepseek-chat-v3 / main-large-001
  displayName: string
  provider: 'openai-compatible' | 'deepseek' | 'anthropic' | 'local'
  endpointRef: string                 // 凭据/端点配置引用，不落明文
  model: string                       // 供应商模型标识
  tier: 'primary' | 'auxiliary' | 'specialized'
  role: 'main-large' | 'main-medium' | 'embedding' | 'rerank' | 'asr' | 'ocr'
       | 'ner' | 'classifier' | 'extractor' | 'rule'
  contextWindow: number               // tokens
  capabilities: string[]              // 长文本 / 中文 / 表格理解 / 多模态 等能力标签
  riskLevel: 'low' | 'medium' | 'high'
  defaultParams: { temperature: number; topP: number; maxTokens: number }
  knowledgeDependencies: string[]     // 绑定知识库 ID 列表（可空）
  departmentScope: string[]            // 适用科室（空 = 全院）
  scenarioTags: string[]              // 任务场景标签：门诊病历 / 住院病程 / 会诊意见 / 质控 / 解读…
  owner: string                       // 责任人
  releasedAt: string; retiredAt?: string; version: string
  status: 'draft' | 'staging' | 'active' | 'shadow' | 'standby' | 'retired'
  health: ModelHealthSnapshot
  fallbackModelId?: string            // 备用模型卡片 ID
  sessionSticky: boolean              // 是否按患者/就诊标识粘性绑定
  costPer1kInput?: number; costPer1kOutput?: number   // 成本计量口径，用于看板
  complianceNotes?: string
}

ModelHealthSnapshot {
  checkedAt: string; available: boolean;
  latencyMsP50?: number; latencyMsP95?: number;
  successRate?: number; errorRate?: number;
  consecutiveFailures: number; circuitOpen: boolean; lastError?: string
}

ModelRouteRule {
  id: string; priority: number
  match: {
    department?: string; scenario?: string; agentId?: string;
    contextLength?: 'short' | 'medium' | 'long';
    latencyTier?: 'low' | 'medium' | 'high';
    costTier?: 'low' | 'medium' | 'high'
  }
  modelId: string
  trafficWeight: number               // 0~1，同优先级规则权重和为 1
  shadowModelId?: string              // 影子比对模型（双跑不输出）
  stickyKey?: 'patientId' | 'visitId' | 'none'
  enabled: boolean
}
```

#### 3.2.3 模块划分与接口契约

| 模块 | 路径（建议） | 职责 | 关键接口 |
|---|---|---|---|
| 模型注册表 | `src/bff/agents/modelRegistry.ts` | 卡片登记/查询/标签检索/健康快照更新/启用停用；进程内存台账，后续接 DB 仓储 | `register(card)`、`getCard(id)`、`listCards(filter)`、`updateHealth(id, snapshot)`、`setStatus(id, status)` |
| 策略路由 | `src/bff/agents/modelRouter.ts` | 按规则表匹配场景 → 选择模型；权重分流；粘性键一致性哈希；主备判定 | `selectModel(req: RouteRequest): RouteDecision`；`RouteDecision { modelId, fallbackModelId, shadowModelId, stickyKey, routeReason }` |
| 模型适配层 | 扩展 `src/core/agent/providers/factory.ts` | 按 `ModelCard.provider` 获取适配；统一接口 `ModelProviderPort`（见 3.2.5）；不改变现有默认实例 | `createProvider(card)` |
| 健康探针 | `src/bff/agents/modelHealthProbe.ts` | 定时轻量探测；失败计数；熔断状态同步；快照写入注册表；连续失败触发备用模型标记 | `probeOnce(cardId)`、`startProbeLoop(intervalSec)` |
| BFF 路由 | `src/bff/routes/modelRegistryV1.ts`（新增，不改动 `modelInfo.ts`/`modelRouterV5.ts` 既有页面数据源） | 卡片台账、规则配置、健康看板、影子对照结果查询 | `GET/POST /api/v1/model/cards`、`PUT /api/v1/model/cards/:id`、`GET /api/v1/model/health`、`GET/POST /api/v1/model/routes` |
| 前端 | `web/src/pages/model-admin/` | 模型卡片、策略路由、健康状态、权重配置、影子比对结果 | 与既有 `model-router`、`muse-model-version` 页面并存，逐步替代 |

#### 3.2.4 关键流程

**模型选择流程（S-02/S-03）**：

```text
智能体 / 工作流节点发起模型请求
  → 构造 RouteRequest（department, scenario, agentId, contextLength,
     tokenBudget, patientId?, visitId?）
  → modelRouter 按 priority 遍历 ModelRouteRule，匹配 match 条件
  → stickyKey = patientId | visitId 时，一致性哈希定位模型版本（同就诊过程不漂移）
  → 同优先级按 trafficWeight 分流；shadowModelId 双跑仅记录不输出
  → 选定模型健康快照不可用 → 沿 fallbackModelId 降级；备用仍不可用 →
     返回降级决策（转人工/模板兜底，由工作流异常处理节点承接）
  → 全程记录：routeReason、选定模型、备用模型、权重版本、探测指标到审计事件
```

**模型升级七步对接（详见第 10 章）**：准入评测通过 → 影子加载（status=shadow，双跑比对）→ 影子盲评达标 → 小流量灰度（trafficWeight 递增）→ 指标比对（质量/时延/成本/异常率）→ 逐档放量 → 全量切换并归档旧版本；任一步不达标回退。

#### 3.2.5 统一模型适配接口（扩展现状窄接口）

现状 `ModelProvider` 仅有 `chat(messages, tools)`。扩展为（新接口与旧接口并存，既有 provider 不受影响）：

```text
interface ModelProviderPort {
  readonly cardId: string
  chat(req: ChatRequest): Promise<ChatResponse>
  // ChatRequest { messages, tools?, temperature?, topP?, maxTokens?,
  //               jsonSchema?, signal?, traceId?, agentId?, versionRefs? }
  // ChatResponse { content, toolCalls?, usage: { inputTokens, outputTokens },
  //                modelId, modelVersion, latencyMs, finishReason, degraded? }
  healthProbe(): Promise<ProbeResult>
}
```

- 流式接口（`streamChat`）列入后续切片，本轮不阻塞骨架落地；
- token 用量必须回传，供场景层 Token 成本看板与模型升级指标比对使用；
- 所有调用携带 `traceId` 与 `versionRefs`（模型/知识/提示词/平台版本四元组，S-08）。

#### 3.2.6 验收标准（S-02、S-03）

- 注册表可注册/查询/按标签过滤；策略路由单测覆盖：条件匹配、权重分流、粘性哈希一致、主备降级、影子双跑标记；健康快照超时/失败计数/熔断状态正确；既有 `tests/unit/modelProvider.test.ts` 不回归；双 tsc 零错误。

### 3.3 RAG 私域知识库子系统

#### 3.3.1 现状基线

双引擎并存：`src/knowledge-platform`（中台门面：connectors/pipeline/hybrid/graph/terminology/version/tenant/FileStore/KnowledgeService）与 `src/knowledge`（运行时 RAG：embeddings/processing/retrieval/vector/cds/qc/emr/templates/rules）。`hybrid.ts` 三路召回（向量/HashingEncoder 余弦、BM25-lite 关键词、图谱多跳）+ 术语库并入关键词路 + RRF 融合（0.45/0.35/0.2，rrfK=60）+ 租户/知识库/阈值过滤 + 规则重排；`KnowledgeService.ts` 为统一门面；`VersionManager` 内存版本登记与 checksum 去重；`TenantManager` 四档可见性。缺口（R-01 ~ R-10）：六域台账、增量监听、OFD/OCR、元数据六要素类型化、结构化标量索引、阈值拒答协议、患者级隔离、准入审核/生效失效期/冲突版本链/季度评审、引用编号协议与前端原文弹窗。

#### 3.3.2 知识域与知识块模型扩展（S-11）

现有 `KnowledgeBase/RawDocument/KnowledgeChunk/TermEntry` 扩展以下结构化字段（字段只增不删，不破坏既有存储）：

```text
// KnowledgeBase 扩展
{
  domain: 'writing-standard' | 'clinical-guide' | 'hospital-policy'
        | 'specialty' | 'data-standard' | 'operations-faq'   // 六知识域
  ownerDepartment: string          // 归属科室/部门
  approver?: string               // 准入审核责任人（签字留痕）
  reviewCycleMonths: number       // 季度评审周期，默认 3
  reviewDueAt?: string
  patientScope: 'none'            // 知识中台不放患者诊疗数据；患者级索引单独建模
}

// RawDocument / KnowledgeChunk 扩展
{
  effectiveDate: string           // 生效日期
  expireDate?: string             // 失效日期；过期转历史不参与召回
  securityLevel: 'public' | 'internal' | 'confidential' | 'restricted'
  owner: string; approver?: string; approvedAt?: string
  specialty: string[]            // 专科标签
  origin: { sourceId, sourceName, publisher, version, url, fetchedAt, checksum }
  sectionTitle: string; pageRef?: string
  conflictGroup?: string          // 冲突检测分组（同一主题不同版本/来源）
  versionRef: string              // 知识版本号，四维留痕使用
}
```

**患者级隔离索引（S-13，独立于通用知识库）**：

```text
SimilarCaseIndex {
  scope: 'patient-isolated'
  partitionKey: patientId | visitId
  chunks: SimilarCaseChunk[]      // 仅历史已归档、经脱敏与授权的病例片段
  accessRule: {
    requireVisitMatch: true       // 强制就诊/患者标识匹配，禁止跨患者召回
    allowedRoles: string[]
    purpose: 'similar-case-only'  // 不用于通用问答
  }
}
```

接入校验：患者诊疗文档进入知识中台时被 `IngestGuard` 拦截并拒绝；相似病例索引只能由归档后批量任务构建，工具节点检索必须携带 `patientId/visitId` 并经隔离过滤器校验，越权检索写入审计事件并触发告警。

#### 3.3.3 七环节流水线设计（对齐方案 R-02 ~ R-08）

| 环节 | 模块（建议路径） | 设计要点 |
|---|---|---|
| ① 采集接入 | `src/knowledge-platform/sources/connectors.ts` 扩展 | 五类接入器（file/api/database/crawler/terminology）保留；新增：增量轮询配置、文件夹监听钩子、接入台账（来源、责任人、频率、最近成功时间、失败重试计数）；批量与增量共用同一加工管道 |
| ② 格式解析 | `processing/pipeline.ts`、`DocumentParser.ts` 扩展 | 格式枚举补齐 OFD、扫描件 OCR 占位类型；解析产出结构化段落 + 表格对象；解析失败进入"人工校对"队列；人工校对界面见前端 `knowledge-intake` 扩展 |
| ③ 清洗规范化 | `processing/cleaner.ts`（新增） | 去页眉/页脚/水印残留；术语与单位统一（复用 `TerminologyService`）；保留页码与章节路径；清洗动作记录在 `PipelineReport` |
| ④ 切分 | `processing/TextSplitter.ts` 扩展 | section 策略优先；表格整块不跨块、条款整块不跨块；每块携带章节标题；元数据六要素（来源/章节/机构/生效日期/专科/密级）落结构字段；超长块二次语义切分 |
| ⑤ 向量化索引 | `vector/LocalVectorStore.ts` + 新增标量索引 | 向量路 + 关键词倒排路 + 结构化标量路（密级/生效期/专科/权威等级/类型精确过滤）；双索引并行切换协议（见 10.4 节知识升级）；Embedding 经 `EmbeddingProvider` 接口可替换 |
| ⑥ 混合检索重排 | `retrieval/hybrid.ts` 扩展 | 结构化标签先过滤 → 三路召回 candidateK 合并去重（跨文档相似片段归并）→ 规则重排 → 预留重排模型接入点；`minScore` 以下返回 `noEvidence`，生成层必须拒答（S-12） |
| ⑦ 引用溯源 | 贯穿 `RetrievalHit` 与生成协议 | 每块携带唯一 `chunkId`、`sectionPath`、`provenance`、`effectiveDate`；输出引用编号协议见 3.3.5 |

#### 3.3.4 知识生命周期设计（S-11）

```text
知识资产状态机：
  draft（提交待审）→ pending_review（部门初审）→ approved（生效可检索）
                 → expired（过期转历史，不参与召回）
                 → superseded（被新版本替代）
                 → deprecated（停用归档）

- 准入：提交人填写来源/专科/适用范围/密级 → 责任人审批签字（留痕 approver/approvedAt）
- 生效：effectiveDate 到达后自动进入可检索；过期 expireDate 到达后自动转 expired
- 冲突：同 conflictGroup 多来源条目标记冲突，人工确认保留/融合；版本链记录替代关系
- 评审：按 reviewCycleMonths 到期提醒；评审结论（继续有效/修订/停用）归档
- 双索引切换：新版本构建期间旧索引保持服务；新索引回归检索测试通过后流量切换；旧索引保留回滚窗口
- 历史病历绑定：历史生成记录指向生成当时的知识版本快照，不随新版本改写
```

#### 3.3.5 引用溯源协议（S-12）

```text
RetrievalHit {
  chunkId: string; title: string; sectionPath: string;
  provenance: SourceProvenance; pageRef?: string;
  effectiveDate?: string; score: number; graphPath?: string
}

模型输出结构化字段（纳入输出 Schema）：
{
  content: string                  // 正文，引用位置标注 [1][2] 编号
  citations: Citation[]
  Citation { refId: string; chunkId: string; title: string; sectionPath: string;
             pageRef?: string; sourceName: string; effectiveDate?: string;
             quotedExcerpt: string }
  missingInfo: string[]            // 资料不足留空字段清单（"待补充"）
  evidenceLevel: 'supported' | 'partial' | 'none'
}
```

- 前端：正文 `[n]` 编号可点击，弹窗展示原文片段、章节、来源机构、生效日期、密级标识；
- `evidenceLevel=none` 时正文不得出现确定性结论，必须标注"（待核实）"；
- 未引用知识却下结论的片段由 S-01 输出校验器标记为 CAUTION/BLOCK。

#### 3.3.6 验收标准（S-11、S-12、S-13）

- 六域台账 CRUD 与单测；元数据六要素缺项在入库时拦截；过期知识不进入召回结果；准入审批留痕可查；引用编号与弹窗组件闭环；患者级隔离集成测试覆盖：跨患者检索被拒绝、越权调用入审计；既有知识中台测试不回归。

### 3.4 提示词工程管理子系统

#### 3.4.1 现状基线

`src/core/agent/SystemPromptBuilder.ts`（175 行）四层拼装：ETHICS_LAYER 医疗伦理层（硬编码静态常量，最高优先级）→ 角色设定层（八岗位）→ 科室专业层 → 当前任务层（六类任务）+ 工具使用说明层（按风险等级标注）。BFF 侧 `promptGovernanceV5.ts`、`agentRuleV9.ts` 与前端 `prompt-governance`、`agent-rules` 页面已存在；DSL `LlmNodeConfig` 支持 `systemPrompt`、`userTemplate`、`fewShotRefs`、`jsonSchema`。缺口（P-01 ~ P-08）：系统级提示词版本化与管理台热更新、场景/科室/任务资产台账、Few-shot 运行时加载校验、Schema 校验失败重试降级闭环、已有内容 + 光标位置上下文、提示词版本采纳率/修改字数聚合与告警、资产加密归属。

#### 3.4.2 四层资产模型

```text
PromptAsset {
  id: string
  level: 'system' | 'scenario' | 'department' | 'task'
  name: string; nameEn?: string
  scope: {
    scenario?: string           // 任务场景：outpatient-record / inpatient-progress / consult ...
    department?: string         // 科室级备案：科室 ID 或 'all'
    agentId?: string            // 绑定智能体（可空）
  }
  version: string               // 语义化版本
  content: string
  variables: string[]           // 模板变量清单（供校验）
  fewShotRefs: string[]         // 示例资产引用 ID
  outputSchemaRef?: string       // JSON Schema 引用
  riskLevel: 'low' | 'medium' | 'high'
  status: 'draft' | 'review' | 'active' | 'archived' | 'deprecated'
  owner: string; approver?: string; approvedAt?: string
  changeLog: PromptChangeEntry[]
  metrics: PromptMetrics         // 运行指标（按版本聚合，3.4.5）
  encrypted: boolean             // 资产归属医院，静态加密存储
  createdAt: string; updatedAt: string
}

PromptChangeEntry {
  version: string; changedAt: string; operator: string
  summary: string; diffRef: string; parentVersion?: string
  reviewResult?: 'approved' | 'rejected'
}

PromptMetrics {
  agentId: string; scenario: string; version: string; window: string
  calls: number; adoptionRate: number; modificationRate: number;
  rejectionRate: number; avgModifiedChars: number;
  schemaFailureRate: number; abnormalFlags: string[]
}
```

#### 3.4.3 加载链与组装顺序（运行时强制顺序，不可被智能体提示词覆盖）

```text
最终 System Prompt =
  ① system 层（全局安全红线：医疗伦理 / 角色边界 / 危急值优先 / 隐私保护 /
     不确定性表达 / 禁止越权行为；平台统一维护、版本化、不可绕过）
  ② scenario 层（任务目标 / 输入要求 / 输出结构 / 质量标准 / Few-shot 示例）
  ③ department 层（专科习惯用语与注意事项；备案后生效）
  ④ task 层动态上下文（患者信息 / 就诊数据 / 历史摘要 / 知识片段 /
     已有病历内容 / 光标位置段落 / 医师本次指令；运行时由模板变量注入）
  ⑤ 工具说明层（按工具风险等级标注：只读 / 需确认 / 需双确认）
```

**强制校验**：加载器在拼装前检查 system 层版本存在且状态 `active`；缺失或被篡改时拒绝发起调用并记录安全事件；智能体包 `systemPrompt` 只能引用 ②③ 层资产，不得覆盖 ① 层文本。

#### 3.4.4 输出 Schema 校验与重试降级

```text
模型输出 → JSON Schema 校验
  ├─ 通过：进入引用校验与输出侧防护（3.6.4）
  ├─ 失败：计数 schemaFailure；携带校验错误信息重试（默认最多 2 次，指数退避）
  │    → 重试仍失败：按智能体风险等级降级：
  │         low   → 返回模板兜底 + 提示人工补充
  │         medium → 转人工确认队列，不自动回写
  │         high  → 阻断提交，通知专家复核
  └─ 校验错误与重试次数计入 PromptMetrics.schemaFailureRate 与审计事件
```

#### 3.4.5 指标闭环

- 每次人工处置（采纳 / 修改 / 拒绝 / 多轮退回）回写指标，按 `agentId + scenario + promptVersion + 时间窗` 聚合；
- 告警阈值（可配置）：`modificationRate` 超阈值、`avgModifiedChars` 异常偏大、`schemaFailureRate` 超阈值、`rejectionRate` 超阈值 → 触发提示词版本评审任务；
- 指标看板归属智能体管理子系统（3.5.4），提示词版本与模型版本、知识版本在同一病历记录上四元组绑定（3.6.5）。

#### 3.4.6 模块划分与验收

| 模块 | 路径（建议） | 职责 |
|---|---|---|
| 资产仓储 | `src/bff/prompt/assetRegistry.ts` | 提示词资产 CRUD、版本历史、对比、归档、加密存储接口 |
| 加载器 | 扩展 `src/core/agent/SystemPromptBuilder.ts` | 按层级拉取 active 版本资产、顺序拼装、变量校验、Few-shot 加载校验 |
| Schema 校验 | `src/bff/prompt/schemaGuard.ts` | JSON Schema 校验、失败计数、重试决策、降级路由 |
| 指标聚合 | `src/bff/prompt/metricsAggregator.ts` | 采纳/修改/拒绝/字数/校验失败按版本聚合，阈值告警事件 |
| BFF 路由 | 扩展 `promptGovernanceV5.ts`（既有路由兼容） | 资产台账、版本对比、指标看板、发布审批 |
| 前端 | 扩展 `prompt-governance`、`agent-rules` | 四层分类目录、版本对比回滚、指标异常标记、审批流 |

**验收标准（S-04）**：system 层缺失/失效时调用被拒绝并留安全事件；四层顺序单测固化；Few-shot 引用不存在时报明确错误；Schema 重试与降级动作可单测；指标按版本聚合可查询；既有岗位提示词测试不回归。

### 3.5 智能体管理子系统

#### 3.5.1 现状基线

两套体系并存（差距矩阵 2.3 节）：岗位注册表 `src/bff/agents/agentRegistry.ts`（7 类岗位、内存默认值、DB `clinical.medmuse_agents` 为权威）；声明式注册表 `src/orchestrator/agent/AgentRegistry.ts`（10 个包、多版本内存 Map、启用/禁用、分类角色标签检索、工具聚合）。BFF 侧 `agentManagerV8`、`agentBuilder`、`agentRuntime`、`agentHealth`、`agentLearning`、`multiAgent`、`personalAgentAdoption`、`workflowV6/monitorV6/signoffV6` 与对应前端页面构成管理雏形。缺口（A-01 ~ A-07）：准入元数据不全、风险与复核角色映射未台账化、上线前三类评测门禁、指标三维聚合、五维灰度、退役留痕、两套注册表统一。

#### 3.5.2 统一智能体元数据（S-06，ADR-01 两步合并）

```text
AgentRecord {
  id: string; name: string; nameEn: string
  version: string                  // 语义化版本
  category: string; tags: string[]; description: string
  department: string[]             // 归属/适用科室
  owner: string; approver?: string  // 责任人 / 准入审批人
  scenario: string                 // 场景标识（与提示词 scenario 对齐）
  dataScope: DataScope             // 可读数据范围（系统 / 表 / 患者标识 / 字段级）
  outputType: 'question-answer' | 'summary' | 'clinical-note'
             | 'qc-conclusion' | 'suggestion' | 'report'
  riskLevel: 'low' | 'medium' | 'high'
  reviewRole?: string              // 复核角色（high 必须专家复核；medium 医师确认；low 可抽检）
  tools: ToolBinding[]
  knowledgeBases: string[]
  modelBinding: ModelBindingRef     // 关联模型卡片 / 路由规则
  promptAssets: { system?, scenario?, department?, task? }  // 提示词版本绑定
  entryWorkflow?: string            // 工作流 DAG ID + 版本
  inputSchema?: SchemaRef; outputSchema?: SchemaRef
  interfaces: InterfaceInventory[]  // 依赖的外部接口清单（准入附件）
  evaluation: EvaluationReportRef  // 三类评测记录（3.5.3）
  status: 'draft' | 'review' | 'staging' | 'active' | 'shadow'
        | 'paused' | 'retired'
  deployment: DeploymentPolicy     // 灰度配置（3.5.5）
  changeLog: AgentChangeEntry[]
  retiredInfo?: { retiredAt, reason, successorAgentId, archiveRef }
  createdAt: string; updatedAt: string
}

DataScope {
  systems: string[]; tables: string[]; fields: string[]
  patientScope: 'own-visit' | 'own-department' | 'hospital-wide'
  externalExport: boolean
}

ToolBinding {
  toolId: string; riskLevel: 'read-only' | 'confirm' | 'double-confirm'
  quota: { callsPerMinute?: number; callsPerVisit?: number }
}

InterfaceInventory {
  systemId: string; endpoint: string; operation: string; purpose: string
}
```

**合并步骤**：第一步（本轮 S-06 骨架）：定义统一元数据类型与校验规则，BFF 岗位注册表与声明式注册表各自映射到统一视图，DB 仍为权威；第二步（后续切片）：写入层收敛到统一仓储，内存 Map 作为启动缓存；既有 BFF 调用面保持兼容。

#### 3.5.3 准入与评测门禁

**准入申请字段**：名称、部门、责任人、场景、数据范围、输出类型、风险等级、模型/知识依赖、工具清单、接口清单、免责声明；准入流程：申请 → 技术合规审查（工具权限、数据范围、接口清单）→ 三类评测 → 审批发布。

**三类评测台账**：

| 评测类 | 内容 | 通过门槛 | 记录要素 |
|---|---|---|---|
| 功能评测 | 场景输入 → 预期输出字段覆盖、工具调用正确、工作流分支符合预期 | 核心用例通过率 100%，非核心 ≥95% | 评测集版本、用例数、通过/失败明细、执行人、日期 |
| 质量评测 | 文书完整性、规范性、引用准确性、事实一致性、语言专业性 | 质量分不低于基线版本；无"无依据结论" | 样本集、评分项、对比基线、盲评记录 |
| 安全对抗评测 | 提示词注入、越权取数、患者数据泄露、确定性诊断表述、敏感词、幻觉诱导、缺失信息编造 | 对抗用例 100% 被拦截/降级；不得出现红线表述 | 对抗样本集、命中处置（阻断/标注/降级）、安全事件记录 |

**门禁规则**：评测记录缺失、任一评测类不达标、风险等级与复核角色不匹配时，禁止将状态置为 `active`；`setEnabled/publish` 动作先校验门禁再落库；评测集本身版本化并与智能体版本绑定归档。

#### 3.5.4 运行监控指标

| 指标 | 口径 | 聚合维度 |
|---|---|---|
| 调用量 | 工作流触发次数 | 智能体 × 版本 × 场景 × 科室 × 时间窗 |
| 采纳率 | 医师未修改直接采纳数 / 生成总数 | 同上 |
| 修改率 | 医师修改后采纳数 / 生成总数 | 同上 |
| 拒绝率 | 医师弃用重写数 / 生成总数 | 同上 |
| 平均修改字数 | 修改前后字符差均值 | 同上 |
| 异常率 | 模型超时 / 熔断 / Schema 失败 / 转人工 / 工具报错分类计数 | 同上 |
| 人工干预点 | 人工挂起、确认、退回次数与节点位置 | 工作流节点 × 智能体版本 |

指标落库后供智能体健康看板、提示词指标闭环（3.4.5）、模型升级指标比对（第 10 章）共用；异常率超阈值触发智能体降级或暂停建议。

#### 3.5.5 灰度发布与退役

**五维灰度配置（DeploymentPolicy）**：

```text
DeploymentPolicy {
  dimensions: {
    departments: string[]       // 科室白名单；空 = 不限
    clinicians: string[]        // 医师白名单；空 = 不限
    documentTypes: string[]     // 文书类型白名单
    patientGroups: string[]     // 患者分组（如试点病区病种组）
    trafficPercent: number      // 0~100 流量比例（哈希分流，同一患者粘性）
  }
  switches: Record<string, boolean>   // 功能开关，纳入版本管理
  baselineAgentVersion: string
}
```

- 灰度期新旧版本并行；指标对照（质量不低于基线、无集中反对、无安全事件、运行稳定）满足五项放量判据后逐档放量；
- 回滚：关闭新版本开关或版本指针回退到 baselineAgentVersion；模型/提示词/知识版本联动回滚（第 10 章顺序）；
- **退役状态机**：`active → paused（暂停接入新任务）→ retired（归档）`；退役记录含下线时间、原因、替代智能体、归档包引用；归档版本仍可被历史病历四维留痕检索，不可再被新任务调用。

#### 3.5.6 验收标准（S-06、S-07 联动）

- 准入字段完整性校验单测；三类评测缺失/不达标禁止发布；指标按三维聚合可查询；退役留痕可检索；两套注册表映射视图一致；既有智能体声明包与岗位智能体加载不回归。

### 3.6 安全审计子系统

#### 3.6.1 现状基线

`src/security/` 十子域：auth（RBAC+ABAC、12 类角色、数据范围）、audit（六类日志、哈希链、WORM、异常检测）、encryption（AES-256-GCM 双层密钥、密钥管理器、密码哈希）、desensitization（姓名/电话/证件/地址/银行卡等规则引擎）、classification（分级分类规则）、compliance（等保检查项与报告）、input（InputValidator + PromptInjectionGuard 五层）、mfa。既有 EMR 合规 P0 六项（真实 RBAC 核验、append-only 病历层、审计覆盖 27 条写路径、多租户 RLS、密钥轮换、出口脱敏）按 `docs/research/emr-gap-matrix-2026-10-25.md` 整改，本节只设计 AI 专项防线与对接接口。

#### 3.6.2 五道防线落地分工

| 防线 | 模块 | 现状 | 本期设计 |
|---|---|---|---|
| ① 输入侧 | `src/security/input/` | ✅ SQL/命令/XSS 校验 + Prompt 注入五层防护 | 接入前补：患者身份上下文校验、工具参数白名单校验、超长输入截断与留痕；接入智能体入口统一调用 |
| ② 提示词约束 | `src/core/agent/SystemPromptBuilder.ts` + `prompt/assetRegistry.ts` | 🟡 四层拼装雏形 | 3.4 节四层资产与强制顺序；system 层不可绕过 |
| ③ 知识约束 | `retrieval/hybrid.ts` + 生成协议 | 🟡 阈值可配，拒答未强制 | 无命中 `evidenceLevel=none` 时生成层拒答/标注"待核实"；知识库密级过滤与角色权限联动 |
| ④ 输出侧 | **`src/security/ai/outputGuard.ts`（S-01，本轮落地切片）** | 🔴 0 实现 | 3.6.4 节规则集与三级处置 |
| ⑤ 全过程审计 | `src/security/audit/` + `orchestrator/engine/recorder.ts` | 🟡 底座与事件记录具备，AI 专项字段不全 | 3.6.5 节 AI 审计事件模型与四维留痕对接 |

#### 3.6.3 输入侧补强接口（与现有模块集成，不另起炉灶）

```text
InputContext {
  caller: { userId, roleCodes, department, dataScope }
  patient?: { patientId, visitId, department }
  tool?: { toolId, riskLevel }
  traceId: string; agentId?: string; promptVersion?: string
}

validateInput(raw: unknown, ctx: InputContext): InputVerdict
  - 复用 InputValidator 做注入/命令/XSS 检测
  - 校验患者/就诊标识与 caller 数据范围匹配（越权拒绝）
  - 工具参数与 ToolBinding.quota 比对（频次/就诊内次数）
  - 超限与拒绝写入审计事件
```

#### 3.6.4 输出侧校验器（S-01，本轮开发切片）

**处置级别**：

| 级别 | 含义 | 动作 |
|---|---|---|
| `PASS` | 全部规则通过 | 输出进入人工确认/回写流程 |
| `CAUTION` | 存在待核实项或低风险不一致 | 正文附加"（待核实）"标记与修改建议，进入人工确认，不阻断 |
| `BLOCK` | 触及红线（虚构身份、确定性诊断、敏感词、事实矛盾、Schema 非法、无依据结论） | 阻断输出；按风险等级转人工或备用模型；记录安全事件与证据片段 |

**规则集（v1 纯函数骨架，不依赖 DB/网络）**：

| 规则 | 检测内容 | 初判级别 |
|---|---|---|
| `fictional-identity` | 输出中出现患者姓名/年龄/性别/ID 等标识，与输入事实快照比对不一致或来源缺失 | BLOCK |
| `contradiction` | 输出字段与原始事实快照（主诉、诊断、检验数值、用药等）明显矛盾 | BLOCK / CAUTION（按矛盾严重性） |
| `certainty-redline` | 非医师确认场景出现"确诊""一定是""必须手术""百分之百"等确定性诊断/治疗表述 | BLOCK |
| `sensitive-redline` | 预设敏感词红线表（诊疗越权承诺、商业宣传、绝对化用语、非医疗引导） | BLOCK |
| `schema-shape` | 输出结构不符合声明 JSON Schema（字段缺失/类型错误/必填项为空） | CAUTION → 重试；重试耗尽转 BLOCK |
| `unsupported-claim` | 结论片段无引用编号、`evidenceLevel=none` 却给出事实性结论 | CAUTION（标注待核实）；情节严重 BLOCK |
| `format-completeness` | 方案要求要素缺失（如门诊病历缺主诉/现病史对应链）仅记录 CAUTION 供人工复核 | CAUTION |

**输入输出契约**：

```text
OutboundContext {
  traceId: string; agentId: string; agentVersion: string
  patient?: { patientId, visitId }
  facts: FactSnapshot              // 原始事实快照：姓名/年龄/性别/主诉/诊断/检验/用药…
  citations: Citation[]            // 本次生成引用
  output: string                   // 待校验正文
  declaredSchema?: SchemaRef
  riskLevel: 'low' | 'medium' | 'high'
  role: 'writer' | 'qc' | 'interpreter' | 'consult'
}

OutboundVerdict {
  level: 'PASS' | 'CAUTION' | 'BLOCK'
  findings: GuardFinding[]
  sanitizedOutput: string          // 附加标记后的正文（CAUTION 可用）
  blockedReason?: string
  retryable: boolean
}

GuardFinding {
  rule: string; severity: 'info' | 'caution' | 'block'
  excerpt: string; message: string; suggestion?: string
  evidenceRef?: string
}
```

- 规则全部为纯函数，便于单测与后续接入语义比对模型；
- 确定性规则（红线词、Schema、身份比对）优先；语义级一致性比对列入后续切片，临床专家规则库经配置加载；
- 校验事件接入审计链（3.6.5），不与业务日志混写。

#### 3.6.5 AI 专项审计事件与四维留痕

```text
AiAuditEvent {
  eventId: string; traceId: string; timestamp: string
  actor: { userId, roleCodes, department }
  agentId: string; agentVersion: string
  scenario: string; patientId?: string; visitId?: string
  versions: {
    modelId: string; modelVersion: string
    knowledgeVersion: string[]
    promptVersion: string
    platformRelease: string
  }
  inputSummary: string              // 输入摘要（脱敏后，不落原始大段患者文本）
  outputSummary: string             // 输出摘要 + 长度
  citations: string[]               // 引用 chunkId 列表
  elapsedMs: number; tokenUsage: { input, output }
  guardLevel: 'PASS' | 'CAUTION' | 'BLOCK'
  humanAction: 'adopted' | 'modified' | 'rejected' | 'escalated'
  toolCalls: ToolCallRecord[]
  auditChain: { prevHash: string; hash: string }   // 哈希链 + WORM 存储
}
```

- 事件写入既有 `AuditLogger` 六类日志扩展域；哈希链、WORM 存储复用 `src/security/audit/`；
- 多维检索：按智能体、模型版本、提示词版本、知识版本、患者标识、科室、时间窗、处置动作组合查询；
- 病历回写记录必须关联 `traceId`，实现"病历 ↔ 生成过程 ↔ 四维版本"双向追溯；
- 27 条未入链病历写路径按合规矩阵 P0-③ 分批接入本事件模型；
- 患者身份字段在审计摘要中按脱敏规则处理，原始标识仅经授权数据范围可查。

#### 3.6.6 验收标准（S-01、S-08、S-13 联动）

- S-01：六类规则正反用例单测全绿；三级处置正确；BLOCK 事件含证据片段；不改动既有 provider 调用链；双 tsc 零错误。
- S-08：AI 事件字段完整入哈希链；四维版本可随病历导出；越权与阻断事件可检索；合规 P0-③ 写路径分批入链记录在案。

---

## 4. 六智能体详细设计

### 4.1 通用约定

所有智能体共享以下框架约束（与第 3 章设计一致，本节只列临床场景差异）：

- **风险分级与人工模式**：低风险（问答/摘要）可抽检；中风险（文书生成）必须医师确认后回写；高风险（质控结论、诊疗建议）须专家复核。人工确认三模式：全量确认、差异确认（仅人工查看改动点）、抽样确认；配置按智能体风险等级与科室习惯备案。
- **输出免责**：所有 AI 输出携带声明"本内容为人工智能辅助生成，不构成诊断或处方依据，须由执业医师审核确认后使用"；检验检查解读附加"辅助解读，不作为诊断依据"。
- **事实边界**：未检索到依据不得编造；缺失信息留空并列入 `missingInfo`；引用编号与证据级别按 3.3.5 协议返回。
- **工作流标准结构**：`start → 意图/场景判定 → 数据汇聚（工具节点）→ 知识检索（RAG 节点）→ 提纲（LLM 节点）→ 分节生成（LLM/工具节点）→ 一致性与格式校验（code/规则节点）→ 人工确认（human 节点）→ 回写（tool 节点）→ 质控触发（事件总线）`；支持条件分支、重试、备用模型降级与转人工。
- **事件联动**：文书生成完成事件发布到事件总线，触发内涵质控实时提醒；质控发现一级严重问题回传阻断提交；处方/检验建议类结论走 CDS 规则引擎二次校验。

### 4.2 门诊病历智能体（S-09）

#### 4.2.1 场景定位

面向门诊医师：将医患对话（语音转写文本 + 既有门诊资料）转化为结构化门诊病历初稿，覆盖初诊与复诊；提供鉴别诊断方向与检查建议并标注依据；实时要素质控；检验检查结果解读与门诊/住院共用解读组件。风险等级：**medium**（文书生成，医师确认后回写）。

#### 4.2.2 输入

| 类别 | 内容 | 来源 |
|---|---|---|
| 患者上下文 | 患者标识、就诊标识、性别年龄、既往史、过敏史、历史门诊/出院摘要 | 实时工具从 HIS/EMR 获取，禁止预入向量库 |
| 对话素材 | 语音转写文本、说话人分离标记（主诉/医师问询/患者陈述分段）、医师人工补充指令 | ASR 接入器 + 工作台录入 |
| 历史资料 | 既往门诊病历、检验检查报告、用药记录摘要 | 工具节点实时调取 + 历史摘要压缩 |
| 知识素材 | 病历书写规范、专科指南、路径、用药与检验检查适用原则、术语字典 | RAG 知识中台（clinical-guide / writing-standard / data-standard） |

#### 4.2.3 工作流 DAG

```text
start
  → intent-classify（初诊 / 复诊 / 复诊续方 / 检验解读，规则 + 模型判定）
  → fetch-patient（工具：患者基本信息、既往史、过敏史、用药、历史摘要）
  → fetch-records（工具：近期门诊/住院记录、检验检查结果）
  → rag-guidelines（RAG：专科指南、路径、病历规范，按科室与主诉检索）
  → dialogue-normalize（code 节点：转写文本去口语化、术语归一、时间线排序；
      缺失要素挂起标记）
  → outline（LLM：初诊=主诉/现病史/既往史/查体/辅助检查/初步诊断/处理意见；
            复诊=诊疗经过/病情变化/查体/辅助检查/诊断调整/后续处理）
  → draft-sections（LLM 分节生成；诊断方向与检查建议必须带引用编号）
  → qc-realtime（规则节点：主诉-现病史对应、时间线一致性、ICD-诊断-用药匹配、
      复制粘贴检测、要素完整性；发现问题回退 revise 节点，最多 2 次）
  → output-guard（S-01 输出侧校验：确定性表述、虚构标识、无依据结论、Schema）
  → human-review（human 节点：差异确认；医师采纳/修改/拒绝/多轮退回指令）
  → write-record（工具：经 EMR 授权接口回写门诊病历草稿，审计留痕）
  → event: outpatient-record-completed（事件总线：触发内涵质控实时提醒）
```

#### 4.2.4 工具集与知识绑定

- **工具**：`get_patient_profile`、`get_visit_history`、`get_recent_exams`、`get_medication_list`、`kb_search`、`icd_lookup`、`submit_outpatient_draft`、`raise_qc_alert`；工具风险等级与频次配额按 3.5.2 `ToolBinding` 配置。
- **知识域**：writing-standard（门诊病历规范）、clinical-guide（专科指南/路径）、data-standard（ICD-10、药品、检验检查项目字典）、hospital-policy（门诊核心制度）。

#### 4.2.5 输出 Schema（节选）

```text
{
  encounterKind: 'initial' | 'follow-up'
  chiefComplaint: string
  presentIllness: string
  historyIllness: string
  physicalExam: string
  auxiliaryExams: string
  diagnosis: [{ code: string; name: string; certainty: 'likely' | 'possible' | 'differential' }]
  suggestions: [{ kind: 'exam' | 'medication' | 'referral' | 'follow-up';
                  content: string; citations: string[]; basisNote: string }]
  missingInfo: string[]
  citations: Citation[]
  evidenceLevel: 'supported' | 'partial' | 'none'
}
```

#### 4.2.6 验收要点

- 初诊/复诊分流正确；诊断与检查建议每条挂引用；无依据结论被标注待核实；要素缺项清单完整；转写时间线与事实快照一致；门诊/住院解读组件复用单一实现；单测覆盖注入、越权取数、确定性表述红线、Schema 失败重试降级。

### 4.3 住院病历智能体（S-10）

#### 4.3.1 场景定位

覆盖入院记录、首次病程记录、日常病程记录、上级医师查房记录、阶段小结、出院记录、病情综合分析；支持移动查房语音体征录入（数值 + 单位识别回写结构化体征项）。风险等级：**medium**；上级查房记录中涉及诊疗方案调整的建议属 **high**，须上级医师确认。

#### 4.3.2 输入与工作流要点

- **输入**：住院登记信息、入院记录、既往病历与外院资料、检验检查/医嘱/手术麻醉/护理记录时间线、查房语音录入、历史病历摘要、专科指南与病历规范。
- **文书模板与时限规则**：入院记录 24h 内完成、首次病程 8h 内、日常病程按病情分级频次、阶段小结（住院满 30 天或病情突变）、出院记录出院后规定时限；时限规则由规则引擎节点校验并在工作台提醒。
- **DAG 主干**：`fetch-inpatient-context`（患者 + 住院期间全量资料时间线）→ `rag-standards-and-guidelines` → `choose-document-type`（条件分支对应七类文书模板）→ `summary-or-outline`（长住院先"摘要 + 关键节点"压缩，再提纲）→ `draft-sections` → `consistency-check`（主诉/诊断/查体/医嘱/检验相互印证）→ `output-guard` → `human-review`（查房类区分日常/上级确认模式）→ `write-record` → `event: inpatient-record-completed`。
- **移动查房语音工具**：`voice_to_vitals` 解析"血压 138/86、心率 82、体温 36.8"等表述，识别数值 + 单位 + 体征项，异常值（超参考范围、危急值）标注并转人工核对；单位换算（℃/℉、mmol/L/mg/dL）按字典规则转换，无法识别保留语音原文并列入 `missingInfo`。

#### 4.3.3 工具集与知识绑定

- **工具**：`get_inpatient_context`、`get_order_list`、`get_exam_results`、`get_nursing_notes`、`voice_to_vitals`、`kb_search`、`icd_lookup`、`submit_inpatient_draft`、`schedule_timeline_check`。
- **知识域**：writing-standard（住院各类文书规范与时限）、clinical-guide（专科诊疗常规/路径）、data-standard（检验参考范围、ICD-10/ICD-9-CM-3、药品字典）、hospital-policy（三级查房、会诊、手术分级制度）。

#### 4.3.4 输出 Schema（节选，出院记录）

```text
{
  admissionDiagnosis: [{ code, name }]
  dischargeDiagnosis: [{ code, name; relation: 'consistent' | 'adjusted' | 'new' }]
  treatmentSummary: string
  conditionOnDischarge: 'cured' | 'improved' | 'unchanged' | 'worsened' | 'transferred' | 'died'
  followUp: [{ timing, advice }]
  dischargeInstructions: string
  timelineNodes: [{ time, event, source }]
  citations: Citation[]; missingInfo: string[]
}
```

#### 4.3.5 验收要点

- 七类文书模板与时限规则测试齐全；长住院摘要不丢失危急值、手术、过敏、诊断变更等关键节点；语音体征数值/单位解析正反用例；诊断调整与入院诊断对照关系正确；查房记录人工确认模式符合风险分级。

### 4.4 手术记录智能体（S-14，阶段②）

#### 4.4.1 场景定位

汇聚术前讨论、麻醉记录、手术经过、术中影像/器械耗材、术后情况，结构化生成手术记录与术后首次病程提示；意外情况主动提示；植入物耗材条目化；术前/麻醉/手术/术后七项一致性核查。风险等级：**high**（手术记录属法律文书，手术医师复核签字后方可归档）。

#### 4.4.2 工作流要点

```text
start
  → fetch-op-context（工具：患者、诊断、手术申请、麻醉计划、知情同意、
      术前讨论、影像、既往手术史）
  → rag-surgery-standards（手术分级目录、专科手术规范、植入物字典、器械图谱）
  → assemble-preop（code：七项一致性核查——患者身份/手术名称/手术部位/
      侧别/诊断/麻醉方式/知情同意；不一致阻断并提示核对）
  → draft-procedure（八段式：体位与消毒铺巾 / 切口与入路 / 手术操作步骤 /
      术中出血与输血 / 植入物耗材清单 / 标本处理 / 术中意外与处理 / 器械清点）
  → implant-items（工具：植入物/耗材扫码或人工录入条目化：名称/型号/批号/数量/厂家）
  → unexpected-event-alert（规则：大出血、心跳骤停、输血、异常脏器损伤、
      耗材遗留风险 → 主动提示医师补录与记录）
  → postop-first-note（LLM：术后首次病程要点：生命体征/手术情况/引流/注意事项，
      触发护理与麻醉后续记录联动）
  → output-guard（确定性表述与虚构耗材项重点检测）
  → human-review（手术医师 + 麻醉医师双确认；high 风险不允许差异以外的自动放行）
  → write-record（回写手术记录草稿，耗材条目同步物资系统接口）
  → event: surgery-record-completed（触发内涵质控、DRG 编码辅助、术后随访提醒）
```

#### 4.4.3 工具集与知识绑定

- **工具**：`get_surgery_plan`、`get_anesthesia_record`、`fetch_implant_catalog`、`register_implant_item`、`kb_search`、`icd9_cm3_lookup`、`submit_surgery_draft`、`postop_notify_nursing`。
- **知识域**：writing-standard（手术记录规范）、clinical-guide（专科手术常规）、data-standard（ICD-9-CM-3、植入物耗材目录、手术分级目录）、hospital-policy（手术分级、知情同意、标本管理制度）。

#### 4.4.4 验收要点

- 七项核查不一致时阻断生成；八段式要素完整；植入物条目与字典匹配；意外情况规则触发准确；术后首程与手术记录时间链一致；双确认动作与审计留痕；后续切片待阶段②排期，本轮仅完成设计归档。

### 4.5 会诊记录智能体（S-15，阶段②）

#### 4.5.1 场景定位

面向普通会诊与多学科会诊（MDT）：自动生成病情背景摘要、辅助受邀专科知识检索、结构化整理各方意见、发言按发言人分离归档；时限与会诊医师资质一致性核查。风险等级：**medium**（会诊意见须受邀科室医师确认）；MDT 综合结论属 **high**，主持专家复核。

#### 4.5.2 工作流要点

```text
start
  → fetch-consult-context（工具：患者、病情摘要、申请目的、检查检验、影像、
      治疗经过、既往会诊记录）
  → rag-by-department（RAG：按受邀专科分别检索指南、共识、用药禁忌、检查适用）
  → background-brief（LLM：控制篇幅的会诊背景摘要：现诊断/关键检查/治疗反应/
      核心问题，避免冗长全文堆砌）
  → opinions-collect（人工 + 发言录入：多方发言按发言人、时间分段归属；
      语音发言说话人分离后挂接专家身份）
  → opinion-structure（LLM：每条意见按"病情判断 / 建议诊断 / 建议措施 /
      需进一步检查 / 注意事项"结构化；标注引用依据）
  → mdt-synthesis（主智能体：综合各方意见形成共识与分歧清单；分歧项明确列出
      各方立场，不得合并抹平）
  → consistency-check（规则：会诊时限是否超期、受邀医师是否具备对应专业资质、
      意见与患者事实是否矛盾、要素是否齐全）
  → output-guard → human-review（受邀专家确认；MDT 综合结论主持专家复核）
  → write-consult-note（回写会诊记录，意见与发言人/时间/签名留痕）
  → event: consult-completed（触发病程记录补充提醒与内涵质控）
```

#### 4.5.3 工具集与知识绑定

- **工具**：`get_patient_brief`、`get_consult_request`、`get_expert_directory`（资质/专业方向校验）、`kb_search_by_department`、`citation_attach`、`submit_consult_note`、`notify_attending`。
- **知识域**：clinical-guide（各专科指南共识）、hospital-policy（会诊制度、MDT 管理、时限要求）、data-standard（术语与编码字典）。

#### 4.5.4 验收要点

- 背景摘要不遗漏危急值、诊断变更、过敏史；发言归属与专家身份一致；分歧意见保留原始立场；时限/资质规则正反用例；结构化意见字段完整；MDT 综合结论复核动作留痕；阶段②排期，本轮完成设计归档。

### 4.6 护理记录智能体（S-16，阶段②）

#### 4.6.1 场景定位

面向责任护士：汇聚护理观察、体征、医嘱执行、异常事件，按"时间-观察-措施-效果"逻辑生成护理记录初稿；护理问题与措施匹配；自动汇聚交接班报告；量表辅助（Braden 压疮、Morse 跌倒、导管滑脱、疼痛、GCS 意识）评分与提示；支持语音移动端录入。风险等级：**medium**（护士确认后回写）；高危风险评分建议属 **high**，须护士长/主管护士复核。

#### 4.6.2 工作流要点

```text
start
  → fetch-nursing-context（工具：患者、诊断、医嘱、风险评估、既往护理记录、
      出入量、管路、皮肤情况）
  → rag-nursing-standards（护理规范、专科护理常规、量表标准、核心制度）
  → vital-and-observation-merge（code：时间线对齐体征、巡视记录、医嘱执行、
      异常事件；识别缺失观察时段）
  → nursing-note-draft（LLM：时间-观察-措施-效果四要素闭环；护理问题 →
      对应措施 → 效果评价匹配，无对应措施的问题挂起提示）
  → scale-assist（工具/规则：Braden、Morse、导管、疼痛、GCS 量表录入项计算
      分值与风险等级；分值变化趋势提示；量表未按时完成提醒）
  → handoff-report（LLM：交接班报告按 SBAR 结构汇聚：现状/背景/评估/建议，
      含待办事项与重点观察患者）
  → output-guard → human-review（护士确认；高危评分护士长复核）
  → write-nursing-note（回写护理记录与量表结果，联动护理敏感指标采集）
  → event: nursing-note-completed（触发内涵质控与护理 NQI 指标统计）
```

#### 4.6.3 工具集与知识绑定

- **工具**：`get_nursing_context`、`get_vitals`、`get_order_executions`、`scale_score`（量表规则计算）、`voice_to_nursing_note`、`kb_search`、`submit_nursing_note`、`handoff_brief`。
- **知识域**：writing-standard（护理文书规范）、clinical-guide（专科护理常规）、hospital-policy（分级护理、交接班、危急值报告制度）、data-standard（量表条目、术语字典）。

#### 4.6.4 验收要点

- 四要素闭环缺项拦截；问题-措施-效果匹配校验；五大量表评分规则正反用例；出入量与时间线一致；交接班报告 SBAR 结构完整；语音录入数值单位识别与门诊/住院工具复用；阶段②排期，本轮完成设计归档。

### 4.7 病历内涵质控智能体（S-17，阶段②先运行提醒、后终末批量）

#### 4.7.1 场景定位

覆盖形式质控（完整性、及时性、规范性）与内涵六维（诊断依据充分性、病情分析逻辑性、诊疗措施合理性、记录一致性、复制粘贴两层查重、核心制度落实）；三级提示分级处置；终末批量质控 + 风险定向抽样；病案首页一致性与 DRG 高靠/低靠风险提示；质量指标体系多维分析；规则可视化可配置。风险等级：**high**（质控结论影响病历归档与医师考核，须质控专家复核；一级严重问题可即时阻断提交）。

#### 4.7.2 规则与处置分级

| 级别 | 性质 | 处置 | 示例 |
|---|---|---|---|
| 一级（严重） | 违反核心制度、关键要素缺失、事实矛盾、严重复制粘贴、时限严重超时 | 即时阻断提交，退回整改，通知科室与质控部门 | 入院记录缺诊断、手术记录与医嘱不一致、病程记录照搬既往整段 |
| 二级（一般） | 要素不全、表述不规范、逻辑瑕疵、引用依据不足 | 提示补充完善，医师修改后可提交 | 现病史与主诉衔接不紧、查体记录笼统、检查建议无依据 |
| 三级（优化） | 语言润色、结构优化、规范表达建议 | 汇总反馈，不阻断提交 | 用语口语化、章节顺序调整建议 |

#### 4.7.3 工作流要点

```text
start（触发：文书生成完成事件 / 提交动作 / 定时终末批量 / 风险抽样队列）
  → fetch-record-context（工具：待质控病历、患者时间线、医嘱、检验检查、
      手术麻醉、护理记录、既往病历、首页数据）
  → rag-qc-standards（病历规范、核心制度、编码字典、DRG 分组规则）
  → formal-qc（规则节点：完整性 / 及时性 / 规范性，要素清单逐项核对）
  → intrinsic-qc（规则 + 模型六维：诊断依据 / 分析逻辑 / 措施合理 / 记录一致 /
      复制粘贴 / 制度落实；每维输出证据片段与问题分级）
  → duplication-check（两层查重：① 同患者内部重复段落；② 跨病历相似片段
      定位对照；白名单豁免条目（模板固定语、量表表头）配置化）
  → risk-sampling（规则：住院 >30 天、死亡、非计划再手术、输血、高倍率病例
      强制进入终末深度质控队列）
  → front-page-drg-check（病案首页与病历内容一致性；DRG 高靠/低靠风险标记，
      编码建议附依据，不替代编码员与医保审核结论）
  → grade-findings（规则汇总一级/二级/三级问题清单，附证据位置与修改建议）
  → output-guard（质控结论本身须标注依据，禁止无证据判定）
  → human-review（一级问题阻断 + 专家复核；二级医师确认整改；三级汇总归档）
  → write-qc-report（质控报告、问题台账、指标数据回写）
  → event: qc-completed（整改闭环任务、科室看板、质量指标统计）
```

#### 4.7.4 质量指标体系（看板口径）

24 小时入院记录完成率、三级查房记录完整率、编码正确率、归档完整率、不合理复制率、甲级病历率；按科室、医师、文书类型、时间窗多维分析；问题分布按六维与级别下钻；指标基线、目标值、趋势对比纳入科室质控看板。

#### 4.7.5 工具集与知识绑定

- **工具**：`get_record_fulltext`、`get_patient_timeline`、`get_order_and_exam`、`duplication_scan`、`front_page_compare`、`drg_risk_flag`、`kb_search`、`submit_qc_report`、`create_rectification_task`。
- **知识域**：writing-standard（病历书写规范与缺陷案例库）、hospital-policy（核心制度、质控管理办法）、data-standard（ICD-10/ICD-9-CM-3、CHS-DRG 分组规则）、clinical-guide（诊疗合理性对照依据）。

#### 4.7.6 验收要点

- 三级分级处置与提交阻断联动正确；两层查重含白名单豁免；风险抽样规则集可配置；首页一致性与 DRG 风险标记附证据；六维问题均带证据片段；指标口径与既有 `emr-qc-*` 看板对齐；风险等级由现状 `low` 校准为 `high` 并配置专家复核角色（A-02 联动）；阶段②排期，本轮完成设计归档。

---

## 5. 编排层设计（对齐方案九能力）

### 5.1 现状基线

`src/orchestrator/dsl/types.ts` 定义 12 类节点、8 态状态机、节点级重试/超时/降级/补偿、LLM/工具/人工/子智能体/RAG/代码/延时节点配置；`engine.ts`（532 行）无状态递归下降解释器，实例态经 PathDeps 显式传递，支持暂停/恢复（节点边界）、AbortSignal 取消、人工挂起、节点重试/超时/降级跳转；`state.ts` 合法迁移校验表；`recorder.ts` 内存事件流 + 节点/失败/重试/token 汇总；`humanTaskHandler.ts` 人工挂起；BFF 侧 `agentEngine.ts` 与 `persistentHumanTaskHandler.ts` 承担运行实例与人工任务持久化。缺口（O-01 ~ O-09）：独立格式校验/通知/回写节点、意图识别与任务规划节点、跨会话断点快照持久化、标准协同消息信封、人工三模式规则、跨实例监控聚合、模型级备用与转人工降级、跨会话状态恢复协议。

### 5.2 节点类型扩展（不改动既有 12 类语义）

| 新节点 | 配置 | 职责 | 失败处置 |
|---|---|---|---|
| `intent` | `promptRef`、`categories[]`、`nextByCategory: Record<category, edgeId>` | 意图识别 + 任务分类，输出类别供条件路由；可选任务规划步骤序列 | 识别失败转人工；默认兜底类别 |
| `schema-check` | `schemaRef`、`maxRetries`、`retryNodeId`、`fallbackNodeId` | 对上游 LLM 输出做 JSON Schema 校验；失败计数、回退重试、降级跳转 | 重试耗尽转人工或备用模型节点 |
| `notify` | `channel: 'in-app' \| 'sms' \| 'wecom'`、`recipients`、`templateRef`、`escalateToRoles` | 节点级通知与超时升级；人工任务超时未处理自动升级到上级角色 | 通知失败进入死信与告警，不阻断主流程 |
| `writeback` | `targetSystem`、`operation`、`payloadTemplate`、`idempotencyKey`、`confirmLevel` | 规范回写节点：统一幂等键、授权校验、审计事件、回写结果回执；替代散落工具节点直接写病历 | 失败补偿节点 + 人工介入；禁止重复回写 |
| `review`（人工确认三模式封装） | `mode: 'full' \| 'diff' \| 'sampling'`、`assigneeRoles`、`formSchema`、`timeoutMs`、`escalateToRoles`、`sampleRate` | 全量确认/差异确认/抽样确认；多轮退回指令携带修改意见回到指定节点 | 超时升级；抽样未命中自动通过并记录 |

既有 `tool` 节点继续承担取数与外部操作；涉及病历/医嘱回写的新流程统一使用 `writeback` 节点；既有流程不强制改造，随智能体重构迁移。

### 5.3 上下文管理与断点快照（S-05）

**上下文模型**（扩展 `WorkflowContext`）：

```text
RuntimeContext {
  vars: Record<string, unknown>
  patient: PatientRef; user: UserRef
  messages: Message[]
  lastOutputs: Record<nodeId, unknown>
  attachments: AttachmentRef[]
  summary?: ConversationSummary          // 长对话/长住院压缩摘要
  keyNodes: TimelineMarker[]             // 关键节点：诊断变更、手术、危急值、过敏史
  snapshot?: StateSnapshot               // 断点接续快照
}

StateSnapshot {
  instanceId: string; workflowId: string; workflowVersion: string
  state: WorkflowState
  currentNodeId: string
  completedNodes: Record<nodeId, NodeOutcome>
  context: RuntimeContext
  pendingHumanTasks: string[]
  versions: VersionQuad
  savedAt: string; traceId: string
}
```

**持久化与恢复协议**：

- 节点边界（成功完成、人工挂起、暂停、失败待重试）自动生成快照，写入独立快照仓储（`src/orchestrator/engine/snapshotStore.ts`，接口预留，先内存实现、后续接 DB）；
- 跨会话恢复：按 `instanceId + patientId/visitId` 查询最近快照，校验状态机合法迁移后从 `currentNodeId` 续跑；历史 `completedNodes` 输出不重放调用；
- 长住院压缩策略：超 token 预算时，旧消息折叠为 `summary`，关键节点（诊断变更、手术、危急值、过敏、输血、抢救）强制保留为 `keyNodes`，不进入折叠；
- 快照内容不含明文敏感数据超规范围，沿用脱敏规则；快照版本与四维版本绑定归档。

### 5.4 多智能体协同消息信封

```text
AgentMessage {
  messageId: string; traceId: string; workflowInstanceId: string
  fromAgent: string; fromVersion: string
  toAgent: string; consultationType: 'delegate' | 'consultation' | 'review' | 'broadcast'
  task: string; input: Record<string, unknown>
  requiredOutputSchema?: SchemaRef
  deadline?: string; citations: string[]
  reply?: { status: 'answered' | 'revision' | 'escalated'; output: unknown; feedback?: string }
  versions: VersionQuad
  sentAt: string; repliedAt?: string
}
```

- 协同拓扑：串行（主流程调用）、并行（`parallel` 节点多分支）、主从（`subagent` 委托）、评审（起草智能体 → 评审智能体 `review` → 修订循环，最多 3 轮，超限升级人工）；
- 消息经事件总线标准信封收发，智能体之间不共享内存对象；评审意见与修改轮次写入执行记录器。

### 5.5 异常降级链（对齐方案）

```text
节点超时 / 错误
  → 重试（节点 RetryPolicy：次数、退避、可重试错误码）
  → 备用模型（LLM 节点绑定 fallbackModelId；3.2.4 路由决策）
  → 工作流 fallbackNode / compensationNode 跳转
  → 转人工：人工任务挂起 + 通知升级；提示"请手工书写/补录"，工作台提供草稿与原始素材
  → 全程事件入执行记录器与审计链
```

降级每一步必须记录触发原因、耗时、处置动作；模板兜底仅允许用于低风险问答类，中高风险文书类禁止以模板内容冒充生成结果。

### 5.6 运行监控与全链路追踪

- `traceId` 贯穿取数、检索、模型调用、节点执行、人工确认、回写与事件总线；执行记录器在现有事件类型上扩展：节点耗时、模型 ID/版本、知识版本、提示词版本、人工干预点与动作、备用模型切换、降级动作；
- 跨实例聚合仓储（S-05 二期）：完成率、平均耗时、失败率、人工干预率、人工修改率、模型调用分布、异常率分类，支持按智能体/版本/科室/场景/时间窗切片；
- 监控大盘复用 `workflow-monitor`、`agent-health`、`agent-adoption` 前端页面，数据源切换到聚合仓储后旧页面不另起新站。

### 5.7 验收标准（S-05）

- 新节点类型通过 DSL 校验；快照序列化/恢复单测覆盖暂停、人工挂起、失败续跑；协同信封字段完整；人工三模式配置生效；监控事件字段齐全；既有 10 个声明包与既有工作流测试不回归；双 tsc 零错误。

---

## 6. 数据模型总览

### 6.1 核心实体关系

```text
ConnectedSystem ──< EndpointBinding
                ──< SubscriptionBinding
                ──< FieldMapping

ModelCard ──< ModelHealthSnapshot
          ── fallbackModelId ──→ ModelCard
ModelRouteRule ── match ──→ ModelCard（主用 + 影子）

AgentRecord ──< ToolBinding ──→ ToolDefinition
            ──< KnowledgeBinding ──→ KnowledgeBase
            ──→ ModelCard / ModelRouteRule
            ──< PromptAssetBinding ──→ PromptAsset（system/scenario/department/task）
            ──→ AgentEvaluationReport
            ──→ DeploymentPolicy

KnowledgeBase ──< RawDocument ──< KnowledgeChunk
              ──< DatasetVersion
KnowledgeChunk ── provenance ──→ SourceProvenance
SimilarCaseIndex（患者级隔离，独立分区，不进通用知识库）

WorkflowDefinition ──< NodeDefinition ──< EdgeDefinition
WorkflowInstance ──< ExecutionEvent
                 ──→ StateSnapshot
                 ──→ AiAuditEvent

AiAuditEvent ── 四维版本 ──→ ModelVersion / KnowledgeVersion / PromptVersion / PlatformRelease
AiAuditEvent ── 关联 ──→ 病历记录（traceId 双向索引）
```

### 6.2 持久化边界（演示态 vs 生产态）

| 实体族 | 本地演示态 | 生产态要求 | 现状基线 |
|---|---|---|---|
| 模型卡片/路由规则 | 进程内存注册表 | DB 持久化 + 版本台账 + 灰度权重表 | S-02/S-03 内存骨架，后续切片接仓储 |
| 智能体记录/评测/灰度 | 声明包文件 + 内存 Map；BFF `clinical.medmuse_agents` 为权威 | DB 权威 + 内存缓存；评测记录、灰度配置、退役台账入库 | ADR-01 两步合并 |
| 知识库/文档/块/版本 | FileStore/MemoryStore 可配置落盘 | 结构化库 + 向量库 + 标量索引分离存储；WORM 知识快照 | `KnowledgeService.persist` 开关预留 |
| 工作流定义/实例/快照/事件 | 内存态为主；BFF 人工任务与部分实例已持久化 | 定义版本库、实例库、快照库、事件库；事件哈希链与 WORM 存储 | 持续补齐，S-05/S-08 |
| 审计事件 | 文件/内存存储（既有 WORM 实现） | 独立审计库、哈希链、只追加、多维检索、备份归档 | 复用 `src/security/audit/` |
| 提示词资产 | 文件 + 治理路由雏形 | 资产库 + 版本历史 + 变更审批 + 静态加密 | S-04 |

### 6.3 既有合规 P0 联动的数据层要求

以下数据层整改以 `docs/research/emr-gap-matrix-2026-10-25.md` 为基线，本文档只列对接接口，不重复整改设计：

- 病历正文 append-only 写入层 + 版本链 + 历史快照表（P0-②）：`writeback` 节点与 AI 回写工具必须落在该层之上，禁止直接更新病历正文字段；
- 审计 WORM/哈希链覆盖全部病历写路径（P0-③）：AI 生成、人工修改、退回重写、导入导出均产生 `AiAuditEvent` 或既有审计事件并入链；
- 多租户 RLS + 越权集成测试（P0-④）：知识库密级、患者级索引、工具取数三层过滤均在 RLS 之上二次校验；
- 密钥版本号/双密钥过渡轮换 + refresh 重放检测（P0-⑤）：模型供应商凭据、知识资产加密密钥纳入密钥管理器版本台账；
- 导出/批量/打印/共享出口逐字段脱敏拦截（P0-⑥）：输出侧校验器与既有脱敏出口在最后一道闸门串联。

---

## 7. 接口契约总则

### 7.1 BFF 路由约定

- 新平台能力一律使用 `/api/v1/...` 版本化路径；既有 `V5/V8/V12/V13/V14` 路由保持兼容，不就地改路径；
- 路由分组：模型管理 `/api/v1/model/...`；提示词 `/api/v1/prompts/...`；智能体 `/api/v1/agents/...`；知识中台 `/api/v1/knowledge/...`；网关台账 `/api/v1/gateway/...`；AI 审计 `/api/v1/audit/ai/...`；
- 请求/响应统一信封：

```text
{ code: number; message: string; data: T; traceId: string }
```

`code=0` 成功；`40000` 参数缺失；`40100` 未认证；`40101` token 过期；`40300` 越权；`40900` 幂等冲突；`50000` 服务错误；错误响应不回显堆栈、不泄露凭据。

### 7.2 鉴权与数据范围

- 所有平台路由经既有 `PermissionChecker` 鉴权；岗位角色、数据范围（`patientScope`）、密级过滤在聚合器层统一执行；
- AI 调用上下文携带 `actor`（userId/roleCodes/department/dataScope）与 `patient/visit` 引用；越权取数在输入校验与工具执行两处拒绝并记审计；
- 演示模式仅开发联调使用；生产环境 `DEMO_MODE` 必须关闭，口令哈希、MFA、会话超时与吊销走既有安全模块。

### 7.3 幂等与并发

- 所有回写、发布、知识入库、模型切换动作携带幂等键（`Idempotency-Key` 头或请求体 `idempotencyKey`）；重复请求返回首次结果，不产生重复病历/重复质控报告；
- 同一就诊过程的智能体任务按 `visitId` 串行化关键写操作；只读检索可并发；
- 工作流实例并发受既有限流与舱壁隔离约束；模型调用频次按 `ToolBinding.quota` 控制。

### 7.4 可观测接口要求

- 每个 BFF 响应返回 `traceId`；模型调用、知识检索、工具执行、人工确认事件均携带同一 `traceId`；
- 模型响应必须回传 `usage{inputTokens,outputTokens}`、`latencyMs`、`modelId/modelVersion`；
- 后台任务（知识入库、批量质控、索引重建）提供进度查询端点（阶段、百分比、失败原因、重试状态），对齐 `DocumentIndexStatus` 既有形态。

### 7.5 前端契约

- 工作台页面按既有路由懒加载规范接入；新增页面目录归入 `web/src/pages/<domain>/`，路由表不产生悬空 lazy import；
- 表格、表单、权限指令、脱敏展示复用既有设计系统组件；AI 输出展示统一复用引用编号弹窗、待核实标记、免责声明组件；
- 前端不保存任何密钥；模型/知识/提示词版本展示从后端台账读取，不在前端硬编码。

---

## 8. 安全合规设计（AI 专项补充）

### 8.1 合规基线对照

| 要求 | 标准/依据 | 落地位置 | 现状评级 |
|---|---|---|---|
| 网络安全等级保护 2.0 | GB/T 22239 | 既有 RBAC、审计、加密、分级分类、合规检查模块；平台部署拓扑与访问控制清单纳入部署手册 | 🟡 机制具备，生产配置待验收 |
| 健康医疗数据安全 | GB/T 39725 | 数据分级分类、脱敏、最小化、患者隔离、知识准入 | 🟡 框架具备，患者级隔离 S-13 待补 |
| 电子病历数据集与共享文档规范 | WS 445、WS/T 500 | 输出 Schema 对齐病历数据集字段；回写接口遵循既有 EMR 兼容层 | 🟡 既有 EMR 合规矩阵跟踪 |
| 互联互通成熟度 | 互联互通测评要求 | FHIR/HL7 网关、术语字典、知识溯源、审计留痕 | 🟡 既有集成测试覆盖基础场景 |
| DRG 分组与编码规范 | CHS-DRG | 内涵质控 DRG 风险提示、`medical-coder` 智能体、编码字典绑定 | 🟡 待与医保分组规则库对接 |
| 生成式 AI 医疗使用边界 | 方案伦理层 + 国家医疗辅助决策要求 | 五道防线、人工在环、免责声明、不确定性表达、禁止确定性诊断 | 🟡 输入/提示词/知识/审计具备，输出侧 S-01 待补 |

### 8.2 数据分级与密级

- 知识资产密级四级：`public`（公开制度/通用规范）、`internal`（院内通用指南/路径）、`confidential`（专科内部经验/未发表资料）、`restricted`（患者相关、个人隐私材料，原则上不入通用知识库）；
- 检索时按调用者角色与数据范围过滤密级；`restricted` 知识块不进入 RAG 召回结果；
- 患者诊疗数据禁止入向量库（ADR-03）；历史相似病例索引独立分区、强制就诊标识匹配、禁止跨患者召回；
- 审计日志、模型调用记录中的患者标识按脱敏规则处理，原始标识仅授权角色可经专门查询接口访问。

### 8.3 密钥与凭据管理

- 模型供应商端点、API Key、数据库连接串、外部接口凭据全部经密钥管理器引用，代码与台账只存引用标识；
- 密钥版本号、启用/停用日期、轮换周期、双密钥过渡窗口纳入台账；轮换期间新旧密钥并行校验；
- 知识资产静态加密；提示词资产、智能体配置、工作流定义中的敏感参数加密存储；
- 禁止在代码仓库、日志、简报、前端、错误消息中出现明文密钥；仓库提交前执行既有密钥扫描流程。

### 8.4 安全测试要求

- 输入侧：提示词注入、指令覆盖、角色冒充、SQL/命令/XSS 回归用例纳入既有 `tests/unit/security/`；
- 输出侧：S-01 规则集正反用例；后续补充语义级幻觉、越权承诺、敏感表述对抗样本；
- 越权测试：跨科室、跨患者、跨密级检索与取数集成测试；患者级隔离专项测试（S-13）；
- 审计测试：事件哈希链完整性校验、WORM 不可篡改、审计字段完整性；
- 上线前安全对抗评测作为智能体准入第三类评测（3.5.3），不通过禁止发布。

### 8.5 隐私与伦理约束（写入 system 层提示词，不可绕过）

1. 只基于患者本次就诊可获得的资料与检索到的院内知识作答；资料不足必须说明缺失，不得编造；
2. 不替代医师诊断与处方；不向患者输出确定性诊断结论；危急值、病情突变优先提示人工处置；
3. 不泄露其他患者信息；不跨患者引用病历作为相似病例依据（相似病例须经隔离索引与授权）；
4. 不做商业宣传、不推荐特定药品品牌、不给出院外购药引导；
5. 记录不确定性：证据不足处标注"（待核实）"，缺失信息列入 `missingInfo`；
6. 医师修改与拒绝意见必须回流，用于提示词与模型版本迭代，不得覆盖医师最终决策。

---

## 9. 版本升级体系设计

### 9.1 四条独立版本线

| 版本线 | 版本对象 | 版本号规则（建议） | 台账要素 | 负责人 |
|---|---|---|---|---|
| 平台程序 | BFF、前端、编排引擎、规则引擎、部署包 | `platform-v<主>.<次>.<补丁>`（对齐既有里程碑 tag 体系） | 提交清单、变更说明、依赖基线、镜像/包校验值、回退包、发布人、审批人 | 平台研发负责人 |
| 模型 | 主力/辅助/专用模型卡片、供应商模型批次、微调版本 | `model-<cardId>-v<主>.<次>.<补丁>` | 评测报告、影子比对结果、灰度记录、基线版本、备用模型、责任人 | 模型负责人 + 临床专家 |
| 知识库 | 知识数据集、文档批次、术语库、图谱版本 | `kb-<kbId>-v<年>.<批次>` | 准入审批、生效/失效日期、冲突处理、索引构建记录、检索回归结果、知识责任人 | 知识管理员 + 医务部 |
| 提示词规则 | 提示词资产、工作流规则、质控规则、量表规则 | `prompt-<assetId>-v<主>.<次>.<补丁>` | 变更记录、评测结果、适用场景、审批人、上线/归档日期 | 提示词管理员 + 临床科室 |

**配置级变更**（参数、阈值、权重、规则文本、提示词内容、知识库批次）与**程序级变更**（代码、数据库结构、权限模型、跨系统协议）分离部署；程序级变更一律走四级管控（9.3）。

### 9.2 四维留痕（病历法律举证）

每次 AI 生成与回写绑定：

```text
VersionQuad {
  platformRelease: string     // 平台程序版本
  modelId: string; modelVersion: string
  knowledgeVersion: string[]  // 本次检索命中知识块所属数据集版本列表
  promptVersion: string       // 提示词资产版本（system/scenario/department/task 组合版本号）
}
```

- 四元组写入 `AiAuditEvent` 与病历记录关联字段；历史病历绑定的版本快照不被后续升级覆盖；
- 举证导出：按病历号/就诊号导出生成过程、输入摘要、输出全文、引用清单、模型/知识/提示词/平台版本、人工处置记录、审计哈希链；
- 知识版本快照保证"历史生成指向旧版本知识"，新版本不追溯改写历史结论。

### 9.3 四级管控与变更分类

| 级别 | 适用 | 审批与流程 | 窗口 |
|---|---|---|---|
| 一级（紧急） | 安全补丁、阻断性缺陷、合规红线问题 | 值班负责人 + 安全/医务负责人双批准；先止血后补评测；留痕与回退准备同步完成 | 随时，避开门诊高峰 |
| 二级（配置） | 提示词、规则阈值、知识库批次、模型权重、灰度开关 | 业务负责人 + 知识/提示词管理员审批；先评测后灰度 | 计划窗口 |
| 三级（功能） | 新智能体、新工作流、新工具、前端页面 | 技术评审 + 临床评测 + 安全对抗评测；预生产验证后灰度 | 计划窗口 |
| 四级（平台） | 程序版本、数据库结构、权限模型、跨系统协议变更 | 架构评审 + 多环境验证 + 回滚演练 + 医务/信息科联合审批 | 非高峰窗口，避开门诊高峰、管理节点、夜间周末与值班薄弱时段 |

**强制四级**：数据模型变更、权限模型变更、跨系统协议变更一律按四级管控；数据库变更执行脚本版本化、双评审、先备份、前后校验、大表单独安排，且向前兼容。

### 9.4 模型升级七步流程

```text
① 准入评测（三硬门槛）
   - 质量不低于在用基线模型；
   - 缺失样本必须回答"信息不足"，不得编造；
   - 无依据问题必须拒答；
   评测集版本化，三类样本（正常 / 缺失 / 矛盾）齐全，结论可复核。
② 影子加载：新模型 status=shadow，相同请求双跑，不对外输出。
③ 影子比对盲评：双跑结果由临床专家盲评，质量、一致性、风险维度打分；
   偏差超阈值即终止流程。
④ 小流量灰度：按五维灰度配置（9.5）先 5% 以内流量。
⑤ 指标比对：采纳率、修改率、拒绝率、异常率、时延、成本、安全事件与基线对照。
⑥ 逐档放量：5% → 20% → 50% → 100%；每档观察期满足五项判据后进入下一档。
⑦ 全量切换归档：旧版本转 standby/retired，保留回退窗口；评测与比对报告归档。
```

**五项放量判据**：功能可用；质量不低于基线；无集中反对意见；运行稳定（超时/熔断/错误率在阈值内）；无安全事件。任一不满足即停止放量；异常处置：轻微问题配置回调，中度问题按场景回退，严重问题立即回退并暂停专项排查。

### 9.5 五维灰度与开关纳入版本管理

灰度维度：科室、医师、文书类型、患者分组、流量比例（3.5.5 `DeploymentPolicy`）；功能开关与灰度配置本身纳入提示词/平台版本台账，开关状态变更留痕；灰度期新旧版本指标对照记录在案；模型、提示词、知识、程序版本组合配置为一个"发布单元"，避免版本错配。

### 9.6 回滚顺序与数据原则

**回滚顺序**：先流量（关闭灰度/切回旧版本指针）→ 配置（参数/规则/开关回退）→ 模型（备用模型/旧模型卡片）→ 程序（旧版本包）→ 数据（原则上不回滚）。

- 数据只前滚、不轻退；确需修正时走补偿冲正、病历修改流程与隔离归档，不直接删除审计记录；
- 回滚包在发布前预置；四级升级前完成回滚演练，年度综合演练一次；
- 回滚动作、时间、操作人、原因、结果全部入审计链。

### 9.7 四环境隔离

| 环境 | 用途 | 数据 | 要求 |
|---|---|---|---|
| 开发（dev） | 日常开发联调 | 演示/脱敏样本 | 可重启、可清空；`DEMO_MODE` 允许开启 |
| 测试（test） | 单元/集成/回归自动化 | 脱敏合成数据 | 自动化流水线执行；不接真实患者数据 |
| 预生产（staging） | 上线前验证、灰度演练、临床盲评 | 与生产同构的脱敏数据 | 配置与生产一致；禁止直接调试生产 |
| 生产（prod） | 正式服务 | 真实授权数据 | 变更走管控窗口；禁止生产直接调试；操作留痕 |

### 9.8 接口兼容四策略

1. **版本化**：路径/请求头携带版本；新接口独立版本号，旧接口保持兼容期；
2. **字段只增不删**：响应新增字段不破坏旧客户端；废弃字段保留一个兼容周期；
3. **弃用提前公告**：废弃接口在文档、响应头、前端提示中提前公告，设定下线日期；
4. **灰度双版本并行**：过渡期新旧接口同时服务，按流量/客户端版本切换，旧版本下线前完成迁移。

上游 HIS/EMR 等系统变更：提前告知 → 适配开发 → 回归测试 → 数据质量监控（空值率、异常值、失败率告警）；组件清单年度复核，保留替代路径与可替换性；版本支持在役版本及前两版。

### 9.9 业务连续性与在途业务保护

**三层降级**：

1. 功能降级：智能体不可用时回退手工书写，工作台保留素材汇总与模板；
2. 只读兜底：平台故障期间病历系统原有功能不受影响，本平台不阻塞核心业务；
3. 人工支援：异常期由值班医师/护士手工补录，平台事后补录审计与质控。

**在途业务三规则**：

- 升级前对在途工作流实例与人工任务做快照；
- 升级期间新任务排队，不返回半成品结果；
- 升级完成后按快照核对在途任务，恢复或人工接管；回写动作幂等，防止重复回写。

### 9.10 知识升级专项流程

谁的知识谁签字（提交人 + 审批人留痕）；生效期到达自动可检索，过期自动降权转历史；增量重建索引；新旧双索引并行切换；检索回归测试通过后切流；历史生成绑定旧知识版本；季度评审台账到期提醒；冲突知识条目版本链可追溯。

---

## 10. 分期实施路线

### 10.1 阶段划分（对齐方案三阶段）

#### 阶段①：平台部署 + 模型上线 + 知识库初始化 + HIS/EMR 对接 + 门诊/住院智能体 2–3 科室试点

| 切片 | 内容 | 门禁 |
|---|---|---|
| S-01 | 输出侧校验器骨架与规则集（本轮落地） | 单测全绿、双 tsc 零错误 |
| S-02 | 模型注册表与模型卡片、健康快照 | 注册表 CRUD 与查询单测；既有 provider 行为不变 |
| S-03 | 策略路由、主备切换、会话粘性 | 路由决策单测覆盖条件/权重/粘性/降级 |
| S-04 | 提示词四层资产治理与 Schema 校验重试 | 层级顺序单测；指标聚合预留 |
| S-06 | 智能体准入元数据、评测门禁、两套注册表映射视图 | 未过评测禁止发布；字段完整性校验 |
| S-08 | AI 审计事件模型与四维留痕基础字段 | 事件入哈希链；四维版本可查询 |
| S-09 | 门诊病历智能体包与工作流 | 声明包通过 DSL 校验；门诊要素链规则测试 |
| S-10 | 住院病历智能体包与七类文书模板、语音体征工具 | 时限规则与体征解析测试 |
| S-11 | RAG 生命周期基础：六域台账、元数据要素、生效期、准入留痕 | 缺字段拦截；过期不召回 |
| S-12 | 检索质量闭环：拒答协议、引用编号协议、前端原文弹窗 | 无命中拒答测试；引用弹窗闭环 |
| S-13 | 患者级隔离索引与强制过滤、越权测试 | 跨患者检索拒绝；越权事件入审计 |
| S-05（部分） | 编排基础：新节点类型、快照持久化协议、监控事件字段 | 快照恢复单测；既有工作流不回归 |

**阶段①验收**：2–3 个试点科室门诊/住院文书可用；五道防线在试点链路闭环；模型/知识/提示词/平台版本可追溯；试点期采纳率、修改率、异常率看板可查；不影响核心 HIS/EMR 原有功能。

#### 阶段②：手术/会诊/护理三智能体 + 内涵质控（先运行病历实时提醒，后终末质控）

| 切片 | 内容 |
|---|---|
| S-05（剩余） | 意图识别节点、协同信封、人工三模式规则、跨实例监控聚合 |
| S-07 | 四线版本台账、五维灰度、模型升级七步状态机、回滚 SOP、环境与兼容规程 |
| S-14 | 手术记录智能体包与七项核查、植入物条目、意外提示 |
| S-15 | 会诊记录智能体包、MDT 发言分离、时限资质核查 |
| S-16 | 护理记录智能体包、四要素闭环、五大量表工具、交接班报告 |
| S-17 | 内涵质控强化：风险等级校准、两层查重、风险抽样、首页/DRG 联动、三级阻断、六维证据链 |

**阶段②验收**：六类文书智能体全部上线；运行病历实时提醒覆盖试点科室；终末批量质控与风险抽样队列运行；灰度发布与回滚流程演练通过；质控指标看板多维分析可用。

#### 阶段③：全院推广 + 能力开放 + 自有资产沉淀

| 切片 | 内容 |
|---|---|
| S-21 | 网关管理台：接入系统台账、健康状态、订阅滞后、限流配额 |
| S-22 | OFD/OCR 文档接入组件与人工校对界面 |
| S-23 | 数据治理接入统一视图（主数据映射/EMPI/脱敏/质量/血缘） |
| 剩余 | 辅助模型（重排/语义比对/专用 NER）接入；全院知识库扩充；科室自有提示词与最佳实践沉淀；能力开放接口与使用计量 |

### 10.2 里程碑门禁（每阶段必过）

1. 双 tsc 门禁零错误（web 目录 + 仓库根）；
2. 单元测试通过，新增切片单测覆盖率达标；既有测试不回归（既有失败用例如实登记，不以改断言换绿灯）；
3. 安全：输入/输出/越权/审计测试通过；无明文密钥入库；
4. 临床评测：试点场景样本集评测达标，人工确认模式符合风险分级；
5. 文档：技术文档、操作手册、审计台账同步更新；
6. 演示模式与生产模式配置分离，生产环境关闭演示模式的检查清单通过。

### 10.3 依赖与前置条件

- 医院侧：试点科室与场景清单、接口/视图/消息接入清单、术语字典与编码映射、临床专家评测与复核人员、历史脱敏样本用于预生产；
- 平台侧：模型供应商与部署资源确认、Embedding/重排/ASR/OCR 组件选型、数据库与审计存储规划；
- 合规侧：等保备案与测评安排、数据安全评估、患者隐私告知与授权口径确认；
- 既有合规 P0 六项按 `emr-gap-matrix-2026-10-25.md` 排期，与本路线并行推进，不阻塞阶段①骨架开发，但生产上线前必须完成对应项。

### 10.4 团队分工建议（供项目排期参考）

| 角色 | 职责 |
|---|---|
| 平台架构组 | 编排引擎、注册表统一、版本/灰度体系、快照与监控聚合 |
| 模型工程组 | 模型卡片、策略路由、健康探针、影子/灰度、辅助模型接入 |
| 知识工程组 | 六域知识库、加工流水线、术语/图谱、生命周期与检索质量 |
| 临床智能体组 | 六智能体工作流、提示词资产、规则集、临床评测样本 |
| 安全合规组 | 五道防线、审计留痕、分级分类、脱敏、越权测试、等保材料 |
| 前端工作台组 | 智能体管理、知识中台、提示词治理、质控看板、引用弹窗组件 |
| 集成对接组 | 网关台账、HIS/EMR/LIS/PACS 接口适配、消息总线、上游变更跟踪 |
| 临床专家顾问 | 场景定义、规则评审、盲评、风险分级确认、上线复核 |

---

## 11. 非功能需求基线

### 11.1 性能与并发（本地试点目标值，生产上线前按压测复核调整）

| 指标 | 目标值 | 说明 |
|---|---|---|
| RAG 单轮检索响应 | P95 ≤ 1.5s | 三路召回 + RRF + 规则重排；不含模型生成 |
| 单次文书生成首 token 时延 | P95 ≤ 8s（长上下文 ≤ 15s） | 含上下文组装、检索、模型调用；流式返回优先 |
| 单篇文书生成总耗时 | P95 ≤ 40s（住院长文书 ≤ 90s） | 超时按 5.5 节降级链处置 |
| 门诊并发生成 | ≥ 30 路同时提交不排队超时 | 试点科室规模估算；阶段③按全院峰值压测重定标 |
| 知识检索并发 | ≥ 100 QPS（只读） | 向量/关键词/标量三路聚合 |
| 工作流实例并发 | 按试点 200 实例常驻设计 | 快照仓储与实例仓储容量规划入部署手册 |
| 模型调用重试 | 超时 30s 为单次上限；重试 3 次指数退避（1/2/4s）；熔断 60s | 沿用既有 `modelProvider` 基线并纳入模型卡片配置 |

### 11.2 可用性与可靠性

- 平台目标可用性 ≥ 99.5%（试点期口径）；模型网关故障时切备用模型，连续熔断后转人工提示，不阻塞核心 HIS/EMR 操作；
- 工作流实例暂停/崩溃后可由快照恢复，断点状态不丢失；在途任务升级前快照保护（9.9）；
- 知识索引重建期间旧索引继续服务；双索引并行切换（9.10）；
- 审计事件与 WORM 存储写入失败必须告警，不得静默丢弃；
- 配置错误（模型端点、知识绑定、规则引用）在准入校验阶段拦截，不进入运行态。

### 11.3 可观测性

- 指标：调用量、采纳率、修改率、拒绝率、平均修改字数、异常率分类、模型时延 P50/P95/P99、token 用量与成本、检索命中率、拒答率、人工干预点分布、节点耗时分布；
- 日志：结构化日志含 `traceId/agentId/agentVersion/modelId/knowledgeVersion/promptVersion/actorId`；错误日志分类（输入校验/模型/检索/工具/工作流/权限/系统）；
- 追踪：`traceId` 串联浏览器 → BFF → 编排引擎 → 工具/检索/模型 → 审计事件；
- 告警：模型连续失败、熔断开启、检索异常率超阈值、知识过期未评审、人工任务超时未处置、审计写入失败、越权尝试、端口/进程健康异常分级告警；
- 看板复用既有 `agent-health`、`workflow-monitor`、`agent-adoption`、`model-router`、`prompt-governance` 页面，数据源切换到聚合仓储后不另起重复站点。

### 11.4 可维护性与可演进性

- 新智能体以声明包 + 工作流定义接入，不改引擎核心代码；新模型以模型卡片注册接入，不改调用链；
- 规则、阈值、提示词、知识条目配置化，业务人员可在管理台维护，规则变更走版本与审批；
- 代码规范沿用既有 `docs/technical/00-开发规范与代码规范.md`：TypeScript strict、ESM、路径别名、bun:test 单测、模块边界与公共出口约定；
- 技术债登记：两套智能体注册表合并、`gangos_` 指标名三处同步更名、重复字面量路由收敛、历史探针归档等 backlog 按专项排期，不在本轮改造中夹带重构。

### 11.5 兼容性约束

- 不替换、不改造 HIS/EMR 等核心系统；本平台经网关台账登记的接口/视图/消息接入；
- 既有前端页面、BFF 路由、声明包、测试用例不被本轮改造破坏；接口演进执行 9.8 节四策略；
- 浏览器支持范围与既有工作台一致（Chromium 内核现代版本）；移动端护理语音录入预留响应式与语音通道，阶段②落地。

---

## 12. 测试与验收策略

### 12.1 测试分层

| 层级 | 范围 | 工具/口径 | 归属 |
|---|---|---|---|
| 单元测试 | 规则集、校验器、路由决策、提示词拼装、Schema 校验、状态机、快照序列化、指标聚合、工具参数校验 | bun:test，`tests/unit/<domain>/`；纯函数优先；不依赖 DB/网络/前端 | 开发人员随切片提交 |
| 集成测试 | 网关台账与适配器、知识检索三路召回与过滤、工作流引擎暂停/恢复/人工挂起、审计哈希链、患者级隔离、RBAC 数据范围 | 既有 `tests/integration/` 口径；mock 外部系统与 LLM | 开发 + 测试 |
| 契约测试 | BFF 响应信封、错误码、版本路由、前端服务层类型对齐 | TypeScript 类型 + 既有请求封装契约 | 前后端共同维护 |
| 临床评测 | 场景样本集：功能覆盖、文书完整性、引用准确性、事实一致性、语言规范性、不确定性表达 | 临床专家盲评；样本集版本化归档；结果绑定智能体版本 | 临床智能体组 + 专家顾问 |
| 安全对抗测试 | 提示词注入、越权取数、跨患者召回、敏感词、确定性诊断诱导、幻觉编造、注入工具参数、脱敏绕过 | 对抗样本集；100% 拦截/降级为通过门槛 | 安全合规组 |
| 性能测试 | 并发生成、检索 QPS、快照仓储容量、模型时延分布、知识索引重建窗口 | 阶段①试点压测；阶段③全院峰值压测 | 平台架构组 |
| 回归测试 | 既有 2038 BFF 单元、136 集成、170 前端可执行用例基线；新增切片不得扩大既有失败清单 | 双 tsc 门禁 + 测试基线对比 | 每次提交前执行 |

### 12.2 验收对照（方案要求 → 验收证据）

| 方案要求 | 验收证据 |
|---|---|
| 一个平台、六个智能体 | 平台六子系统台账可查；六智能体声明包 + 工作流 + 评测记录归档；管理台可见状态与版本 |
| 模型统一网关、策略路由、健康探针、主备降级 | 模型卡片/规则/健康快照页面；路由决策单测；故障切换演练记录；影子比对报告 |
| RAG 六知识域、七环节、引用溯源、患者隔离 | 知识台账与生命周期状态；加工流水线报告；引用编号与原文弹窗；隔离索引越权测试报告 |
| 提示词四层、版本管理、Schema 校验重试、指标闭环 | 资产台账与版本对比；层级顺序单测；Schema 重试降级记录；采纳/修改指标看板 |
| 智能体准入、三级风险、三类评测、灰度退役 | 准入申请与审批记录；评测报告；灰度配置与指标对照；退役留痕归档 |
| 五道防线与全过程审计 | 输入/提示词/知识/输出/审计事件证据；S-01 规则测试集；审计多维检索与哈希链校验记录 |
| 编排九能力 | 工作流设计/运行/监控页面；节点类型清单；协同模式实例；断点恢复演练；全链路 trace 样本 |
| 升级体系（四线版本、四维留痕、灰度、回滚、四环境、兼容、连续性） | 版本台账；病历四维版本导出样本；灰度记录；回滚演练记录；环境配置清单；兼容策略说明 |
| 临床减负与质量提升目标 | 试点前后对照：文书书写时长、重复录入量、质控抽检覆盖率、事后整改率；文书规范完整率、内涵质量评分、复制粘贴率、甲级病历率 |

### 12.3 缺陷分级与准入红线

- **P0（阻断上线）**：越权取数/跨患者召回、审计事件丢失或可篡改、确定性诊断红线未拦截、模型/知识/提示词版本无法追溯、核心回写重复提交、生产模式演示开关未关闭；
- **P1（试点期必须修复）**：Schema 校验失败未重试降级、人工确认模式错配风险等级、引用编号与原文不对应、知识过期仍参与召回、工作流快照恢复失败；
- **P2（backlog 跟踪）**：文案不规范、指标口径待校准、页面交互优化、非关键规则阈值调优；
- 既有测试失败用例如实登记在测试基线清单，禁止删除用例或修改断言换取绿灯；新切片引入的失败必须当轮清零。

### 12.4 交付物清单（本阶段）

1. 差距矩阵：`docs/research/YXS20261026-gap-matrix-2026-10-26.md`；
2. 本开发技术文档：`docs/technical/YXS20261026-development-spec-2026-10-26.md`；
3. S-01 输出侧校验器源码与单测（本轮落地切片）；
4. 巡检简报与测试/门禁记录（`reports/patrol/`、测试日志归档）；
5. 后续切片设计文档按阶段①/②/③在 `docs/technical/` 分册补充，编号与本文件章节对齐。

---

## 13. 风险登记册

| 编号 | 风险 | 等级 | 影响 | 缓解措施 | 责任归属 |
|---|---|---|---|---|---|
| R-01 | 两套智能体注册表长期并存导致元数据不一致、灰度口径冲突 | 高 | 智能体状态与指标口径混乱，审计追溯断裂 | ADR-01 两步合并：先统一视图映射，再收敛写入层；过渡期以 DB 权威为准，视图只读聚合 | 平台架构组 |
| R-02 | 模型供应商端点/凭据变更或限流，主力模型不可用 | 高 | 文书生成中断、门诊住院流程受阻 | 模型卡片备用模型绑定；健康探针熔断；降级链转人工；供应商双活列入阶段③规划 | 模型工程组 |
| R-03 | 知识库患者诊疗数据误入向量库造成越权泄露 | 高 | 违反数据安全法规与伦理红线 | 入库拦截规则；患者级独立隔离索引；密级过滤；越权专项集成测试；入库审计 | 知识工程组 + 安全合规组 |
| R-04 | 输出幻觉（虚构病史、检验数值、诊断结论）未被拦截 | 高 | 病历法律风险、患者安全风险 | S-01 输出校验器；引用强制绑定；无依据拒答协议；高风险人工双确认；临床专家盲评 | 临床智能体组 + 安全合规组 |
| R-05 | 提示词 system 层被场景/任务层覆盖绕过安全红线 | 中 | 伦理与边界约束失效 | 加载链强制顺序校验；system 层缺失拒绝调用；提示词资产版本审批 | 提示词管理员 + 安全合规组 |
| R-06 | 工作流长实例状态丢失，跨会话无法接续 | 中 | 医师重复录入、在途任务中断 | 节点边界快照持久化；恢复协议校验；快照与四维版本绑定；升级前快照保护 | 平台架构组 |
| R-07 | 既有 EMR 合规 P0 项未收口即上线 AI 功能 | 高 | 真实环境越权、审计断裂、密钥风险 | 生产上线前完成 `emr-gap-matrix-2026-10-25.md` 对应 P0 项；演示模式关闭检查清单；上线门禁一票否决 | 安全合规组 + 平台架构组 |
| R-08 | 试点科室临床配合度不足、样本与评测专家不到位 | 中 | 评测无法达标、上线延期 | 项目启动会明确科室责任人与专家排班；样本集提前采集；评测流程培训 | 项目管理 + 临床专家顾问 |
| R-09 | 接口对接进度受制于 HIS/EMR/LIS/PACS 厂商配合 | 中 | 取数不全影响生成质量 | 网关台账提前登记接入清单；mock 数据先行开发；视图/消息备选方案；变更跟踪机制 | 集成对接组 |
| R-10 | 规则库与临床指南更新滞后，生成内容不符合最新规范 | 中 | 文书缺陷、内涵质控误判 | 知识季度评审周期；指南变更登记与增量入库；规则版本与知识版本绑定追溯 | 知识工程组 + 医务部 |
| R-11 | 性能基线在试点期估算不足，高峰期生成排队超时 | 中 | 医师体验下降、弃用率上升 | 阶段①压测复核指标；模型并发与限流配置；降级链保障手工书写不中断；阶段③全院峰值压测 | 平台架构组 + 模型工程组 |
| R-12 | 本地开发环境无 PostgreSQL/Redis/真实 LLM 凭证，集成验证受限 | 中 | 部分链路只能演示态验证，生产问题延迟暴露 | 测试环境补齐；预生产同构脱敏验证；集成测试 mock 边界明确登记；环境缺口列入部署前置条件 | 平台架构组 + 运维 |

---

## 附录 A 术语表

| 术语 | 含义 |
|---|---|
| 健澜AI原生医院操作系统OS | 本平台产品正式名称（Jianlan AI-Native Hospital OS），公司主体：杭州健澜科技有限公司 |
| BFF | Backend For Frontend，前端服务聚合层（本仓库 `src/bff/`） |
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| RRF | Reciprocal Rank Fusion，多路召回结果融合算法 |
| FHIR | Fast Healthcare Interoperability Resources，医疗信息交换国际标准 |
| HL7 v2 | 医疗信息交换标准协议版本 2，院内消息总线常用格式 |
| ICD-10 / ICD-9-CM-3 | 疾病分类与手术操作分类国家标准编码 |
| LOINC | 检验检查项目国际通用编码体系 |
| CHS-DRG | 中国疾病诊断相关分组（医保支付改革分组方案） |
| CDS | Clinical Decision Support，临床辅助决策支持 |
| 五横两纵 | 方案总体架构分层：接入/平台/应用/数据/展示五横，安全与运维两纵 |
| 五道防线 | 输入侧、提示词约束、知识约束、输出侧校验、全过程审计 |
| 四维留痕 | 模型版本、知识版本、提示词版本、平台发布版本与病历记录绑定追溯 |
| 三模式人工确认 | 全量确认、差异确认、抽样确认 |
| 五维灰度 | 科室、医师、文书类型、患者分组、流量比例 |
| 影子加载 | 新模型/新版本双跑但不对外输出，用于盲评比对 |
| 幂等键 | 标识同一业务请求的唯一键，重复请求不产生重复回写 |
| WORM | Write Once Read Many，只追加不可篡改存储（审计日志要求） |
| MDT | Multi-Disciplinary Team，多学科会诊 |
| SBAR | Situation-Background-Assessment-Recommendation，交接班报告结构化框架 |

## 附录 B 标准与政策依据清单

| 类别 | 文件/标准 |
|---|---|
| 国家政策 | 国发〔2025〕11 号（人工智能与医疗健康融合相关部署）；国卫办规划发〔2025〕30 号（医疗大模型与智能体发展阶段目标：2027 一批垂直大模型/智能体、2030 二级以上医院普遍临床辅助决策） |
| 网络安全 | GB/T 22239 信息安全技术 网络安全等级保护基本要求（等保 2.0） |
| 医疗数据安全 | GB/T 39725 信息安全技术 健康医疗数据安全指南 |
| 病历规范 | WS 445 卫生信息数据元标准（电子病历基本数据集）；WS/T 500 电子病历共享文档规范 |
| 互联互通 | 国家医疗健康信息医院信息互联互通标准化成熟度测评要求 |
| 医保支付 | CHS-DRG 分组方案与编码规则 |
| 内部基线 | `docs/research/emr-gap-matrix-2026-10-25.md`（EMR 合规 P0 六项）；`docs/research/2026-10-25-电子病历国标规范与开源实践对标研究报告.md`；`docs/research/emr-oss-benchmark-2026-10-25.md`；`docs/research/emr-regulation-index-2026-10-25.md` |

## 附录 C 现有代码索引（本文件设计对应的现状模块）

| 设计章节 | 现状模块路径 |
|---|---|
| 3.1 网关管理 | `src/bff/routes/fhir.ts`、`fhirGatewayV5.ts`、`fhirGatewayDetail.ts`、`fhirGatewayDetail2.ts`、`fhirOperationsRoutes.ts`、`fhirResources.ts`；`src/integration/`；`web/src/pages/fhir-gateway/`、`hl7-integration/`、`interop-*` |
| 3.2 模型管理 | `src/bff/agents/modelProvider.ts`、`src/core/agent/providers/factory.ts`、`DeepSeekProvider.ts`、`LLMClient.ts`、`MedicalAgentLoop.ts`；`web/src/pages/model-router/`、`muse-model-version/` |
| 3.3 RAG | `src/knowledge-platform/`（connectors、pipeline、hybrid、graph、terminology、version、tenant、FileStore、KnowledgeService）；`src/knowledge/`（embeddings、processing、retrieval、vector、cds、qc、emr、templates、rules） |
| 3.4 提示词 | `src/core/agent/SystemPromptBuilder.ts`；`src/bff/promptGovernanceV5.ts`、`agentRuleV9.ts`；`web/src/pages/prompt-governance/`、`agent-rules/` |
| 3.5 智能体管理 | `src/bff/agents/agentRegistry.ts`、`agentEngine.ts`、`agentMetrics.ts`、`toolRegistry.ts`、`agentContext.ts`、`contextSummary.ts`、`kbSearchTool.ts`、`sentinel.ts`；`src/orchestrator/agent/AgentRegistry.ts`；`agents/manifest.json` 10 个声明包；`src/bff/agents/agentManagerV8.ts`、`agentBuilder.ts`、`agentRuntime.ts`、`agentHealth.ts`、`agentLearning.ts`、`multiAgent.ts`、`personalAgentAdoption.ts`；`web/src/pages/agent-*`、`muse-*` |
| 3.6 安全审计 | `src/security/auth/`、`audit/`、`encryption/`、`desensitization/`、`classification/`、`compliance/`、`input/`（PromptInjectionGuard、InputValidator）、`mfa/`；`src/security/index.ts` 统一出口 |
| 5 编排层 | `src/orchestrator/dsl/types.ts`；`src/orchestrator/engine/engine.ts`、`state.ts`、`recorder.ts`、`humanTaskHandler.ts`；`src/orchestrator/adapters/`；`src/orchestrator/nodes/`；`src/bff/workflowV6/monitorV6/signoffV6`；`web/src/pages/workflow-*`、`workflow-monitor/` |
| 4.2 门诊 | `web/src/pages/clinical/` 门诊相关页面；`agents/manifest.json` `triage-preconsult`、`diagnosis-assistant`、`medical-record-writer` |
| 4.3 住院 | `emr-ai-nursing-note-gen`、`emr-ai-nursing-reco`、住院病程相关页面；`medical-record-writer`、`voice-medical-record` |
| 4.4 手术 | 手术麻醉相关页面与工具集；`agents/manifest.json` 手术类待扩展包位 |
| 4.5 会诊 | `consult-agent`、`consultation(-mgmt)`、`mdt*`、`diagnosis-assistant` 相关页面与测试 |
| 4.6 护理 | `emr-ai-nursing-note-gen`、`emr-ai-nursing-reco`、`nursing-*` 大量页面与既有测试 |
| 4.7 内涵质控 | `medical-record-qc` 声明包；`emr-qc-*` 页面；`src/knowledge/cds`、`src/knowledge/qc` 规则引擎 |

## 附录 D 文档关系与修订记录

| 文档 | 关系 |
|---|---|
| `docs/research/YXS20261026-gap-matrix-2026-10-26.md` | 方案-现状差距矩阵，本文件的事实依据与切片编号来源（G/M/R/P/A/S/C/O 系列编号一致） |
| `docs/technical/00-开发规范与代码规范.md` | 代码风格、目录结构、测试惯例权威规范，本文件工程约束从属于该文件 |
| `docs/technical/01-系统总体架构设计.md` | 既有总体架构基线，本文件为方案 YXS20261026 对照下的增量设计 |
| `docs/technical/02-Agent能力与医疗工具设计.md` | 既有智能体与工具设计基线，第 4 章为六智能体目标态设计 |
| `docs/technical/03-数据模型与知识库设计.md` | 既有数据模型基线，第 6 章为扩展字段与持久化边界设计 |
| `docs/technical/04-安全合规与系统集成设计.md` | 既有安全合规基线，第 8 章为 AI 专项补充 |
| `docs/research/emr-gap-matrix-2026-10-25.md` | EMR 合规 P0 整改基线，与本文件并行推进、上线门禁联动 |

**修订记录**

| 版本 | 日期 | 修订内容 | 作者 |
|---|---|---|---|
| v0.1 | 2026-10-26 | 首版：方案对照差距分析、平台六子系统与六智能体目标态设计、编排/升级/分期/测试/风险章节成稿；S-01 输出侧校验器骨架落地 | 健澜科技研发组 |

> 本技术文档为开发指导文件，临床诊疗决策以执业医师判断为准；文档中性能指标为试点期目标基线，生产上线前以压测与评审结论为准。

