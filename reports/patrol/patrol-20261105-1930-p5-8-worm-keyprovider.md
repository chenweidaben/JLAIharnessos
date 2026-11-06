# P5-8 KeyProvider 抽象 + SM2 密钥轮换 简报

- 时间：2026-11-05 19:30
- 分支：consult-agent-m86
- 基线 HEAD：0fc1b990

## 改动文件
- `src/bff/aggregators/wormKeyProvider.ts`（新建）
- `src/bff/aggregators/wormArchiveAggregator.ts`
- `src/bff/routes/worm.ts`：新增 `POST /api/v1/worm/keys/rotate`（admin）
- `tests/unit/wormKeyProvider.test.ts`（11 用例）
- `tests/integration/worm-e2e.test.ts`：P5-8 轮换 HTTP 层用例
- `scripts/perf-worm-search.mts`（可复跑性能脚本）

## 关键设计
- DemoEphemeral：`productionSafe=false`，构造即 warn
- FileKey：私钥 SM4-CBC 加密落盘（KEK=`WORM_KEK`，不回落 `WORM_SM4_KEY`）
- verify 按段 `signerKeyId` 选公钥，未知 keyId 与 bad-signature 区分
- rotate 旧钥保留可验签

## 性能三档（10 次采样，50 真加密段 × 20 事件）
- A 全扫首次 median=59.27ms (min=56.10, p90=60.02)
- B 粗筛首次 median=0.01ms (min=0.01, p90=3.95)
- C 粗筛重复 median=0.01ms (min=0.01, p90=0.05)
- 粗筛 A→B ~100%，LRU B→C 30.6%
- 口径：B/C 亚毫秒量级，p90/min>2x，计时噪声大；B 测量时索引缓存已暖（非真冷启动）。主结论以 A→B 粗筛降幅为准。

## 门禁
- 根 tsc 0B、web tsc 0B
- KeyProvider 单测 11/0/30
- 回归 85/0/247
- E2E R2 22/0/73
