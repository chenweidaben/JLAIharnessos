# 健澜仓库滚动巡检简报 · 2026-11-06 11:05 槽位（主线）

- 产品：健澜AI原生医院操作系统OS
- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 分支：`consult-agent-m86`；远端：`gitcode`（JLMEDAIOS）+ `mirror`（JLAIharnessos）
- 巡检起始 HEAD：`918ce109`（09:33:23，组织侧 P5-17 简报提交）
- 工具链：node `v22.23.2` / bun `1.2.0` / npm `10.9.8` / git `2.54.0.windows.1`

## 1. 组织智能体状态

`peek_task_progress(o_000Rfj7NkAk)` → `status=finished`、overall 65%、version **562**、round 7634–7643，摘要自述「P5-18 验收进行中（HEAD=4463a333）」。
- 版本号与会话上一槽位持平（562），**本轮无新提交落地**，仍停在 09:33 的 `918ce109`。
- 其自述的 `HEAD=4463a333` 与本地实况不符（本地 HEAD 一直是 `918ce109`），继续按「组织侧自述口径一律以 git 实证为准」处理。
- 其自述的 lint-diff 注入验证（注入违规 → EXIT=1；撤销 → EXIT=0）本轮由主线**间接独立复现**：主线修改测试文件后引入 `await-thenable` 违规，差分门禁确实 EXIT=1 且精确报出文件与规则；修好后 EXIT=0（见第 6 节）。

## 2. 代码健康门禁（主线独立实测）

| 门禁 | 结果 | 取证日志 |
|---|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | exit 0，输出 0 字节 | `logs/patrol-1023-tsc-root2.log` |
| web tsc（`bun x tsc --noEmit`，cwd=web） | exit 0，输出 0 字节 | `logs/patrol-1023-tsc-web2.log` |
| 九文件单测 | **143 pass / 0 fail / 446 expect（11.25s）** | `logs/patrol-1023-unit2.log` |
| S3 fallback 集成 | **7 pass / 0 fail / 17 expect（1.91s）**（整改前为 6 条，本轮新增 1b 回归） | `logs/patrol-1023-s3fallback2.log` |
| E2E（`tests/integration/worm-e2e.test.ts`） | R1 **23/0/81（2.52s）**、R2 **23/0/81（4.21s）** | `logs/patrol-1023-e2e-R1.log`、`-R2.log` |
| 路由体检 | 声明 2870 / 唯一 2870 / 重复 0 / lazy 2863 / 悬空 0 | `logs/patrol-1023-route.log` |
| 品牌 17 词扫描（src + web/src，README 级扩展名全量逐文件 Ordinal） | **files=9816，hits=0，hitFiles=0** | 本轮命令内联取证 |
| 差分 lint 门禁（`scripts/lint-diff.mts`） | 整改后 3 文件 **0 error / 5 warning**，exit 0 | `logs/patrol-1023-lintdiff2.log` |

说明：E2E 两轮跑在 10:54:15 新起的干净 BFF 进程（pid 43988，`wormBackend=memory`）上，两轮均绿；本轮随后的代码改动只涉及 `wormStoreFactory`（运行态未接线）与 lint 脚本，不影响 E2E 行为，故未再起第三个 E2E 轮（同进程三轮以上按既有经验会因密钥环/段签名状态出现假红）。

## 3. 运行态与健康端点

| 端点 | 状态 | 长度 |
|---|---|---|
| `GET :8080/health` | 200 | 2 B |
| `GET :8080/ready` | 200 | 168 B |
| `GET :8080/api/v1/health` | 200 | 161 B |
| `GET :8080/api/v1/system/health` | 200 | 145 B |
| `GET :8080/metrics` | 200 | 36535 B |
| `GET :5173/` | 200 | 894 B |

`/ready` 正文：`{"status":"ok","wormBackend":"memory","wormStoreDir":"(in-process memory; not persisted)","auditStore":"pg","sealDisabled":false,"sealDisabledReason":"","uptimeSec":632}`

端口与进程：8080 由 bun pid **43988** 监听（10:54:15 启动）；5173 由 node/vite pid **36328**（2026-11-05 22:28 启动）监听；3000 / 8000 / 9090 无监听。

## 4. 仓库卫生

- 工作区未跟踪项 38 项：其中 35 份是历史 `patrol-*-p0/p1/p2/p3/p4-*.md` 切片简报（旧轮次产物，本轮未纳入、未删除），3 份是 `round1/2/3-2026-10-25-*.md` 另路产物。
- 根目录历史探针 `*.txt` 1361 个，已跟踪 0 个（均未入库，维持现状）。
- `reports/` 已跟踪文件数由本轮前的 49 恢复到 **106**（其中 `reports/patrol` 58 份）。

## 5. 本轮处理项（就地优化）

### 5.1 修复 `.gitignore` 范围过宽导致的「自家交付物被踢出索引」
上一轮 P5-17 用 `reports/patrol/*` + 白名单只放行 `*-p5-*.md`，连带把本主线的 57 份简报（`*-mainline.md` 与切片段）从索引里撤出（tip 树里只剩 1 份），属于把「忽略另路小时报」误做成「忽略自己」。本轮改为精确忽略 `reports/patrol/patrol-????????-????.md`（仅无后缀小时报），并放行 `*-mainline.md`、`*-p5-*.md`；用 `176d26cd^` 的树清单交叉核对后恢复 **57/57**（磁盘无缺失）。

### 5.2 修复 `S3WormStore.list()` 写死 `worm/` 前缀的真缺陷
`list()` 原用 `/worm\/(.+)\.json$/` 解析 key，在 `prefix` 非默认值时恒不匹配 → `list()=[]` → `countBySigner()=0`、`newestSeq=0`（「该密钥是否仍被引用」这类守卫会直接失效）。改为构造期按 `this.prefix` 转义生成 `keyRe`，并新增用例 **1b**（`prefix='arch/'` 下 put→list 命中 1 条、`countBySigner=1`）做回归。

### 5.3 差分 lint 门禁的 fail-open 收口
`scripts/lint-diff.mts` 原用 `execSync(args.join(' '))`，路径含空格/中文会被 shell 拆词，eslint 直接报参数错，而 catch 分支只解析 stdout JSON、解析不到就静默忽略 → **「门禁没跑起来」被算成 0 error 放行**。改为 `execFileSync` 传参数数组；catch 里 JSON 为空时记 `lint-run-failure` 并计入 error。顺带把原先「算出来但没用」的 `baselineFile` 真正落盘到 `logs/lint-baseline.jsonl`，清掉 4 条 unused 警告。
验证：本轮改动自身先触发过一次真实违规（`worm-s3-fallback.test.ts` 的 `await-thenable`），门禁 EXIT=1 且精确指出文件行号与规则；修正后 0 error / 5 warning。

### 5.4 去掉 S3 fallback 用例 1 的假绿断言
原用例标题写「断网 → 段落 local，不 500」，实则先断言 `remote.put` 抛错、再**手动** `local.put(seg)` 并断言能读到，等于自己伪造了「已兜底」。已改为断言真实行为：抛错 + `local.get === null` + `local.list().length === 0`，并在用例内写明「断网兜底未实现」。

## 6. 本轮独立复核发现的两处口径问题（未改实现，转下一批）

1. **S3 后端尚未接线（`WORM_BACKEND=s3` 实际无效）**：全仓 `src/**/*.ts` 对 `wormStoreFactory` 的引用数为 **0**，即 `createWormStore()`/`S3WormStore` 目前只有测试在用，启动路径仍走 `wormStore.ts` 的 memory/fs 分支。P5-17 提交信息「S3 后端接线（env 开关）」应理解为「工厂与部署件就绪、运行态未接」。影响：S3 目标态无法通过环境变量真正启用。
2. **`layered.put` 无断网兜底**：`wormLayeredStore.put` 只做 `remote.put`，remote 抛错即向上抛，`local.put` 仅在 remote 成功后作为副本写入；`wormStoreResilience` 注释所说的「让上层走本地兜底/重试」在上层并不存在。属设计口径未定项（宁可失败 fail-closed，还是落 local + pending + sweep 补传），需产品口径后由组织侧实现，本轮只把假绿断言改成真断言。

## 7. 分组提交清单

| 提交 | 内容 |
|---|---|
| `fix(worm)` | `src/bff/aggregators/wormStoreFactory.ts`（keyRe 前缀感知）、`tests/integration/worm-s3-fallback.test.ts`（用例 1 去假绿 + 新增 1b）、`scripts/lint-diff.mts`（execFileSync / fail-open 收口 / baseline 落盘） |
| `chore(reports)` | `.gitignore` 精确忽略 + 恢复 57 份本主线简报跟踪 |
| `docs(patrol)` | 本简报 |

## 8. 双仓推送与 SHA 核对

推送 `gitcode` 与 `mirror` 的 `master` 与 `consult-agent-m86`（不推 `origin` / `heagentos`，不打 tag）。
本地 HEAD 与两仓四 ref 的逐位核对结果见本轮回复附注（简报不写死最终 SHA，避免自指）。

## 9. 遗留风险与下一轮重点

1. **S3 接线**：把 `createWormStore` 接到启动路径（或在 `/ready` 暴露 `wormBackend` 实际装配），否则 `WORM_BACKEND=s3` 是死开关；接之前先定「断网兜底」口径（第 6 节第 2 条）。
2. **组织侧自造 lint 债**：`worm-e2e.test.ts` 83 error（`CallResult.data: any`）、`wormStore.ts` 19、`routes/worm.ts` 12、`wormKeyProvider.ts` 10、`wormArchiveAggregator.ts` 7、`auditEventAggregator.ts` 3、`server.ts` 2、`scripts` 历史 25，合计约 203 error，尚未清。
3. **E2E 数据污染审计库**：单轮约写 73 条 `audit.events`，累计撞 `AUDIT_BACKFILL_LIMIT=1000` 会让 dev 环境 seal 永久禁用；建议独立 schema `audit_e2e`（约 3 文件）。
4. **待用户/产品口径**：PG 备份表 `audit.events_backup_20261106b`（286 行）是否 drop；35 份历史 p0–p4 切片简报是否入库；根目录 1361 个历史探针归属；`WORM_BACKEND` 默认值。
5. 下一轮动作：复跑双 tsc + 九文件单测 + S3 集成 + E2E 两轮（新进程）、六端点、路由、品牌；复核组织侧 P5-18 的 `no-floating-promises` 实际覆盖文件是否真生效（要求其在 `eslint.config.js` 生效后注入一次违规自证）。
