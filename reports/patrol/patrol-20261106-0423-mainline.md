# 健澜仓库滚动巡检简报（2026-11-06 04:23 槽位）

- **本轮时间**：2026-11-06 04:23 触发，04:2x–04:3x 完成收口（仓库时间 +08:00）。
- **仓库/分支**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，`consult-agent-m86`。
- **进入本轮 HEAD**：`a4201813`（组织侧 P5-14 第 5 条，02:52:00，未推送）。
- **本轮代码改动**：无（组织侧 P5-14 独立复跑全绿，未发现需就地修复的 P0）。

## 1. 组织智能体状态

| 项 | 值 |
|---|---|
| 组织者 | `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级） |
| 状态 | `status=2` finished，overall 100% |
| version / round | 510 / 6699–6703（`updated_at_unix=1793904614`） |
| 本轮新增产出 | 5 条提交（E2E 前置断言 + key-ops 按实例分文件 + mkdir 回归修复 + 简报 + 简报修订） |
| 处置 | 已完成进入 idle-resumable；复跑通过后本轮末尾唤醒续做下一批 |

旧智能体 `o_000pZ6W0z5F` / `o_000pKWRkDCO` / `o_000EkD3iWsb` / `o_000E2mfsz5X` 已终态，不再巡查。

## 2. 工具链

node `v22.23.2`、bun `1.2.0`、npm `10.9.8`、git `2.54.0.windows.1`。

## 3. 门禁实测（主线独立复跑，非沿用组织侧自报）

| 门禁 | 结果 | 取证 |
|---|---|---|
| 根 tsc | exit 0 / 0 字节 | `logs/patrol-0423-tsc-root.log` |
| web tsc | exit 0 / 0 字节 | `logs/patrol-0423-tsc-web.log` |
| 六文件单测（worm 四件 + keyOpsStore + auditEventHook） | **125 pass / 0 fail（18.22s）** | `logs/patrol-0423-unit.log` |
| 审计持久化三件（store/events/globalRateLimit） | **42 pass / 0 fail（109ms）** | `logs/patrol-0423-unit-audit.log` |
| E2E 第 1 轮 | **23 pass / 0 fail（6.00s）** | `logs/patrol-0423-e2e-R1.log` |
| E2E 第 2 轮 | **23 pass / 0 fail（7.30s）** | `logs/patrol-0423-e2e-R2.log` |
| 运维审计并发脚本 | **PASS**：300 条写读回 300、files=3、malformed=0、unique actor 300；边写边读 200/200 | `logs/patrol-0423-concurrency.log` |
| fs 后端验收脚本 | **8/8 PASS**（`wormBackend=fs`、seal 接续 336→337→338、`valid=true gaps=[] segmentCount=3`、重启后仍可 seal） | `logs/patrol-0423-fsverify.log` |

- 路由体检：`2870` 声明 / `2870` 唯一 / `0` 重复 / `2863` lazy / `0` 悬空（`logs/patrol-0423-route.log`）。
- 品牌 17 词 Ordinal 扫描（`src`+`web\src` 逐文件）：**files=9811，hits=0，hitFiles=0**。
- 组织侧 P5-14 简报（`reports/patrol/patrol-20261106-0250-p5-14-keyops-concurrency.md`）单独重扫：**hits=0**（其上一轮自造违规已被 `a4201813` 修正）。

## 4. 运行态

| 项 | 实测 |
|---|---|
| 8080 | LISTEN pid **42728**（bun，02:49:31 起，晚于代码提交 `85ed950e` 02:45:39，加载的是当前代码） |
| 5173 | LISTEN pid 36328（node/vite，2026-11-05 22:28:04），持续稳定 |
| 3000 / 8000 / 9090 | 无监听 |

端点实测：`/health` 200/2B、`/ready` 200（`wormBackend=memory, auditStore=pg, uptimeSec=5782`）、`/api/v1/health` 200/165B、`/api/v1/system/health` 200/145B、`/metrics` 200/38038B、`5173/` 200/838B。

`/metrics` 已含 `jlmedaios_audit_persist_failed_total 0`（HELP/TYPE/值三行齐全，前缀为自有品牌 `jlmedaios_`）。

## 5. P5-14 复核结论

1. **E2E 前置断言成立**（`bc88c29b`）：`tests/integration/worm-e2e.test.ts:50-56` 在 `keySource === 'env'` 时直接抛出「E2E 前置条件不满足」并点名 `EnvKeyProvider`，把上一轮 9 条散乱红灯收敛为 1 条明确前置失败，且不是静默 skip。
2. **运维审计流并发写改造成立**（`7e0d0ffd`）：写入改为 `_key-ops-<instanceId>-<YYYYMMDD>.jsonl` 单行 `appendFileSync`，读改为 glob 合并、坏行计数，彻底消除读-改-写覆盖；并发实证 300/300、malformed=0。
3. **旧格式迁移**：`_key-ops.json` → `.migrated` 幂等迁移；两实例同时首次启动存在毫秒级重复追加窗口，后果是「重复一遍」而非丢失，一次性窗口可接受（简报已注明滚动升级先单起一个实例）。

## 6. 本轮新发现（未就地修复，登记为下一批）

**P1：`cleanupOldKeyOps` 是死代码，且语义本身不可达 —— 运维审计文件会无限增长。**

- 证据：全仓 grep 仅 1 处定义（`src/bff/aggregators/keyOpsStore.ts:130`）+ 2 处单测/文档引用，**无任何生产调用点**；`server.ts` 启动流程未调用。
- 语义缺陷：`INSTANCE_ID` 含 `pid + 随机串`（`keyOpsStore.ts:33`），每次重启即换新 id；而清理逻辑只删「文件名含本实例 id」的文件（`:140`）。因此上一个进程的文件永远不会被任何进程清理，`readKeyOps` 会永久累积读取。
- 合规冲突：默认 `maxAgeDays = 30`，低于网络日志留存 6 个月的要求；一旦真被接上调用，会删掉本应留存的审计记录。
- 建议修法（下一批交给组织侧）：改为按文件名日期跨实例清理；默认值抬到 ≥180 天；只在显式运维入口（独立脚本或受环境变量开关控制的任务）触发，不做进程内静默自动删除；单测同步改断言（现有 `keyOpsStore.test.ts:99` 「只删本实例旧文件」的用例把错误策略固化成了预期）。

**P2：运行态 WORM 仍是 memory。** `/ready` 实测 `wormBackend=memory`，与 `auditStore=pg` 构成被守卫拦下的组合（开发环境仅告警）。dev 重启仍会重复归档旧 seq，只有生产被 `process.exit(1)` 拦住。默认后端是否切 `fs` 仍待拍板。

## 7. 提交与推送

| 项 | 值 |
|---|---|
| 组织侧 5 条（本轮复核后一并推送） | `bc88c29b` E2E 前置断言 · `7e0d0ffd` key-ops 按实例分文件 · `85ed950e` 写入前递归建目录 · `44a88a34` P5-14 简报 · `a4201813` 简报移除品牌词元引用 |
| 主线 | 本简报（无源码改动） |
| 推送 | `gitcode` 与 `mirror`，`consult-agent-m86` → 双方 `master` 与本分支；`ls-remote` 四 ref 逐位核对见本轮回复（简报不写死最终 SHA） |
| 未推送 | `origin`、`heagentos`；未打 tag |

## 8. 仓库卫生

- `trackedDirty=0`；未跟踪 **405 项全部位于 `reports/`**（另一路 consult 任务产物与历史简报），本主线不代提交、不删除。
- `logs/` 被 `.gitignore` 覆盖（`git status --porcelain logs` 为 0 项）；本轮取证日志与 fs 验收临时目录均在 `logs/`，不入库。

## 9. 遗留风险与下一轮重点

1. **P1 见第 6 节**：key-ops 清理死代码 + 语义不可达 + 30 天与 6 个月留存冲突。
2. **D（S3 / SIEM Syslog-CEF）未做**：无真实环境，只能出接口 + 契约测试 + mock，并标注未联调。
3. **`/ready` 恒 200 的 degraded 语义未拍板**（`auditStore=memory` 时是否降级）。
4. **`WORM_BACKEND` 默认 memory**：dev/演示环境重启会重复归档；彻底修法是 `NODE_ENV=test → memory`、其余默认 `fs`，需连带改 E2E 的 storeDir 隔离——应单独立项。
5. **BFF 无进程守护**：本轮 8080 由组织侧 pid 42728 持有，一旦退出仍需人工/巡检拉起。
6. **11 个 `scripts/` 历史脚本类型债**、**405 项未跟踪 `reports/`**、**本地 `master` 历史指向** 均未定。

**下一轮重点**：复核 P1 修复（跨实例按日期清理 + 留存期抬至 ≥180 天 + 单测改断言）；D 的 mock 契约测试；继续双 tsc + E2E 两轮 + fs 8 项全量复跑。
