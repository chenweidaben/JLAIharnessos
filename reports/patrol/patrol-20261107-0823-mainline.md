# 巡检简报 · 2026-11-07 08:23 轮（主线独立复核）

- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 分支：`consult-agent-m86`　双推：`gitcode`(JLMEDAIOS) + `mirror`(JLAIharnessos)
- 本轮起点 HEAD：`4c5cdd9c`（组织侧三轮自交后未推）
- 本轮收口 HEAD：`2b5bffca`（brand-gate 词表修复，本简报提交后再推一次）
- 结论：五步门禁 5/5 PASS；产品代码域品牌残留 0；文档域残留首次精确量化（1013 处/132 文件），其中产品文档 106 处为真实脱敏债。

## 一、组织智能体进度

`peek_task_progress(o_000Rfj7NkAk)`：`status=2 finished`、100%、version 758、round 11133→11138、`reason=flush`。

自报摘要与主线实测的差异：

| 组织侧自报 | 主线实测 | 判定 |
|---|---|---|
| P5-27 验收 ALL_GREEN 收官（双口径+注入自证） | 默认 181/0/512 PASS；`-WithChain` 186/0/522 PASS；注入 `-Baseline 185/0/522` → `diff pass=1` FAIL exit 1 | 采信（注入自证成立，数字是真算出来的） |
| P5-26 双 tsc 与断库自证已完成 | tsc 双 PASS；真停库后 `/ready` = `degraded` + `auditStore:"unreachable"` + 200；拉库后 6 次轮询全 `ok/pg/true` | 采信（本轮为首次自己取证，非转述） |
| P5-25 brand-gate 初版跑通、backlogGangos 逻辑待修 | 词表结构性漏报（见第三节），本轮由主线修复 | 未采信自报"跑通"，已重写 |

`84760dca`（`/ready` 增 `dbReachable`）、`14cf7d5b`（`gate-unit` 双口径）、`4c5cdd9c`（双简报）三个 commit 均在本轮起点 HEAD 链上，内容与自报一致。

## 二、工具链与双 tsc（实测）

- node `v22.23.2`、bun `1.2.0`（全路径 `C:\Users\lenovo\.bun\bin\bun.exe`）、npm `10.9.8`
- 根 tsc：`node node_modules/typescript/bin/tsc --noEmit` → exit 0，28s
- web tsc：cwd=`web`，`bun x tsc --noEmit` → exit 0，55s
- 日志：`logs\patrol-0823-gateall-final.txt`（本轮 HEAD `2b5bffca` 上复跑）

## 三、品牌门禁：本轮主修项（结构性漏报）

**发现**：`scripts\brand-words.b64.txt` 原有 30 条全部是 HIS 厂商适配器名，**不含任务书点名的 10 类违规词**（竞品真名、旧代号、拼音/中文误写）。也就是说，过往所有 `hardViolations: 0` 只证明"这 30 个适配器名不存在"，对被点名的品牌词天然失明。

**次生 bug**：`brand-gate.ps1` 中 `if ($rel -like 'logs\*')` 写在 `$rel` 赋值之前，PowerShell 下取到的是上一轮迭代的残留值，根目录 `logs\` 排除判定长期不可靠。

**修法**（`2b5bffca`）：
- 词表扩到 40 条：30 条 literal（保留旧行为，`OrdinalIgnoreCase`）+ 10 条 `RE:` 正则（拉丁词严格词边界，避免把 `winningSupplierId`、`isWinning` 这类业务标识误判为厂商名；`gangos_` 指标前缀继续单列 backlog）。
- 脚本支持两类条目，正则预编译校验，坏正则以 `FAIL: bad regex entry` exit 1。
- 输出增加 `scope:` 与 `hardViolations: N (code=X doc=Y)`，一眼区分产品代码与文档域。
- 修正 `$rel` 顺序 bug；文件以 UTF-8 BOM 回写（PS 5.1 硬要求）。

**自证（三向，均实跑）**：

| 场景 | 结果 |
|---|---|
| 默认 scope（`src,web/src`） | `words loaded: 40 (literal=30 regex=10)`、`filesScanned: 9816`、`hardViolations: 0 (code=0 doc=0)`、`backlogGangos: 13`、PASS exit 0 |
| 外部 fixture（第 2 行旧代号、第 4 行中文误写） | `filesScanned: 1`、`hardViolations: 2`、行号 2/4 命中、`backlogGangos: 1`、FAIL exit 1；fixture 已删并复核 `Test-Path=False` |
| 全仓 `-Paths '.'` | `filesScanned: 18337`、`hardViolations: 1018 (code=5 doc=1013)`、FAIL exit 1 |

**作用域口径澄清（重要，供后续轮沿用）**：
- `9816 = src 5244 + web/src 4572`，即门禁默认**只扫产品代码**；`docs`(294 文件)/`reports`(529)/`tests`(2317) 均不在默认范围。上一轮把 9816 当成"全仓文件数"是错的。
- 全仓 1018 处的真实分布：`reports\` 905 处 / 110 文件、`docs\` 106 处 / 19 文件、根 `.md` 2 处、`web\dist\` 本地构建产物 4 处。
- 代码域真违规 **0**：`src`,`web/src`,`scripts`,`tests`,`deploy` 无一处命中；`code=5` 全部来自根 `RELEASE_NOTES`、`verification-report` 与 `web\dist`（均非产品源码；`web/dist` 已被 `web/.gitignore:7` 忽略、`git ls-files` 为 0，属本地旧构建残留，重新构建即消失）。
- `reports\` 的 905 处多为审计/合规/巡检报告**引用违禁词以报告违禁词**（如 `03-brand/brand-compliance-report.md` 46 处），属证据性引用，不宜按违规处理；`docs\` 的 106 处是商业分析文档里的真实厂商名，才是脱敏债。

## 四、单测与 E2E

- 单测默认口径：`actual 181 / 0 / 512` = expected，PASS（11s）
- 单测 `-WithChain`：`actual 186 / 0 / 522` = expected，PASS
- 注入自证：`-WithChain -Baseline '185/0/522'` → `FAIL: diff pass=1 fail=0 expect=0`，exit 1（证明数字真算）
- E2E：拉库后 `actual 23 / 0 / 83` = expected、`port 8081: clean`、PASS（10s）
- 日志：`patrol-0823-gateall.txt`、`patrol-0823-unit-withchain.txt`、`patrol-0823-unit-inject.txt`、`patrol-0823-gatee2e.txt`

## 五、P5-26 停库/拉库两向自证（本轮最硬取证）

实现（`src\bff\server.ts` 6914–6958）：`dbReachable = await store.ping()`（`SELECT 1` + `Promise.race` 2s，不能用 PG `statement_timeout`——连接层挂掉时语句发不出去）；`auditStore` 三分支 `pg`/`unreachable`/`memory`；非生产 `degraded`+200，生产 `fail`+503。

实测（停库前 `audit.events=2877`）：
- 停库（`pg_ctl -D C:\postgres\data2 -m fast stop`，5433 无监听）→ 连测两次 `HTTP=200` + `status:"degraded"` + `auditStore:"unreachable"` + `dbReachable:false`
- 拉起（`Start-Process C:\postgres\pgsql\bin\postgres.exe -D C:\postgres\data2 -p 5433`，2s 即 LISTEN）→ 6 次轮询全 `HTTP=200 / ok / pg / true`
- 数据未丢：`POST_AUDIT=2877`、`POST_MIGRATIONS=349`

结论：`/ready` 的"探针说谎"已被组织侧修成真实连通性。

## 六、运行态（08:37 实测）

| 端口 | 状态 |
|---|---|
| 3000 / 8081 / 9090 / 5174 | 无监听 |
| 5173 | pid 51604（外部沙箱 vite，非本仓；本仓前端仍未起） |
| 8080 | pid 46600（`bun src/bff/server.ts`，父进程 47276 已死 → 孤儿进程，第五代：45332→44264→41448→33500→46600） |
| 5433 | pid 240（本轮拉起） |

五端点全 200：`/health` 2B、`/ready` 234B、`/api/v1/health` 165B、`/api/v1/system/health` 145B、`/metrics` 4149B。

`/ready` 当前：`{"status":"ok","auditStore":"pg","dbReachable":true,"sealDisabled":true,"sealDisabledReason":"audit-backfill-truncated","wormBackend":"memory","uptimeSec":6172}`。

`sealDisabled=true` 属**既有状态**（`audit.events=2877 > 默认 limit 1000`），非停库所致——即"重启后 BFF 一律失去 seal 能力"，未落脚本，仍待拍板。

## 七、仓库卫生

- 根目录探针 `.txt` 1361、`.log` 762；`logs\` 5007 文件（`.gitignore` 已覆盖 `logs`、`*.log`、`*.txt`）
- untracked 40 行：`pgdata/` 运行态漂移（`base/**`、`global/pg_control`、`pg_wal/*`、`postmaster.opts`、`pg_stat/`）+ 另一路 consult 的 `reports/patrol/patrol-2026{1103,1104}*.md` 等（**不代提交、不删除**）
- `pgdata/` 仍被 git 跟踪 2220 文件（本轮起库又产生工作区漂移，未提交）
- `web/dist` 未纳入版本控制（`git ls-files` 0），旧构建产物内含厂商名，重新构建即可清掉

## 八、本轮 commit 与双推

| 分组 | commit | 内容 |
|---|---|---|
| 组织侧（本轮起点已在链上，首次推送） | `84760dca` | `/ready` 真实连通性 `dbReachable` + `auditEventStore.ping` |
| | `14cf7d5b` | `gate-unit` 双口径 `-WithChain` |
| | `4c5cdd9c` | 双简报 |
| 主线（本轮） | `2b5bffca` | brand-gate 词表补齐点名违规词 + 边界匹配 + code/doc 作用域计数 + `$rel` 顺序修复 |
| 主线（本轮） | 本简报 commit | `reports/patrol/patrol-20261107-0823-mainline.md` |

推送口径：`git push <remote> consult-agent-m86:master consult-agent-m86`，仅 `gitcode` 与 `mirror`；不推 `origin`（HTTPS token）、不推 `heagentos`、不打 tag。

四 ref 核对：`git ls-remote <remote> refs/heads/master refs/heads/consult-agent-m86`，两端共 4 个 SHA 需与本地 HEAD 逐位相等。核对结果记在 `logs\patrol-0823-lsremote.txt`，最终值见本轮回复（values 与本地 HEAD 一致方可判定收口）。

## 九、遗留风险与下一轮重点

1. **文档域脱敏（新量化）**：`docs\` 19 文件 106 处真实厂商名 → 下一轮可做成独立批次（按文件逐篇改脱敏代称，改完以 `-Paths 'docs'` 复核为 0）；`reports\` 905 处属证据性引用，建议明确豁免口径而不是逐条改，避免把审计报告改成"看不出在审谁"。
2. **`brand-scan.mts` 与 `brand-gate.ps1` 双实现口径**：本轮只改了 `.ps1` 与词表，未确认 `brand-scan.mts` 是否同步 10 条正则 → 下一轮必须先对齐，否则两套口径继续分叉。
3. **`AUDIT_BACKFILL_LIMIT` 未落脚本**：重启即失 seal 能力，现状靠手工传 `10000`；待拍板 A/B/C。
4. **BFF 第五代孤儿进程**：46600 父进程已死仍服务，反复"消失无异常栈"原因未查明；`/ready` 的 uptime 可作重启证据。
5. **`pgdata/` 入库 2220 文件**：清理涉历史重写，未动。
6. **本仓前端 5174 仍未起**：5173 被外部沙箱占用，工作台入口可用性未验证。
7. `gangos_` 指标前缀 13 处（`src\bff\observability\metrics.ts`、`src\core\observability\metrics.ts`）仍为专项 backlog，未清理。

## 十、待用户拍板（跨轮累积，未自行决定）

1. `AUDIT_BACKFILL_LIMIT` 上限策略（A 调大 limit / B 归档后截断 / C 冷热分离；推荐 B，须 dry-run）
2. `pgdata/` 是否从版本库摘除（历史重写风险）
3. `WORM_BACKEND=memory` 默认是否改 `fs`
4. `layered.put` 断网兜底 A/B/C
5. `AUDIT_DB_SCHEMA` 优先级
6. 演示环境明文口令取舍
7. `docs/` 脱敏批次范围与节奏（本轮首次给出可执行口径：19 文件 / 106 处）

---
本轮所有结论均来自本机实跑，未采信组织侧"ALL_GREEN"自报；未绿项已如实列出。
