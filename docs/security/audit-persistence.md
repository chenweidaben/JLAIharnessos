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
