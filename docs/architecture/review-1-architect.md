# 健澜杠OS（jianlan-gang-os）重构方案 · 首席架构师评审意见

- 评审对象：初始提议「Java 核心交易 + Python AI + TS BFF + K8s/APISIX/Kafka/PG16/Redis7 + 绞杀者模式 12 个月」
- 评审人：首席架构师（20 年三甲核心系统重构经验）
- 评审日期：2026-10-19
- 评审基线代码：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`（Bun 1.4.2 / TS 单体 BFF / 1957 路由 / PostgreSQL 16 / prod compose 已含 Kafka+Nginx+Prom+Jaeger）
- 文档级别：架构宪法修订输入（Review-1）

---

## 一、总体结论

**初始方案方向正确但步子过大，整体判定为「有条件认可」——可以按绞杀者模式推进，但必须砍掉 Spring Cloud 全家桶一步到位、砍掉 K8s 与 Istio、砍掉 Seata AT，并把可用性目标从 99.99% 下调到 99.95%。** 对一个初期 <30 人、客户在三甲医院内网、运维只有 3–5 人的初创团队，同时维护 Java/Python/TypeScript 三套语言栈 + K8s + Service Mesh + Seata + Nacos + Sentinel，12 个月内几乎不可能稳定上线。正确路径是「**TS BFF 不动、Python AI 独立、Java 模块化单体先立、微服务按需拆**」，把 Spring Cloud 从 Day-1 降级为 Day-180+ 的可选项。

五条最关键修正：

1. **不要 Day-1 上 Spring Cloud 2024.x**。核心交易先用 Spring Boot 3.5.x 模块化单体（Modulith）跑起来，跨服务拆解决策推迟到第三个模块独立部署之后。
2. **不要 Day-1 上 K8s 与 Istio**。医院内网、3–5 人运维，先用 3 节点 Docker Compose / systemd 集群 + Keepalived VIP，K8s 放到客户量 ≥3 家之后再引入；Service Mesh 在 12 个月内明确禁止。
3. **不要用 Seata AT**。医疗交易跨库一致性走「本地消息表 + 业务 Saga」（仓库里 `src/saga/` 已有雏形，直接平移为 Java 侧实现），AT 模式的全局行锁在挂号高峰会把 P99 打爆。
4. **Bun 保留但必须做 Node.js 22 LTS 双运行时验证**。Bun 1.4.x 性能好但生产成熟度在医院客户侧仍被质疑，BFF 代码须同时在 Bun 与 Node 22 上跑通，运行时由部署侧选择。
5. **可用性 99.99% 改为 99.95%（年停机 ≤4.3h）**。99.99% 要求年停机 ≤52 分钟，对 <30 人团队是财务自杀；挂号 P99<200ms、3000 QPS 目标合理且可达。

---

## 二、逐项认可点（初始方案里判断正确的部分）

| # | 初始判断 | 认可理由 |
|---|---|---|
| 1 | 核心交易从 TS 单体迁出，用 JVM 系重写 | 1957 路由的 TS 单体 BFF 已到复杂度天花板；医疗挂号/收费/药房是强一致、长事务、复杂 SQL、强审计场景，JVM 的成熟生态（连接池、事务、JMX、 Arthas、国产中间件适配）是 TS 短期内补不齐的。 |
| 2 | AI 层独立 Python 化，与交易核心解耦 | 仓库已用 `@anthropic-ai/sdk` 与 `@modelcontextprotocol/sdk 1.29`，但 LLM 推理、向量检索、RAG、Agent 工具调用的生态在 Python 侧（vLLM、LangGraph、LlamaIndex、Milvus）碾压 JS。Python 独立进程是对的。 |
| 3 | BFF 保留 TypeScript + React 19 | 宪章 v2.0 §2.6 已把「TS + Bun（BFF）」写成宪法；前端聚合层用 TS 能与 web/React 19 共享类型 zod schema，避免跨语言 DTO 反复翻译。 |
| 4 | 消息队列选 Kafka | prod compose 里已经部署了 Kafka（见 `docker-compose.prod.yml:178`），团队已有运维经验；不要为了"更优雅"换 RabbitMQ/Pulsar。 |
| 5 | 关系库选 PostgreSQL 16 | 仓库现状就是 PG 16（:5433 / jlmedaios），宪章已固化；PG 对 JSONB、窗口函数、CTE、分区表的支持在 EMR 文书场景明显优于 MySQL 8。 |
| 6 | 绞杀者模式（Strangler Fig）作为迁移路径 | 1957 路由全量重写是自杀；按业务域逐一切流、门面层路由、双写对账、灰度回滚，是唯一在三甲客户面前可解释、可回滚的路径。 |
| 7 | 性能目标 3000 QPS 挂号、P99<200ms | 以 2000 床、日门诊 1 万人次测算，早高峰 8:00–9:00 挂号并发约 1500–2500 QPS，3000 QPS 留有 30% 余量合理；P99<200ms 是三甲医生对系统的体感阈值。 |

---

## 三、逐项风险点与修正建议

### 3.1 三层语言划分（Java + Python + TS）对 <30 人团队过重

**风险描述**：三语言栈意味着三套 CI、三套依赖治理、三套可观测性仪表板、三套招聘画像。按业界经验，每多一套语言栈，初期至少需要 2–3 名专职熟手。<30 人团队若按 1/3 给 Java、1/3 给 Python、1/3 给 TS，等于每边只有 8–10 人，而 EMR/HIS/药房/护理/AI 五个业务域要同时推进，必然出现「谁都写、谁都不精」。

**修正方案**：分阶段收敛语言数。

- **阶段一（0–6 个月）：双语言**。TS BFF + Python AI 直接沿用现状，**不引入 Java**。把现有 TS 单体里最稳定、最容易切出的模块（EMPI、字典、认证）先按绞杀者模式切到独立的 TS 服务（NestJS 11 或纯 Bun HTTP），验证服务拆分方法论。
- **阶段二（6–12 个月）：三语言但收敛边界**。仅在「挂号/收费/药房」三个强交易域引入 Java（Spring Boot 3.5 模块化单体），其余域继续 TS。Java 团队规模 ≥5 人时才启动。
- **阶段三（12 个月+）：按信创/客户要求再决定是否全量 Java 化**。

**理由**：
- 宪章 v2.0 §2.6 已把 TS+Bun 写成宪法，Day-1 推翻宪法的代价比推迟 Java 化大得多。
- 医院客户最关心的是「等保三级、数据不出院、信创适配、7×24 稳定」，而不是你用什么语言写的。
- Java 在医疗行业的真正不可替代性是：医保接口、电子票据、社保卡、互联互通四级乙等的既有 Java SDK——这些是**接口适配层**，不是核心业务逻辑层。

**备选方案对比**：

| 方案 | 团队要求 | 上线速度 | 信创兼容 | 长期可维护性 | 判定 |
|---|---|---|---|---|---|
| A. 三语言（Java+Py+TS）一步到位 | ≥40 人 | 慢（12–18 月） | 好 | 中（语言税高） | **反对** |
| B. 全 Java（Spring Boot + Java 版 AI） | ≥30 人 | 最慢（18 月+） | 最好 | 好 | 反对（Python AI 生态不可替代） |
| C. 全 Go | ≥25 人 | 中 | 中 | 中 | 反对（医疗 SDK 生态弱） |
| D. **TS 核心 + Python AI，Java 仅用于交易强一致域**（推荐） | 15–25 人 | 快（6 月见雏形） | 中→好（按需补 Java） | 好 | **认可** |

---

### 3.2 Java 选型细节

#### 3.2.1 Spring Cloud 2024.x vs Spring Boot 3.5 模块化单体

**风险**：Spring Cloud 2024.x（对应 Spring Boot 3.5.x）一上来就带 Nacos/OpenFeign/Sentinel/Seata/Gateway 一整套，对于 <10 个微服务的阶段是过度设计。模块化边界没有验证之前就上服务注册发现，会把「模块间调用」变成「网络间调用」，P99 立刻从 5ms 变成 50ms。

**修正**：
- 起步用 **Spring Boot 3.5.x（最低 3.5.3，Java 21 LTS）** + **Spring Modulith 1.4.x**，单进程内按 Maven 模块隔离：

```
gangos-trading/
├── mod-emp/          # EMPI 患者主索引
├── mod-reg/          # 挂号
├── mod-charge/       # 收费
├── mod-pharm/        # 药房
├── mod-shared/       # 共享内核（字典/权限/审计）
└── mod-bootstrap/    # 启动模块
```

- 跨模块调用走 Spring ApplicationEvent（本地事件）+ 接口在 `mod-shared-api`，**禁止**直接 `@Autowired` 对方模块的实现类。
- 拆出独立进程的触发条件：该模块有独立扩缩容需求、独立发布节奏、或独立数据量（如 EMR 文书 > 5000 万行）。
- Spring Cloud 在第 3 个模块独立部署时才引入，且只引入 **Spring Cloud 2024.0.x + Spring Cloud Alibaba 2023.0.3.x**（Nacos 那一套）。

#### 3.2.2 注册中心：Nacos vs Consul vs K8s Service

**修正**：**Nacos 2.4.x**。理由：
- 医疗行业信创目录里 Nacos 出现频率远高于 Consul；
- Nacos 同时承担配置中心，医院客户喜欢「配置界面可见」；
- K8s Service 只在 Day-180+ 真上 K8s 后才考虑，初期 K8s 不上，排除。

#### 3.2.3 熔断限流：Sentinel vs Resilience4j

**修正**：**Sentinel 1.8.8**。理由：
- 国内医疗团队对 Sentinel 控制台（流量整形、热点参数、系统保护）更熟；
- 挂号场景天然需要「按科室限流」「按医生限流」这种热点参数规则，Sentinel 的热点参数限流开箱即用，Resilience4j 要自己写；
- Resilience4j 更轻但需要代码侵入，Sentinel 注解 + 控制台即可。

关键配置示例：

```java
@SentinelResource(value = "register:book",
    blockHandler = "bookBlock",
    fallback = "bookFallback")
public RegisterVO book(BookCmd cmd) { ... }
```

```yaml
# flow-rule: 挂号接口全局限流 3000 QPS，单个医生 20 QPS
flow:
  - resource: register:book
    count: 3000
    grade: 1
    limitApp: default
param-flow:
  - resource: register:book
    itemIndex: 1          # doctorId
    count: 20
```

#### 3.2.4 分布式事务：Seata AT/TCC/SAGA 选哪个

**风险**：Seata AT 模式用全局行锁 + undo_log，在挂号高峰会把 `patient_id` 索引行锁住，P99 直接飙到秒级；TCC 要求每个接口写 Try/Confirm/Cancel 三套代码，团队写不出；医疗交易（挂号→收费→药房发药）天然是长流程、可补偿，SAGA 最合适。

**修正**：**不用 Seata，用本地消息表 + 自研 Saga**（仓库 `src/saga/` 已有 TypeScript 雏形，Java 侧平移为 Spring StateMachine 3.x）。

```
[挂号服务] 本地事务：
  BEGIN;
    INSERT INTO reg_order(...);
    INSERT INTO local_outbox(topic='reg.booked', payload=..., status='PENDING');
  COMMIT;
[Outbox Relay] 轮询 PENDING → 投 Kafka → 标记 SENT
[收费服务] 消费 reg.booked → 创建预结算单
[药房服务] 消费 charge.paid → 预配药
[补偿] 任一步骤失败 → 发回滚事件（reg.cancel / charge.refund）
```

**理由**：
- 本地消息表是金融级已验证模式（支付宝、微信支付都在用）；
- 不引入 Seata Server（额外运维一个组件）；
- 与现有 `src/bff/outboxRelay.ts` 设计一致，迁移成本最低。

#### 3.2.5 ORM：MyBatis-Plus vs JPA vs jOOQ

**修正**：**MyBatis-Plus 3.5.x**。理由：
- 医疗系统 SQL 复杂度极高（EMR 文书多态表、报表、互联互通四级乙等的 HL7 转换），JPA 自动生成的 SQL 在复杂查询下不可控；
- jOOQ 类型安全但商业 license 对开源项目不友好；
- MyBatis-Plus 国内医疗团队人才池最大，SQL 可手写可生成，DBA 可 review。

---

### 3.3 Python AI 层

#### 3.3.1 FastAPI 够不够

**认可**。FastAPI 0.115.x + Pydantic v2 + Uvicorn/Gunicorn，是 AI 层的事实标准。补充：
- 生产用 `gunicorn -k uvicorn.workers.UvicornWorker -w $((2*CPU+1))`，不要直接裸跑 uvicorn；
- 加 **Litestar 或 FastAPI 自带中间件** 做请求 ID、慢日志、LLM 调用审计。

#### 3.3.2 vLLM 自研 vs 云厂商 API

**修正**：**混合架构**。
- **院内本地推理（必选）**：vLLM 0.6.x+，部署 Qwen2.5-32B-Instruct / Qwen3-32B，单卡 H20/L20（48G）起步，供「病历草稿、审方建议、交班总结」这些涉 PHI 场景；数据不出院是等保三级硬要求。
- **云端 API（可选）**：仅用于「医学文献检索、患者教育材料生成」这类非 PHI 场景，且必须经过脱敏网关。
- **不要** Day-1 就自建 vLLM 集群。初期用单卡 vLLM + OpenAI 兼容接口（http://localhost:8000/v1），业务无感知；并发上来再扩。

#### 3.3.3 LangChain/LangGraph vs 自研 Agent 框架

**修正**：**LangGraph 0.2.x**（不要 LangChain Chain）。理由：
- 医疗 Agent 是「状态机 + 可中断 + 可人工审批」（医生要在 AI 建议上点采纳/修改/拒绝，对应宪章 §3.3 反馈闭环），LangGraph 的 Pregel 模型天然适合；
- LangChain 的 Chain 抽象是线性管道，表达不了「医生修改→重新规划」这种循环；
- 自研框架的隐性成本（持久化、断点续跑、观测）至少 6 人月，不划算。

#### 3.3.4 MCP 协议层放哪

**修正**：**MCP Server 放在业务侧（Java/TS 服务），MCP Client 放在 Python AI 层**。

```
[Python AI Orchestrator]
   │  MCP Client (via @modelcontextprotocol/sdk python port)
   ▼
MCP Gateway (FastAPI 侧, port 8100)
   │
   ├── mcp-patient-service   → 调用 EMPI（Java）查患者
   ├── mcp-reg-service       → 调用挂号（Java）查号源
   ├── mcp-emr-service       → 调用 EMR（TS）读文书
   └── mcp-knowledge-service → 调向量库查指南
```

业务系统不直接暴露 OpenAI 工具描述，而是统一通过 MCP Gateway，这样工具鉴权、审计、限流在一处。

---

### 3.4 TS BFF 保留：Bun 生产成熟度、厚薄

#### 3.4.1 Bun vs Node.js 22 LTS

**风险**：Bun 1.4.x（2026 年）性能比 Node 22 快 2–4 倍，但医院客户的运维视角、信创目录、`.venv` 兼容性、某些 npm 包的 Bun 兼容性仍有坑（仓库根目录一堆 `bff-restart-err.txt`、`tsc_*.txt` 调试日志就是证据）。

**修正**：**双运行时验证，部署侧选**。
- 代码层：BFF 代码必须同时在 Bun 1.4.x 与 Node.js 22 LTS 上 `bun test` / `node --test` 都通过；
- 禁止使用 Bun-only API（`bun:sqlite`、`Bun.serve` 高级特性），只用 Web 标准 API（fetch、Request、Response、WebSocket）；
- 部署默认 Bun，客户要求 Node 时一键切到 Node（Dockerfile 多阶段构建两个镜像）。

#### 3.4.2 BFF 该厚还是薄

**修正**：**薄 BFF**。BFF 只做四件事：
1. 协议转换（HTTP/JSON ↔ gRPC/Thrift，未来）；
2. 聚合（并行调多个下游，组装视图）；
3. 鉴权与上下文注入（JWT、租户 ID、数据范围）；
4. SSE 流式透传（AI 输出）。

**禁止**在 BFF 写业务规则、写 SQL、直接写库。现状 1957 路由里大量 route→repo→db 直连 PG 的写法必须在绞杀过程中清除，否则 BFF 会成为新的单体。

---

### 3.5 基础设施

#### 3.5.1 K8s vs 裸机 + systemd

**风险**：K8s 学习曲线 6 个月起，3–5 人运维团队上 K8s 等于白天写代码晚上救火。医院客户机房通常没有 K8s 运维能力，私有化交付时客户根本接不住。

**修正**：
- **Day-0 ~ Day-180**：3 节点物理机 / 虚机，Docker Compose + systemd，Keepalived VIP（1 主 1 备 1 观察），NFS / Ceph RBD 存持久卷。
- **Day-180 ~ Day-360**：客户 ≥3 家、模块数 ≥6 个时，引入 **k3s 1.30.x**（轻量 K8s，单二进制 <100MB），而不是完整 K8s。
- **完整 K8s + Istio**：12 个月内不做，明确写进宪法。

#### 3.5.2 APISIX vs Nginx Ingress vs Spring Cloud Gateway

**修正**：**APISIX 3.10.x**（如果 Day-180 不上 K8s，就独立部署 APISIX）；过渡期保留现有 Nginx 1.26。理由：
- APISIX 国产、Apache 顶级项目、有 Dashboard（医院客户喜欢可视化）；
- 插件市场自带 JWT、限流、CORS、Prometheus 指标，不用自己写 Nginx Lua；
- 现有 Nginx 配置可由 APISIX 的 `proxy-rewrite` 插件平移；
- Spring Cloud Gateway 是 Java 进程，性能不如 APISIX（Nginx 内核），且与业务同栈会导致「网关挂=业务挂」。

#### 3.5.3 Kafka vs RabbitMQ vs Pulsar

**认可 Kafka 3.8.x**。prod compose 已经有 Kafka，不换。补充：
- Topic 命名规范：`{domain}.{entity}.{event}`，如 `reg.order.booked`、`charge.paid`；
- 分区数 = 预估峰值 QPS / 单分区 300 QPS；
- 副本因子 3，`min.insync.replicas=2`，`acks=all`。

RabbitMQ 只在「医院客户已有 RabbitMQ」时作为兼容选项，不主动引入。

#### 3.5.4 PostgreSQL 16 vs MySQL 8 vs 达梦

**修正**：
- 开发/默认：**PostgreSQL 16.x**（与现状一致）；
- 信创交付：**达梦 8**（DM8）作为目标方言，通过 MyBatis-Plus 多方言配置 + Druid 连接池切换；
- **不主动用 MySQL 8**（PG 已在宪章固化，MySQL 无收益）。

关键：**禁止在 SQL 里写 PG-only 语法**（如 `RETURNING`、`JSONB` 操作符），抽象在 Repository 层；EMR 文书的 JSON 字段用通用 JSON 类型，避免迁移时重写。

#### 3.5.5 Redis 7：哨兵 vs Cluster

**修正**：**Redis 7.4.x 哨兵模式（1 主 2 从 3 哨兵）**。理由：
- <30 人团队运维 Cluster（16 槽位、节点扩缩容、reshard）成本高；
- 医疗场景对 Redis 的需求是「会话、分布式锁、热点号源缓存」，数据量 <10GB，哨兵足够；
- Cluster 留给 Day-360+ 缓存数据量 >30GB 时再升。

关键配置：

```redis
# redis.conf
maxmemory 8gb
maxmemory-policy allkeys-lfu       # 热点号源优先留
appendonly yes
appendfsync everysec
requirepass ${REDIS_PWD}
```

分布式锁用 Redisson 3.x 的 `RLock`，看门狗续期，**不要**用 `SETNX` 裸写。

#### 3.5.6 Service Mesh（Istio）

**反对**。理由：
- Istio sidecar 会让每个 Pod 多 100–200ms 延迟，直接吃掉 P99<200ms 的预算；
- 3–5 人运维团队玩不转 Envoy + istiod 的排错；
- 初期用 APISIX + Sentinel 已经覆盖了流量治理需求。

如未来真要上 Mesh，选 **Istio Ambient 模式**（无 sidecar），不要选经典 sidecar 模式。

---

### 3.6 服务划分

**核心原则**：按业务域拆，不按技术层拆（宪章 §2.5 已定）。DB 策略：**绞杀期 Shared Database，稳定期 Database per Service**——不要 Day-1 就强制每服务一库，否则 1957 路由的数据迁移会死锁。

| 微服务 | 职责 | 所属层 | 优先迁移批次 | 库策略 |
|---|---|---|---|---|
| `bff-aggregator` | 聚合、鉴权、SSE 透传（TS/Bun） | 接入层 | 批次 0（保留） | 不持有库 |
| `ai-orchestrator` | Doctor MUSE 编排、LangGraph 状态机、MCP Client（Python） | AI 层 | 批次 0（保留增强） | 向量库 + 会话库 |
| `mcp-gateway` | MCP Server 统一入口、工具鉴权审计（Python/FastAPI） | AI 层 | 批次 0 | 不持有库 |
| `svc-emp` | EMPI 患者主索引、就诊号、字典 | 核心域 | **批次 1（0–3 月）** | 独立库 |
| `svc-iam` | RBAC、租户、MFA、审计日志 | 平台域 | 批次 1 | 独立库 |
| `svc-reg` | 挂号、预约、退号、号源 | 核心域 | **批次 2（3–6 月）** | 独立库 |
| `svc-charge` | 收费、结算、票据、医保对接 | 核心域 | 批次 2 | 独立库 |
| `svc-pharm` | 药房、审方、发药、库存 | 核心域 | 批次 2 | 独立库 |
| `svc-emr` | 电子病历文书、结构化、质控规则 | 临床域 | **批次 3（6–9 月）** | 独立库（JSONB 重） |
| `svc-nurse` | 护理记录、交班、风险评估 | 临床域 | 批次 3 | 共享 emr 库 |
| `svc-opt` | 手术麻醉、排班 | 临床域 | 批次 3 | 独立库 |
| `svc-qc` | 质控、DRG、运营报表 | 分析域 | **批次 4（9–12 月）** | 独立库（读多写少） |
| `svc-qa` | 知识库、指南、患者教育 | AI 支撑 | 批次 4 | 向量库 |

**先拆 EMPI/IAM 的理由**：它们是所有其他域的依赖底座，先切出去能立刻让其他模块调用方走标准 API，而不是直连共享表。

---

### 3.7 绞杀者模式细节

#### 3.7.1 门面层（Anti-Corruption Layer）怎么建

在现有 Nginx/APISIX 之上加一层 **Router Service（TS/Bun）**，按 URL 规则路由到老单体或新服务：

```
client
  ▼
APISIX / Nginx
  ▼
gangos-gateway (TS, port 8080)
  ├── /api/v2/emp/*   → svc-emp (Java, 8081)
  ├── /api/v2/reg/*  → svc-reg (Java, 8082)
  ├── /api/v2/charge/*→ svc-charge (Java, 8083)
  ├── /api/v2/emr/*   → svc-emr (TS, 8084)
  ├── /api/v2/ai/*    → ai-orchestrator (Python, 8100)
  └── /*              → legacy-monolith (TS/Bun, 8090)   ← 老单体
```

规则配置在 APISIX Dashboard 或 Nginx conf，**改路由 = 改配置，不改代码**。

#### 3.7.2 双写、灰度、回滚

**双写**（仅挂号/收费/发药三个强一致域）：
- 老单体与新 Java 服务同时写 PG，老单体写主表，新服务写影子表（`reg_order_shadow`）；
- Outbox Relay 把老单体的写事件投 Kafka，新服务消费后写自己的库；
- 每日凌晨对账任务比对影子表与主表差异，差异 >0.1% 报警。

**灰度**：
- 按患者 ID 尾号灰度：0–9 尾号逐步切流（10%→30%→50%→100%）；
- 按科室灰度：先放一个非急诊科室试点；
- 按医生灰度：主任专家团队自愿试点。

**回滚**：
- 路由规则切回老单体是秒级（APISIX 配置热更新）；
- 影子表数据保留 30 天，回滚后老单体数据不丢；
- 新服务写库若失败，自动 fallback 到老单体写（`fallback` 方法，见 Sentinel 注解）。

---

## 四、最终推荐技术选型表

| 组件 | 推荐版本 | 关键配置 | 理由 | 替代方案 |
|---|---|---|---|---|
| BFF 运行时 | Bun 1.4.x + Node 22 LTS 双验证 | 禁 Bun-only API | 性能 + 兼容 | Deno 2.x（不推荐，生态弱） |
| BFF 框架 | 原生 Bun HTTP / Elysia 1.x | 不引重型框架 | 1957 路由已原生 | NestJS 11（新模块用） |
| 前端 | React 19.2 + Vite 6 | 与现状一致 | 宪章固化 | Vue 3（不推荐，团队已 React） |
| 核心交易语言 | Java 21 LTS | G1GC，堆 4G | 医疗生态 | Kotlin（可后续引入） |
| 核心交易框架 | Spring Boot 3.5.3 | Modulith 1.4.x | 模块化单体起步 | Quarkus 3.x（GraalVM  native 可选） |
| 微服务框架 | Spring Cloud 2024.0.x + Alibaba 2023.0.3 | 仅 ≥3 模块独立部署后引入 | 信创兼容 | 不引入（保持模块化单体） |
| 注册/配置中心 | Nacos 2.4.x | 1 主 2 节点 | 控制台 + 信创 | K8s Service（Day-180+） |
| 熔断限流 | Sentinel 1.8.8 | 控制台独立部署 | 热点参数限流 | Resilience4j 2.x |
| 分布式事务 | 本地消息表 + Spring StateMachine 3.x | Outbox Relay 复用现有 | 避免 Seata AT 锁 | Seata Saga（不推荐，多组件） |
| ORM | MyBatis-Plus 3.5.x | 多方言（PG/达梦） | 医疗 SQL 可控 | jOOQ（商业 license） |
| 数据库连接池 | Druid 1.2.x | 信创适配 | 监控 + SQL 墙 | HikariCP（默认） |
| AI 框架 | FastAPI 0.115 + LangGraph 0.2 | Pydantic v2 | 状态机 Agent | LlamaIndex（RAG 辅助） |
| 推理引擎 | vLLM 0.6.x，Qwen3-32B | OpenAI 兼容 API | 院内数据不出院 | 接云 API（仅非 PHI） |
| 向量库 | Milvus 2.4.x 或 pgvector 0.7 | 初期 pgvector | 初期省一个组件 | Qdrant 1.x |
| MCP | FastMCP 2.x（Python） | Client 在 AI 层 | 业务系统作 MCP Server | 自研工具协议（不推荐） |
| 消息队列 | Kafka 3.8.x | RF=3, acks=all | 现状一致 | RabbitMQ（客户已有时） |
| 缓存 | Redis 7.4 哨兵（1主2从3哨兵） | allkeys-lfu | 运维简单 | Redis Cluster（Day-360+） |
| 网关 | APISIX 3.10.x（过渡期保留 Nginx 1.26） | Dashboard | 国产 + 插件 | Spring Cloud Gateway |
| 容器编排 | Docker Compose + systemd + Keepalived（Day-180）；k3s 1.30（Day-180+） | 3 节点 | 3–5 人运维 | 完整 K8s（12 月内禁止） |
| 可观测性 | Prometheus 2.54 + Grafana 11 + Jaeger 2.x + OTel 1.42 | 采样 10% | 现状一致 | ELK 替换 Jaeger（不推荐） |
| 日志 | Loki 3.x + Promtail | 保留 ES 仅检索 | 省资源 | ELK（现状已用，可保留） |
| 关系库 | PostgreSQL 16.4（开发）/ 达梦 8（信创） | 分区表 | EMR JSONB | MySQL 8（不推荐） |

---

## 五、服务划分清单（按迁移批次）

```
gangos/
├── gateway/                  # TS/Bun，APISIX 后的应用层路由
├── bff-aggregator/           # TS/Bun，薄 BFF（聚合、鉴权、SSE）
├── ai-orchestrator/          # Python/FastAPI + LangGraph
├── mcp-gateway/              # Python/FastAPI + FastMCP
├── trading/                  # Spring Boot 3.5 模块化单体
│   ├── mod-emp/              # 批次 1
│   ├── mod-iam/              # 批次 1
│   ├── mod-reg/              # 批次 2
│   ├── mod-charge/           # 批次 2
│   ├── mod-pharm/            # 批次 2
│   └── mod-shared/
├── clinical/                 # 批次 3，TS/Bun 或 Java 二选一
│   ├── svc-emr/
│   ├── svc-nurse/
│   └── svc-opt/
└── analytics/                # 批次 4
    ├── svc-qc/
    └── svc-qa/
```

**里程碑**：

- M+0~M+3：EMPI/IAM 切出，老单体回归纯 BFF + 业务聚合；
- M+3~M+6：挂号/收费/药房三域双写并灰度到 50%；
- M+6~M+9：EMR/护理切出，AI 层接 MCP 工具链；
- M+9~M+12：质控/报表切出，老单体路由 95% 流量被绞杀，剩余 5% 为管理后台低流量，可下线。

---

## 六、对后续 PRD / 架构文档的硬性约束建议（必须写进宪法）

1. **【语言栈收敛】** 系统只允许三种语言：TypeScript（BFF/前端）、Python（AI 层）、Java（核心交易域）。新引入第四种语言必须经架构委员会 2/3 多数通过。
2. **【模块化单体优先】** 任何新 Java 模块必须先以 Modulith 模块形式存在于 `gangos-trading` 进程内；拆出独立进程的触发条件写入宪法：独立扩缩容 / 独立发布节奏 / 独立数据量 >5000 万行 / 独立合规边界，四选一。
3. **【禁 Seata AT】** 跨服务一致性只允许「本地消息表 + Saga」，禁止引入 Seata AT/TCC；Seata Server 不进任何生产部署。
4. **【禁 Istio / Service Mesh】** 12 个月内禁止 sidecar 模式 Mesh；流量治理统一在 APISIX + Sentinel 完成。
5. **【禁 K8s 一步到位】** Day-180 前禁止完整 K8s；Day-180 后引入 k3s 也必须先有 2 家以上客户付费验证。
6. **【BFF 必须薄】** BFF 代码禁止出现 `pg.query` / SQL 字符串 / 业务规则常量；BFF 行内 SQL 行数 = 0，ESLint 规则强制。
7. **【双运行时验证】** BFF 代码必须同时通过 Bun 1.4 与 Node 22 LTS 的测试；禁止使用 `bun:*` 模块。
8. **【信创方言抽象】** 所有 SQL 禁止出现 PG-only 语法（`RETURNING`、`JSONB` 操作符、`FILTER (WHERE ...)`）；Repository 层必须提供 PG 与达梦两套实现的单元测试。
9. **【可用性目标】** 生产环境 SLA 目标 99.95%（年停机 ≤4.3h），不是 99.99%；99.99% 仅在客户合同明确付费时为单个模块承诺。
10. **【AI 输出可驳回】** 所有 LLM 输出必须带 `adopted/modified/rejected` 三种反馈按钮（宪章 §3.3 已有），未接反馈闭环的 AI 接口禁止上线。
11. **【数据不出院】** 涉 PHI 的 LLM 调用必须走院内 vLLM；非 PHI 场景接云 API 必须经脱敏网关，禁止业务代码直连云厂商 SDK。
12. **【绞杀回滚预算】** 每次灰度切流必须有「10 秒内切回老单体」的预案；路由规则变更必须在预发环境演练回滚。

---

*本评审为 Review-1。后续 Review-2 将针对 `gangos-trading` 模块化单体的包结构、Outbox Relay 协议、MCP 工具清单做逐条设计。*
