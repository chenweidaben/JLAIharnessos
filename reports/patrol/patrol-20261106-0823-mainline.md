# 健澜仓库滚动巡检简报（2026-11-06 08:23 槽位）

- **本轮时间**：2026-11-06 08:23 触发，08:23–09:0x 收口（仓库时间 +08:00）。
- **仓库/分支**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，`consult-agent-m86`。
- **进入本轮 HEAD**：`e7f6bc92`（组织侧 P5-16 简报，08:05:07，未推送）；两仓远端仍停在上一轮收口 `fb4977a7`。
- **本轮改动**：一处卫生修复（撤回误纳入的另路巡检产物）+ 本简报；未改任何源码/测试。

## 1. 组织智能体状态

| 项 | 值 |
|---|---|
| 组织者 | `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级） |
| 状态 | `status=2` finished，overall 60%，version **548**，round 7286–7289 |
| 自报 | 「P5-16 step 1 async 化已落地并通过门禁，step 2 装饰层待确认」 |
| 本轮新增 | 9 条提交（07:04–08:05）：设计文档 + 五方法 async 化 + no-floating-promises 门禁 + 超时/并发装饰层 + scripts tsconfig + backfill 截断 fail-closed + 分层 store 段一致性 + P5-16 简报 |

> 自报的 commit 号（1e0ae8f2 / dfdc2c16 / ce668e6d）与本地实际 git 历史不一致（本地为 42c976f9…e7f6bc92），属其自述口径漂移，一律以 git 实证为准。

## 2. 工具链

node `v22.23.2`、bun `1.2.0`、npm `10.9.8`、git `2.54.0.windows.1`。

## 3. 门禁实测（主线独立复跑）

| 门禁 | 结果 | 取证 |
|---|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | **exit 0 / 0 字节** | `logs/patrol-0823-tsc-root.log` |
| web tsc（`bun x tsc --noEmit`） | **exit 0 / 0 字节** | `logs/patrol-0823-tsc-web.log` |
| 九文件单测（新增 resilience/layered/backfill 三件 + 原六件） | **143 pass / 0 fail / 446 expect（8.36s）** | `logs/patrol-0823-unit.log` |
| E2E 第 1 轮（BFF 重启后） | **23 pass / 0 fail（1.82s）** | `logs/patrol-0823-e2e-R1.log` |
| E2E 第 2 轮 | **23 pass / 0 fail（3.38s）** | `logs/patrol-0823-e2e-R2.log` |
| 路由体检 | `2870` 声明 / `2870` 唯一 / `0` 重复 / `2863` lazy / `0` 悬空 | `logs/patrol-0823-route.log` |
| 品牌 17 词扫描（`src`+`web\src` 逐文件 Ordinal） | **files=9815，hits=0，hitFiles=0** | 本轮实测 |

### 3.1 E2E 的 6 条「红」是旧进程状态，不是代码回归

8:36 首次跑 E2E 得 **17 pass / 6 fail**（探针篡改未被识别、真实链 verify 失效、轮换后旧段验签失败）。判断路径：

1. 6 条失败在 R1/R2 完全一致，不随轮次变化；
2. 8080 上的 BFF 是 08:20 启动的进程，此前已跑过多轮 E2E，`purge(k1)` 已把旧公钥从密钥环移除，内存 store 里却留着用 k1 签名的历史段 → 真实链 verify 必然 `unknown-key-id` → `brokenScope` 落到 `real`；
3. 重启 BFF（清 `WORM_*`/`NODE_ENV`/`DEMO_MODE`）后同一份代码两轮 **23/0**。

结论：E2E 只在新起的 BFF 上有效，同一进程跑超过 2 轮会因密钥轮换/清理留下不可验证的历史段而产生假红。这条应写进测试前置说明，而不是每轮去解释红灯。

### 3.2 lint「可执行化」只成立一半

- **不再 OOM**：`eslint src tests scripts --cache` 在 6GB 堆下正常跑完（5486 文件，src 3209 / tests 2235 / scripts 42），耗时约 2 分钟，证明上一轮那句「本机跑不动」已被绕开。
- **但结果不是绿**：全量 **14186 problems（7499 errors / 6687 warnings）**，其中 src 与 tests 是大头（`no-unsafe-*`、`no-unnecessary-type-assertion`、`no-empty-function` 等）。
- **scripts 单独跑也不绿**：`eslint scripts` **49 errors / 18 warnings**，其中包含 parsing error——`scripts/verify-roles.ts` 等文件未被 project service 覆盖（`was not found by the project service`）。
- **本批改动文件**：8 个文件单独跑 **28 errors / 27 warnings**。

因此组织侧「scripts lint 0 error/3 warning」只成立于它实际跑的那几个文件；全目录口径下不成立。lint 门禁当前只能算「能跑」，离「能当门禁」还有 7.5k error 的基线差。

## 4. P5-16 逐条复核

| 提交 | 内容 | 复核结论 |
|---|---|---|
| `42c976f9` / `98c4e7cd` | S3 异步改造前置设计（seal 调用点、超时分档、段一致性、pending 无状态化） | 文档存在（`docs/security/worm-async-migration.md`），内容与实现口径一致 |
| `50d97fc5` | `wormArchiveAggregator` 五方法 async 化 | **成立**：`seal/listSegments/getSegment/getSegmentEvents/segmentToCsv/storeInfo/search/tick/createProbe` 全部 async，`routes/worm.ts` 调用点逐处 `await`（无漏 await 的裸调用）；provider 的 `purge` 与 `setKeyInUseChecker` 同步改为 Promise，三个实现类一致 |
| `4463a333` / `772688c6` | 开 no-floating-promises + scripts 独立 tsconfig | 规则已开；但 tsconfig 覆盖不全 → scripts 目录仍出现 project-service parsing error（见 3.2） |
| `b03f376f` | 超时 + 并发上限装饰层 | **成立且诚实**：按方法分档超时（put 30s / get 5s / list 10s …）、FIFO 信号量默认 20；文件头明写「不支持 AbortSignal，Promise.race 只是停止等待，底层请求会跑到底，不是真取消」——没有把超时包装成取消 |
| `2d19b99c` | backfill 超限 → 拒绝 seal | **成立且 fail-closed**：`backfillPending` 超 `AUDIT_BACKFILL_LIMIT` 置 `sealDisabled`，`seal()` 入口第一件事就是读该标志并返回 `worm-seal-disabled-backfill-truncated`（路由 503），不是只在 `/ready` 打个标记 |
| `1be64a63` | 分层 store 段一致性 + 无状态补传 | **成立**：同 segmentId 两侧 hash 不一致直接抛 `worm-segment-divergence` 并拒绝返回任何一侧（不静默取一侧）；`sweep()` 每次按当前 list 推导，不维护 pending 集合；local.put 失败只告警、由下轮 sweep 对齐 |
| `e7f6bc92` | P5-16 简报 | 品牌词 0 命中（本轮全量扫描口径） |

**上轮交办的两个边角已落地**：`INSTANCE_ID` 随机段改为 `randomSuffix()`（不足 6 位补零，杜绝 `--` 造成的不可解析文件名）；`resolveRetentionDays` 文案改为「拒绝执行清理」。

## 5. 运行态

| 项 | 实测 |
|---|---|
| 8080 | 旧进程 42740（08:20 启动）→ 本轮重启为 **pid 27536**（bun，当前代码） |
| 5173 | pid 36328（node/vite，2026-11-05 22:28 起），API 首页 200/838B |
| 3000 / 8000 / 9090 | 无监听，无端口冲突 |

端点：`/health` 200/2B、`/ready` 200/**168B**、`/api/v1/health` 200/163B、`/api/v1/system/health` 200/145B、`/metrics` 200/4149B、`5173/` 200/838B。

`/ready` 正文：`{"status":"ok","wormBackend":"memory","wormStoreDir":"(in-process memory; not persisted)","auditStore":"pg","sealDisabled":false,"sealDisabledReason":"","uptimeSec":13}` —— 新增的 `sealDisabled` 字段已在运行态生效；仍是 memory + pg 的危险组合（开发仅告警，生产被守卫硬拦）。

## 6. 仓库卫生（本轮的主要修复）

组织侧 `2d19b99c` 这条「worm backfill fail-closed」提交里，**混进了 2403 个不属于本主线的文件**（2431 files / 196737 insertions 的主体）：

| 来源 | 数量 |
|---|---|
| `reports/consult-deepen/` | 2204 |
| `reports/consult-rebuild/` | 12 |
| `reports/patrol/patrol-YYYYMMDD-HHMM.md`（另路每小时巡检） | 187 |

这些都是另一路 consult 任务的巡检产物，本轮之前一直是未跟踪状态，被一次 `git add -A` 式操作带进了语义完全不相关的提交。

**处置（提交 `d934b698`）**：
- `git rm --cached` 这 2403 个路径，恢复未跟踪；**磁盘文件一个未删**（`reports/` 下 7124 个文件仍在）；
- `.gitignore` 增补 `reports/consult-deepen/`、`reports/consult-rebuild/`，防止再次被 `git add -A` 带走；
- 未触碰任何源码/测试/已跟踪简报。tip 树内 `reports/` 已跟踪文件从 2881 降到 478。

**遗留**：这 2403 个对象仍在历史里（`2d19b99c` 及其后续），未推送前可选择重写历史彻底清除，需用户确认；不重写则只是历史体积变大，tip 树已干净。

其余卫生项：`trackedDirty=0`；未跟踪 188 项（另路 patrol 的 `patrol-20261106-0707/0807` 等）；根目录历史探针 `*.txt/*.csv` 1362 个（265 已跟踪）为长期技术债，未清。

## 7. 提交与推送

| 项 | 值 |
|---|---|
| 本轮提交 | `d934b698` chore(hygiene) 撤回误纳入的另路巡检产物；本简报一条 |
| 组织侧 9 条 | `42c976f9`…`e7f6bc92` 随本轮一并推送 |
| 推送 | `gitcode` + `mirror`，`consult-agent-m86` → 双方 `master` 与本分支 |
| 核对 | `git ls-remote` 四 ref 与本地 HEAD 逐位一致，值见本轮回复（简报不写死最终 SHA） |
| 未推 | `origin`、`heagentos`；未打 tag |

## 8. 遗留风险与下一轮重点

1. **lint 基线 7499 error**：能跑但不可当门禁。下一步要么定「只对变更文件 + 新增代码 0 error」的差分门禁，要么分批清理到可 `--max-warnings 0`；`lint:ci` 目前必然失败。
2. **scripts 目录 tsconfig 覆盖不全**：`verify-roles.ts` 等仍触发 project-service parsing error，需把 scripts 全量文件纳入或给独立 tsconfig。
3. **S3 仍未接线**：装饰层与分层 store 都有了，但 `S3WormStore` 仍是 mock，`wormArchiveAggregator` 的 store 工厂还没切到 layered/resilience 组合；真接入还差「带 flag 的接线 + 断网回退实测」。
4. **E2E 只能在新进程上跑**：需在测试前置里显式断言/重启，或让测试自建独立 store，避免每轮红灯解释成本。
5. **`/ready` degraded 语义未拍板**（非生产 `auditStore=memory` 是否降级）；**`WORM_BACKEND` 默认是否改 fs** —— 两条仍待用户口径。
6. **BFF 无守护**：本轮 8080 已重启为 pid 27536，退出后仍需人工/巡检拉起。
7. **2403 个误纳入对象仍在历史**（见第 6 节），是否重写历史待定。
8. `gangos_` 存量 2 文件仍为 backlog；根目录 1362 个探针文件未清。

**下一轮重点**：lint 差分门禁落地与 scripts tsconfig 补齐；S3 接线是否开工；E2E 前置自检；继续双 tsc + 九文件单测 + E2E ×2 + 品牌/路由全量复跑。
