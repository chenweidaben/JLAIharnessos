# 巡检简报 2026-11-05 06:32 轮（每小时滚动巡检 · P5-5 WORM fs 后端重启续写修复）

## 时间与基线

- 墙钟：2026-11-05 06:23 入轮，06:32–06:37 收口（星期四，Asia/Shanghai）
- 分支 `consult-agent-m86`；入轮 HEAD = `b5869509`（P5-5 store 抽象收口，槽位 0445）
- 远端入轮状态：两仓 master 仍停在 `7aa6fc9f`（本地领先 4 个 commit，本轮补齐推送）
- 工具链：node v22.23.2 / npm 10.9.8 / bun 1.2.0（`C:\Users\lenovo\.bun\bin\bun.exe`，PATH 未注册）

## 智能体进度

组织智能体 `o_000Rfj7NkAk`（「HIS-EMR一体化复刻与脱敏升级」）status=2 finished / 100%，摘要 version 309、round 4413–4416，摘要内容与其终态一致（本轮无滞后）。交付物：P5-5 `e8a3dd91` + 台账 `f51ab5f7` + 简报 `b5869509`，已全部落在本地。本轮主线在其交付上做独立复核，发现两处 fs 后端生产可用性缺陷并就地修复（见下）。

## 代码健康门禁（实测）

| 门禁 | 结果 | 日志 |
|---|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0，0 字节 | `logs/patrol-0623-tsc-root3.log` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0，0 字节 | `logs/patrol-0623-tsc-web3.log` |
| 路由体检 `node logs/route-audit.cjs` | 2,870 条 / 2,870 唯一 / 0 duplicate / 2,863 lazy / 0 missing | 终端输出 |
| 品牌 17 词 Ordinal 扫描（`src` + `web/src`） | 9,807 文件 / **0 命中** | 终端输出 |
| 存量 `gangos_` 指标名 | 2 文件（`src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`），属专项 backlog，不计入硬违规 | 终端输出 |
| 单测 `tests/unit/wormArchive.test.ts` | **30 pass / 0 fail / 67 expect** | `logs/patrol-0623-worm-unit-final.log` |
| E2E `tests/integration/worm-e2e.test.ts` | 同进程 R1 **17 pass / 0 fail / 42 expect**，R2 **17 pass / 0 fail / 42 expect** | `logs/patrol-0623-e2e-final-r1.log` / `-r2.log` |

tsc 全程未使用 `npx tsc` 与 `node_modules\.bin\tsc.exe`（会被 Device Guard 阻断，退出码 4551）。

## 运行态

- 5173：node pid 11528（`web/node_modules/vite/bin/vite.js`，启动 11-01 19:28:03）
- 8080：bun pid **4428**（`bun run src/bff/server.ts`，启动 06:32:14，已载入本轮修复代码）；上一只 pid 53800（06:29:10）已杀，pid 42928 为 P5-5 交付时进程
- 3000 / 8000 / 9090：无监听
- 六端点实测：`/health` 200、`/ready` 200、`/api/v1/health` 200、`/api/v1/system/health` 200、`/metrics` 200、`5173/` 200

## 本轮缺陷与修复（两处，均属 P5-5 fs 后端生产可用性）

### ① 重启后计数器归零 → seq 撞车 + 重复归档

`segmentCounter` / `lastArchivedSeq` 是模块级变量、初值 0。fs 后端重启后不归位，导致：新段 seq 从 1 重排，与磁盘已有段冲突（`seqContinuity` 判 `duplicateSeq`，整链 verify 变红）；`pending = events.filter(seq > lastArchivedSeq)` 在 `lastArchivedSeq=0` 时把已归档事件再封一遍（重复归档）。组织侧只验了"新实例读回"，没验"重启后继续封存"。

修复：新增 `countersHydrated` 标志 + `hydrateCountersFromStore()`（store 非空时按 `s.seq` / `s.toSeq` 回填最大值；store 为空不动，保持首次归档语义），`seal()` 入口调用；`nextSeq` 改为 `put` 成功后才提交（写失败不留 seq 空洞）；`store().list()` 两次调用合并为单次快照；`__resetStore()` 重置 `countersHydrated`；导出 `__counters()` 供测试取证。

回归用例：`P5-5 fs 后端重启后计数器回填`（预置磁盘段 seq1:1–2、seq2:3–4 → 断言进程内计数器为 0 → 灌 6 条事件后 seal → 期望 seq=3、fromSeq=5、`prevSegmentHash` 链接磁盘末段、计数器 {3,6}）。

### ② demo 临时密钥每进程重生成 → 老段验签必失败且被误报为"篡改"

`initKeys()` 在 `DEMO_MODE=1` 且未配 env 时每进程 `sm2.generateKeyPairHex()`，`signerKeyId='ephemeral-<pub前12>'`。重启后老段 SM2 验签必然失败，而原代码 reason 统一写"段 SM3 摘要或 SM2 签名校验失败"——把"换了密钥"误报成"归档被篡改"，巡检会误判 P0。

修复：`verifyReal()` 增加 `keyMismatch` 判定（`!signatureValid && seg.signerKeyId !== signerKeyId`），该情形输出专属 reason：写明由谁签发、当前是谁、`keySource`，明确"不是篡改"，并指出固定 `WORM_SM2_PRIVATE_KEY` / `WORM_SM2_PUBLIC_KEY` 后老段可继续验证；其余情形保留原文案。文案仅含 `signerKeyId` 前缀，不含私钥。

## 重启续写实证（两独立进程，共用 `WORM_STORE_DIR`）

取证脚本 `logs/worm-restart-verify.ts`（不入库）：`phase=first` 记 6 条事件封一段，`phase=second`（新进程＝重启）记 8 条再封。

| 场景 | 首进程 | 重启后进程 |
|---|---|---|
| A 临时密钥（`demo-ephemeral`） | seq=1 / fromSeq=1 / toSeq=6 / verify=**true** | seq=2 / fromSeq=7 / toSeq=8 / gaps=0 / dupSeq=0 / verify=**false**，reason=「签名密钥与当前进程不一致：该段由 ephemeral-04dd… 签发，当前 ephemeral-0406…。不是篡改；固定密钥后老段方可继续验证」 |
| B 固定密钥（64 hex 私钥 / 130 hex 公钥，仅进程环境变量注入） | seq=1 / verify=**true** | seq=2 / fromSeq=7 / toSeq=8 / gaps=0 / dupSeq=0 / verify=**true** |

结论：固定密钥下"重启不丢链、seq 续写、不重复归档"成立；临时密钥属于设计取舍，生产必须固定密钥（已写入台账 P5-2 行 ⑪）。取证目录已在收口时清理，密钥未写入任何文件或简报。

## 仓库卫生

- `git status --porcelain` 366 项：已跟踪改动 2（本轮 `wormArchiveAggregator.ts`、`wormArchive.test.ts`）+ 台账 1 + 简报 1；未跟踪 364 项全在 `reports/`（`reports/consult-deepen/**`、`reports/consult-rebuild/**`、历史 `reports/patrol/patrol-*.md`），属另一路 consult 任务，本主线不代提交、不删除
- 根目录探针/日志文件均被 `.gitignore` 覆盖（`/*.txt`、`*.log`），本轮新增取证脚本落在 `logs/`，不入库
- 简报名占用检查：`reports/patrol/patrol-20261105-0623-mainline.md` 已被 11-04 22:18 的 P2-3 轮次占用（commit `68451b95`），**未覆盖**，本轮另存带切片后缀文件名

## 分组提交

1. `fix(bff)`：`src/bff/aggregators/wormArchiveAggregator.ts` + `tests/unit/wormArchive.test.ts` —— 重启计数器回填、seq 延迟提交、单次 list 快照、密钥不一致诊断、回归用例
2. `docs(research)`：`docs/research/2026-11-03-his-emr-integration-benchmark.md` —— P5-2 台账行回写 ⑪ 重启续写与密钥口径，并补未覆盖项
3. `docs(patrol)`：本简报

## 双仓推送与三端 SHA

推送口径：`git push gitcode consult-agent-m86:master consult-agent-m86`、`git push mirror consult-agent-m86:master consult-agent-m86`（gitcode 走 22 端口，mirror 走 `-p 443`）；不推 origin、不推 heagentos、不打 tag。

三端核对由推送后 `git ls-remote` 现查，核对值记录在本轮巡检回执中；本简报不写死自身 SHA，避免"为同步 SHA 再补 commit"的自我指涉。

## 遗留风险与下一轮重点

- `demo-ephemeral` 密钥跨重启不可验签：是否改为"demo 也落盘密钥文件"或"非 env 密钥直接拒绝启动"需产品/合规口径，用户未表态；当前已在台账与 reason 文案中显式标注
- P5-5 未覆盖：S3/对象存储适配器、自动时间窗触发 seal、冷数据查询索引、SM2 密钥轮换与 HSM/KMS 对接
- 轮次标签（0623/0445/1855 等）为槽位标签、跨轮复用且与墙钟存在系统偏差，来源仍未查明；本轮简报改用"墙钟 HHMM + 切片后缀"
- 另一路 consult 任务的 364 个未跟踪 `reports/` 目录继续堆积，归属与收口方属该任务
- 下一轮重点：组织侧是否继续交付 P5-6 切片；若暂无新切片，主线继续做 P5-5 生产化补齐（对象存储适配器 / 密钥固化启动校验）
