# 巡检简报 · 2026-11-07 10:23 轮（主线独立复核）

- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 分支：`consult-agent-m86`　双推：`gitcode`(JLMEDAIOS) + `mirror`(JLAIharnessos)
- 本轮起点 HEAD：`9b068a80`（组织侧 P5-30 提交，含夹带）
- 本轮 HEAD 链：`bf19e3a0`（上一轮推送点）→ `2017b897`（docs 脱敏收口 + 代称粘连修正）→ `e3389ed1`（P5-29 双侧对齐）→ `59cb9483`（P5-30 方案）→ `7753bbee`（brand-gate 标签修复）
- 五步门禁 5/5 PASS；四 ref 全等 `7753bbee`；本轮发现并修掉一处 P0 级回归（上一笔组织侧提交把 docs 脱敏改了回去）。

## 一、组织智能体进度

`peek_task_progress(o_000Rfj7NkAk)`：`status=2 finished`、95%、version 773、round 11420→11424、`reason=flush`，处于 idle-resumable standby。

自报与主线实测对照：

| 组织侧自报 | 主线实测 | 判定 |
|---|---|---|
| P5-29 双侧一致：`9816/0/13` 完全一致 | 独立复跑 `brand-scan.mts` 与 `brand-gate.ps1`，默认 scope 三项全同；docs scope 同 `294/0` | 采信 |
| P5-30 已完成（`9b068a80`），只出方案未动数据 | 方案文档确实只有 +74 行；但该提交同时夹带 19 个 docs 文件（+74/-74），把脱敏代称改回厂商真名 | **不采信"未动数据"**，见第三节 |
| code/doc 归类标签 bug「已验证无需改代码」 | 其验证只用了仓库内路径；`-Paths` 指向仓库外时 `$rel` 相对化失效，标签全部落入 `code`（实测 `code=106 doc=0`） | **结论错误**，本轮已修（`7753bbee`） |
| P5-27 验收剩余项待做 | 同 | 如实，转入下一轮 |

## 二、工具链与双 tsc（实测）

- node `v22.23.2`、bun `1.2.0`（全路径 `C:\Users\lenovo\.bun\bin\bun.exe`）、npm `10.9.8`
- 根 tsc：`node node_modules/typescript/bin/tsc --noEmit` → exit 0，30s
- web tsc：cwd=`web`，`bun x tsc --noEmit` → exit 0，62s
- 路由：`web/src/router/index.tsx` 未见新增悬空 lazy import 或重复 Route
- 日志：`logs\patrol-1023-gateall-post2.txt`（在最终 HEAD `7753bbee` 上复跑）

## 三、本轮 P0：上一笔组织侧提交把脱敏改了回去（已修）

**取证**：`git show --numstat 9b068a80` = 19 个 docs 文件 + 74/-74，外加 `reports/patrol/...p5-30...md` +74。抽样 diff 显示 `-HIS厂商C、东华…` → `+卫宁、东华…`，即 P5-28 已完成的工作被反向改回。

**逐版短名计数（docs 域 309 文件）**：

| 版本 | 点名词 A | 点名词 B | 同域其他短名 |
|---|---|---|---|
| `58855ed8`（P5-28 后） | 0 | 22 | 27 / 10 / 9 / 9 |
| `9b068a80`（P5-30） | **39** | **36** | 33 / 10 / 10 / 10 |
| 修复后 `7753bbee` | **0** | 22 | 27 / 10 / 9 / 9 |

**处置**：不追随原提交链，按语义重建四笔提交（内容等价、提交信息脱敏），并顺手修掉替换脚本留下的 7 处代称粘连（`HIS厂商C HIS厂商C`、`HIS厂商CHIS厂商C` 一类，共 4 文件 48 字符），docs 与 `58855ed8` 的差异仅剩这 9 增 9 删。

**另一处配套 P0**：原四条提交信息正文含 4 个厂商真名（词表 literal 命中 4）。因这些提交尚未推送，重建后提交信息按词表复扫 **literal 命中 0**。

## 四、单测与 E2E

- 默认口径：`actual 181 / 0 / 512` = expected，PASS（11s）
- `-WithChain`：`actual 186 / 0 / 522` = expected，PASS（13s）
- 注入自证：`-WithChain -Baseline '185/0/522'` → `FAIL: diff pass=1`，exit 1（数字确为真算）
- E2E：`actual 23 / 0 / 83` = expected，`port 8081: clean`，PASS（12s）
- 日志：`patrol-1023-unit-withchain.txt`、`patrol-1023-unit-inject.txt`、`patrol-1023-gateall-post2.txt`

## 五、品牌门禁

默认 scope：`filesScanned 9816`、`hardViolations 0 (code=0 doc=0)`、`backlogGangos 13`、PASS（10s）。
docs scope：`filesScanned 294`、`hardViolations 0 (code=0 doc=0)`、`backlogGangos 14`、PASS。

**标签缺陷修复（`7753bbee`）**：`brand-gate.ps1` 原以 `$rel -like 'docs\*'` 做前缀判定，`-Paths` 指向仓库外时 `$rel` 保持绝对路径 → 全部落入 `code`。改为按路径段判定（`(^|\\)docs\\` 等），文件头补英文说明，UTF-8 BOM 复核。

四向验证（均实跑）：

| 场景 | 结果 |
|---|---|
| 默认 scope | `9816 / 0 (code=0 doc=0)` / backlog 13 / PASS exit 0 |
| 仓内 `docs` | `294 / 0` / PASS exit 0 |
| 仓库外 `bf19e3a0` 快照 | `294 / 106 (code=0 **doc=106**)` exit 1 —— 标签已纠正 |
| 全仓 `-Paths '.'` | `18341 / 912 (code=5 doc=907)` / backlog 407 / exit 1 |

同口径也独立复现了 P5-28 的"改前 106 处"：`bf19e3a0` 的 docs 快照解包后为 `294 文件 / 106 硬违规`，方向为 `code=0 doc=106`。结论是 P5-28 属门禁驱动的真实改动，不是盲目改动。

**必须记录的口径盲区**：`docs scope 0` 只代表"词表内 40 条不存在"。词表 literal 为厂商全名，以下短名/英文标识仍在 payload 内且门禁看不见：

| 残留 | 位置 | 量 |
|---|---|---|
| `东华` | `docs/**` | 27 行 / 8 文件 |
| `东软` | `docs/**` | 10 行 / 4 文件 |
| `联众` | `docs/**` | 9 行 / 2 文件 |
| `智业` | `docs/**` | 9 行 / 2 文件 |
| 英文供应链标识（小写） | `docs` YAML 示例、`src\bff\routes\m600Routes.ts` | 文档 2 处 / 代码 8 处（后者是业务字段名，属正则刻意的排除项） |
| 代称重复行标签 | `docs\technical\04-…` 表格两行同代称 | 2 行 |

本轮**没有**擅自扩词表：`东软` 在 `web\src\mock\systemMock.ts` 有 2 处，直接加词会把默认 scope 打红；`winning` 一类拉丁词若改大小写不敏感，会误伤 `winningSupplierId` 业务标识。扩表属口径变更，需先定"短名清单 + 边界规则 + 代称映射"，已作为 P5-31 交组织侧出方案。

## 六、运行态（10:40 实测）

| 端口 | 状态 |
|---|---|
| 3000 / 5174 / 8081 / 9090 | 无监听 |
| 5173 | pid 51604（外部沙箱 vite，非本仓；本仓前端仍未起） |
| 8080 | pid 46600（`bun src/bff/server.ts`，父 47276 已死 → 孤儿，第六代） |
| 8000 | pid 36640（他项目） |
| 5433 | pid 240 |

六端点全 200：`/health`(2B)、`/ready`(235B)、`/api/v1/health`(166B)、`/api/v1/system/health`(145B)、`/metrics`(4149B)、`5173/`(630B)。

`/ready` = `status:"ok"`、`wormBackend:"memory"`、`auditStore:"pg"`、`dbReachable:true`、`sealDisabled:true`（`audit-backfill-truncated`，属既有 2877 > limit 1000 状态，非停库）、`uptimeSec:13896`。

## 七、仓库卫生

- 根目录散落 `.txt` 1361、`.log` 762；`logs\` 5075 文件（均被 `.gitignore` 覆盖）
- `pgdata/` 仍被跟踪 2220 文件；`web/dist` tracked 0
- `git status --porcelain` 148 行 = 44 条 `docs/_m2xx*`（另一路 consult 在制品）+ 9 条 `pgdata/` 运行态漂移 + 其余（`docs/_perm_codes_raw.txt`、`docs/api/tools/*.md` CRLF 等）
- 本轮未代提交、未删除另一路的任何未跟踪产物；提交全部按显式 pathspec 分组

## 八、本轮提交清单

| SHA | 说明 | 文件 |
|---|---|---|
| `2017b897` | docs 域脱敏收口 + 代称粘连修正 | 19 |
| `e3389ed1` | `brand-scan.mts` 与 `brand-gate.ps1` 口径对齐 | 1 |
| `59cb9483` | P5-30 三方案与 dry-run 数据 | 1 |
| `7753bbee` | brand-gate code/doc 标签按路径段判定 | 1 |

## 九、双仓推送与四 ref 核对

- `git push gitcode consult-agent-m86:master consult-agent-m86` → exit 0，`bf19e3a0..7753bbee`（两 ref）
- `git push mirror consult-agent-m86:master consult-agent-m86` → exit 0，`bf19e3a0..7753bbee`（两 ref）

| ref | gitcode | mirror | 本地 |
|---|---|---|---|
| `master` | `7753bbee96a13ac18a549e94c0e3db275bbdb04a` | 同 | 同 |
| `consult-agent-m86` | 同 | 同 | 同 |

四 ref 逐位一致。未推 `origin` / `heagentos`，未打 tag。日志：`patrol-1023-push-*.txt`、`patrol-1023-lsremote-*.txt`。

## 十、遗留风险与待拍板

1. **docs 短名残留 55 处**（东华 27 / 东软 10 / 联众 9 / 智业 9）+ 英文供应链标识 2 处：门禁口径外，需先定短名清单与代称映射（P5-31）。
2. **`web\src\mock\systemMock.ts` 含厂商短名 2 处**：产品代码域，扩表后即为硬违规，随 P5-31 一并处理。
3. **`reports/` 905 处证据性引用**：豁免口径仍未落地，组织侧只提了 `-ExemptPaths 'reports'` 方案。
4. **`AUDIT_BACKFILL_LIMIT`**：A 调大 / B 归档截断（推荐但高危，须 dry-run）/ C 冷热分离，仍待拍板；`sealDisabled` 现状由它决定。
5. **`pgdata/` 2220 文件被跟踪**、**`WORM_BACKEND=memory` 是否改 `fs`**、**`layered.put` 断网兜底 A/B/C**、**`AUDIT_DB_SCHEMA` 优先级**、**演示环境明文口令取舍**：均未动，等拍板。
6. **BFF 第六代 46600 仍是孤儿进程**，前五代消失无异常栈的原因未查明；本仓前端 5174 仍未起。

## 十一、下一轮重点

1. 唤醒组织侧做 P5-31：短名清单 + 边界规则 + 代称映射表，先出方案与全仓计数，不动数据。
2. 复核组织侧 P5-27 剩余项（14 文件明细表、`gate-all -UnitWithChain`、双 tsc、卫生、读代码）。
3. 盯 8080 孤儿的存活与重启后 PID 归属；尝试拉起本仓前端并核对占口者归属。
4. 复核 `reports/` 豁免口径，避免下一轮把证据性引用误计入违规。
