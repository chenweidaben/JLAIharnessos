# P5-7 调度可观测性 + 大段检索性能优化 简报（最终态）

- 时间：2026-11-05 11:22（最后一次更新 18:00）
- 分支：consult-agent-m86
- 基线 HEAD：0c55705b
- 最终 HEAD：见 `git log`（本简报不写死自身 SHA）

## 改动文件
- `src/bff/aggregators/wormAuto.ts`：tick 落历史、LRU 解密缓存、索引内存缓存、search 加 candidateSegments/decryptedSegments
- `src/bff/aggregators/auditEventAggregator.ts`：AuditEvent 增加 `excludeFromArchive?: boolean` 可选字段（不参与哈希）
- `src/bff/aggregators/wormArchiveAggregator.ts`：seal() pending 过滤和 queryAuditEventsCount() 过滤掉 `excludeFromArchive`；hydrateCountersFromStore 类型窄化修复
- `src/bff/store/fileWormStore.ts`：构造时扫盘建立内存索引（`segments[]` + `byId Map`）、put 自动 append、count/list O(1)、新增 `refresh()`
- `src/bff/routes/worm.ts`：新增 `GET /api/v1/worm/auto/history`
- `src/bff/middleware/globalRateLimit.ts`：localhost 免流三门控
- `tests/unit/wormArchive.test.ts`：P5-7 + 内存索引 + refresh() 语义用例
- `tests/unit/globalRateLimit.test.ts`：localhost 免流门控 4 用例
- `tests/integration/worm-e2e.test.ts`：call() 加 429 Retry-After 内部重试

## 新增路由
- `GET /api/v1/worm/auto/history?limit=&offset=`（admin）→ `{rows, total}`，倒序

## 实现要点

### tick 落审计（防自激）
- tick 每次执行追加 `<dir>/_history.json`（环形 1000 条）
- 字段：`{at, sealed, reason, pendingBefore, segmentsBefore, segmentsAfter, intervalDue, thresholdDue, durationMs}`
- 双保险防自激：①tick 历史独立 JSON 不进 audit events 链；②seal() 过滤 `excludeFromArchive` 标记事件，queryAuditEventsCount() 同步过滤

### 大段检索性能
- **索引粗筛**：先用 `_index.json` 的 actorIds/patientIds/actions/modules/fromTs/toTs 做段级预筛，只解密命中段
- **LRU 解密缓存**：解密后的段事件按 segmentId 缓存（容量 32），重复检索不重复解密
- **索引内存缓存**：loadIndex() 内存缓存，避免每次 search 读 `_index.json` 盘
- **FileWormStore 内存索引**：构造时扫盘一次，put 自动 append，count/list 直接读内存；`refresh()` 重新扫盘（语义：同实例不自动感知外部写入，需显式调用）
- 返回体：`candidateSegments`（粗筛候选）、`decryptedSegments`（实际解密）、`scannedSegments`（段总数，兼容旧断言）

### 分页校验加固
- `limit=NaN/负数/0` → 回退默认 50；`limit>500` → 钳位 500
- `offset=NaN/负数` → 回退 0；`offset` 超出 total → `rows=[]` 且 `total` 仍正确

### localhost 免流三门控（生产反代漏洞修复）
- 原实现：127.0.0.1/::ffff:127.0.0.1 无条件免流
- 风险：BFF 部署在 Nginx/反代后时，所有外部请求源 IP 被归一成 127.0.0.1，免流等于对全网取消限流
- 现实现：`isLocal && (NODE_ENV=development || DEMO_MODE=1) && TRUST_PROXY!=1` 同时满足才免流

## 性能实测

### 真加密段（50 段 × 20 事件 = 1000 事件，3 段含 TARGET-ACTOR，走真实 seal() SM4-CBC + SM2）
| 场景 | 前置 | 中位数 ms |
|---|---|---|
| A 全扫首次 | 空 LRU、空索引缓存 | **113.47** |
| C 粗筛首次 | 空 LRU、空索引缓存 | **0.36** |
| D 粗筛重复 | LRU 已暖 | **0.05** |

- 解密成功率：50/50 = 100%（真 SM4-CBC 密文，非假 hex）
- 粗筛 vs 全扫降幅：**99.7%**（同时减少读盘与解密段数）
- **LRU D/C = 0.05/0.36 = 13.9% PASS <50%** ✓

### 合成段（200 段 × 50 事件，cipherBytes 为伪造 JSON）
- A=1.23ms / C=0.25ms / D=0.04ms
- **段体非真密文，getSegmentEvents 返回 null，measure 的仅为读盘开销，不能用于解密性能结论**

## 门禁三元组（最终态）
| 项 | 结果 | 日志 |
|---|---|---|
| 根 tsc | exit 0 / 0B | `logs/tsc-p5-7-final-root2.log` |
| web tsc | 0B | `logs/tsc-p5-7-final-web2.log` |
| wormArchive R1 | 45 / 0 / 156 | `logs/unit-final-worm-r1.log` |
| wormArchive R2 | 45 / 0 / 156 | `logs/unit-final-worm-r2.log` |
| globalRateLimit R1 | 17 / 0 / 148 | `logs/unit-final-rl-r1.log` |
| globalRateLimit R2 | 17 / 0 / 148 | `logs/unit-final-rl-r2.log` |
| E2E R1 | 21 / 0 / 61（554ms） | `logs/e2e-final-r1.log` |
| E2E R2 | 21 / 0 / 61（2.21s） | `logs/e2e-final-r2b.log` |
| P4 审计回归 | 37 / 0 / 82 | `logs/p4-reg-c.log` |
| 品牌 17 词 | 0 命中 | — |

## 修复历程
1. `85eb9ded` 初版：tick 历史 + LRU + 索引粗筛 + history 路由
2. `6eb41c5a` 自证复核：单测隔离、E2E 强断言、R2 sleep 65s
3. `1a75e961` P5-7b：FileWormStore 内存索引 + refresh()，LRU 从 FAIL 到达标
4. `e6207a62` P5-7c：真加密段实测 113.47/0.36/0.05ms、E2E call() 429 内部重试、localhost 免流
5. `9b0ed348` 安全修复：localhost 免流加三门控（防生产反代漏洞）
6. `001062ca` tsc 类型窄化修复：hydrateCountersFromStore cast `{refresh?:()=>void}` 把 list() 窄掉
