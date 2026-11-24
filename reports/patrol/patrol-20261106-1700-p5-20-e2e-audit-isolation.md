# P5-20 E2E AUDIT_DB_SCHEMA 隔离落地简报

**日期**：2026-11-06
**分支**：`consult-agent-m86`
**HEAD**：`4cb895c6`
**基线**：`22ea5576`

---

## 一、成果

### E2E 隔离闭环
- `audit.events` 跑前跑后 **1807 行不变**（隔离生效，不再因 dev 数据累积触发 `AUDIT_BACKFILL_LIMIT` fail-closed）
- E2E 自管 BFF：spawn 在 8081，独立 `audit_e2e` schema，afterAll DROP + kill
- memory 后端 **10/10 全绿**（23 pass / 0 fail / 81 expect）

### 提交链
| commit | 内容 |
|---|---|
| `d1cb4b8a` | PgAuditStore 支持 `AUDIT_DB_SCHEMA`（默认 audit，白名单校验） |
| `ea3baf7d` | E2E 自管 BFF + audit_e2e schema 隔离 |
| `b580f374` | E2E fs 后端 + 种子事件（后回 memory） |
| `858e3b29` | decryptEvents 不静默吞异常，加 warn 日志 |
| `622e9039` | lock key 参数化 `hashtext('audit_events_seq_' + schema)` |
| `82e46da7` | tsc 类型错误修复 |
| **`4cb895c6`** | **search indexCache 失效条件改为段签名，memory search 修复** |

---

## 二、三个真发现（本批核心价值）

### (1) search indexCache 用段数判失效 → memory 后端 100% 失败
**现象**：P5-6 跨段检索 10/10 失败，段存在（segmentCount=2）但 search total=0。

**调查链**：
1. 怀疑 flaky → 10/10 复现，排除偶发
2. 怀疑隔离导致 pending 空 → 播种 3 条 audit 事件，仍 0
3. 怀疑 memory decrypt 缺陷 → dump 段详情：eventCount=2、cipherBytes=1760、decrypt 无异常
4. 怀疑 store 实例分裂 → 探针证明 `getWormStore()` 是单例
5. **真相**：`wormAuto.search` 的缓存失效条件是 `index.length !== store.count()`（段数对比）。段数不变但内容变化时（空段补齐、hash 更新），缓存不重建，永远用第一次建的空索引

**修法**：改为按 `segmentId:segmentHash:toSeq` 签名比对。`segmentHash` 每次 seal 都变，能感知内容变化。

**注入自证**：
- 改回旧逻辑：22 pass / 1 fail（P5-6 复现）
- 改回签名比对：23 pass / 0 fail

### (2) E2E 隐性依赖环境状态
**现象**：隔离前 E2E 在共享 8080 BFF 上能过，是因为那个 BFF 长时间运行、pending 队列有历史累积。

**真相**：P5-6 用例隐含依赖"BFF 启动时从 audit store backfill 出事件"。隔离后新 spawn 的 BFF 面对空 `audit_e2e`，backfill 0 条，seal 出空段。

**修法**：beforeAll 直连 PG 播种 3 条 audit 事件，使测试 setup 自足。

### (3) 静默 catch 让调查走四轮弯路
**现象**：`decryptEvents` 的 `try/catch` 吞异常返 null，导致"memory decrypt 失败"这个错误结论维持四轮。

**修法**：catch 块加 warn 日志（segmentId、cipherLen、ivLen、err.message）。加上后一次就看清 decrypt 从未失败——问题在缓存失效条件，不在解密。

**共同病根**：判据选错了信号（段数、catch 静默），于是永远命中"没问题"分支。与 P5-19 的 `lint-diff` maxBuffer 截断假绿同属一类。

---

## 三、P0 单列（本批未修）

### `380-consult-threads.sql` 的 `current_role` 是保留关键字
- **文件**：`deploy/postgres/init/380-consult-threads.sql`
- **问题**：`current_role text CHECK (...)` 列名未加双引号，PostgreSQL 保留关键字
- **引入 commit**：`42c98a3d`（M86 在线咨询智能体全链路）
- **影响**：`DEMO_MODE=0` 时 migration 失败、BFF 直接退出。**生产部署会同样失败**
- **修法**：列名改为 `"current_role"` 或换名（如 `current_user_role`）

---

## 四、技术要点

### AUDIT_DB_SCHEMA 隔离
- 写路径：`PgAuditStore` 构造函数读 `AUDIT_DB_SCHEMA ?? 'audit'`，白名单 `^[a-z_][a-z0-9_]+$`
- 所有 SQL 全限定 `"${schema}"."events"`，不依赖 `search_path`
- 读路径（query/backfill/countAfter）同源同参数化
- lock key 参数化：`hashtext('audit_events_seq_' + schema)`，两 schema 不互斥
- 默认行为不变（不设 env 时写 `audit.events`）

### E2E 自管 BFF
- 端口 8081（不碰主 BFF 8080）
- env：`PORT=8081 HTTP_PORT=8081 DEMO_MODE=1 AUDIT_STORE=pg AUDIT_DB_SCHEMA=audit_e2e WORM_BACKEND=memory`
- beforeAll：DROP+CREATE schema、执行 DDL、播种 3 条事件、spawn BFF、轮询 /health
- afterAll：taskkill 进程树、DROP schema
- DROP 白名单硬编码只允许 `audit_e2e`，传 `audit` 直接 throw

### 环境陷阱
- `.env` 文件有 `HTTP_PORT=8080`，bun 启动时加载，会覆盖 `PORT`。E2E 必须同时设 `PORT` 和 `HTTP_PORT`
- `DEMO_MODE=1` 跳过 `auditOperation`（操作日志）但不跳 `auditEventHook`（after-hook → PgAuditStore）。P5-13 的"DEMO_MODE 不参与"指 store 选择（memory/pg），不是"是否写"

---

## 五、自证实测

| 项 | 结果 |
|---|---|
| E2E memory 10 轮 | 23/0/81 ×10 |
| `audit.events` 跑前 | 1807 |
| `audit.events` 跑后 | **1807（不变）** |
| `audit_e2e` afterAll 存在性 | 0（已 DROP） |
| tsc exit | 0 |
| VendorAdapters 单跑 | 7 pass / 0 fail |
| brand-scan | paths=src,web/src files=9816 words=30 hits=0 hard=0 backlogGangos=13 |
| 注入自证（旧逻辑） | 22/1（P5-6 复现） |
| 注入自证（新逻辑） | 23/0 |

---

## 六、待办（后续批次）

1. P0：`380-consult-threads.sql` 的 `current_role` 保留关键字
2. 单测集合改为按文件显式列举（纳入 `tests/unit/integration/VendorAdapters.test.ts`）
3. `docs/security/audit-persistence.md` 加 lock key 参数化升级说明
4. 四项待用户拍板：`layered.put` A/B/C、`/ready` 非生产 degraded、`WORM_BACKEND` 默认值、admin 明文口令取舍

---

*不 push、不打 tag。*
