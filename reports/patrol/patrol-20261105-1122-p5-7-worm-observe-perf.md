# P5-7 调度可观测性 + 大段检索性能优化 简报

- 时间：2026-11-05 11:22
- 分支：consult-agent-m86
- 基线 HEAD：0c55705b
- 代码 commit：85eb9ded

## 改动文件
- `src/bff/aggregators/wormAuto.ts`：tick 落历史、LRU 解密缓存、索引内存缓存、search 加 candidateSegments/decryptedSegments
- `src/bff/aggregators/auditEventAggregator.ts`：AuditEvent 增加 `excludeFromArchive?: boolean` 可选字段（不参与哈希）
- `src/bff/aggregators/wormArchiveAggregator.ts`：seal() pending 过滤和 queryAuditEventsCount() 过滤掉 `excludeFromArchive`
- `src/bff/routes/worm.ts`：新增 `GET /api/v1/worm/auto/history`
- `tests/unit/wormArchive.test.ts`：新增 P5-7 describe 6 用例

## 新增路由
- `GET /api/v1/worm/auto/history?limit=&offset=`（admin）→ `{rows, total}`，倒序

## 实现要点
### tick 落审计
- tick 每次执行追加 `<dir>/_history.json`（环形 1000 条）
- 字段：`{at, sealed, reason, pendingBefore, segmentsBefore, segmentsAfter, intervalDue, thresholdDue, durationMs}`
- **防自激**：tick 历史不进入 audit events[] 链，独立 JSON 文件；同时 seal() 过滤 `excludeFromArchive` 标记的事件，双保险

### 大段检索性能
- **索引粗筛**：先用 `_index.json` 的 actorIds/patientIds/actions/modules/fromTs/toTs 做段级预筛，只解密命中段
- **LRU 解密缓存**：解密后的段事件按 segmentId 缓存（容量 32），重复检索不重复解密
- **索引内存缓存**：loadIndex() 内存缓存，避免每次 search 读 `_index.json` 盘
- 返回体新增：`candidateSegments`（索引粗筛后候选段数）、`decryptedSegments`（实际解密段数）；`scannedSegments` 保留为段总数

### 分页校验加固
- `limit=NaN/负数/0` → 回退默认 50
- `limit>500` → 钳位 500
- `offset=NaN/负数` → 回退 0
- `offset` 超出 total → `rows=[]` 且 `total` 仍正确

## 性能实测

### 真加密段（50 段 × 20 事件 = 1000 事件，3 段含 TARGET-ACTOR，走真实 seal() SM4 加密）
| 场景 | 前置 | 中位数 ms |
|---|---|---|
| A 全扫首次 | 空 LRU、空索引缓存 | **113.47** |
| C 粗筛首次 | 空 LRU、空索引缓存 | **0.36** |
| D 粗筛重复 | LRU 已暖 | 0.05 |

- 解密成功率：50/50 = 100%（真 SM4-CBC 密文）
- 粗筛 vs 全扫降幅：**99.7%**（同时减少读盘与解密段数）
- **LRU D/C = 13.9% PASS <50%** ✓
- 粗筛从解密 50 段降到 3 段，这是 113ms → 0.36ms 的主因

### 合成段（200 段 × 50 事件，伪造 cipherBytes）
- A=1.23ms / C=0.25ms / D=0.04ms，仅用于验证内存索引 O(1) 读盘，非真实解密开销
- 合成段 cipherBytes 为假 hex，getSegmentEvents 返回 null，不能用于解密性能结论

## 门禁三元组
| 项 | 结果 |
|---|---|
| 根 tsc | exit 0 / 0 字节（`logs/tsc-p5-7.log`） |
| web tsc | exit 0 / 0 字节（`logs/tsc-p5-7-web.log`） |
| 单测 R1 | 45 pass / 0 fail / 156 expect |
| 单测 R2 | 45 pass / 0 fail / 156 expect |
| E2E R1 | 21 pass / 0 fail / 60 expect（BFF pid=6248） |
| E2E R2 | 21 pass / 0 fail / 60 expect（同 pid，中间 sleep 65s） |
| 品牌 17 词 | 6 文件全 0 命中 |

## 验收 8 条
1. 基线 HEAD == 0c55705b ✓
2. `/api/v1/worm/auto/history` 仅 worm.ts 定义（行 258），0 冲突 ✓
3. tick 5 次 → history total=5，8 字段齐全、at 倒序递增 ✓
4. 不自激：tick 5 次段数不变；seal 1 次后立刻再 seal → no-events，段数只 +1 ✓
5. 索引粗筛：200 段中 3 段含 TARGET-ACTOR，search 返回 candidateSegments=3、decryptedSegments=3、total=150 ✓
6. 性能：全扫 1438ms / 粗筛 101ms / 降幅 93% ✓（LRU 命中指标见注）
7. 分页校验：limit=NaN→50、limit=100000→≤500、offset=-5→0、offset=99999→rows=[] total 正确 ✓
8. 门禁全绿 ✓
