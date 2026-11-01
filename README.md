# 健澜AI原生医院操作系统OS

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![Bun](https://img.shields.io/badge/runtime-bun%20%3E%3D1.3.0-fb6f02.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)
![TypeScript](https://img.shields.io/badge/typescript-6.0.x-3178c6.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16.4-336791.svg)
![FHIR](https://img.shields.io/badge/FHIR-R4-005fcc.svg)
![Compliance](https://img.shields.io/badge/EMR%20Level-6%20%7C%20Interop-4A%20%7C%20Smart%20Service-3%20%7C%20MLPS-3-green.svg)

> 仓库视角：**GitCode `JLMEDAIOS` 主仓**（BFF / 后端服务 / AI 编排 / 数据底座 / FHIR 网关 / CDS / 电子病历 / 互联网医院 / 知识平台 / 语音 / 多租户）。
> 前端工作台、Vite 构建、部署运维与二次开发指引见 [`README.dev.md`](./README.dev.md)（GitHub `JLAIharnessos` 开发者镜像视角）。

---

## 1. 项目简介

**健澜AI原生医院操作系统OS（`jlmedaios`）** 是一套面向三级公立医院的 AI 原生医院底座。它不是"传统 HIS + AI 外挂"，而是把 **BFF、领域服务、AI 编排、数据底座、FHIR 网关、CDS** 熔在同一个 Bun 运行时与同一份 PostgreSQL 16 schema 里：

- **接入层**：Bun 原生 `Bun.serve` 同时承载 REST（`/api/v1/*`）、WebSocket（`/ws/chat`，SSE 式流式对话与危急值广播）与 Prometheus `/metrics`。
- **领域层**：门诊 / 住院 / 护理 / 药房 / 手术 / 急诊 / 院感 / 病案 / 体检 / 互联网医院 / 多租户等域以路由 + aggregator + repository 三层落地，全部走统一鉴权、审计、幂等与数据脱敏中间件。
- **AI 编排层**：自研 Orchestrator，提供声明式 YAML/JSON DSL（12 类节点）、安全表达式沙箱、DAG 校验、状态机、断点重试、人工挂起恢复，对接 `@anthropic-ai/sdk@0.80.0`、`@modelcontextprotocol/sdk@1.29.0` 与 OpenAI 兼容端点（默认 DeepSeek）。
- **数据底座**：PostgreSQL 16 单库多 schema + Redis 7 缓存/锁/限流 + Kafka 3.8（KRaft）事件总线 + Elasticsearch 8 日志检索 + 向量库（`bge-large-zh`，1024 维）。
- **合规层**：JWT HS256、RBAC + ABAC、AES-256-GCM 字段加密、审计日志哈希链（保留 ≥180 天）、Prompt Injection 五层防护、PII 自动脱敏——直接对齐电子病历六级、互联互通四甲、智慧服务三级、等保三级。

---

## 2. 设计愿景与战略锚点

本仓库遵循 [`ARCHITECTURE_CHARTER.md`](./ARCHITECTURE_CHARTER.md) v2.0 的最高宪法。五条不可妥协的锚点：

1. **AI 原生医院 3.0**：系统本身就是学习系统。每个业务模块强制带"学习点"——`记录 → 积累 → 进化 → 反馈`，AI 建议可被 `adopted / modified / rejected`，每一次标注都是下一次推荐的训练信号。
2. **系统越用越聪明**：患者画像、医生偏好、科室路径、运营规律四个学习子系统跨就诊持续沉淀；推荐策略带版本号，可回滚、可审计。
3. **三中台驱动**：业务中台（统一用户/权限/主数据，HIS/EMR/护理/药房/手术/质控/医保共享）+ 数据中台（操作即采集，全结构化）+ AI 中台（Doctor MUSE / Nurse MUSE / Pharma MUSE / Admin MUSE 四类个人智能体，自下而上汇聚为科室 MUSE、医院 MUSE）。
4. **FHIR R4 原生**：`/api/v1/fhir/*` 网关自 M190-P0 起按 HL7 FHIR R4 暴露 Patient / Encounter / Observation / Condition / MedicationRequest / DiagnosticReport 等资源，支持 `search-type` Bundle、`read`、`validate`、`history`，不做"事后翻译层"。
5. **部署底座浙江健康云**：容器镜像固定 tag、非 root 运行（`bunapp` uid=10001）、最小暴露面（数据库/Redis/Kafka 不接入 frontend 网络），与省级健康云 PaaS 对齐；目标是支撑国内顶尖公立医院未来 10–15 年高质量发展。

行业背景一句：在医院从"信息化"走向"数智化"再走向"AI 原生"的三段路上，本仓库落点是第三段——AI 不是功能，是操作系统本身。

---

## 3. 系统架构

```mermaid
flowchart TB
  subgraph EDGE["接入层"]
    NGINX["nginx edge<br/>:443 / :80"]
  end

  subgraph BFF["BFF 层 (Bun 1.4, :8080)"]
    direction TB
    MW["middleware: JWT / CSRF / RBAC+ABAC /<br/>tenant / idempotency / rateLimit / audit / desensitize"]
    ROUTES["routes/  ~300+ 业务路由<br/>/api/v1/*"]
    WS["WebSocket /ws/chat<br/>SSE 流式 + 危急值广播"]
    OBS["observability/<br/>/health /ready /metrics"]
  end

  subgraph DOMAIN["领域服务层 (src/)"]
    direction LR
    BIZ["internet-hospital · medical-tools ·<br/>emergency · voice · knowledge · knowledge-platform"]
    SEC["security · tenant · cache · resilience · saga"]
  end

  subgraph AI["AI 编排层"]
    ORCH["orchestrator<br/>DSL / 状态机 / 表达式沙箱 / DAG"]
    LLM["llm/ 客户端<br/>Anthropic SDK 0.80 · MCP SDK 1.29 · OpenAI 兼容"]
    AGENT["agents/ + skills/<br/>Doctor MUSE · Nurse MUSE · Pharma MUSE"]
  end

  subgraph DATA["数据底座"]
    PG[("PostgreSQL 16.4<br/>:5432 / jlmedaios")]
    RD[("Redis 7.4<br/>cache / lock / rate / session")]
    KAFKA[("Kafka 3.8 KRaft<br/>event bus")]
    ES[("Elasticsearch 8.15<br/>log search")]
    VEC[("向量库 bge-large-zh<br/>1024 维")]
  end

  subgraph FHIR["合规与集成"]
    FHIRGW["FHIR R4 Gateway<br/>/api/v1/fhir/*"]
    HIS["HIS / EMR / LIS / PACS<br/>integration/"]
  end

  NGINX --> BFF
  MW --> ROUTES
  MW --> WS
  ROUTES --> DOMAIN
  ROUTES --> AI
  AI --> LLM
  AGENT --> ORCH
  DOMAIN --> PG
  DOMAIN --> RD
  DOMAIN --> KAFKA
  DOMAIN --> ES
  ORCH --> VEC
  ROUTES --> FHIRGW
  FHIRGW --> HIS
```

五层职责：

| 层 | 进程/端口 | 关键路径 | 对外契约 |
|---|---|---|---|
| 接入 | nginx edge `:443/:80` | `deploy/nginx/` | 唯一对外入口，TLS 终止，同源 `/api/v1`、`/ws` |
| BFF | Bun `:8080` | `src/bff/server.ts` | REST `/api/v1/*`、WS `/ws/chat`、`/health` `/ready` `/metrics` |
| 领域 | 同进程 | `src/<domain>/` | aggregator → repository → db，无跨域直连 |
| AI 编排 | 同进程 | `src/orchestrator/`、`src/bff/llm/`、`src/bff/agents/` | 声明式 DSL、MCP tool、Agent run |
| 数据 | PG16 `:5432` / Redis `:6379` / Kafka `:9092` / ES `:9200` | `src/db/`、`src/cache/`、`src/data-platform/` | 仅 backend 网络可达 |

---

## 4. 核心模块（`src/` 一级目录）

| 目录 | 文件数 | 职责 | 关键路径 / 对外契约 |
|---|---:|---|---|
| `bff/` | 4419 | HTTP/WebSocket 入口、中间件、路由、aggregator、LLM 客户端、observability、outbox、alertBus | `bff/server.ts` 启动；`bff/routes/fhir*` 暴露 FHIR R4；`bff/observability/metrics.ts` 输出 Prometheus 指标 |
| `orchestrator/` | 35 | 智能体编排 DSL：12 类节点、安全表达式递归下降解析、DAG 拓扑校验、`WorkflowStateMachine`、人工挂起/恢复、ExecutionRecorder | `orchestrator/index.ts` 统一导出；与 `medical-tools/` 36 个医疗工具标准对接 |
| `data-platform/` | 2 | 数据质量与湖仓 ETL 入口 | `dataQuality.ts`、`lakehouseEtl.ts` |
| `db/` | 162 | PostgreSQL 连接池（`postgres` 驱动 ^3.4.9）、`autoMigrate`、repository 层、迁移 SQL | `db/index.ts` 导出 `autoMigrate / closeDb / verifyDbConnection`；迁移 SQL 落 `deploy/postgres/init/` |
| `security/` | 42 | RBAC + ABAC 混合授权（12 种角色）、JWT HS256、AES-256-GCM 字段加密（双层密钥）、审计日志哈希链、PII 脱敏引擎、Prompt Injection 五层防护 | 被 BFF `middleware/auth`、`middleware/audit`、`middleware/desensitize` 调用 |
| `tenant/` | 5 | 多租户与院区上下文：`TenantContextResolver`、`TenantService`、`DataScopeGuard` | `tenant/index.ts`；BFF 中间件 `middleware/tenant.ts` 注入请求上下文 |
| `resilience/` | 6 | 生产级韧性原语：`CircuitBreaker`、`Bulkhead`、`ConcurrencyLimiter`、`AsyncQueue`、`TieredRateLimiter`（滑动窗口/令牌桶） | `resilience/index.ts` |
| `saga/` | 1 | 跨域长事务编排与补偿 | `saga/saga.ts` |
| `cache/` | 9 | Cache-Aside、`MemoryCache`、`DistributedLock`（Redis）、`lru-cache@11` | `cache/factory.ts` 按环境切换内存/Redis |
| `medical-tools/` | 149 | 36 个医疗工具注册表（检验/检查/用药/诊断/路径…），MCP 协议暴露 | `medical-tools/registry.ts`、`framework.ts` |
| `knowledge-platform/` | 20 | 知识中台：指南/路径/规则/术语统一检索 | `knowledge-platform/index.ts` |
| `knowledge/` | 44 | 知识引导、向量检索、RAG 片段组装 | `knowledge/bootstrap.ts` |
| `internet-hospital/` | 8 | 互联网医院业务域：在线问诊、处方流转、支付 | 经 BFF `routes/internet*` 暴露 |
| `voice/` | 8 | ASR 服务 + 医学语音后处理（`MedicalSpeechPostProcessor`） | `voice/AsrService.ts` |
| `emergency/` | 3 | 急诊绿色通道模板、分诊评分、急诊状态机 | `emergency/stateMachine.ts` |
| `skills/` | 7 | Agent 技能加载/注册/执行（与 MCP SDK 对齐） | `skills/loader.ts`、`executor.ts` |
| `core/` | 90 | 跨域核心领域模型与纯函数 | — |
| `integration/` | 50 | 与外部 HIS/EMR/LIS/PACS/区域平台适配器 | `integration/index.ts` |
| `ui/` | 58 | 服务端视图/聚合 DTO（非前端 React 代码） | — |
| `config/` `constants/` | 1+2 | `ConfigManager`、医学常量字典 | — |
| `types/` `data/` `entrypoints/` | 4+2+1 | 全局类型、演示目录数据、CLI 入口 `entrypoints/cli.tsx` | — |

---

## 5. 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 运行时 | **Bun**（首选）/ Node 兼容 | `packageManager: bun@1.4.2`，`engines: bun>=1.3.0, node>=18` |
| 语言 | TypeScript（ESM） | `typescript@6.0.2`（根） |
| HTTP | Bun 原生 `Bun.serve`（HTTP + WebSocket 一体） | 内建 |
| 校验 / Schema | Zod | `zod@4.3.6` |
| LLM SDK | Anthropic TypeScript SDK | `@anthropic-ai/sdk@0.80.0` |
| 工具协议 | Model Context Protocol SDK | `@modelcontextprotocol/sdk@1.29.0` |
| 默认 LLM 端点 | DeepSeek OpenAI 兼容 | `LLM_PROVIDER=deepseek`，`deepseek-chat` |
| 数据库驱动 | `postgres`（porsager/postgres） | `^3.4.9` |
| 缓存 / 锁 | ioredis | `^6.0.0` |
| HTTP 客户端 | undici / axios | `undici@7.29.0`、`axios@1.18.0` |
| WebSocket | `ws` | `8.21.0` |
| 容器 | oven/bun slim 多阶段镜像 | `oven/bun:1.4.2-slim` |
| 数据库 | PostgreSQL | `postgres:16.4-alpine3.20` |
| 缓存 | Redis | `redis:7.4.0-alpine3.20` |
| 消息队列 | Apache Kafka（Bitnami，KRaft 单节点） | `bitnami/kafka:3.8.0-debian-12-r0` |
| 日志检索 | Elasticsearch + Kibana | `8.15.0` |
| 链路追踪 | Jaeger all-in-one（OTLP） | `1.60.0` |
| 指标 / 看板 | Prometheus + Grafana + Alertmanager | `prom/prometheus:v2.54.1`、`grafana/grafana:11.2.0`、`prom/alertmanager:v0.27.0` |
| 边缘网关 | nginx（自签开发证书，生产替换） | `deploy/nginx/Dockerfile` |
| 旁路参考 | Java 模块化单体（Spring Boot 3.5.3 + JDK 21）、Python FastAPI | `--profile legacy`，不进默认编排 |

---

## 6. FHIR R4 与合规对标

本仓库的所有写操作在设计期即对齐下列评级，不靠"事后补材料"：

| 合规项 | 目标级别 | 在代码中的落点 |
|---|---|---|
| 电子病历系统功能应用水平分级评价 | **六级**（全流程数据闭环 + 知识库联动） | `bff/routes/emr*`、`emrLevel5Review`、`cdsDeep`、`timelineDeep`、`emrAi*` 系列路由 |
| 国家医疗健康信息互联互通标准化成熟度 | **四级甲等** | `bff/routes/fhir*`：`fhirRoutes`、`fhirGatewayDetailRoutes`、`fhirGatewayDetail2Routes`、`fhirOperationsRoutes`（search/read/validate/history） |
| 医院智慧服务分级评估 | **三级** | `internet-hospital/`、`patientPortal`、`patientCare`、`healthEdu`、`guideAi`、`mobileQuickActions` |
| HL7 FHIR | **R4** | `/api/v1/fhir/*` 网关，资源 Bundle 输出 |
| 网络安全等级保护 | **三级** | `security/`：JWT HS256、AES-256-GCM、审计哈希链保留 ≥180 天（`AUDIT_RETENTION_DAYS=180`）、PII 脱敏、Prompt Injection 五层防护 |

生产环境硬性约束（`assertProductionNotDemoMode` 在启动期 fail-closed）：

- `NODE_ENV=production` 时 `DEMO_MODE` 必须为 `0`，否则进程直接退出；
- `JWT_SECRET`、`ENCRYPTION_MASTER_KEY`、`RADAR_INTERNAL_TOKEN` 必须由 KMS/环境注入，镜像内不固化；
- 所有写操作必须经过 `withIdempotency`（`Idempotency-Key`）与 `auditOperation`。

---

## 7. 快速开始（DEMO_MODE 离线）

前置要求：

- **Bun ≥ 1.3.0**（推荐 1.4.2，与 `packageManager` 对齐）。Windows 安装后把 `C:\Users\<you>\.bun\bin` 加入 `PATH`；下文假定 `bun` 已在 PATH 中，否则用全路径 `C:\Users\lenovo\.bun\bin\bun.exe`。
- Node ≥ 18（仅用于双 tsc 门禁与工具链，BFF 本身跑在 Bun 上）。

```powershell
# 1) 克隆并进入仓库根
cd C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1

# 2) 安装依赖（Bun lockfile 已提交）
bun install --frozen-lockfile

# 3) 复制环境变量示例
Copy-Item .env.example .env.development

# 4) 以 DEMO_MODE 启动 BFF（跳过 PostgreSQL，全部走内存演示数据）
$env:DEMO_MODE = "1"
$env:HTTP_PORT = "8080"
bun run src/bff/server.ts
```

启动成功后日志应包含：

```text
[jianlan-bff] starting  nodeEnv=development  DEMO_MODE=ON (内存演示数据，不连 PG)
[db] DEMO_MODE=1：跳过 PostgreSQL 连接，使用内存演示数据（不持久化）
[jianlan-bff] listening on http://0.0.0.0:8080  (WebSocket /ws/chat [auth required])
```

健康与可观测端点：

```powershell
curl http://127.0.0.1:8080/health        # 存活
curl http://127.0.0.1:8080/ready         # 就绪（真实模式会探测 PG/Redis）
curl http://127.0.0.1:8080/metrics      # Prometheus 指标
curl http://127.0.0.1:8080/api/v1/health # 业务层健康
```

连真实 PostgreSQL 的开发模式：

```powershell
# 启动基础设施（Postgres/Redis/Kafka/ES/Jaeger 等）
docker compose up -d postgres redis kafka elasticsearch jaeger

# 关闭 DEMO，指向本地 PG
$env:DEMO_MODE = "0"
$env:DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:5432/jlmedaios"
$env:JWT_SECRET = "dev-only-at-least-32-bytes-change-me-please-xxxx"
$env:ENCRYPTION_MASTER_KEY = "dev-only-at-least-32-bytes-change-me-please"
bun run src/bff/server.ts
# 启动时自动执行 autoMigrate（deploy/postgres/init/*.sql 顺序）
```

---

## 8. 环境变量（摘自 `.env.example`）

| 变量 | DEMO 必需 | 生产必需 | 说明 |
|---|:-:|:-:|---|
| `NODE_ENV` / `APP_ENV` | ✓ | ✓ | `development` / `test` / `production` |
| `HTTP_PORT` | ✓ | ✓ | 默认 `8080` |
| `HTTP_TIMEOUT_MS` |  | ✓ | 接口超时，默认 30000 |
| `DEMO_MODE` | ✓ | 必须 `0` | `=1` 跳过 PG，使用内存数据；生产启动期 fail-closed |
| `DATABASE_URL` |  | ✓ | `postgres://user:pass@host:5432/jlmedaios` |
| `PGSSLMODE` / `PG_POOL_MAX` |  | ✓ | 内网 `disable`，生产 `require` |
| `REDIS_URL` |  | ✓ | `redis://:pass@host:6379/0` |
| `KAFKA_BROKERS` |  | ✓ | 容器内 `kafka:9092` |
| `ES_URL` |  | ✓ | 日志检索 `http://localhost:9200` |
| `LLM_PROVIDER` / `LLM_MODEL` / `LLM_BASE_URL` / `LLM_API_KEY` |  | ✓ | 默认 DeepSeek；生产接院内私有化 OpenAI 兼容端点 |
| `LLM_MAX_TOKENS` / `LLM_TEMPERATURE` / `LLM_TIMEOUT_MS` |  | ✓ | 默认 8192 / 0.2 / 60000 |
| `HIS_BASE_URL` / `HIS_API_KEY` / `EMR_*` / `LIS_*` / `PACS_*` |  | 按院 | 院内系统对接 |
| `RADAR_INFERENCE_URL` / `RADAR_INTERNAL_TOKEN` |  | ✓（启用影像辅诊时） | DAMO-RADAR 第二阅片，`X-Internal-Token` 内部鉴权 |
| `VECTOR_STORE_DIR` / `EMBEDDING_MODEL` / `EMBEDDING_DIM` |  | ✓ | 默认 `./data/vectors` / `bge-large-zh` / `1024` |
| `JWT_SECRET` |  | ✓ | HS256，≥32 字节随机 |
| `ENCRYPTION_MASTER_KEY` |  | ✓ | AES-256-GCM 主密钥，≥32 字节 |
| `ENABLE_DESENSITIZATION` / `ENABLE_PROMPT_GUARD` |  | 必须 `true` | PII 脱敏 / Prompt Injection 防护 |
| `AUDIT_RETENTION_DAYS` |  | ✓ | 等保三级 ≥180 |
| `LOG_DIR` / `LOG_MAX_SIZE` / `LOG_MAX_FILES` |  | ✓ | 默认 `./logs` / 10MB / 14 |
| `SENTRY_DSN` / `PERF_API_TIMEOUT_MS` / `PERF_TOOL_TIMEOUT_MS` |  |  | 错误上报与性能告警阈值 |

> 容器编排插值变量另见 `.env.compose.example`，与本文件按用途分开维护。

---

## 9. 开发规范

**目录约定**（强约束）：

```text
src/<domain>/
  routes/        # HTTP 路由（只做参数校验与调用 aggregator，不写业务逻辑）
  aggregators/   # 业务编排（跨 repository、跨外部依赖）
  repositories/  # 数据访问（只在这里出现 SQL / ORM）
  services/      # 纯业务服务（无 IO 或 IO 已被注入）
  types.ts       # 域内类型
```

**质量铁律**（引自架构宪章第六章）：

1. `tsc --noEmit` 零报错；禁止 `any`、`@ts-ignore`、`console.log`。
2. 纯函数单测覆盖率 100%；JSDoc 完整。
3. 分层清晰：`route → aggregator → repository → db`，不允许跨层直连。
4. 所有写操作必须 `Idempotency-Key`；所有迁移 SQL 用 `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`。
5. LLM 调用：30s 超时 + 指数退避 + `CircuitBreaker` 降级；降级时回退到确定性模板，前端不白屏。

**可观测性**：

- 指标：`src/bff/observability/metrics.ts`，Prometheus 文本格式输出到 `/metrics`；HTTP 路由标签化（route 模板 + 状态码，不含 PII）。
- 日志：`LOG_DIR=./logs`，JSON 行格式，`LOG_LEVEL` 控制；请求带 `traceId` 贯穿 BFF → repository → LLM 调用。
- 链路：`OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318`，`OTEL_SERVICE_NAME=jlmedaios-bff`。
- 告警：`deploy/observability/alertmanager/` 配置渠道，`deploy/prometheus/rules/` 录规则。

**测试**：

```powershell
bun test                        # 全量
bun test tests/unit             # 单元
bun test tests/integration      # 集成（需要 PG/Redis）
bun test tests/e2e              # 端到端
bun test --coverage             # 覆盖率
```

---

## 10. 路线图

**已落地（M3 – M190）**：

- BFF 骨架 + 中间件链（JWT/CSRF/RBAC+ABAC/tenant/idempotency/rateLimit/audit/desensitize）；
- 门诊 / 住院 / 护理 / 药房 / 手术 / 急诊 / 院感 / 病案 / 体检 / 互联网医院全域路由；
- Orchestrator DSL + 36 个医疗工具 + Doctor/Nurse/Pharma/Admin MUSE 个人智能体；
- 韧性层五原语、Saga、Outbox 中继、危急值广播；
- 监控体系（Prometheus/Grafana/Alertmanager/Jaeger/ES/Kibana）与 Docker Compose 全栈编排。

**M190-P0 合规改造（进行中收尾）**：

- FHIR R4 网关深度（M430 资源搜索 Bundle、M432 第二批资源、CRUD/validate/history 操作端点）；
- CDS 临床决策支持深化（M448）、患者 360 时间线（M449）、权限与组织架构深化（M450）；
- 电子病历五级评审深度（M433）、运营经营分析（M434）、急诊急救（M435）、PACS（M438）、门诊挂号分诊（M439）、住院通用（M440）、传染病与公卫（M441）、药房调剂（M442）、后勤设备（M443）、患者服务（M444）、家庭医生（M445）、移动护理 PDA 床旁闭环（M446）、事件总线与通知中心（M447）、院长驾驶舱 BI（M451）、护理质量 NQI（M453）、患者门户（M454）、健康宣教（M455）、行政办公（M456）、分诊叫号（M457）、自助终端（M458）、院内导航停车（M459）。

**进行中**：

- **Consult-Agent 深化加固**（任务 #30–#38，分支 `consult-agent-m86`）：会话记忆、工具调用审计、人工接管、与 CDS 闭环。
- **健康画像平台**：跨就诊患者画像、慢病管理、风险预测、与 MUSE 个人智能体双向回流。

**规划中（AI 原生医院 3.0 全场景）**：

- 全院级 MUSE 知识联邦与模型版本治理；
- 数字孪生院区 + 资源智能调配；
- 医共体/医联体多院联邦学习；
- 与浙江健康云 PaaS 对齐的多租户 SaaS 运营版。

---

## 11. 仓库双镜像说明

| 视角 | 仓库 | 用途 |
|---|---|---|
| 主仓（后端/AI/数据） | **GitCode `JLMEDAIOS`** | 本 README 视角；`src/`、`deploy/`、`docker-compose*.yml`、`Dockerfile.backend` |
| 开发者镜像（前端/上手/部署） | **GitHub `JLAIharnessos`** | 见 [`README.dev.md`](./README.dev.md)；`web/`、`scripts/`、示例与二次开发 |

- 当前工作分支：**`consult-agent-m86`**。
- 推送策略：日常开发推 GitCode 主仓；GitHub 镜像由 CI 单向同步，**不要**直接 `git push origin heagentos` 或覆盖镜像分支。
- 双镜像同源同 commit，仅 README 视角不同。

---

## 12. License 与社区

- 代码许可证：**Apache-2.0**，见 [`LICENSE`](./LICENSE)。
- 数据与模型许可：见 [`DATA_LICENSES.md`](./DATA_LICENSES.md)、[`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md)。
- 行为准则：[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)。
- 安全披露：[`SECURITY.md`](./SECURITY.md)（请勿公开 Issue 上报漏洞）。
- 贡献指南：[`CONTRIBUTING.md`](./CONTRIBUTING.md)。

Copyright © 2026 杭州健澜科技有限公司. All rights reserved.
