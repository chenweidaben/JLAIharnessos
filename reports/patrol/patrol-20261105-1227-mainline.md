# 健澜仓库滚动巡检简报 · 2026-11-05 12:27 槽位（主线）

> 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`　分支：`consult-agent-m86`
> 基线 HEAD：`8a00f24b`（12:02:15 `docs(patrol): P5-7 简报与台账同步最终态`）
> 本简报按纪律**不写自身最终 SHA**，SHA 只在巡检回执中报。

## 1. 本轮核心结论

P5-7 组织侧宣称的「防自激双保险」（`excludeFromArchive` 标记 + tick 历史独立存储）经主线核查为**只有消费端、没有生产端**的空转实现：`AuditEvent` 上有该可选字段，`seal()` 与 `queryAuditEventsCount()` 也写了过滤，但全仓无任何代码把该标志置为 `true`，`/api/v1/worm/auto/tick`、`/api/v1/worm/segments/seal` 仍按普通业务写记入审计链 → 每 tick 自我喂养一条待归档事件 → 阈值被自己推高 → 封段把 tick 自己的记录封进段，即文档中声称「已解决」的自激。

本轮已完成：根因定位 → 方案取舍 → 就地修复 → 单测覆盖 → 双 tsc/E2E/审计回归复跑 → 运行时实测验证 → 台账口径同步。

## 2. 组织智能体状态

| 项 | 值 |
|---|---|
| 智能体 | `o_000Rfj7NkAk`（HIS-EMR 一体化复刻与脱敏升级，thread `60620697200580098`） |
| status | 2（finished / idle-resumable），overall 95% executing |
| version | 355，round 4777–4781，updated_at 1793850980 |
| 摘要 | 停在「P5-7 自证复核完成、粗筛达标、LRU 未达标、E2E 21/0/60、P4 37/0/82、commit `85eb9ded`+`6eb41c5a`」 |
| 判定 | 摘要滞后 6 个提交（git 实证 HEAD 已含 `1a75e961`/`e6207a62`/`9b0ed348`/`001062ca`/`8a00f24b`）；无新切片产出，属可续跑待唤醒，非停工。本轮收口后唤醒，续派 SM2 密钥轮换 + KMS/HSM 接口抽象（当前 `demo-ephemeral`，生产不可用） |

## 3. 工具链与门禁（本轮现跑，均为主线独立复跑）

| 门禁 | 命令 | 结果 |
|---|---|---|
| 工具链 | `node -v` / `bun -v` / `npm -v` | `v22.23.2` / `1.2.0` / `10.9.8` |
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit` | **exit 0，日志 0 字节**（`logs/patrol-1227-tsc-root2.log`） |
| web tsc | cwd=`web`，`bun x tsc --noEmit` | **exit 0，日志 0 字节**（`logs/patrol-1227-tsc-web2.log`） |
| WORM 单测 | `bun test ./tests/unit/wormArchive.test.ts ./tests/unit/auditEventHook.test.ts` | **65 pass / 0 fail / 191 expect（2.11s）** |
| P4 审计回归 | `bun test auditEvents+auditReport+auditEventHook` | **40 pass / 0 fail / 59 expect（90ms）** |
| WORM E2E | `bun test ./tests/integration/worm-e2e.test.ts` | **21 pass / 0 fail / 61 expect（2.00s）**，无假红（BFF 已重启清库存） |
| 品牌 17 词 | 遍历 `src`+`web/src` 9808 文件逐词 Ordinal `IndexOf` | **hits=0，hitFiles=0** |
| 路由体检 | `node logs/route-audit.cjs` | 2870 声明 / 2870 唯一 / **0 dup** / 2863 lazy / 0 missing |

## 4. 运行态（BFF 已重启加载修复代码）

| 端口 | 进程 | 启动 | 说明 |
|---|---|---|---|
| 8080 | bun pid **3408** | 12:41:58 | `bun run src/bff/index.ts`（本轮重启，替换原 pid 35176） |
| 5173 | node pid 6528 | 10:51:27 | `node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173` |
| 3000 / 8000 / 9090 | — | — | 无监听 |

| 端点 | 状态 |
|---|---|
| `/health` | 200（len 2） |
| `/ready` | 200（len 115） |
| `/api/v1/health` | 200（len 162） |
| `/api/v1/system/health` | 200（len 145） |
| `/metrics` | 200（len 18362） |
| `5173/` | 200（len 894） |
| `/api/v1/worm/store/info` | 401（admin 鉴权，预期） |

## 5. 本轮处理项（P5-7 防自激）

### 5.1 根因

- `src/bff/middleware/auditEventHook.ts` 的跳过名单只含 `/api/v1/audit/`、`/health`、`/ready`、`/metrics`、`/livez`、`/version`、`/ws/` 与 `/api/v1/health`、`/api/v1/system/health`；`/worm/auto/tick`、`/worm/segments/seal` 不在其中，被记成普通 `create` 事件。
- `Grep 'excludeFromArchive'` 在 `src/bff` 只有类型声明与两处过滤，**零赋值** → 标志永不生效。

### 5.2 方案取舍（为什么不用 `excludeFromArchive`）

先按「记录但排除出段」实现（加 `RecordInput` 透传、hook 传标记、`seal()`/计数过滤），随后核查 `checkSeqContinuity()`：

```
相邻段校验：nextFrom !== prevTo + 1 → push gap → valid = false
```

被排除的事件仍占用 seq。tick 事件落在段边界之后（seal 结束后立刻产生下一条 tick 事件），下一段 `fromSeq` 必然跳过它 → **gaps 非空 → `verify(scope=real).valid=false`**。对 WORM 产品而言，这是把「已合规」改成「永久报 broken」，不可接受。

最终实现：**归档控制面调用与 `/api/v1/audit/`、`/health` 同规则，不进审计链。**

- `src/bff/middleware/auditEventHook.ts`：新增 `ARCHIVE_CONTROL_PATHS = {'/api/v1/worm/auto/tick','/api/v1/worm/segments/seal'}`，带注释说明取舍依据，并在 `SKIP_EXACT` 判断后 `return`。
- `src/bff/aggregators/auditEventAggregator.ts`：移除 `AuditEvent.excludeFromArchive` 与 `RecordInput` 透传字段（无生产端，去死代码）。
- `src/bff/aggregators/wormArchiveAggregator.ts`：`queryAuditEventsCount()` 与 `seal()` pending 过滤回归纯 `seq > lastArchivedSeq`，注释说明「控制面不进链 → pending 是连续一段，段间无缝」。
- 可观测性不降级：tick 落 `<wormDir>/_history.json`（环形 1000 条），seal 落段记录（segmentId/sealedAt/fromSeq/toSeq/eventCount/segmentHash）。

### 5.3 单测覆盖（新增 7 例）

`tests/unit/auditEventHook.test.ts` 新增 4 例：tick×3 不落事件、seal 不落事件、`/engagement/reports` 照常记录（1 条且 hash 64 hex）、`/worm/auto/config` 不被误跳。

`tests/unit/wormArchive.test.ts` 新增 3 例：pending 计数与段对齐（3→0→2）、连续封段 `s2.fromSeq === s1.toSeq + 1` 且各 eventCount=2、无新业务事件时两次 tick 均 `sealed=false` 且 `total===1`。

### 5.4 运行时实测（重启后 BFF，pid 3408）

- 复位 → `POST /api/v1/worm/auto/config {enabled:true, intervalMs:999999, threshold:999999}` → 连打 6 次 `POST /api/v1/worm/auto/tick {}`。
- `GET /api/v1/worm/auto/history?limit=8`：6 条记录 **`pendingBefore` 恒为 8，`segmentsBefore/After` 恒为 1→1，`sealed=false, reason=below-threshold`** → tick 不再喂养待归档池，自激消除。
- `POST /api/v1/worm/verify?scope=real` → `valid=true, realChainValid=true, digestValid=true, signatureValid=true, seqContinuity.valid=true, gaps=[], duplicateSeq=[], outOfOrder=false, segmentCount=1`。
- `GET /api/v1/worm/segments?limit=3` → `WORM-0001-mw327d4o seq=1 from=1 to=1 eventCount=1`，`sourceChainValid=true`。
- 收尾 `POST /api/v1/worm/auto/config {enabled:false,...}` 还原（返回 200，`enabled=false`）。

### 5.5 台账同步

`docs/research/2026-11-03-his-emr-integration-benchmark.md` 第 475 行 P5-7 行原「`excludeFromArchive` 双保险」表述与实现不符，已就地订正为「控制面不进审计链」并补 ⑪ 1227 主线复核口径（含运行时 pending 恒定与 verify 全绿）。

## 6. 仓库卫生

- tracked 改动：本轮 5 个源码/测试文件 + 台账 1 处（分组提交）。
- 未跟踪：**372 项，全部位于 `reports/`**（另一路 consult 任务产物，`reports/consult-deepen/patrol-*` 逐轮目录；本主线不代提交、不删除；较上一轮 371 +1）。
- `.gitignore:33` 覆盖 `logs/`，本轮全部日志与探针脚本（`patrol-1227-*.log/.ps1`）均不入库。

## 7. 分组提交

| 组 | 语义 | 文件 |
|---|---|---|
| A | `fix(worm): 归档控制面调用不进审计链，消除 P5-7 自激封段` | `src/bff/middleware/auditEventHook.ts`、`src/bff/aggregators/auditEventAggregator.ts`、`src/bff/aggregators/wormArchiveAggregator.ts`、`tests/unit/auditEventHook.test.ts`、`tests/unit/wormArchive.test.ts` |
| B | `docs(patrol): P5-7 台账口径订正与 1227 巡检简报` | `docs/research/2026-11-03-his-emr-integration-benchmark.md`、`reports/patrol/patrol-20261105-1227-mainline.md` |

## 8. 双仓推送与 SHA 核对

推送口径：`git push gitcode consult-agent-m86:master` + `git push mirror consult-agent-m86:master`（不推 `origin`、不推 `heagentos`、不打 tag）。推送后分别 `git ls-remote` 读 `refs/heads/master` 与 `refs/heads/consult-agent-m86`，与本地 `HEAD` 逐位比对——**本轮三端 SHA 值见巡检回执**（简报不写死自身 SHA，避免自我指涉循环）。

## 9. 遗留风险与下一轮重点

1. **LRU 性能口径未闭环**：组织侧报「粗筛降幅 99.7%，LRU D/C=13.9%」，但同批自述 `store.count()` 目录读是瓶颈、LRU 对总耗时无可观测贡献；本批 `FileWormStore` 内存索引（`1a75e961`）已把 `count()` 变 O(1)，但**尚无主线侧复测数字**。下一轮补一次真加密段基准（全扫 / 粗筛首次 / 粗筛重复 三档，同一进程、同一数据集）。
2. **`limit>500` 截顶只有单测覆盖**：运行时实测 `limit=10000` 时实际仅 58 行，未触发截顶路径；`limit=-5&offset=-3` 归一已实测。若要运行时证据，需先造 >500 行数据。
3. **DEMO_MODE 下 SM2 临时密钥**：fs 后端重启后老段验签依赖 `demo-ephemeral`，重启即失效（本轮重启后 `segmentCount=1` 即此效应的直接后果）。是否接受「演示态不跨重启验签」需产品口径；生产必须走 KMS/HSM。
4. **372 个未跟踪 `reports/` 项**归属另一路 consult 任务，长期未收口，建议由该路任务自行 commit 或加 `.gitignore` 例外规则。
5. **组织智能体摘要滞后 6 个提交**：建议其每轮收口前先 `git log --oneline -8` 对齐自述，否则主线需反复用 git 反证。
6. **探针口径坑（本轮踩到）**：`/api/v1/worm/verify` 是 **POST**，用 GET 打会 404，且脚本随后请求出现 401（改用正确 POST 口径后连续 11 次请求全 200、同一 token 12 次 GET 复测也全 200，判定为脚本侧口径错误而非服务端缺陷）；`auditEventHook` 对 `/api/v1/worm/*` 已加控制面跳过，但 `/api/v1/audit/events` 对自造 admin JWT 的返回曾出现一次 401，未复现，下一轮定口径复测。

## 10. 日志索引（均被 `.gitignore` 覆盖）

`logs/patrol-1227-tsc-root.log`(0B) / `-tsc-web.log`(0B) / `-tsc-root2.log`(0B) / `-tsc-web2.log`(0B) / `-unit-worm-fix.log`(65/0/191) / `-e2e2.log`(21/0/61) / `-unit-audit2.log`(40/0/59) / `-gates.log`（六端点+端口+品牌+路由+卫生） / `-probe4.log`（运行时防自激探针） / `-jwt-debug.ps1`、`-probe*.ps1`（探针脚本）
