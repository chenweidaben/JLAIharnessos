# P5-6 WORM 自动归档调度 + 跨段冷数据检索 收口简报

- 时间：2026-11-05 10:29
- 分支：consult-agent-m86
- commit 链：`b54f54ea`（初版代码）→ `0bcbaeb4`（台账）→ `fa4f091d`（独立验证三问题 fix）

## 改动文件
- `src/bff/aggregators/wormAuto.ts`：自动调度器 + 跨段检索 + 索引；顶部加架构边界注释
- `src/bff/aggregators/wormArchiveAggregator.ts`：导出 `queryAuditEventsCount`
- `src/bff/routes/worm.ts`：新增 4 条路由
- `tests/unit/wormArchive.test.ts`：P5-6 describe beforeEach 清理 `_auto.json`；tick/search 用例调整
- `tests/integration/worm-e2e.test.ts`：P5-6 四用例值断言强化 + 补 POST /auto/config

## 新增 4 条路由
- `GET  /api/v1/worm/search?actorId=&patientId=&action=&module=&from=&to=&limit=&offset=`
- `GET  /api/v1/worm/auto/config`（admin）
- `POST /api/v1/worm/auto/config`（admin，body `{enabled, intervalMs, threshold}`）
- `POST /api/v1/worm/auto/tick`（admin，手动触发调度判断）

## 实现要点
- 调度配置持久化到 `<WORM_STORE_DIR>/_auto.json`：`{enabled, intervalMs, threshold, lastSealAt}`
- tick() 判断"距 lastSealAt 超 intervalMs 或待归档事件数 ≥ threshold"后调 seal()
- 索引 `<dir>/_index.json`：每段 `{actorIds[], patientIds[], actions[], modules[], fromTs, toTs}`；文件缺失自动重建
- 检索：跨段解密后按条件过滤，返回 `{rows, total, scannedSegments, indexHit}`

## 架构边界（独立验证确认，已写入代码注释）
审计事件聚合器是**进程内存态，不跨进程共享**。跨进程保证的是：
1. 段持久化到磁盘（FileWormStore）
2. 段间链式衔接（prevSegmentHash）
3. `_auto.json` 配置读回
4. `_index.json` 索引读回/重建

跨进程**不能**继续归档新事件——B 进程 audit 内存为空，pending=0，seal() 返 no-events。这是预期行为，不是缺陷。

## 门禁三元组
| 项 | 结果 |
|---|---|
| 根 tsc | exit 0 / 0 字节（`logs/tsc-p5-6-final.log`） |
| web tsc | exit 0 / 0 字节（`logs/tsc-p5-6-final-web.log`） |
| 单测 R1 | 34 pass / 0 fail / 77 expect |
| 单测 R2 | 34 pass / 0 fail / 77 expect（连跑两次都 0 fail） |
| E2E R1 | 21 pass / 0 fail / 60 expect（BFF pid=27404） |
| E2E R2 | 21 pass / 0 fail / 60 expect（同 pid，中间 sleep 65s） |
| 品牌 17 词 | 5 文件全 0 命中 |

## 独立验证发现的三个问题 + 修复
1. **单测隔离缺陷**：`setAutoConfig 持久化` 把 `enabled:true` 写到 `_auto.json`，`getAutoConfig 默认值` 二次运行读到残留。修法：P5-6 describe 的 `beforeEach` 删除 `_auto.json`。
2. **E2E 弱断言**：P5-6 三用例只断言 `typeof === 'number'`。修法：强化为值断言（enabled 布尔、intervalMs>0、total≥1、rows[0].seq/occurredAt），并补回 POST /auto/config 用例（写 `enabled:false` 不触发 seal）。
3. **R2 首次 429**：同进程连跑两轮时 R2 两 POST 返 429。修法：两轮之间 sleep 65s 清限流窗口。

## 跨进程实证（独立脚本，两独立 bun 进程）
- A seal 2 段，B 新进程读回：seq=1/2、fromSeq 衔接、prevSegmentHash 链式正确
- B 读回 A 写的配置 `{enabled:true, intervalMs:60000, threshold:5}`
- B search 命中 A 写的事件，scannedSegments=2
- B tick 两次均 `{sealed:false, reason:'no-events'}`（幂等）
- 删 `_index.json` 后 B search 结果一致（自动重建）
