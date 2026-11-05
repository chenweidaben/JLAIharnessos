# 巡逻简报 P5-12：fs 后端运行态验收 + KeyProvider env 拆分

- 时间：2026-11-05 21:10
- 范围：WORM 后端跨进程重启 / SM2 密钥来源 / 索引一致性

## fs 后端运行态验收结果（scripts/verify-fs-backend.mts）

| CHECK | 结果 | 关键值 |
|---|---|---|
| A-seal-2segments | PASS | 进程 A seal 2 段，status=201 |
| A-disk-1json | PASS | 磁盘目录出现 2 个 WORM-*.json |
| A-store-info-kind-fs | PASS | GET /store/info kind=fs |
| B-store-info-fs-count2 | PASS | 进程 B 读回 kind=fs，segmentCount=2 |
| B-seal-after-restart | **KNOWN_LIMITATION** | pending 池纯内存，重启后未归档事件丢失，status=400 |
| B-verify-valid | PASS | 跨进程 verify realChainValid=true（密钥固定后） |
| B-verify-no-gaps | PASS | gaps=[]、duplicateSeq=[] |

**RESULT: PASS_WITH_KNOWN_LIMITATIONS (1)**

## 发现 1：KeyProvider 重构丢了 env 优先语义（已修）

- 根因：P5-8 KeyProvider 重构把 P5-4 的"env 优先"逻辑丢了，导致 `WORM_SM2_PRIVATE_KEY/PUBLIC_KEY` 配了也被忽略，每进程随机生成临时密钥
- 修法：拆成独立 `EnvKeyProvider`（kind=env, productionSafe=true）与 `DemoEphemeralKeyProvider`（kind=demo-ephemeral, productionSafe=false）
- 关键语义：`productionSafe` 不再错误出现在 env 模式上；env 只配一半抛 `worm-env-key-invalid`，不静默降级
- 已修 commit：42d1e7e6（初步恢复）+ 本轮拆分 commit

## 发现 2（**未修，需立项**）：audit events 纯内存无持久化

- 证据：`auditEventAggregator.ts` grep `writeFile|appendFile|insert|pool.query|createWriteStream|readFile|fs.` 0 命中
- 事件只存 `const events: AuditEvent[] = []`（进程内存数组）
- P4 审计查询接口 `/api/v1/audit/events` 读同一数组 → **重启即清空**
- 合规影响：等保三级审计留存要求被打穿，重启前未归档的审计事件永久丢失且不可感知
- 处置：本批不动 P4，建议单独立项"审计事件持久化（PG 落盘 + 启动回填）"

## 索引一致性边界（mtime 检测 + 文件数双保险）

- 索引是**最终一致**：靠 `statSync(dir).mtimeMs` 检测外部写入 + 文件数比对双保险
- mtime 精度窗口内多次写入会漏检 → 由 `ensureKeyInUseChecker` 的"0 命中强制 refresh"兜底
- 结论：**purge 判定是 fail-closed**（宁可多扫一次，不会误删）；但 `countBySigner` 直接查询在极端窗口内可能短暂滞后
- 需要显式 `refresh()` 的场景：高并发同目录多进程写、目录被外部工具批量重建后

## mtime 三用例结果（wormArchive.test.ts）

| 用例 | 结果 |
|---|---|
| 同精度窗口连续 put 2 段，A 不 refresh 调 countBySigner | PASS（===2，证明 refresh 兜底生效） |
| 交错 put（A/B 两实例同目录） | PASS（段数正确、无覆盖丢失） |
| 目录删除后重建继续 seal | PASS（目录自动 mkdir、新段 seq 从 1 开始） |

## 门禁数字

- 根 tsc：exit=0, bytes=0
- web tsc：exit=0, bytes=0
- 四文件单测组合（wormArchive / wormKeyProvider / wormKeysRoutes / globalRateLimit）：**104 pass / 0 fail / 416 expect**
- fs 验收脚本：PASS_WITH_KNOWN_LIMITATIONS (1)
- 品牌 17 词：通过（无违规命中）

## 历史 commit 说明

- `93e59981`（20:53:29）实际同时包含 fs 脚本 fix 与 mtime 三用例两部分（amend 时合并），不拆历史
- `9369bca5`（20:48:22）：fs 运行态验收脚本初版