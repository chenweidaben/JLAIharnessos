# 审计事件持久化（P5-13）

## 表结构

DDL 见 `deploy/postgres/init/120-audit-events.sql`：

- schema `audit`，表 `events`
- `seq bigint PRIMARY KEY`（连续序号，不用 bigserial）
- `event_id uuid UNIQUE NOT NULL`
- `occurred_at timestamptz NOT NULL`
- `actor_id` / `actor_role` / `action` / `module` / `resource_type` / `resource_id` / `patient_id`
- `result` / `error_code` / `ip` / `user_agent`
- `prev_hash` / `hash`（SM3 链）
- `payload jsonb`（可选扩展）
- 索引：`(occurred_at)`、`(tenant_id, occurred_at)`

## seq 严格连续的保证

不用 `bigserial`（并发/回滚会跳号）。每条 INSERT 在单语句隐式事务内执行：

```sql
SELECT pg_advisory_xact_lock(hashtext('audit_events_seq'));
INSERT INTO audit.events (seq, ...)
SELECT COALESCE(MAX(seq),0)+1, ... FROM audit.events;
```

- 锁内只做 MAX+1 + INSERT，立刻 COMMIT
- 不在锁内做 SM3、不查别的表、不写文件
- 回滚不影响：事务回滚时 advisory lock 自动释放，MAX(seq) 也回滚，下一条重新分配

## 落库失败策略

**不阻断业务**。理由：hook 在 finally 里执行时业务已完成，500 会让调用方重试导致重复执行医疗操作（重复发药、重复扣费）。

流程：
1. DB 写成功 → `{ok:true, persisted:true}`，事件进内存 pending 池
2. DB 失败 → 立刻 `appendFileSync` 到 `logs/audit-fallback-<date>.jsonl`（`AUDIT_FALLBACK_DIR` 可覆盖）
   - 兜底成功 → `{ok:true, persisted:false, fallbackPath}`，**不进 pending 池**（它没入库，seal 不能拿它当源），打 `console.error` + 计数器 `jlmedaios_audit_persist_failed_total` +1
   - 兜底也失败 → `{ok:false}`，打 `console.error`（最坏情况，至少留痕）
3. hook 内部吞掉失败结果，只 log + metric，业务响应状态码不变
4. `_seed` 路由（显式测试入口）遇 `ok:false` → 返 500 + 明确错误码

fallback JSONL 的 replay 本切片不做，留 TODO（replay 会重新分配 seq，导致"seq 顺序 ≠ 事件时间顺序"，需单独设计）。

## 存储后端选型

| 条件 | 后端 |
|---|---|
| `NODE_ENV=test` | Memory |
| `AUDIT_STORE=memory` | Memory（唯一合法手动降级入口） |
| `NODE_ENV=production` | 必须 Pg，连不上启动失败 |
| 其他（含 `DEMO_MODE=1`） | 有 `DATABASE_URL` → Pg；否则 Memory + 启动警告 |

`DEMO_MODE` **不参与审计后端判定**——审计不是演示数据，不该被 DEMO_MODE 关掉。

启动时显式初始化并打日志：`[audit] store=pg` 或 `[audit] store=memory`。

## 启动回填

- BFF 启动时 `SELECT * FROM audit.events WHERE seq > $lastArchivedSeq ORDER BY seq ASC LIMIT 1000` 灌回内存 pending
- 回填失败不阻塞启动，打 `[audit] backfill failed: ...` error 日志
- 回填成功打 `[audit] backfilled N events (seq A..B)`

## 查询语义

- `GET /api/v1/audit/events` 只走 store（DB 分页 + count），不做"内存 + DB 合并去重"
- 内存 pending 的唯一职责是 `seal()` 时取未归档事件
- 深分页走 DB `LIMIT/OFFSET`
- total 用 `count(*)`

## verifyChain

- 路由 `/audit/events/verify-chain` 用异步流式版本：按 500 条一批从 store 读，逐批重算 SM3 链
- seal 路径用同步版本（`verifyChainSync`）：基于内存 pending 池，不查 DB

## 迁移步骤

1. 跑 `deploy/postgres/init/120-audit-events.sql`（幂等，`IF NOT EXISTS`）
2. 重启 BFF，启动日志应见 `[audit] store=pg` 与 `[audit] backfilled N events`
3. 旧内存事件无法迁移（重启即丢），从新启动起开始持久化

## 容量估算

假设：
- 单院日均审计事件 N = 5000 条（HIS/EMR/CDS/药房/登录操作合计）
- 单条事件平均 500 字节（含 jsonb payload）
- 6 个月 = 180 天

- 6 个月行数：5000 × 180 = 900,000 行
- 6 个月体积：900,000 × 500B ≈ 450 MB（含索引约 600 MB）

单台 100GB 盘足够支撑 10 年量级。超出 N 时按线性外推。

---

## E2E 数据隔离方案（P5-17 新增，待拍板）

> 现状：E2E 跑在 `AUDIT_STORE=memory`，不连 PG。但 `WORM_BACKEND=fs` 时会写本地段文件，多轮跑会污染 keyring（purge 后旧公钥出环 → verify 假红）。下面是切到 PG 持久化后的隔离方案。

### 方案：`AUDIT_DB_SCHEMA` 参数化，E2E 用独立 schema `audit_e2e`

#### 改动点（`PgAuditStore`）
1. 构造函数读 `process.env.AUDIT_DB_SCHEMA ?? 'audit'`，存为 `this.schema`
2. 所有 SQL 从硬编码 `audit.events` 改成 `${this.schema}.events`（用 `pg` 的标识符安全拼接，不许字符串模板拼用户输入；这里 schema 来自 env，可信）
3. `CREATE TABLE IF NOT EXISTS` DDL 也走参数化 schema
4. `deploy/postgres/init/120-audit-events.sql` 保持不动（默认 schema `audit` 给生产用）

#### E2E `beforeAll` / `afterAll`
```ts
// beforeAll
await sql`CREATE SCHEMA IF NOT EXISTS audit_e2e`;
await sql`SET search_path TO audit_e2e`;
// 建表（复用 120-audit-events.sql 的 DDL，替换 schema）
// 起 BFF 时注入 AUDIT_DB_SCHEMA=audit_e2e
// afterAll
await sql`DROP SCHEMA IF EXISTS audit_e2e CASCADE`;
```

#### 风险与注意
- **`search_path` 影响其他连接**：pg 连接池里改 `search_path` 只影响当前连接。E2E 用独立连接池，不与生产 BFF 共享同一 pool。生产 BFF 用默认 schema `audit`，互不影响。
- **DDL 参数化**：`120-audit-events.sql` 里 `CREATE TABLE audit.events` 不能直接复用（schema 硬编码）。需要复制一份 `120-audit-events.e2e.sql`，或在 `PgAuditStore.init()` 里用模板字符串在运行时拼 DDL。
- **advisory lock**：`pg_advisory_xact_lock(hashtext('audit_events_seq'))` 在两个 schema 间不会冲突（同一个 PG 实例内 advisory lock 是全局的）。E2E 与生产 BFF 同时跑时，seq 锁会竞争——但 E2E 是测试环境，不与生产共库，可接受。
- **WORM 段目录隔离**：`WORM_STORE_DIR` 给 E2E 单独指一个 `logs/worm-store-e2e/`，afterAll 清空。

#### 工程量估计
- `PgAuditStore` 参数化：~30 行改动，5 个 SQL 模板收窄到一个 helper
- E2E `beforeAll/afterAll`：~20 行
- 单测：2 个（默认 schema / e2e schema 各一）
- 总计：半天内

### E2E 隔离必要性（P5-19 已复现证据）

2026-11-06 实测 dev 环境：
- `SELECT count(*) FROM audit.events` = **1084 行**（max_seq=1084）
- 默认 `AUDIT_BACKFILL_LIMIT=1000` → 超 84 行 → `/ready` 返回 `sealDisabled=true reason=audit-backfill-truncated`
- E2E seal 端点返 503，23 个用例中 11 个失败
- 临时设 `AUDIT_BACKFILL_LIMIT=2000` 后 E2E 通过（23/0/81 ×2），但这是抬高 fail-closed 门槛，**不是修复**

结论：E2E 当前依赖 dev 环境 `audit.events` 不超 1000 行，**不可复现**。必须落地 `AUDIT_DB_SCHEMA` 隔离方案，让 E2E 用独立 schema、每次 beforeAll 建表 afterAll DROP，不与 dev 数据混。

#### 不做的替代方案
- **独立 PG database**：隔离更彻底，但需要 CI 起两个 PG 实例，本地开发成本高
- **mock PgAuditStore**：E2E 仍然 memory，不切 PG——等于没测到真实持久化路径
- **E2E 自建 BFF 进程**：解决 keyring 污染，但不解决 PG 数据污染；两个方案互补，不替代

