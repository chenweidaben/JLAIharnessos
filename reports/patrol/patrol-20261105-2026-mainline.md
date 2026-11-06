# 巡检简报 · 2026-11-05 20:26 槽位（主线独立复核）

> 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`　分支：`consult-agent-m86`
> 执行方式：主线独立实测（组织侧自报门禁一律不采信）
> 本简报不写死“最终 SHA”，避免为同步 SHA 反复追加提交造成自我指涉；推送后的三端 SHA 以交付回复中的实测值为准。

## 1. 本轮时间与基线

- 本轮起止：2026-11-05 20:26 起，收口约 20:45（+08:00）
- 上轮收口基线：`6539a65640a9b7578af94ef2a071e8f121fed1a9`
- 本轮起点 HEAD：`3b1ab51f95be54362aa2c34fa12bde9a076664d9`（组织侧 P5-11 末提交）
- 本轮新增提交（2 个，均为主线就地优化）：
  - `41564a3c` fix(worm): P5-11b purge 判定前强制重扫，闭合索引漏检窄窗口
  - `8c7ae750` fix(worm): 运维审计流写入前递归建目录，杜绝审计静默丢失

## 2. 组织智能体状态（o_000Rfj7NkAk）

| 项 | 实测值 |
|---|---|
| 状态 | `status=2`（finished / idle-resumable standby） |
| 进度 | overall 100%，version 421，round 5672–5676 |
| 更新时间 | `updated_at_unix=1793876534`（约 19:02，`reason=flush`） |
| 本轮新切片 | 无（P5-11 五提交已在前序完成；本轮由主线接手补漏） |

组织侧自陈三项缺口仍成立：① P5-11 三提交无对应简报；② 验证非其本人执行（云主机 `switch` 返回 `SANDBOX_UNAVAILABLE`，由其另建验收代理代跑）；③ 索引一致性自称“最终一致 + 文件数兜底”，本轮实测证明该兜底失效。

## 3. 工具链（实测）

- node `v22.23.2`
- bun `1.2.0`（全路径 `C:\Users\lenovo\.bun\bin\bun.exe`，PATH 未注册，命令内显式补 PATH）
- npm `10.9.8`
- git `2.54.0.windows.1`（不在默认 PATH，每条命令先拼 `C:\Program Files\Git\cmd`）

## 4. 双 tsc 门禁（独立复跑，共 3 次）

| 时点 | 根 tsc | web tsc |
|---|---|---|
| 改码前 | exit 0 / 0 字节 / 0 行 | exit 0 / 0 字节 / 0 行 |
| `41564a3c` 后 | exit 0 / 0 字节 / 0 行 | exit 0 / 0 字节 / 0 行 |
| `8c7ae750` 后 | exit 0 / 0 字节 / 0 行 | exit 0 / 0 字节 / 0 行 |

根命令 `node node_modules/typescript/bin/tsc --noEmit`；web 命令 `bun x tsc --noEmit`（禁 `npx tsc` / `node_modules\.bin\tsc.exe`）。

## 5. 测试与 E2E（全部落盘 `logs/`，无裸管道）

| 项 | 结果 |
|---|---|
| `tests/unit/wormArchive.test.ts` 单文件 | 52 pass / 0 fail / 180 expect（4.60s） |
| `tests/unit/worm*.test.ts` 三文件组合（改码前） | 79 pass / 0 fail / 250 expect（4.68s） |
| `tests/unit/wormKeysRoutes.test.ts` 单文件（含新用例） | 11 pass / 0 fail / 24 expect（0.43s） |
| E2E 第 1 轮（pid 37052） | 23 pass / 0 fail / 81 expect（1.27s） |
| E2E 第 2 轮（pid 37052） | 23 pass / 0 fail / 81 expect（3.38s） |
| E2E 第 3 轮（pid 16344，重启后） | 23 pass / 0 fail / 81 expect（1.01s） |
| E2E 第 4 轮（pid 16344） | 23 pass / 0 fail / 81 expect（2.75s） |

E2E 前均按硬检查比对 BFF `StartTime` 与 `git log -1 --format=%cI`，两轮重启后的运行都严格晚于对应 commit。

## 6. 运行态（端口 / 进程 / 端点）

| 端口 | 状态 |
|---|---|
| 3000 | 无监听 |
| 5173 | LISTEN pid 6528（node/vite，10:51:27 起） |
| 8080 | LISTEN pid 16344（bun，2026-11-05 **20:43:54** 起，晚于 `8c7ae750` 的 20:43:31） |
| 8000 / 9090 | 无监听 |

健康端点（新进程实测）：

| 端点 | 状态码 | 响应体 |
|---|---|---|
| `/health` | 200 | 2 B |
| `/ready` | 200 | 115 B |
| `/api/v1/health` | 200 | 163 B |
| `/api/v1/system/health` | 200 | 145 B |
| `/metrics` | 200 | 39,312 B |
| `5173/`（前端首页） | 200 | 894 B |

## 7. 本轮处理项

### 7.1 缺陷一：purge 引用判定存在 mtime 漏检窄窗口（提交 `41564a3c`）

- 现象：`autoDetect()` 在 `st.mtimeMs === lastScanMtimeMs` 时直接 return；此时 `countBySigner()` 返回滞后索引的 0。P5-10 的回退 `store().list()` 同样先过 `autoDetect()`，兜底也读不到。
- 影响：若外部进程在同一 mtime 精度窗口内写入用该钥签名的段，purge 会误判“零引用”而删钥 —— 属破坏性误判。
- 处置：`WormStore` 接口新增可选 `refresh?(): void`；`ensureKeyInUseChecker` 在索引 0 命中时先强制 `refresh()` 再回退 `list().filter()`。热路径（seal/list/count）仍是 O(1) 的 mtime 比较，不退化。
- 证明用例：冻结目录 mtime → 直接落新段 → 冻回原 mtime → 断言 `countBySigner===0`（证明漏检真实存在）→ `refresh()` 后断言 `===1` 且 `list().filter()` 长度 1（证明兜底有效）。

### 7.2 缺陷二：运维审计流在目录缺失时静默丢失（提交 `8c7ae750`）

- 现象：探针多次 purge/retire 之后 `GET /keys/ops` 仍返回 `{"ops":[]}`，且 `WORM_STORE_DIR` 指向的目录根本未创建。
- 根因：`logKeyOp` 直接 `writeFile` 到 `${WORM_STORE_DIR}/_key-ops.json`，目录不存在时抛错并被 `catch { }` 静默吞掉 —— 审计缺失本身即合规缺陷。
- 处置：写入前 `mkdir(dir, { recursive: true })`；失败不再空 catch，改为 `console.warn` 留痕（只打印错误消息，不含任何密钥值）。
- 新增用例：`WORM_STORE_DIR` 指向不存在的嵌套目录时，purge 仍能落盘审计，且 ops 记录含 `keyId/actorId/action`、不含私钥字段。

### 7.3 运行态探针（v2，已修正 pwsh 错误体读取与字段名）

关键真值（均为 HTTP 实测）：

| 场景 | 结果 |
|---|---|
| retire / purge 无 token | 401 / `40100` |
| retire / purge nurse token | 403 / `40300`「仅 admin 可操作 WORM 归档」 |
| `GET keys` | 200，仅返 `signerKeyId` + `publicKeyHex` + `keySource=demo-ephemeral` + `sm4Configured=true`，无私钥 |
| seal | 201，段 `WORM-0011-mw3jf3ql`（seq 11、eventCount 9） |
| purge 缺 confirm | 400 `confirm-required` |
| purge confirm 小写 `purge` | 400 `confirm-required`（大小写敏感成立） |
| purge 不存在 id + confirm | 400 `unknown-key-id` |
| purge 当前 active 钥 | 409 `cannot-purge-active` |
| rotate 后 purge 已签段钥 | 409 `key-in-use`，`refs=1` |
| rotate 后 purge 未签段旧钥 | **200**（放行） |
| 同上重复 purge | 400 `unknown-key-id` |
| `GET /keys/ops?limit=50` | 200，`ops` **10 条**，`ops_leak_hits=0` |
| `POST /verify?scope=real` | 200 `valid=true`，`realChainValid/digestValid/signatureValid` 全 true，`seqContinuity.gaps=[]`、`duplicateSeq=[]`，segmentCount 11 |
| `GET store info` | 200 `kind=memory`、segmentCount 11、oldestSeq 1、newestSeq 55 |

审计落盘取证：`logs\worm-store-2026b` 重启前 **不存在**，探针后自动创建，`_key-ops.json` 1,790 字节，含 `key-in-use refs=2`、`retire ok`、`cannot-purge-active` 等记录 —— 目录自动创建与审计留痕均已运行态验证。

对照：探针期间 `store info` 报 `kind=memory`，说明当前 BFF 跑的是内存后端（`getWormStore()` 仅在 `WORM_BACKEND==='fs'` 时用 `FileWormStore`），`WORM_STORE_DIR` 只影响审计流路径，不影响段存储后端。该口径差异属设计现状，已登记为遗留项。

## 8. 品牌 / 路由 / 仓库卫生

| 项 | 结果 |
|---|---|
| 品牌 17 词扫描（`src` + `web\src`，逐文件 `ReadAllText` + `IndexOf(Ordinal)`） | 9,809 文件，hits **0**，hitFiles **0** |
| 路由体检（`logs\route-audit.cjs`，只读 `web/src/router/index.tsx`） | routePathDeclarations 2,870 / uniquePaths 2,870 / duplicatePaths **0** / lazyImports 2,863 / lazyMissing **0** |
| `git status --porcelain` 已跟踪改动 | 0（提交后干净） |
| 未跟踪项 | 全部位于 `reports/`（另一路 consult 任务与历史轮产物），本主线不代提交、不删除 |

## 9. 推送与三端核对

- 推送目标：`gitcode`（JLMEDAIOS）与 `mirror`（JLAIharnessos），各推 `consult-agent-m86:master` + `consult-agent-m86` 两个 ref。
- 不推 `origin`（HTTPS 内嵌票据）、不推 `heagentos`；本槽位不打 tag。
- 推送范围：`6539a656..` 本轮 3 个提交（`3b1ab51f` 起、`41564a3c`、`8c7ae750`、简报提交）。
- 三端 SHA：**以交付回复中的 `git ls-remote` 实测值为准**（本地 HEAD / gitcode master / mirror master 逐位一致）。

## 10. 遗留风险与下一轮重点

1. `WORM_BACKEND` 默认仍为 memory：重启丢段、`WORM_STORE_DIR` 对段存储不生效；生产是否默认 `fs` 未拍板。
2. `.env` 无 `WORM_*` 变量，运行态恒为 `demo-ephemeral`，重启即换钥、旧段验签报 `unknown-key-id`。
3. 运维审计为单文件追加写（上限 1000 条截断），多实例并发写会互相覆盖；后续需加锁或改为按实例分文件。
4. 组织侧 P5-11 三提交仍无对应简报；其索引一致性文档未写明“最终一致”的实际边界（本轮已用代码闭合窄窗口，文档待补）。
5. `scripts/` 下 11 个历史一次性脚本的类型债（修复 / `@ts-nocheck` / 长期排除）仍待定。
6. 本地 `master` 分支仍指向历史遗留提交，是否清理未定。

下一轮重点：① 追组织侧续做（mtime 边界补测、S3 适配器、SIEM Syslog/CEF）；② 核实 `WORM_BACKEND=fs` 下的重启续写与段计数；③ 收敛运维审计并发写口径。
