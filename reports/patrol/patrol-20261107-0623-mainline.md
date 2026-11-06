# 巡检简报 · 2026-11-07 06:23 轮（主线独立复跑）

- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- 本轮起点 HEAD：`7d8968bda99676ce0a7c51266d04d1d0c02320e5`
- 采证时刻：06:23 – 06:52（CST）
- 宿主：Windows + Windows PowerShell 5.1 跑 `.ps1` 门禁，pwsh 7 跑运维命令；Bash 不可用，全部命令走 PowerShell，路径一律 `-LiteralPath`

## 一、本轮结论（先说结果）

1. **五步门禁全绿**：`gate-all.ps1` 五步全 PASS，`OVERALL: PASS`，exit 0（tsc-root 31s / tsc-web 61s / gate-unit 11s / gate-e2e 12s / brand-gate 9s）。
2. **品牌口径首次三向一致**：`brand-gate.ps1`、主线 python 扫描器、组织侧 `brand-scan.mts` 全部报 **9816 文件 / 硬违规 0 / backlogGangos 13**。
3. **修复了一条真实的运行态中断**：本机 PostgreSQL（5433）已非正常终止，E2E 无法启动 BFF；本轮已定位到正确数据目录并拉起，DB 数据未见丢失（`audit.events=2877`、`schema_migrations=349`）。
4. **工具误报已修**：`gate-e2e` 原先把"数据库不可达"报成"测试断言差异"（`diff pass=-23 fail=23`），现改为独立判定并明示 `dependency unavailable`，仍 exit 1。

## 二、组织智能体状态（`o_000Rfj7NkAk`）

- 状态：`finished` / 100% / version 742，自报"P5-9 到 P5-25 多轮验收全部 ALL_GREEN 收官"。
- 自报基线：HEAD `7d8968bd`，`gate-all` 全绿、材料齐全。
- 主线复核：**其自报的 gate-all 全绿发生在 PG 仍存活的时间窗内**，本轮 PG 中断后已不成立；其遗留的"9815 比 9816 少 4、未定死"本轮已给出答案（见第四节）。
- 本轮对组织侧：无新切片产出，按巡检纪律唤醒并下发 P5-26 / P5-27 两片（见第八节）。

## 三、门禁与测试（主线独立复跑，不采信组织侧自报）

| 步骤 | 结果 | 耗时 | 关键值 |
|---|---|---|---|
| tsc-root | PASS | 31s | exit 0，日志 0 字节 |
| tsc-web | PASS | 61s | exit 0，日志 0 字节 |
| gate-unit | PASS | 11s | `181 / 0 / 512` = 基线（13 文件） |
| gate-e2e | PASS | 12s | `23 / 0 / 83` = 基线，8081 跑后清空 |
| brand-gate | PASS | 9s | `9816 / 0 / 13` |

工具链：node `v22.23.2`、bun `1.2.0`（`%USERPROFILE%\.bun\bin\bun.exe`，PATH 未注册）、npm `10.9.8`。

`gate-all` 非短路证据（同一轮内三次跑）：
- 默认跑 → 5/5 PASS，exit 0；
- `-BrandPaths <仓库外 fixture>` → brand-gate FAIL（`HARD: ...\logs\leak.ts:2`，行号正确）+ 其余步骤照跑，exit 1；
- `-UnitBaseline 180/0/512` → gate-unit FAIL，**brand-gate 仍然执行并 PASS**，exit 1。

## 四、本轮修掉的缺陷（全部有自证，不是声称）

### 4.1 `scripts/brand-gate.ps1`：按目录名排除会误杀产品页（两次同型错误）

- 原实现用 `-notmatch '\\logs\\'` 排除日志，结果把 **4 个日志业务页面**一并排除：
  `web/src/pages/audit/logs/index.tsx`、`web/src/pages/admin/Logs/index.tsx`、`web/src/pages/system/logs/index.tsx`、`web/src/pages/tenant/logs/index.tsx`。
  文中"排除仓库根 `logs/`"与"排除任何叫 logs 的目录"是两种语义，代码写成了后者。
- 修法：改为按**相对仓库根的路径**判定 `if ($rel -like 'logs\*') { continue }`，且在 `$filesScanned++` 之前判。
- 自证：修后 `filesScanned` 由 9812 → **9816**，与 python 枚举、`brand-scan.mts` 完全一致；逐文件 `Compare-Object` 差异集为空。

### 4.2 主线自己的扫描器同样按目录名误杀（`9815` 之谜的答案）

- 历史悬案"9815 比 9816 少 4"不在组织侧，**在主线的 `logs/brand-scan-mainline.py`**：它把目录名 `coverage` 当构建产物排除，扔掉了产品页 `web/src/pages/fhir/coverage/index.tsx`。
- 修法：目录排除只保留 `node_modules` / `.git`；修后主线扫描器报 **9816 / 24 词 / 13 命中 / 2 文件**。
- 教训：**目录名不是角色判据**，`coverage`、`logs`、`dist` 在不同层级含义不同；排除项只能锚定仓库根的确定位置。

### 4.3 `brand-gate.ps1` 其余收口

- 词表入库：新增 `scripts/brand-words.b64.txt`（30 条 base64 + 3 行英文注释），`brand-gate` 启动解码，坏行/空词表即 exit 1；旧明文词表仍在被忽略的 `logs/` 下，不再作为依赖（此前的"换台机器 clone 即 `words file not found`"问题消失）。
- `node_modules` 正则从过度转义的 `'\\\\node_modules\\\\'` 改回单层 `'\\node_modules\\'`。
- 绝对路径不再静默假绿：`ERROR: path not found` + exit 1；硬违规带真实行号。
- 后缀口径 10 类：`.ts .tsx .js .jsx .mts .md .css .json .yml .yaml`。

自证（fixture 建在仓库外，避免污染工作区）：
- 绝对路径 fixture（`...\_tmp_brand_fixture_0623\logs\leak.ts`，第 2 行埋词）→ `filesScanned: 1` / `hardViolations: 1` / `HARD: ...:2` / exit 1；
- 不存在路径 `C:\no-such-dir-0623` → `ERROR: path not found` / exit 1；
- fixture 跑完已删除（`Test-Path` 复核为 False）。

### 4.4 `scripts/gate-e2e.ps1`：依赖中断被误报成断言回归

- 原行为：DB 不可达 → BFF 起不来 → `BASE=null` → 23 条全红，汇总行只给 `diff pass=-23 fail=23 expect=-84`，读者会去查代码回归。
- 修法：判定日志含 `ECONNREFUSED|Failed to connect` 且 exit≠0 时，输出 `ERROR: dependency unavailable - PostgreSQL unreachable (not a test-assertion regression)` 并 exit 1。
- 自证：**实停库**跑一次 → 打印上述独立判定、exit 1；随后拉起库跑全量 → 5/5 PASS。即"只有它真生效才成立"的证据。

## 五、运行态

- 端口：3000 无；**5173 pid 51604**（外部沙箱 vite，非本仓）；**5174 无（本仓前端未起）**；**8080 pid 33500**（本仓 BFF，`bun src/bff/server.ts`）；8000 pid 36640（他项目）；9090 无；**5433 pid 50652（本轮拉起）**。
- BFF 自 `2026-11-07 02:27:28` 起持续存活，`uptimeSec=15633`（≈4h20m），**首次跨过 4 小时**（此前四次掉线均落在 2–4 小时内）。交叉观察到此为止，仍不足以断言"不再掉线"，需再跨 8 小时与一次重启验证。
- 五端点全 200：`/health`、`/ready`、`/api/v1/health`、`/api/v1/system/health`、`/metrics`；前端 5173 首页 200（714 bytes，非本仓页面，仅记账）。
- `/ready` 正文：`status=ok`、`wormBackend=memory`、`wormStoreDir="(in-process memory; not persisted)"`、`auditStore=pg`、`sealDisabled=false`。

## 六、PostgreSQL 中断与恢复（本轮最大运行态事件）

- 现象：5433 无监听、无 `postgres*` 进程、无服务、`docker` 不可用；所有 DB 取证脚本 `ECONNREFUSED`；`gate-e2e` 必红。
- 根因：本机 PG 被**非正常终止**（数据目录残留 `postmaster.pid`，进程已死；重启时日志出现 `consistent recovery state has not been yet reached`，即崩溃恢复）。
- 定位过程（记录弯路，避免下轮重犯）：`C:\Users\lenovo\pgsql16\data` 与仓库内 `pgdata` 各是一个**旧集群**（分别 129 / 64 个迁移、无 `audit.events`），先被误拉起又停掉；真正在服务 5433 的是 **`C:\postgres\data2`**（二进制 `C:\postgres\pgsql\bin\postgres.exe`，PG 16.15）。
- 恢复：清掉死进程的 `postmaster.pid` → `Start-Process postgres.exe -D C:\postgres\data2 -p 5433`（detached，`-WindowStyle Hidden`）。
- 恢复后对账：`audit.events=2877`、`schema_migrations=349`、consult 表 0 —— 与 04:23 记录**逐项一致**，崩溃恢复未造成可观测数据丢失。
- 未做：未尝试自动拉起脚本固化（启动方式仍是手工命令），列为下轮 P1。

## 七、仓库卫生

- 根目录探针 `.txt` 1361、`.log` 762；`logs/` 内文件 4871（本轮 +约 60，均为本轮取证日志，被 `.gitignore` 覆盖）；
- untracked 41 条，全部为另一路 consult 的 `reports/patrol/*.md`，按纪律**不代提交、不删除**；
- `git stash list` 空；
- 新发现（登记不下手）：**`pgdata/` 目录本身被 git 跟踪**，本轮启动数据库导致 `pgdata/base/**`、`pgdata/global/pg_control`、`pgdata/pg_wal/*` 出现改动。数据库二进制入库属结构性卫生问题，需单独立项（清理会触发历史重写，须用户拍板）。

## 八、本轮提交与双仓推送

分组提交（详见第九节 SHA 链）：
1. `fix(scripts): brand-gate 排除规则改按仓库根路径 + base64 词表入库` —— `scripts/brand-gate.ps1`、`scripts/brand-words.b64.txt`；
2. `fix(scripts): gate-e2e 断库判定为依赖不可用，不再报成断言回归` —— `scripts/gate-e2e.ps1`；
3. `docs(patrol): 20261107-0623 巡检简报` —— 本文件。

双仓：`gitcode`（GitCode JLMEDAIOS.git）+ `mirror`（GitHub JLAIharnessos.git），推 `consult-agent-m86:master` 与 `consult-agent-m86` 两 ref；未推 `origin`、未推 `heagentos`、未打 tag。三端 SHA 核对值见文末。

## 九、遗留风险与下一轮重点

**需用户拍板（沿用并新增）**
1. `/ready` 的 `auditStore=pg` 是**启动时装配结果**，不是当前连通性。本轮实测：库已挂时 `/ready` 仍 `status=ok`、仍报 `pg`。建议下一轮把 `/ready` 增加 `dbReachable: true|false`（非生产可降级 `degraded`，保持 HTTP 200），属产品语义变更，需拍板后再动。
2. `pgdata/` 入库问题（历史重写风险）。
3. 既有六项：`layered.put` 断网兜底 A/B/C、`AUDIT_DB_SCHEMA` 优先级、`WORM_BACKEND` 默认是否改 `fs`、演示环境明文口令取舍、`AUDIT_BACKFILL_LIMIT` 上限策略、`/ready` 非生产降级。

**本轮下发组织侧的两片**
- **P5-26**：`/ready` 增加真实连通性字段（含 DEMO_MODE 下不得报 `pg` 的断言），并给出"断库时字段必须翻 false"的自证。
- **P5-27**：`tests/unit/auditChainVerify.test.ts` 是否并入官方单测清单——若并入，官方基线由 `181/0/512`（13 文件）变为 `186/0/522`（14 文件），要求在 `gate-unit.mts` 同时保留两套可复算口径并各自自证。

**下一轮重点**
1. PG 启动方式固化（脚本化 + 开机自恢复），并在 `env-doctor.ps1` 增加 5433 探针与"集群身份校验"（避免再拉错数据目录）。
2. 8080 继续观察跨 8 小时与一次重启后的行为。
3. `brand-scan.mts` 与 `brand-gate.ps1` 双实现的长期取舍（当前三向一致，可暂并存的成本是双份维护）。

## 十、SHA 链与核对

本轮提交（按语义分组）：

| # | 提交 | 内容 |
|---|---|---|
| 1 | `4845b8ca` | `fix(scripts): brand-gate 排除规则改按仓库根路径 + base64 词表入库` |
| 2 | `0beac103` | `fix(scripts): gate-e2e 断库判定为依赖不可用` |
| 3 | 本简报自身 | `docs(patrol): 20261107-0623 巡检简报`（SHA 见提交后 `git rev-parse`，下一轮简报回填） |

双仓推送（`consult-agent-m86:master` + `consult-agent-m86` 双 ref）：

- `gitcode`：`ab2994f1..0beac103`，exit 0；
- `mirror`：`ab2994f1..0beac103`，exit 0（443 端口 SSH）。

四 ref 核对（`git ls-remote <remote> refs/heads/master refs/heads/consult-agent-m86`）在工具修复两提交推送后执行，两仓两 ref 均为 `0beac103e75aa329e5034a259c613b8b8053b7a1`，与本地 HEAD 逐位一致。

未推 `origin`（HTTPS token 口径）、未推 `heagentos`、未打 tag。

## 十一、本轮未做（如实登记）

- 未把 PG 拉起方式脚本化（仍是手工 `Start-Process` 命令），下轮补 `env-doctor.ps1` 的 5433 探针 + 集群身份校验。
- 未修改 `/ready` 的 `auditStore` 语义（属产品语义变更，等拍板；已下发 P5-26 定义）。
- 未处理 `pgdata/` 入库问题（历史重写风险，等拍板）。
- 未清理根目录 1361 个探针 `.txt` 与 762 个 `.log`（属更早遗留项，不在本轮 P0 范围）。
