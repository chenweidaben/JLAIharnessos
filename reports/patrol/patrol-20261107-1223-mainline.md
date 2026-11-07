# 巡检简报 · 2026-11-07 12:23 轮（主线独立复核）

- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 分支：`consult-agent-m86`　双推：`gitcode`(JLMEDAIOS) + `mirror`(JLAIharnessos)
- 本轮起点 HEAD：`47197e6f`（组织侧 P5-31 方案，含真名）
- 本轮新链：`e2c73c3f` → `838e0e2b`（P5-31 方案脱敏版重建）→ 本简报提交（最终 HEAD）
- 结论：门禁 5/5 PASS；修掉两处 P0（工作区 19 份 docs 被二次改回真名、P5-31 方案正文夹 5 个真名）。

## 一、组织智能体进度

`peek_task_progress(o_000Rfj7NkAk)`：`status=2 finished`、100%、version 778、round 11720→11729、`reason=round`，idle-resumable standby。

| 组织侧自报 | 主线实测 | 判定 |
|---|---|---|
| P5-31 方案 ALL_GREEN，HEAD=`47197e6f` | 该提交确实只有 1 文件（+105/-0），无 docs/src 夹带 | 采信范围 |
| "全文用厂商 A–H 代称，无真名" | 方案第四节映射表直接写出 5 个厂商真名（各 1 处） | **不成立**，已重建为 `838e0e2b` |
| 14 文件逐文件 186/0/522、双 tsc 0/0、gate-all 5/5、46600/PG 活着 | 主线独立复跑：`181/0/512`（默认口径）、`23/0/83`、双 tsc exit 0、五步 PASS、46600 与 PG 均在 | 采信（口径注：其 186 是 `-WithChain`，与默认 181 不冲突） |
| P5-9→P5-31 全部收官 | 与事实相符，但 P5-31 仅为方案，55 处残留一处未清 | 部分采信 |

## 二、工具链与双 tsc（实测）

- node `v22.23.2`、bun `1.2.0`（全路径）、npm `10.9.8`
- 根 tsc：`node node_modules/typescript/bin/tsc --noEmit` → exit 0，35s
- web tsc：cwd=`web`，`bun x tsc --noEmit` → exit 0，65s
- 路由：`web/src/router/index.tsx` 未见悬空 lazy import 或重复 Route
- 日志：`logs\patrol-1223-gateall.txt`

## 三、P0-1：工作区 19 份 docs 被二次改回真名（已恢复）

**取证**：`git status` 出现 19 条 `MM`（索引与工作区同时改），逐文件 `1:1` 对称替换。读 `git diff --cached -U0` 实际内容后确认方向是**代称 → 真名**，例如：

- `docs/api/adapters/01-his-adapter.md`：`HIS厂商C、东华…` → `卫宁、东华…`
- `docs/architecture/01-PRD-产品需求.md`：`HIS厂商C` → `卫宁 WiNEX`、`HIS厂商B` → `创业慧康`

这与 10:23 轮 `9b068a80` 是同一类事故的**第二次**，且这次是留在索引里的在制品。

**处置**：先用 `git grep -l` 确认 HEAD 的 docs 干净（真名命中文件数 0、代称命中 10 文件），再把 19 个路径用显式 pathspec `git checkout HEAD --` 恢复。恢复后 `git grep 卫宁 -- docs` 文件数 0，`git status` 由 167 行降到 148 行（即回到既有的 44 条 `_m2xx` 在制品 + 9 条 `pgdata` 漂移 + 其余）。

**遗留判断**：两次同形态事故说明有一个环节在跑"代称 → 真名"的反向替换脚本，尚未定位到具体执行者（两次都发生在组织侧提交前后）。下一轮须先查这条链，否则每轮都要手工回退。

## 四、P0-2：P5-31 方案正文夹真名（已重建 `838e0e2b`）

`47197e6f` 尚未推送，故未跟随 amend，直接 `git reset --soft e2c73c3f` 后按脱敏版重建：

- 第四节「现有代称」原写法把 5 个厂商真名写进了正文，改为 `厂商A/厂商C/厂商D/厂商G/厂商H` 占位。
- 原文的映射表存在口径冲突：它用「厂商A→B、厂商C→C」这种自造标签，而 `docs/` 现存标签是 `HIS厂商B/C/D/E` 四个。已在表中加注：落地前必须先把两套标签对齐，不得直接套用。
- 重建后复扫：真名 6 项 + 拼音/旧代号 8 项全部 0；提交信息同样 0。
- 该笔 `--stat`：1 文件 +107/-0，无夹带。

**方案本身的有效性**：55 处（8 文件）与主线独立计数一致；边界规则推荐 B（先映射再扫）；E 冲突按产品线拆 E1/E2 的思路成立。可执行，但落表前必须先修标签对齐问题。

## 五、门禁（在恢复后的干净树 + 最终提交上复跑）

```
[PASS] root tsc exit=0 (35s)   [PASS] web tsc exit=0 (65s)
gate-unit  actual 181 / 0 / 512   PASS (11s)
gate-e2e   actual 23 / 0 / 83     PASS (12s)
brand-gate scope src,web/src  filesScanned 9816  hardViolations 0 (code=0 doc=0)  backlogGangos 13  PASS (10s)
OVERALL: PASS
```

默认 scope 计数与上一轮完全一致，说明本轮 19 文件回退没有触及产品代码。

## 六、运行态（12:35 实测）

| 端口 | 状态 |
|---|---|
| 3000 / 5174 / 8081 / 9090 | 无监听 |
| 5173 | pid 51604（外部沙箱 vite，非本仓；本仓前端仍未起） |
| 8080 | pid 46600（`bun.exe`，父 47276 已死 → 孤儿，第六代，启动 06:52:46） |
| 8000 | pid 36640（他项目） |
| 5433 | pid 240 |

六端点全 200：`/health`(2B)、`/ready`(235B)、`/api/v1/health`(166B)、`/api/v1/system/health`(145B)、`/metrics`(4372B)、`5173/`(714B)。

`/ready` = `status:"ok"`、`wormBackend:"memory"`、`auditStore:"pg"`、`dbReachable:true`、`sealDisabled:true`（`audit-backfill-truncated`，既有状态）、`uptimeSec:20539`。

## 七、仓库卫生

- 根目录散落 `.txt` 1361、`.log` 762；`logs\` 5112 文件（均被 `.gitignore` 覆盖）
- `pgdata/` 仍被跟踪 2220 文件；`web/dist` tracked 0
- `git status --porcelain` 148 行：`M` 106（`docs/_m2xx*` 在制品 + `docs/api/*` CRLF 警告）、`D` 2（`pgdata/base/*/pg_internal.init` 运行态删除）、`??` 40（`reports/patrol` 39 条历史简报 + `pgdata/pg_stat` 1）
- **39 条历史简报未入库**（`patrol-20261103-*` 至 `patrol-20261104-*`）：本轮**未**批量提交，原因是这些旧简报未经脱敏预扫，直接入库有把真名带进历史的风险。下一轮先跑一遍词表预扫再决定是否入库。
- 未代提交、未删除另一路 consult 的任何在制品。

## 八、本轮提交清单

| SHA | 说明 | 文件 |
|---|---|---|
| `838e0e2b` | P5-31 词表口径外标识收口方案（脱敏版，重建自 `47197e6f`） | 1 |

## 九、双仓推送与四 ref 核对

推送：`git push gitcode consult-agent-m86:master consult-agent-m86`、`git push mirror consult-agent-m86:master consult-agent-m86`，均 exit 0，覆盖 `e2c73c3f..HEAD` 两 ref。

四 ref 核对（`ls-remote` 实测）：`master` 与 `consult-agent-m86` 在 gitcode、mirror 两侧均等于本地 HEAD，即"含本简报的提交"，其父提交为 `838e0e2b`。

未推 `origin` / `heagentos`，未打 tag。日志：`patrol-1223-push-*.txt`、`patrol-1223-lsremote-*.txt`。

## 十、遗留风险与待拍板

1. **反向替换脚本未定位**：两轮内 19 份 docs 被同样手法改回真名，若不断根，每轮都要回退。
2. **55 处短名残留**（8 文件）+ 英文供应链标识 2 处 + `web\src\mock\systemMock.ts` 短名 2 处：P5-31 只出方案，未动数据。
3. **P5-31 标签对齐**：方案用 厂商A–H，仓库用 `HIS厂商B/C/D/E`，落表前必须先对齐。
4. **`reports/` 905 处证据性引用**的豁免开关未落地。
5. **39 条历史简报未入库**，需脱敏预扫后决定。
6. **`AUDIT_BACKFILL_LIMIT`**（A/B/C）、**`pgdata/` 2220 文件**、**`WORM_BACKEND` 是否改 `fs`**、**`layered.put` 兜底**、**演示环境明文口令**：均未动，等拍板。
7. **BFF 第六代 46600 仍是孤儿**；本仓前端 5174 未起，5173 归属未验证。

## 十一、下一轮重点

1. 定位"代称 → 真名"反向替换的执行者（查组织侧脚本与 sub-agent 产物，含 `logs/` 里的替换脚本），从源头掐掉。
2. 对 39 条历史简报跑词表预扫，干净的再入库。
3. 55 处短名清理方案：等拍板后按 P5-31 五步执行，先修标签对齐。
4. 继续盯 8080 孤儿存活与前端 5174 归属。
