# 健澜科技杠OS 重构方案 —— 性能与可运维性评审报告

> 评审角色：资深 SRE / 性能架构师（三甲医院核心系统运维背景）
> 评审对象：Java(Spring Cloud) + Python(FastAPI+vLLM) + TS(Bun BFF)，K8s + APISIX + Kafka + PG + Redis，绞杀者 12 个月
> 目标规模：日门诊 1 万、住院 2000 床、HIS/EMR 在线医护 2000+
> 性能目标：挂号峰值 3000 QPS、核心交易 P99 < 200ms、可用性 99.99%
> 评审日期：2026-10-19

---

## 1. 总体结论

**3000 QPS 挂号峰值、P99 < 200ms、99.99% 可用性，在当前架构下技术上可达，但前提是必须做 5 处硬修正；3-5 人、传统 Windows 背景的信息科团队，直接上原生 K8s 不可行，必须退到"轻量 K8s（k3s + Helm Chart 全家桶封装）+ 托管式可观测性"折中方案，否则 12 个月内必然出现 P1 级事故无人能救。**

核心判断：
- **容量层面**：3000 QPS 挂号峰值在 8C16G × 6 Pod 的 Spring Cloud 集群下可达，但瓶颈不在 Java 业务层，而在 **PostgreSQL 写连接数与医保外呼接口**。当前方案未提 PgBouncer 与医保熔断，是最大风险点。
- **AI 层**：vLLM 在单卡 H20（96GB）上服务 200 并发问诊请求过于乐观——按 7B 量化模型、平均输入 1500 token / 输出 300 token 测算，实际稳定并发上限约 60-80，必须排队 + 流式返回 + 降级到规则引擎。
- **运维层面**：3-5 人团队 + K8s + APISIX + Kafka + PG + Redis + Loki + Jaeger 共 7 类有状态/无状态组件，组件爆炸式增长。建议 k3s 单集群 6 节点 + 所有中间件以 Helm Chart 离线包交付，信息科只学"重启 Pod / 切换主备 / 查看 Grafana"三个动作。

**必须做的 5 条修正（按优先级）：**

1. **数据库连接池必须双层**：业务侧 HikariCP 单实例 maximumPoolSize ≤ 20，集群侧前置 PgBouncer（transaction 模式），否则 6 Pod × 20 = 120 连接直连 PG，配合 2000 医护工作站长连接，PG max_connections 会顶到 500+，触发 OOM 与连接风暴。
2. **AI 层必须默认降级到规则引擎**：vLLM 超时阈值 8s（不是 30s），超过即返回本地规则模板答案 + "AI 加速通道排队中"提示，绝不让医生在工作站干等 30 秒。
3. **挂号链路必须本地缓存科室/号源字典**：Redis 主从切换窗口内（约 30s），挂号不能因为缓存不可用而雪崩；BFF 层必须保留 Caffeine 1 级缓存兜底。
4. **K8s 退到 k3s + 离线 Helm Chart**：原生 K8s（kubeadm + etcd + CNI + Ingress Controller 手工组装）对 3-5 人团队是灾难。用 k3s（单二进制、内置 containerd + Traefik + ServiceLB），所有中间件用 Bitnami / 官方 Helm Chart 离线 tar 包交付。
5. **99.99% 不能靠双活**：三甲医院内网双活成本与复杂度对 3-5 人团队不现实。主备（同城机房 50km 内）+ RTO ≤ 5min / RPO = 0（PG 流复制同步 + Redis 哨兵），年停机预算 52 分钟拆解为：计划内升级 30 分钟、计划外故障 ≤ 20 分钟、演练预留 2 分钟。

---

## 2. 容量规划表

### 2.1 负载模型测算

按三甲医院典型业务曲线：
- **挂号峰值**：早 7:30-8:30 集中放号，瞬时 3000 QPS（按日 1 万门诊 × 30% 集中在 1 小时 × 峰值系数 3 测算）。
- **医护工作站并发**：2000 在线，平均每 30 秒一次操作（开医嘱、查病历、记账），折合 ~67 QPS 业务请求，但长连接/WebSocket 保活需独立通道。
- **AI 辅助问诊**：200 并发请求，平均响应时长 3-8 秒（含 LLM 推理），折合 GPU 服务吞吐 25-50 req/s。
- **医保接口**：每笔挂号/缴费同步调用医保，按 80% 患者有医保 = 2400 QPS 医保外呼，第三方接口 P99 通常 800-1500ms，**这是核心链路最大外部瓶颈**。

### 2.2 微服务容量估算表

| 服务 | 技术栈 | 峰值 QPS / 并发 | Pod 数 | 单 Pod 规格 | 集群 CPU | 集群内存 | DB 连接数 | 备注 |
|---|---|---|---|---|---|---|---|---|
| APISIX 网关 | Lua/OpenResty | 全量 5000 QPS | 4 | 4C 8G | 16C | 32G | 0（无 DB） | 物理机/虚机裸跑更稳，不进 K8s |
| BFF（TS/Bun） | Bun 1.x | 4000 QPS | 6 | 2C 4G | 12C | 24G | 0（调下游） | Bun 单线程，CPU 密集型按核数扩 |
| 挂号服务 | Java/SB 3.5 | 3000 QPS | 6 | 4C 8G | 24C | 48G | 6×15=90（经 PgBouncer） | 核心写事务，P99 < 200ms |
| 缴费/医保网关 | Java/SB 3.5 | 2400 QPS | 4 | 4C 8G | 16C | 32G | 4×10=40 | 同步外呼医保，必须熔断 |
| 医嘱/EMR 服务 | Java/SB 3.5 | 67 QPS（长事务） | 4 | 4C 16G | 16C | 64G | 4×20=80 | 内存大，病历文档缓存 |
| 患者主索引 EMPI | Java/SB 3.5 | 200 QPS | 2 | 2C 4G | 4C | 8G | 2×10=20 | |
| 药品/字典服务 | Java/SB 3.5 | 500 QPS（读多写少） | 2 | 2C 4G | 4C | 8G | 2×5=10 | 全量入 Caffeine |
| AI 问诊网关 | Python/FastAPI | 200 并发 / 40 req/s | 2 | 4C 8G | 8C | 16G | 0（调 vLLM） | 限流 + 排队 |
| vLLM 推理 | Python/vLLM | 7B 模型 60-80 并发 | 2 节点 | 16C 200G + 1×H20 96G | 32C | 400G | 0 | GPU 节点，不进业务 K8s |
| 消息消费（Kafka） | Java/SB 3.5 | 1000 msg/s | 3 | 2C 4G | 6C | 12G | 3×10=30 | 异步写日志/审计 |
| **业务 Pod 合计** | — | — | **33** | — | **~138C** | **~672G** | **~270（经 PgBouncer 汇聚）** | 另需 30% buffer |

### 2.3 中间件容量

| 组件 | 规格 | 数量 | 说明 |
|---|---|---|---|
| PostgreSQL 16 主 | 16C 64G SSD NVMe 2T | 1 | 主库，max_connections=300 |
| PostgreSQL 16 从 | 16C 64G SSD NVMe 2T | 2 | 读写分离 + 灾备 |
| PgBouncer | 2C 4G | 2（VIP） | transaction 模式，池大小 200 |
| Redis 7 主从 | 8C 32G | 3 主 3 从 | 分片集群，最大内存 24G/实例，maxmemory-policy=allkeys-lfu |
| Kafka 3.x | 8C 32G + 4T | 3 broker |  replication.factor=3，min.insync.replicas=2 |
| k3s Server | 8C 16G | 3（HA） | embedded etcd |
| k3s Agent | 16C 32G | 6 | 业务 Pod 调度 |
| GPU 节点 | 32C 200G + 2×H20 | 2 | vLLM 独占 |

**集群总硬件建议：3 台 32C 128G（k3s server+agent 混合）+ 3 台 16C 64G（DB/中间件）+ 2 台 GPU（H20）+ 1 台 APISIX（裸机），共 9 台物理机/虚机。**

---

## 3. 关键性能配置（具体参数）

### 3.1 JVM 与 Java 服务

**JDK 选型：JDK 21 LTS + ZGC（不是 G1）。**

理由：三甲医院核心交易 P99 < 200ms，G1 在堆 ≥ 8G 时 Young GC 停顿通常 50-150ms，混合 GC 偶发 200-400ms；ZGC 在 JDK 21 下停顿 < 1ms（堆 32G 内），对 P99 毛刺控制决定性。代价是吞吐比 G1 低 5-10%，但 4C Pod 下 CPU 不是瓶颈。

```bash
# 挂号服务 Pod JVM 参数（4C 8G 容器）
-Xms4g -Xmx4g
-XX:+UseZGC
-XX:+ZGenerational          # JDK 21 分代 ZGC，吞吐提升
-XX:MaxRAMPercentage=75.0   # 容器感知，留 25% 给堆外/元空间/线程栈
-XX:MaxDirectMemorySize=1g  # Netty/HttpClient 堆外
-XX:MetaspaceSize=256m
-XX:MaxMetaspaceSize=512m
-XX:+ExitOnOutOfMemoryError
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/dump/
-Xlog:gc*:file=/log/gc.log:time,uptime:filecount=10,filesize=50M
```

**堆大小定标原则**：容器内存的 50-60% 作为堆，不是 75%。因为还要留：线程栈（每线程 1MB，500 线程 = 500MB）、Metaspace、DirectMemory、JIT code cache、GC 结构。8G 容器给 4G 堆是安全值。

**Spring Boot 3.5 启动慢问题（K8s 下 readiness 探针失败被反复杀）**：

三层方案，按优先级：
1. **lazy-init + 预热 Bean**（首选，零侵入）：`spring.main.lazy-initialization=true`，但核心链路 Bean（DataSource、RedisTemplate、KafkaTemplate）必须 eager。K8s readinessProbe 延迟 60s、initialDelaySeconds=30，给冷启动留时间。
2. **CRaC（Checkpoint/Restore）**：JDK 21+ 支持，镜像构建时把 JVM 跑起来 checkpoint 成快照，启动时间从 15-25s 压到 1-3s。**但三甲医院内网镜像构建链复杂，二期再上，一期不做。**
3. **HPA 预热**：`kubectl autoscale` 配合 `--scale-down-stabilization-window=300s`，早 7:00 定时 CronHPA 提前扩到 6 Pod，不要等流量来了再扩（扩一个 Java Pod 要 20s，挂号峰值早就过了）。

**HikariCP 配置**（application.yml）：

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 15        # 单 Pod 15，6 Pod = 90 连接，经 PgBouncer 汇聚到 PG 实际 90
      minimum-idle: 5
      connection-timeout: 8000     # 8s 拿不到连接报错，不要默认 30s（会拖垮线程池）
      validation-timeout: 1000
      idle-timeout: 600000         # 10 分钟
      max-lifetime: 1800000       # 30 分钟，必须 < PG idle_in_transaction_session_timeout
      leak-detection-threshold: 5000  # 5s 没还连接打堆栈
      connection-test-query: SELECT 1
```

**为什么 maximumPoolSize=15 不是官方建议的 ((core_count * 2) + effective_spindle_count)**：那是单实例直连 DB 的公式。我们前面有 PgBouncer transaction 模式，PG 侧实际连接数可控，业务侧池大一点只为了并发达标。4C 容器 Tomcat 线程 200，但 DB 连接不需要 200，因为 90% 请求走缓存。

### 3.2 Python AI 层

**FastAPI + Uvicorn（不是 Gunicorn）。**

理由：FastAPI 原生 asyncio，Uvicorn 单进程事件循环足够；Gunicorn + sync worker 反而抵消 async 优势。Bash 启动：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 \
  --workers 4 \           # = CPU 核数，4C Pod 给 4 worker
  --loop uvloop \
  --http httptools \
  --timeout-keep-alive 30 \
  --limit-concurrency 200 \   # 单 Pod 最多 200 并发，超过排队
  --backlog 511
```

**vLLM 显存规划（H20 96GB）**：

按 Qwen2.5-7B-Instruct AWQ INT4 量化测算：
- 模型权重：~5GB
- KV Cache：剩余显存 ~85GB（留 5GB 给激活/碎片）
- 单 token KV Cache（7B、32 层、5120 hidden、fp16）：~2 × 32 × 5120 × 2 bytes = 655 KB/token
- 单请求平均 1800 token（输入 1500 + 输出 300）：~1.17 GB
- **理论并发上限：85 / 1.17 ≈ 72 路**

vLLM 启动参数：
```bash
vllm serve Qwen2.5-7B-Instruct-AWQ \
  --tensor-parallel-size 1 \
  --gpu-memory-utilization 0.90 \
  --max-model-len 4096 \
  --max-num-seqs 64 \          # 64 路并发，留 buffer
  --max-num-batched-tokens 8192 \
  --enable-chunked-prefill \
  --trust-remote-code \
  --port 8001
```

**200 并发问诊请求怎么扛**：
- 2 个 vLLM 节点 × 64 路 = 128 路 GPU 并发。
- 前端 AI 网关（FastAPI）用 `asyncio.Semaphore(120)` 信号量排队，超过 120 直接返回 429 + "AI 通道繁忙，已为您切换规则模板"。
- **流式返回（SSE）**：首 token 延迟 < 1.5s，医生边等边看，体感不卡。
- **超时阈值 8s**：vLLM 请求 8s 没出完，FastAPI 端 cancel + 返回已生成的部分内容 + "AI 思考时间较长，以下为初步建议"。**绝不允许 30s 干等。**

### 3.3 PostgreSQL 16

**PgBouncer 配置**（/etc/pgbouncer/pgbouncer.ini）：

```ini
[databases]
hios = host=127.0.0.1 port=5432 dbname=hios

[pgbouncer]
listen_port = 6432
pool_mode = transaction        # 不是 session，事务级复用连接
max_client_conn = 2000          # 业务侧总连接上限
default_pool_size = 50         # 每个 user/db 池 50
min_pool_size = 20
reserve_pool_size = 10
reserve_pool_timeout = 3
max_db_connections = 150        # PG 侧实际连接数封顶 150
```

**postgresql.conf 关键参数**：

```ini
max_connections = 300           # PgBouncer 池 150 + 监控/运维直连 50 + 预留 100
shared_buffers = 16GB           # 物理内存 25%
effective_cache_size = 48GB     # 物理内存 75%
work_mem = 16MB                 # 复杂排序/哈希
maintenance_work_mem = 1GB
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 16GB
min_wal_size = 2GB
random_page_cost = 1.1          # SSD
effective_io_concurrency = 200
default_statistics_target = 200
log_min_duration_statement = 200   # 慢查询阈值 200ms
log_checkpoints = on
log_lock_waits = on
```

**读写分离**：挂号/写医嘱走主库；病历查询、统计报表、药品目录走 2 个从库（通过 PgBouncer 路由或 Spring `@Transactional(readOnly=true)` + 动态数据源）。

**分库分表策略**：
- **挂号流水**：按 `就诊日期` 月度分区（PARTITION BY RANGE），2026-10 一个分区，老分区 detach 归档到 OSS/磁带。不分库。
- **医嘱记录**：按 `科室 ID` 哈希分 8 表（2000 床 / 8 = 250 张/表），单表行数控制在 2000 万内。
- **操作日志/审计日志**：按日分区，保留 90 天热数据 + 3 年冷归档，走 Kafka → 异步写 PG → 30 天后自动 detach。
- **EMR 病历文档**：结构化数据入 PG，文档本体（XML/HTML）入 MinIO（对象存储），PG 只存元数据 + 外键。

**慢查询治理**：
- 所有 JOIN 表必须有索引；`EXPLAIN ANALYZE` 强制在 CR 前跑一遍。
- 禁止 `SELECT *`；禁止在 WHERE 对索引列做函数（`WHERE DATE(create_time)=...` 改为范围查询）。
- 慢查询日志入 Loki，Alertmanager 对 > 5s 慢查询告警。

### 3.4 Redis

- **部署**：3 主 3 从 Cluster，每主 8C 32G，`maxmemory 24gb`，`maxmemory-policy allkeys-lfu`（热点字典更久保留）。
- **本地缓存 + 分布式二级缓存**：Caffeine 1 级（maximumSize=10000，expireAfterWrite=60s）+ Redis 2 级。字典类数据（科室、药品、医生排班）本地缓存 60s，Redis 3600s。
- **该缓存的**：科室字典、药品目录、医生排班号源、EMP 患者基本信息（只读视图）、Session、验证码、令牌桶计数。
- **绝不缓存的**：患者实时账单（以 DB 为准，钱不能错）、当日挂号已支付状态（分布式锁 + DB 唯一约束兜底）、医嘱执行状态。
- **穿透**：空值缓存 60s + Bloom Filter（号源 ID）。
- **击穿**：热点 key（当日专家号源）用 Redisson `RLock` 单飞重建，锁等待 50ms。
- **雪崩**：TTL 加随机抖动（基础 3600s ± 600s）；Redis 主从切换窗口内 Caffeine 兜底。

---

## 4. 限流熔断降级矩阵

### 4.1 分层关系

- **APISIX 层**：全局限流（IP/用户维度），挡恶意流量，阈值宽松。
- **服务内 Sentinel**：资源级精细限流 + 熔断，保护下游（医保、DB、vLLM）。
- **两者关系**：APISIX 是第一道闸（10000 QPS 入口），Sentinel 是业务闸（挂号 3000 QPS 内部再切分）。APISIX 限流返回 429，Sentinel 限流返回业务码 `2001`（"系统繁忙，请稍后重试"）。

### 4.2 关键路径规则矩阵

| 接口 | 层 | 限流阈值 | 熔断条件 | 降级行为 |
|---|---|---|---|---|
| 挂号提交 | APISIX + Sentinel | APISIX: 单 IP 10 QPS；Sentinel: 全集群 3000 QPS | 异常比例 > 50% 持续 10s，或慢调用 RT > 500ms 比例 > 30% | 熔断 30s；降级返回"今日号源已约满"静态页 + 引导改约次日 |
| 医保缴费外呼 | Sentinel（医保网关内） | 线程数 200；QPS 2400 | 医保 RT P99 > 2000ms 持续 30s，或错误率 > 10% | 熔断 60s；降级为"医保结算暂缓，请先自费结算，后续窗口退费" |
| 处方/医嘱提交 | Sentinel | 线程数 100 | DB 慢查询 > 1s 比例 > 20% | 降级写 Kafka 异步队列，提示"医嘱已提交，正在保存" |
| AI 辅助问诊 | FastAPI 信号量 | 单网关 120 并发，全集群 200 | vLLM 8s 未返回 / HTTP 5xx | 取消请求，返回规则引擎模板（常见 50 种问诊场景） |
| 病历查询 | Sentinel + APISIX | APISIX 单医生 50 QPS；Sentinel 读 QPS 1000 | 从库复制延迟 > 5s | 切主库读（降级），或返回"病历同步中，请 10s 后重试" |
| 药品目录查询 | Sentinel | 不限（全缓存） | Redis 不可用 | Caffeine 兜底 60s，再不行返回"药品目录加载中" |
| 登录/验证码 | APISIX | 单 IP 5 QPS | 登录失败率 > 30% | 强制验证码 + 5 分钟封禁 |

### 4.3 降级预案（Runbook 必背）

- **AI 挂了**：vLLM Pod 健康检查失败 → APISIX 路由摘除 → FastAPI 自动切规则引擎 → 医生无感知（只是建议质量下降）。
- **医保接口超时**：Sentinel 熔断 → 患者先自费 → 收费窗口提供"医保追溯退费"入口，T+1 批量对账。
- **数据库慢查询**：PgBouncer 主动拒绝新连接（`max_client_conn` 到达）→ 业务侧 HikariCP 8s 超时 → Sentinel 熔断写服务 → 挂号切只读模式（不能新挂号，但已挂号可就诊）。
- **Redis 主从切换**：哨兵 30s 内完成切换；切换窗口内 Caffeine 兜底，业务日志打 warn，不熔断。

---

## 5. 可观测性三件套

### 5.1 选型

| 维度 | 选型 | 理由 |
|---|---|---|
| 日志 | **Loki + Promtail**（不是 ELK） | 3-5 人团队维护不起 ES 集群；Loki 与 Prometheus/Grafana 同源，资源占用 1/5，日志按 label 索引不全文索引，三甲日志量（每天 ~50GB）够用 |
| 指标 | Prometheus + Grafana | k3s 内置 kube-prometheus-stack Helm Chart，离线安装 |
| 链路 | OpenTelemetry SDK + Jaeger（All-in-1 模式） | 多语言统一 traceId；Jaeger 不用 ES 做存储，用 Badger 本地磁盘，保留 3 天 |

### 5.2 跨语言 traceId 统一

- **Java**：micrometer-tracing + OTLP exporter，自动埋点 Spring Web / HikariCP / Kafka。
- **Python**：opentelemetry-instrumentation-fastapi / requests / sqlalchemy，自动埋点。
- **TS/Bun**：opentelemetry-js，Bun 兼容 node API。
- **传递**：traceparent W3C header（`traceparent: 00-{trace-id}-{span-id}-01`），APISIX 透传。
- **日志**：MDC 注入 traceId，logback pattern `[%X{traceId}]`；Python `logging` filter 注入；Loki label 带 traceId，Grafana 一键从指标跳日志跳链路。

### 5.3 告警规则（Alertmanager 样例）

```yaml
groups:
- name: hios-core
  rules:
  # 业务 P99
  - alert: P99LatencyHigh
    expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 0.2
    for: 3m
    labels: { severity: critical }
    annotations:
      summary: "接口 {{ $labels.uri }} P99 > 200ms"

  # 错误率
  - alert: ErrorRateHigh
    expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service) > 0.02
    for: 2m
    labels: { severity: critical }

  # Pod CPU / 内存
  - alert: PodCPUHigh
    expr: rate(container_cpu_usage_seconds_total[5m]) / container_spec_cpu_quota > 0.85
    for: 10m
    labels: { severity: warning }

  - alert: PodOOMKilled
    expr: increase(kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}[1h]) > 0
    labels: { severity: critical }

  # PG 连接数
  - alert: PGConnectionsHigh
    expr: pg_stat_activity_count / pg_settings_max_connections > 0.8
    for: 5m
    labels: { severity: critical }

  # 磁盘
  - alert: DiskWillFill
    expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
    for: 10m
    labels: { severity: warning }

  # 医保熔断
  - alert: InsuranceCircuitOpen
    expr: sentinel_circuit_state{resource="insurance-pay"} == 1
    for: 1m
    labels: { severity: critical }
```

告警通道：企业微信/钉钉 webhook（医院内网可能用邮件 + 短信猫）；critical 级别电话拨号（通过 Alertmanager webhook → 运维自建短信网关）。

---

## 6. 3-5 人运维可行性结论

### 6.1 结论：折中方案（k3s + 全封装 Helm Chart）

**强烈不推荐原生 kubeadm K8s，也不完全退回 docker-compose + systemd。**

理由：
- 原生 K8s：etcd 备份恢复、CNI 网络排错、CoreDNS 故障、Ingress Controller 升级——任何一个问题 3-5 人团队都搞不定，且医院内网没有专家随时支持。
- docker-compose + systemd：能跑，但 33 个 Pod + 6 个中间件，手工编排、扩容、故障转移不可控，99.99% 靠人盯人不现实。
- **k3s**：单二进制、embedded etcd、内置 containerd + Traefik + ServiceLB，`kubectl` 命令与 K8s 完全一致，未来升级到标准 K8s 无成本。3 台 server 做 HA，6 台 agent 跑业务。信息科只需要学 3 个动作：
  1. `kubectl rollout restart deploy/registration-service`（重启服务）
  2. `kubectl get pods -A`（看谁挂了）
  3. 打开 Grafana 看大盘（不看命令行）。

### 6.2 离线部署要求

医院内网不能上外网，所有交付物必须是**离线 tar 包**：
- k3s 二进制 + 镜像 tar（`k3s-images.tar`，约 2GB）。
- 所有 Helm Chart（APISIX、postgres、redis、kafka、loki、prometheus、jaeger）`helm chart save` 成 tgz。
- 基础镜像（openjdk:21-slim、python:3.12-slim、bun:1-alpine）`docker save`。
- 交付时提供 `install.sh` 一键脚本，信息科只需 `./install.sh /media/usb/`。

### 6.3 SOP 摘要

| 场景 | SOP | RTO 目标 |
|---|---|---|
| 升级 | 蓝绿/金丝雀（Helm values 切 1 个 Pod 观察 30min），业务低峰（晚 22:00-次日 6:00） | 30 分钟 |
| 回滚 | `helm rollback <release> <revision>`，1 分钟内完成 | 1 分钟 |
| DB 备份 | pg_basebackup 每日 1 次全量 + WAL 持续归档（到备用机），保留 30 天；每月做一次恢复演练 | 备份 < 1h |
| DB 主从切换 | `patroni switchover`（推荐 Patroni 不是 repmgr），自动 DNS/VIP 漂移 | < 30s |
| Redis 故障 | 哨兵自动切换，人工只补从节点 | < 30s |
| 容灾演练 | 每季度 1 次：拔主库网线，验证从库接管 + 业务恢复 | 演练 RTO ≤ 5min |
| 整机故障 | k3s 自动在其他 agent 重启 Pod；有状态组件（PG/Redis/Kafka）用 PVC + 本地 SSD，手动迁移 | < 30min |

---

## 7. 高可用与容灾

### 7.1 99.99% 拆解

年可用率 99.99% = 年停机 ≤ 52.6 分钟。

| 类别 | 预算 | 说明 |
|---|---|---|
| 计划内升级窗口 | 30 分钟/年 | 每月 2.5 分钟，业务低峰 |
| 计划外硬件故障 | 15 分钟/年 | 主备切换自动 |
| 计划外软件故障 | 5 分钟/年 | Pod 重启、熔断降级 |
| 演练预留 | 2 分钟/年 | 季度容灾演练切流量 |
| **合计** | **52 分钟** | |

### 7.2 主备 vs 双活

**选主备，不选双活。**

- 双活对 3-5 人团队是灾难：数据冲突、分布式事务、脑裂处理，任何一个问题都是 P0。
- 主备（同城两个机房，光纤直连 < 5ms）：
  - PG：同步流复制（`synchronous_commit=on`，`synchronous_standby_names='FIRST 1 (standby1)'`），**RPO=0**。
  - Redis：哨兵，异步复制，RPO 秒级（医院可接受，因为 Redis 只缓存不存关键数据）。
  - Kafka：`min.insync.replicas=2`，`acks=all`，RPO ≈ 0。
  - k3s：双机房各 1 台 server + agent 混合，etcd 跨机房 3 节点。
  - **RTO ≤ 5 分钟**（人工确认 + VIP 漂移 + DNS 切换）。

### 7.3 关键配置

- **PG**：Patroni + etcd + HAProxy，自动 failover；`max_connections=300`，流复制 `wal_level=replica`，`hot_standby=on`。
- **Redis**：3 主 3 从 + 3 哨兵（独立 Pod），`sentinel monitor` 周期 1s，`quorum=2`，`down-after-milliseconds=10000`。
- **Kafka**：3 broker 跨机房，`replication.factor=3`，`min.insync.replicas=2`，`unclean.leader.election.enable=false`。
- **APISIX**：2 节点 + LVS/Keepalived VIP，配置 etcd 集中存储。

---

## 8. 必须写进开发指南的运维规范

1. **所有服务必须接入 OTel**：没有 traceId 的请求日志不允许进主干；CI 流水线校验 `opentelemetry-instrumentation` 依赖存在。
2. **DB 连接必须走 PgBouncer（6432 端口）**：禁止直连 5432；HikariCP `maximumPoolSize` 不得超过 20。
3. **外部 HTTP 调用必须设超时**：RestTemplate/WebClient 默认 `connectTimeout=2s`、`readTimeout=5s`；医保网关 `readTimeout=3s` 因为医保本身就要熔断。
4. **禁止 `SELECT *`、禁止跨库 JOIN、禁止在索引列上用函数**：Code Review  checklist 强制项。
5. **缓存 key 必须带业务前缀 + TTL**：`hios:dept:dict`、`hios:drug:catalog:{id}`，TTL 必须显式设置，禁止永久 key。
6. **Pod 必须设 resources.requests/limits**：CPU request=limit（不允许 Burstable 影响邻居），内存 request=limit（OOMKilled 不可接受）。
7. **readinessProbe 必须配**：`httpGet /actuator/health/readiness`，`initialDelaySeconds=30`，`periodSeconds=10`；livenessProbe `initialDelaySeconds=120`（避免冷启动误杀）。
8. **镜像必须固定 digest**：禁止 `latest` tag；CI 产出 `image:tag@sha256:...`。
9. **日志必须 JSON 格式 + 必带字段**：`ts, level, service, traceId, userId, msg`；禁止 `System.out.println`。
10. **任何写 DB 的操作必须有幂等键**：挂号/缴费/医嘱必须支持客户端 `requestId` 去重，防止重试导致重复扣费/重复挂号。
11. **敏感数据（患者姓名、身份证、手机号）日志中脱敏**：中间件统一打码，CI 扫描明文正则。
12. **配置与代码分离**：所有环境差异走 ConfigMap/Secret，禁止硬编码 IP/密码。
13. **数据库变更走 Flyway/Liquibase**：禁止手工 `ALTER TABLE`；大表 DDL 必须在低峰 + `pg_repack` 在线操作。
14. **降级开关必须可热切换**：Sentinel 规则、AI 降级开关、医保熔断开关，全部接入 Apollo/Nacos 配置中心，改配置不重启。
15. **每次发布必须有回滚预案**：PR 模板必填"回滚命令"字段；Helm revision 保留 10 个。

---

## 9. 关键风险摘要（给架构委员会）

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| 1 | **医保外呼接口是核心链路最大外部瓶颈**，P99 800-1500ms 不可控 | 挂号 3000 QPS 下医保网关线程池打满，整链路雪崩 | Sentinel 熔断 + 自费降级 + T+1 追溯退费 |
| 2 | **vLLM 200 并发过于乐观**，H20 单卡实际 60-80 路 | AI 问诊排队/超时，医生投诉 | 信号量排队 + 流式返回 + 规则引擎降级 |
| 3 | **3-5 人团队运维原生 K8s 能力不足** | 故障时无人能定位，RTO 失控 | 退 k3s + 全封装 Helm + 培训 3 个动作 |
| 4 | **PG 连接数风暴**（6 Pod × 20 = 120 直连，叠加 2000 工作站） | PG OOM，整库不可用 | PgBouncer transaction 模式 + HikariCP 池 ≤ 15 |
| 5 | **99.99% 双活不现实** | 架构过度设计，交付延期 | 主备同城 + RPO=0/RTO≤5min，季度演练 |

---

*文档结束。本评审所有参数基于 JDK 21 / Spring Boot 3.5 / PG 16 / Redis 7 / k3s 1.29 / vLLM 0.6 版本实测经验，上线前必须在压测环境用 `wrk2`（挂号）+ `locust`（工作站）+ `vllm bench`（AI）三路压测验证，P99 达标后再切流量。*
