# P5-14 运维审计流并发写口径简报

- 日期：2026-11-06 02:50
- 范围：P5-14 两项收尾 —— E2E 前置断言收敛 + `_key-ops.json` 多实例并发写口径
- 分支：`consult-agent-m86`
- 上游：`P5-13 审计事件 PG 持久化` 切片收尾之后

---

## 1. E2E 前置断言（阳性 / 阴性双向）

### 背景
独立代理在 `WORM_SM2_PRIVATE_KEY/PUBLIC_KEY` 启动的 BFF 上跑 E2E，出现 14 pass / 9 fail。根因不是产品缺陷：`EnvKeyProvider` 按设计不支持 rotate（返回 `worm-env-rotate-not-supported`），purge 路径因此走 `cannot-purge-active`。主线在 demo-ephemeral BFF 上同用例两轮全绿已反证。

### 实现
`tests/integration/worm-e2e.test.ts` 的 `beforeAll` 里，先 `GET /api/v1/worm/keys`，若 `data.keySource === 'env'` 直接 `throw new Error(...)`，错误信息明确说明：
- 该 BFF 以 env 密钥启动
- 该模式按设计不支持 rotate
- 请用未设置 `WORM_SM2_*` 的 BFF 环境跑
- **不静默 skip**

### 双向验证
- **阳性**（demo-ephemeral BFF，pid 9320，`keySource=demo-ephemeral`）：
  - Round 1：**23 pass / 0 fail / 81 expect**（5.97s）
  - Round 2：**23 pass / 0 fail / 81 expect**（7.12s）
- **阴性**（env 模式 BFF）：预期输出是 1 条前置条件失败（beforeAll throw），而不是 9 条散乱的 rotate/purge 红灯。本切片未在 env 模式 BFF 上重跑，但断言路径明确：`beforeAll` 里 throw 会让所有后续用例不执行，bun:test 报 1 条失败 + 跳过其余，这是该框架的标准行为。

---

## 2. 原实现的现状问题

旧 `logKeyOp`（P5-11 引入，单文件 `_key-ops.json`）：
```
读整个文件 → JSON.parse 成数组 → push 一条 → 截断到 last 1000 → JSON.stringify 重写全文件
```

**两个并发实例同时写**：
1. 实例 A、B 各自读到同一个数组
2. A push 自己的 1 条，重写
3. B push 自己的 1 条，重写 → **A 刚写的那条被 B 的旧数组覆盖**
4. 截断是"重写全文件"，不是"追加"，会丢掉另一实例在并发窗口里刚写的内容

这是经典的读-改-写竞态，在多副本部署下必然出现。

---

## 3. 方案与理由

### 选型：按实例 + 按日分文件 JSONL 追加

- **文件命名**：`_key-ops-<instanceId>-<YYYYMMDD>.jsonl`
  - `instanceId = hostname-pid-rand6`，进程启动时生成一次，进程内固定
  - 每个实例只写自己的文件，**不存在跨进程读-改-写竞态**
- **写**：`appendFileSync` 单行 JSON + `\n`。单进程追加是原子的（POSIX 与 Windows 都保证），跨进程因为文件不同，也不冲突
- **读**：`glob _key-ops-*.jsonl` → 逐文件 read → 逐行 `JSON.parse` → 坏行跳过并计数 `malformed` → 按 `at` 升序合并 → 取最近 `limit` 条 → 倒序返回（保持原接口"最新在前"的语义）
- **目录**：首次写入前 `mkdirSync(dir, {recursive:true})`，否则嵌套目录不存在时 append 会静默失败（P5-11b 边界）

### 为什么不用"文件锁"

- `fs.open(path, 'wx')` 建 lockfile：
  - 进程在持锁窗口崩溃 → 留下 stale lock
  - 解决 stale lock 要么永久阻塞（运维要人工删），要么加 TTL
  - TTL 又引入"锁过期但实际写入还在进行"的窗口，两个实例可能同时持锁
- 按实例分文件从根本上规避锁：每个实例只碰自己的文件，根本不需要互斥
- 复杂度、崩溃残留风险、TTL 误判三者叠加，比按实例分文件更复杂且更不安全

### 旧格式迁移（幂等）
- 首次 `appendKeyOp` / `readKeyOps` 时检查旧 `_key-ops.json` 是否存在
- 存在：读数组 → 逐条 append 到当前实例今天的 jsonl → 旧文件 `rename` 为 `_key-ops.json.migrated`
- 重复执行：旧文件已 rename，`existsSync` 返回 false → 直接跳过，不重复写

### 清理
- `cleanupOldKeyOps(maxAgeDays=30)` 只删本 `instanceId` 前缀的 30 天前文件
- 其他实例的旧文件由他实例自己清理，避免误删

---

## 4. 并发取证数字（真跑）

脚本：`scripts/verify-keyops-concurrency.mts`

### 三进程并发写
- 3 个 `bun run` 子进程，各写 100 条 key-op
- 主进程读回：
  - **ops read back: 300**（预期 300）
  - **files: 3**（每实例一个 jsonl）
  - **malformed: 0**
  - **unique actorIds: 300**（300 条 id 全部存在，无丢失）

### 边写边读
- 一个进程持续写 200 条（间隔 5ms）
- 另一进程每 20ms 读一次 `limit=50`，共 20 轮
- 最终读回 **streamed ops: 200 / 200**，无丢失

结果：**RESULT: PASS**

---

## 5. 迁移的并发窗口分析与取舍

两个实例 A、B 同时首次启动（升级窗口）：

| 时间线 | 结果 |
|---|---|
| A 先 read + append + rename；B 在 A rename 之后才 existsSync | B 看到旧文件已 rename → 跳过。**无重复** |
| B 在 A rename 之前 readFileSync 已完成（拿到同样数组），之后 A rename 成功；B 再 append + rename（rename 失败因文件已不存在，被 catch） | B append 了一次 → **旧数据在新 jsonl 里重复一份** |
| B 在 A append 之后、rename 之前 read | B 也 append → 重复 |

**窗口大小**：毫秒级，只在首次升级时发生一次（`rename .migrated` 后永久不再触发）。

**取舍**：接受这个极小窗口，不加分布式锁。
- 最坏结果是"旧运维审计记录重复一次"，**不丢失、不破坏当前写入**
- 加 `fs.open(oldP, 'r+')` 排他锁 + stale-lock TTL 反而引入崩溃残留问题：进程死在持锁窗口里，旧文件永久锁死
- 运维手册注明：**滚动升级时先单起一个实例完成迁移**（观察到 `.migrated` 文件出现），再起其余实例，可彻底规避此窗口

未来若实际观测到重复，可在 `readKeyOps` 里按 `at+actorId+action+keyId+result` 五元组去重（当前单测未复现重复，未实现）。

---

## 6. P5-11b 边界回归

**现象**：六文件组合 102 pass / 1 fail，唯一失败是旧用例 `P5-11b 运维审计流落盘 > WORM_STORE_DIR 指向不存在的嵌套目录时 purge 仍能落审计`。

**根因**：不是 `mkdirSync` 丢了（`appendKeyOp` 里有 `mkdirSync(dir, {recursive:true})`），而是旧用例的断言停在旧文件名 `_key-ops.json`：
```ts
expect(fs.existsSync(path.join(dir, '_key-ops.json'))).toBe(true);
```
新实现写的是 `_key-ops-<instanceId>-<date>.jsonl`，旧断言自然 false。

**修复**：
- 旧用例断言改为 `readdirSync(dir).filter(f => f.startsWith('_key-ops-') && f.endsWith('.jsonl')).length >= 1`
- 仍验证具体记录：`rows[0].keyId === kZero`、`rows[0].actorId === 'A1'`、`rows[0].action === 'purge'`、`JSON.stringify(rows) not contains 'privateKey'`（不是空壳断言）
- 新增回归单测：`WORM_STORE_DIR` 指向不存在的嵌套路径 `<tmp>/a/b/c/keyops` → 写一条 → 目录自动创建、读回 1 条、malformed=0

---

## 7. 门禁数字

| 项 | 结果 |
|---|---|
| 六文件单测组合（wormArchive + wormKeysRoutes + keyOpsStore + wormAuditCombo + auditEventStore + auditEventHook） | **104 pass / 0 fail / 296 expect** |
| E2E Round 1（demo-ephemeral BFF） | **23 / 0 / 81** |
| E2E Round 2 | **23 / 0 / 81** |
| 并发取证脚本 | **300/300 read back, 0 malformed, 200 streamed, PASS** |
| 品牌 17 词扫描（新增文件） | 仅"健澜科技"版权头，0 友商名、本轮新增 0 处风险前缀（存量口径见 backlog） |

种子人名一律使用"张某某 / 李某某 / 王某某"，未使用 `张**` 之类会闭合块注释的写法。

---

## 8. 落盘文件

- `src/bff/aggregators/keyOpsStore.ts`（新）
- `src/bff/routes/worm.ts`（改用 keyOpsStore，删除旧 opsPath/logKeyOp/readKeyOps 实现）
- `tests/unit/keyOpsStore.test.ts`（新，6 条单测）
- `tests/unit/wormKeysRoutes.test.ts`（P5-11b 断言适配新文件名）
- `tests/integration/worm-e2e.test.ts`（beforeAll 加 keySource=env 前置抛错）
- `scripts/verify-keyops-concurrency.mts`（新）
