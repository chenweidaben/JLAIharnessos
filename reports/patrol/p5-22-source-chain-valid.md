# P5-22: seal 响应 `sourceChainValid:false` 定性

**日期**: 2026-11-06
**基线**: `9848f6f0`
**结论**: **夹具缺陷，非产品缺陷**。E2E 播种用假哈希导致 `sourceChainValid:false`，但 E2E 测试从未断言这个字段，所以是"静默存在的副作用"，不是"故意测断裂检测"。

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

## 3. E2E 用例断言分析（关键）

### seal 用例（`worm-e2e.test.ts:175-186`）
```ts
it('generate 1 event + seal → 段含 SM3/SM4/SM2 字段', async () => {
  await call('POST','/api/v1/engagement/reports', {...});  // 生成 1 条真实事件
  const r = await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
  expect(r.httpStatus).toBe(201);
  expect(r.data.digestAlg).toBe('SM3');
  expect(r.data.digestSm3).toMatch(/^[0-9a-f]{64}$/);
  expect(r.data.sm4Encrypted).toBe(true);
  expect(r.data.sm2Signature?.length).toBeGreaterThan(0);
});
```

**断言了什么**：`digestAlg`、`digestSm3`、`sm4Encrypted`、`sm2Signature`
**没断言**：`sourceChainValid`、`sourceChainHead`、`prevSegmentHash`

### 判定：三种情况中的哪一种
| 情况 | 是否成立 |
|---|---|
| 断言了 `false`（故意测断裂） | **否**。用例名是"seal 正常流程"，没有 `sourceChainValid` 断言 |
| 没断言这个字段（漏网） | **是**。`sourceChainValid:false` 是静默副作用 |
| 断言了 `true`（测试应该红） | **否**。没断言所以不红 |

### 定性修正
这不是"故意设计的断裂检测测试"，而是**夹具不完整**：
- 播种 3 条事件是为了 P5-6 search 有数据（`worm-e2e-setup.ts:46-47` 注释明确写了）
- 播种时用了假哈希（`prev-${i}`, `hash-${i}`），没有走真实 `computeHash` 链
- seal 时 `verifyChainSync` 如实报告链断裂，但测试不检查这个字段

**产品代码正确，夹具不完美。**

---

## 4. 产品侧真实哈希链算法

- `GENESIS = 'GENESIS'`（`auditEventAggregator.ts:47`）
- `computeHash(prevHash, canonical(base))`（`:65`）
- 第一条真实事件：`prevHash = GENESIS`，`hash = computeHash('GENESIS', canonical(base1))`
- 第二条：`prevHash = hash1`，`hash = computeHash(hash1, canonical(base2))`
- `verifyChainSync` 从 `GENESIS` 起逐条重算，任一不匹配 → false

播种的假哈希与这个算法完全不符，所以从第一条就断了。

---

## 5. 什么情况下 `sourceChainValid` 会是 true

1. **空 pending 池**（seal no-events 不会产段）
2. **所有事件都通过 `recordEvent` API 写入**（链完整）
3. **backfill 的事件来自真实生产库**（链完整）

E2E 要让它变 true，播种时应该用真实 `computeHash` 计算链（但这会让夹具变复杂，当前 false 不影响其他断言）。

---

## 6. 证据

- 播种 SQL：`tests/integration/worm-e2e-setup.ts:51-54`（`prev-${i}`, `hash-${i}`）
- 验链实现：`src/bff/aggregators/auditEventAggregator.ts:162-178`
- seal 写入：`src/bff/aggregators/wormArchiveAggregator.ts:298, 325`
- seal 用例：`tests/integration/worm-e2e.test.ts:175-186`（未断言 `sourceChainValid`）

---

## 7. 建议（不改代码）

E2E 播种事件的假哈希导致 `sourceChainValid:false`，这是测试夹具的性质，不影响生产。如果希望 E2E 里 `sourceChainValid:true`，播种时应该用真实 `computeHash` 计算链（但这会增加测试复杂度）。**当前 false 不影响任何断言**，不改。

---

## 8. 附带：`audit.events` 生产上限策略建议（只写方案，不执行）

现库 2877 行，默认 `AUDIT_BACKFILL_LIMIT=1000` → 每次启动 `sealDisabled:true`。

### 三个方向

| 方向 | 做法 | 代价 | 风险 |
|---|---|---|---|
| **A. 调大 limit** | 默认值改 10000 或 50000 | backfill 全量加载进内存，启动慢 | 内存占用随事件数线性增长；大库 OOM |
| **B. 定期归档截断** | seal 后从 `events` 表删除已归档事件，保留 seal 段在 WORM 存储 | 需要写清理任务；审计查询要 join WORM 段 | **删除审计日志是高危操作**（见下） |
| **C. 按时间段滚动** | 保留最近 N 天/月的事件，旧的归档到冷存储 | 需要冷热分离存储 | 架构复杂度高；查询跨冷热层 |

### 方案 B 的风险（必须写清）

1. **删除前如何确认"已归档且可恢复"**：WORM 段里存的是 SM4 加密的事件 JSON，`events` 表存的是明文。删除前要逐条确认 `fromSeq..toSeq` 范围的事件已在对应 WORM 段里能解密出来
2. **删除原子性**：删一半崩了怎么办？应该在一个事务里：先 seal → 确认段可验证 → DELETE FROM events WHERE seq BETWEEN ... → COMMIT。任一失败回滚
3. **合规风险**：审计日志有法规保留期限要求（医疗行业通常 15 年），删除明文事件后 WORM 段必须能满足同等保留要求
4. **默认不开启**：要显式 env（如 `AUDIT_EVENTS_PRUNE=1`）才能启用，且首次运行只 dry-run 打印将删多少行

**推荐 B 但要上述保护措施。不执行清理、不改默认值。等用户拍板。**
