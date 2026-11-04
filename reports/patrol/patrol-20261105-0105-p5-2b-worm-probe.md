# P5-2 影子探针修复 简报（槽位 0105，墙钟 2026-11-05 01:00）

## 背景
主线复测 P5-2 首跑 5 fail，全部源于 `_tamper` 永久改写内存真实段：verify 永远 false、首段 prevSegmentHash 不再是 GENESIS、按 id 读内容 404。属测试污染，非断言问题。

## commit
- c36af59e fix(security): _tamper 改影子探针，真实段只读
- 38908cb9 docs: 台账影子探针版回写
- 4b84309d docs: P5-2 简报时间口径改墙钟

## 修复设计
- 真实段 Map 完全只读，`_tamper` 不再触碰
- `_tamper {segmentId}` 深拷贝目标段，故意 eventCount+1 制造自洽性破裂，生成 `VERIFY-PROBE-<n>-<ts>`
- `verify?scope=all` 返 `realChainValid` / `probeBroken` / `brokenScope='real'|'probe'`
- `verify?scope=real` 只校真实段，永远 realChainValid=true
- 新增 `POST /_probes/reset`（DEMO + admin）清空探针

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：13 pass / 0 fail / 28 expect

## 核心验收：同进程连跑两轮不重启
- BFF pid 前后均为 49140（未重启）
- 第 1 轮：12 pass / 0 fail / 26 expect
- 第 2 轮：12 pass / 0 fail / 26 expect
- 结论：污染已消除，后续巡检不再需重启清库存

## 真实段未被污染实测
_tamper 后 GET /worm/segments/:seg1 仍 200 且 segmentHash 64 hex；verify?scope=real → realChainValid=true；verify?scope=all → valid=false 但 brokenScope='probe'；_probes/reset 后恢复 valid=true

## 品牌
17 词 Ordinal 0 命中

## 未覆盖
段落盘对象存储/S3、SM4 加密、SM2 签名、自动时间窗 seal、跨段 seq 连续性、冷数据索引