# P5-22: seal 响应 `sourceChainValid:false` 定性

**日期**: 2026-11-06
**基线**: `9848f6f0`
**结论**: **设计行为，非缺陷**。`sourceChainValid:false` 是 E2E 播种的合成事件没有真实哈希链的正确反映。

---

## 1. 代码路径定位

### `sourceChainValid` 在哪计算
- `src/bff/aggregators/wormArchiveAggregator.ts:325`
  ```ts
  sourceChainHead, sourceChainValid: chain.valid,
  ```
- `chain` 来自 `verifyChainSync()`（同文件 :298）

### `verifyChainSync` 实现
- `src/bff/aggregators/auditEventAggregator.ts:162-178`
- 遍历内存 `events[]` 数组，对每条事件检查：
  1. `e.prevHash === prevHash`（链连续性）
  2. `computeHash(e.prevHash, canonical(base)) === e.hash`（哈希完整性）
- 任一不满足 → 返回 `{ valid: false, brokenAt: e.seq }`

---

## 2. 为什么 E2E 里是 false（根因）

E2E 播种事件在 `tests/integration/worm-e2e-setup.ts:49-55`：

```ts
INSERT INTO audit_e2e.events (..., prev_hash, hash)
VALUES (i, ..., 'prev-${i}', 'hash-${i}')
```

**播种的 3 条事件用的是假哈希**：
- `prev_hash = 'prev-1'` / `'prev-2'` / `'prev-3'`（不是 GENESIS 或真实哈希）
- `hash = 'hash-1'` / `'hash-2'` / `'hash-3'`（不是 `computeHash` 的输出）

BFF 启动时 `backfillPending(0)` 把这 3 条加载进内存 `events[]`。`verifyChainSync()` 遍历第一条时：
- 期望 `prevHash === GENESIS`（`'0'.repeat(64)`）
- 实际 `prevHash === 'prev-1'`
- → **返回 `{ valid: false, brokenAt: 1 }`**

这是**正确检测**：播种的合成事件本来就没有真实哈希链，`verifyChainSync` 如实报告"链断了"。

---

## 3. 定性：设计 vs 缺陷

| 维度 | 判断 |
|---|---|
| 是否代码 bug | **否**。`verifyChainSync` 逻辑正确，种子数据本来就是假的 |
| 是否后端问题 | **否**。`memory` vs `pg` 后端都一样——问题在种子数据，不在存储后端 |
| 是否"无法验链" | **否**。真事件（通过 `recordEvent` 写入的）有完整链，`sourceChainValid` 会是 `true` |
| 含义 | **`false` = "检测到链断裂"，不是"无法证明"**。这两种含义不同：前者是 fail-closed 安全行为，后者是能力缺失 |

### 关键区分
- **真实生产事件**（通过 HTTP API 写入，走 `recordEvent`）：`prevHash` 和 `hash` 由 `computeHash` 计算，链完整 → `sourceChainValid: true`
- **E2E 播种事件**（直接 SQL INSERT 假哈希）：链断裂 → `sourceChainValid: false`

**`false` 是 fail-closed 的正确输出**，不是缺陷。

---

## 4. 什么情况下 `sourceChainValid` 会是 false

1. **E2E 播种事件**（当前场景）：合成数据，假哈希
2. **DB 中存在手工 INSERT 的事件**（非 `recordEvent` 路径）：哈希不匹配
3. **历史数据迁移**：旧事件没有经过 `computeHash` 计算
4. **真实篡改**（攻击场景）：`prevHash` 或 `hash` 被改动

---

## 5. 证据

- 播种 SQL：`tests/integration/worm-e2e-setup.ts:51-54`（`prev-${i}`, `hash-${i}`）
- 验链实现：`src/bff/aggregators/auditEventAggregator.ts:162-178`
- seal 写入：`src/bff/aggregators/wormArchiveAggregator.ts:298, 325`

---

## 6. 建议（不改代码）

E2E 播种事件的假哈希导致 `sourceChainValid:false`，这是测试 fixture 的性质，不影响生产。如果希望 E2E 里 `sourceChainValid:true`，播种时应该用真实 `computeHash` 计算链（但这会增加测试复杂度，当前 false 反而验证了 fail-closed 路径）。

**不改任何代码、不动五项配置。**

---

## 附带：`audit.events` 生产上限策略建议（只写方案，不执行）

现库 2877 行，默认 `AUDIT_BACKFILL_LIMIT=1000` → 每次启动 `sealDisabled:true`。

### 三个方向

| 方向 | 做法 | 代价 | 风险 |
|---|---|---|---|
| **A. 调大 limit** | 默认值改 10000 或 50000 | backfill 全量加载进内存，启动慢 | 内存占用随事件数线性增长；大库 OOM |
| **B. 定期归档截断** | seal 后从 `events` 表删除已归档事件，保留 seal 段在 WORM 存储 | 需要写清理任务；审计查询要 join WORM 段 | 删除原始事件会影响实时查询性能；要保证归档前数据完整 |
| **C. 按时间段滚动** | 保留最近 N 天/月的事件，旧的归档到冷存储 | 需要冷热分离存储 | 架构复杂度高；查询跨冷热层 |

**推荐 B**：seal 成功后事件已加密进 WORM 段，`events` 表只保留未 seal 的 pending。这是 WORM 架构的本意——原始事件是临时的，seal 段是持久的。

**不执行清理、不改默认值。等用户拍板。**
