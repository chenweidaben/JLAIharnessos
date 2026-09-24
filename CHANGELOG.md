# 变更日志（CHANGELOG）

本文件记录健澜科技数智医院智能体的版本变更。
格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 概述
**v0.3.0 真实化改造**：系统从"演示骨架（mock 壳）"升级为"数据真落库、LLM 真闭环、链路真贯通"的工业级系统。引入 PostgreSQL 作为业务主库，医疗工具从内存 mock 改为真实 Repository 读写，对话层接入 DeepSeek 流式 LLM 并持久化，前端去除硬编码 mock。

### 新增
- **PostgreSQL 持久化层**（`src/db/`）：连接池（postgres.js）、轻量 SQL 迁移执行器（启动自动迁移）、10 个 Repository（患者/就诊/医嘱/处方/病历/检验/药品/对话/消息/审计/用户），支持事务、参数化查询、优雅关闭。
- **对话会话与消息表**（`deploy/postgres/init/60-chat.sql`）：`agent.conversations` + `agent.conversation_messages`，支撑多轮对话持久化、工具调用记录、Token 用量统计。
- **药品目录与库存表**（`deploy/postgres/init/25-drug-catalog.sql`）：`clinical.drug_catalog` + `clinical.drug_inventory`。
- **种子数据脚本**（`scripts/db/seed.ts`）：一键写入演示用户/患者/就诊/医嘱/处方/检验/药品。
- **真实链路集成测试**（`tests/integration/real-persistence.test.ts`）：患者 CRUD、医嘱状态流转、处方审核发药、病历签署、检验危急值、对话消息持久化、事务一致性，无 DB 自动跳过。
- **DEMO_MODE 开关**：`DEMO_MODE=1` 时跳过 DB 连接使用内存演示数据（明确水印），默认连真实 Postgres。
- **前端 API 客户端层**（`web/src/api/`）：统一 fetch 封装、对话/患者/医疗 API 模块、WebSocket 流式客户端。
- **前端演示模式水印**：`VITE_DEMO_MODE=1` 时顶部显示"演示模式 - 数据不持久化"横幅。
- 前端离线状态指示器（`useOnlineStatus` + `OfflineIndicator`）：断网顶部红色横幅，恢复后自动提示。
- HTTP 请求超时可配置：默认 30s，支持 `VITE_API_TIMEOUT_MS` 覆盖。
- HTTP 请求指数退避重试：仅幂等 GET，5xx/网络错误/超时，最多 2 次，离线不重试。
- BFF 内置 Prometheus 指标端点 `/metrics`（零依赖，可选 `METRICS_TOKEN`）：HTTP RED、WebSocket、智能体/工具/CDS/人工任务指标（`gangos_` 前缀），并支持 SIGTERM/SIGINT 优雅停机。
- 预置 Prometheus 告警规则 9 条与 Grafana 平台总览大盘（19 面板，自动装配）。
- k6 压测脚本（冒烟/常规/压力，`scripts/perf/k6/`）。
- TOTP 多因素认证（RFC 6238），BFF 5 个 `/auth/mfa/*` 接口。
- PostgreSQL 备份/恢复脚本（`deploy/postgres/backup.sh`、`restore.sh`）。
- 《生产上线验收清单》《容灾与恢复演练手册》。

### 变更
- **医疗工具真实化**：P0 共 15 个工具从 `MOCK_*` 内存数据改为走 `src/data/clinicalData.ts` 门面层 → Repository 真实读写；P1 影像/CDS 工具基于真实数据；P2 运营/质控工具保留 mock 但标注 `_demoMode: true`。
- **对话层真闭环**：`chat.ts` 从假返回改为 conversationRepo 真实 CRUD；`chatAggregator.ts` 改为 DeepSeek 流式调用 + 消息落库 + 单轮工具调用；WebSocket 改为真实 LLM 流式推送。
- **BFF 启动初始化**：启动时执行 DB 连接校验 + 自动迁移，连不上 DB 明确报错；优雅停机时关闭连接池。
- **前端 AI 问诊页**：从硬编码改为真实会话列表/历史加载/流式逐字渲染。
- **前端患者页**：从 mock 改为真实 API 调用，补齐 loading/错误态。
- 演示危急值假告警改为仅非生产环境推送。

### 修复
- BFF 认证中间件修复"任意非空 token 即 admin"的 P0 漏洞。
- BFF 500 错误不再向客户端泄露堆栈/SQL/文件路径。
- 修复指标 Histogram 桶计数被重复累加的问题。
- 修复 `clinicalData.ts` 中 `counsel` 字段严格模式错误。
- 修复 `createOrder.ts` 中创建结果未判空的潜在运行时错误。
- 修复 `LabOrderTools.test.ts` 中 orderId 前缀断言。

### 安全
- 所有 SQL 查询参数化，防注入；写操作事务化，可回滚。
- 患者敏感字段不存明文，真实模式下不编造缺失数据。
- 无 LLM Key 时明确返回 `LLM_NOT_CONFIGURED`，不用写死回复冒充 AI。
- 演示模式数据明确标注 `_source: 'demo'`，真实模式标注 `_source: 'database'`。

### 已知限制
- 完整 `MedicalAgentLoop` 已存在但对话层当前采用简化直连 DeepSeek 方案，事件契约同构可平滑替换。
- 真实 HIS/LIS/PACS 院内系统对接仍需部署适配器。
- 前端仪表盘/急诊/住院/运营/质控等页面仍使用 mock 数据（P2）。

---（`useOnlineStatus` + `OfflineIndicator`）：断网顶部红色横幅，恢复后自动提示。
- HTTP 请求超时可配置：默认 30s，支持 `VITE_API_TIMEOUT_MS` 覆盖。
- HTTP 请求指数退避重试：仅幂等 GET，5xx/网络错误/超时，最多 2 次，离线不重试。
- BFF 内置 Prometheus 指标端点 `/metrics`（零依赖，可选 `METRICS_TOKEN`）：HTTP RED、WebSocket、
  智能体/工具/CDS/人工任务指标（`gangos_` 前缀），并支持 SIGTERM/SIGINT 优雅停机。
- 预置 Prometheus 告警规则 9 条（`deploy/prometheus/rules/gangos.yml`）与 Grafana 平台总览大盘
  （19 面板，自动装配），docker-compose 已挂载。
- k6 压测脚本（冒烟/常规/压力，`scripts/perf/k6/`）。
- TOTP 多因素认证（RFC 6238，±1 步时钟容忍、重放保护、一次性备份码），BFF 5 个 `/auth/mfa/*` 接口。
- PostgreSQL 备份/恢复脚本（`deploy/postgres/backup.sh`、`restore.sh`，含校验与保留期）。
- 《生产上线验收清单》《容灾与恢复演练手册》。

### 变更
- 演示危急值假告警改为仅非生产环境推送，生产环境不再制造假告警。

### 修复
- BFF 认证中间件修复"任意非空 token 即 admin"的 P0 漏洞：JWT 验签失败一律拒绝，演示 token 仅非生产环境可用。
- BFF 500 错误不再向客户端泄露堆栈/SQL/文件路径，统一返回通用文案 + traceId。
- 修复指标 Histogram 桶计数被重复累加的问题。

---

## [0.2.0-radar] - 2026-09-21

### 概述
工业级超融合接入达摩院 **DAMO-RADAR**（腹部增强 CT 视觉-语言大模型，Science 393(6817):eaec6129, 2026）。以独立 Python FastAPI 推理微服务 + BFF 适配器 + 前端报告页的方式接入，定位**第二阅片/辅助决策**，强制放射科医师复核签名闭环。技术栈异构不硬糅，无权重/GPU 自动降级 demo。

### 新增
- **推理微服务** `services/radar-inference/`（FastAPI，端口 8090）：`demo`/`production` 双模式，无权重自动加载预计算 CSV 降级；内部 token 鉴权、并发信号量限流、作业超时、日志脱敏。
- **BFF 集成**：适配器 `src/integration/adapters/radar/` + 路由 `src/bff/routes/imaging.ts`（`/api/v1/imaging/ai/*`）；catalog/jobs/review/历史报告端点；推理服务不可用时回退内置静态 catalog 与确定性 mock，前端不白屏。
- **前端**：`web/src/pages/imaging/AiReportPage.tsx` 与 `web/src/components/imagingAi/`——18 器官导航（阳性数徽标）、146 发现列表（critical/major/minor 分级配色）、医师复核签名闭环、critical 危急值推送、降级「演示数据」水印。
- **权限点**：`imaging:view` / `imaging:ai:analyze` / `imaging:ai:review`，复用既有 RBAC。
- **配置项**：`RADAR_INFERENCE_URL`、`RADAR_INTERNAL_TOKEN`、`RADAR_POSITIVE_THRESHOLD`、`RADAR_MAX_CONCURRENCY`（及 major 阈值/critical 集合/作业超时/权重路径等可覆盖项）。
- **容器**：docker-compose profile `demo`（CPU，无权重）与 `gpu`（挂载 `./models/radar:/models`）；权重约 5 GB，`download_weights.sh` 默认走 `hf-mirror.com` 镜像，**严禁入库**。
- **双语技术文档**：融合架构白皮书、融合集成说明、部署安装手册、许可与合规声明、训练微调评估复现指南（CN/EN 各一份）。

### 合规
- 上游代码 Apache-2.0（vendor 于 `services/radar-inference/vendor/damo-radar/`，保留 LICENSE/THIRD_PARTY_LICENSES.md）；**权重 CC BY-NC-SA 4.0（非商业）**，商用须另行授权。
- 定位第二阅片，所有 AI 输出须经放射科医师复核签名后方可进入报告；PACS 脱敏、审计哈希链、数据不出院。

### 测试
- 融合后全量回归实测：`bun test` **1184** 通过、`vitest` **201** 通过、`pytest` **19** 通过、`tsc` **0** 错误。

---

## [0.1.0] - 2026-09-16

### 概述
首个可交付版本，完成第四阶段全量验证（编译、测试、代码质量、功能、交互一致性、安全性能、异常边界、文档交付）。

### 新增
- **核心引擎**：MedicalAgentLoop、QueryEngine、LLMClient、SystemPromptBuilder、上下文压缩与 Token 预算管理。
- **工具框架**：buildMedicalTool、ToolRegistry、ToolExecutor、ToolRiskManager（三级风险确认）。
- **36 个医疗专用工具**：患者管理、电子病历、医嘱处方、检验检查、CDS、质控、患者服务、运营、系统集成。
- **多智能体协作**：AgentRegistry、CollaborationEngine、ConsultationManager、IntentClassifier、SuperScheduler。
- **8 类科室子代理**：内科、外科、儿科、妇产科、急诊科、ICU、手术室、医技科。
- **BFF 层**：Bun.serve，REST `/api/v1` + WebSocket `/ws/chat`，统一响应信封、traceId、限流、CSRF、安全头。
- **安全合规**：JWT HMAC-SHA256 验签（时序安全比较）、RBAC+ABAC、四级数据分级、数据脱敏、审计日志、Prompt 注入防护、输入验证（SQL/命令/XSS/路径遍历）、加密服务、密钥管理。
- **监控可观测**：ErrorMonitor（全局兜底+错误聚合+指纹）、HealthChecker（三态健康检查）、PerformanceMonitor、结构化日志。
- **前端**：React 19 + TypeScript + Vite + AntD5，206 源文件，覆盖门诊/住院/急诊/手术/质控/运营/系统管理等场景。
- **文档体系**：110+ 份文档，含 API（36 工具+11 服务+7 适配器）、部署（4）、运维（5）、用户手册（5 角色）、ADR（16）、工程化（8）。

### 安全
- 等保三级合规：安全响应头（CSP/X-Frame-Options/HSTS 等）、限流、CSRF 双重提交、输入验证、输出编码。
- JWT 验签失败拒绝伪造 Token；生产环境禁用演示 Token。
- 患者数据脱敏展示；审计日志防篡改（LogIntegrity）。

### 测试
- 后端 898 个测试用例（单元/集成/E2E）。
- 前端组件与交互测试。
- 异常边界测试覆盖：网络/服务/数据/并发/权限/浏览器六类异常场景。

### 已知限制
- WebSocket 演示态以模拟流式推送为主，真实 LLM 流式对接待生产环境联调。
- 多标签页登录状态实时同步（storage 事件广播）列入后续迭代。
- 大文件分片上传、长列表虚拟滚动按场景逐步落地。

---

## 版本说明

- **主版本（MAJOR）**：不兼容的 API/架构变更
- **次版本（MINOR）**：向下兼容的功能新增
- **修订号（PATCH）**：向下兼容的问题修复

升级指南见 [部署文档](docs/deployment/02-部署步骤.md) 与 [运维手册](docs/operations/05-日常运维手册.md)。

Copyright (c) 2026 杭州健澜科技有限公司
