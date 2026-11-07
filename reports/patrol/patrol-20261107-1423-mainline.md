# 主线巡检简报 · 2026-11-07 14:23（两小时滚动）

- **轮次时间**：2026-11-07 14:23–14:52（UTC+8）
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- **分支**：`consult-agent-m86`；双推 `gitcode`（GitCode）+ `mirror`（GitHub）
- **轮次基线**：`4b0a1c97` → **本轮代码收口 HEAD `6508c69e`**（简报自身提交在代码收口之后单独推送，其 SHA 见下节说明）
- **结论**：门禁 5/5 全绿；本轮清掉两类真名泄漏（含源码字段与门禁白名单），两笔提交已双推，四 ref 逐位一致。

---

## 一、智能体进度（组织侧 o_000Rfj7NkAk）

| 项 | 值 |
|---|---|
| 状态 | `status=2 finished`，100%，version **784**，round **11913–11918**，reason=flush |
| 摘要 | P5-31 方案终验 ALL_GREEN，**HEAD=47197e6f** |
| 判定 | **摘要已过期**：47197e6f 早已被 838e0e2b 替换，HEAD 现已到 6508c69e；两轮（12:23 / 14:23）无新切片产出，idle-resumable standby |
| 处置 | 本轮 `send_message` 唤醒（`target_state: restarted`），通报新基线 + 指派下一片（重做映射表 / 反向替换根因自查 / 两张待办清单 / 未拍板项不动） |

---

## 二、工具链与门禁（本机实测，未沿用旧口径）

- node `v22.23.2`、bun `1.2.0`（`C:\Users\lenovo\.bun\bin\bun.exe`）、npm `10.9.8`
- `scripts\gate-all.ps1`（Windows PowerShell 5.1 执行），证据 `logs\patrol-1423-gateall-final.txt`

| 步骤 | 结果 | 耗时 |
|---|---|---|
| root tsc `node node_modules/typescript/bin/tsc --noEmit` | **exit 0** | 33s |
| web tsc `bun x tsc --noEmit`（cwd=web） | **exit 0** | 66s |
| gate-unit | **181 pass / 0 fail / 512 expect**（13 files） | 11s |
| gate-e2e | **23 pass / 0 fail / 83 expect**（1 file） | 12s |
| brand-gate | **9816 files / 0 硬违规（code=0 doc=0）/ backlog 13** | 9s |

`OVERALL: PASS`。backlog 13 全部为 `gangos_` 指标前缀（`src\bff\observability\metrics.ts`、`src\core\observability\metrics.ts`），属专项存量，不计硬违规。

---

## 三、运行态（14:38 前后实测）

| 端口 | 状态 |
|---|---|
| 3000 / 5174 / 8081 / 9090 | 空 |
| 5173 | LISTEN pid **51604**（node.exe，外部沙箱 vite，非本仓前端进程） |
| 8080 | LISTEN pid **46600**（bun.exe，第七代，孤儿进程，父进程已退出） |
| 8000 | LISTEN pid 36640（python，他项目） |
| 5433 | LISTEN pid 240（postgres.exe） |

六端点全部 200：

| 端点 | 状态 | 体积 |
|---|---|---|
| `/health` | 200 | 2 B |
| `/ready` | 200 | 235 B |
| `/api/v1/health` | 200 | 166 B |
| `/api/v1/system/health` | 200 | 145 B |
| `/metrics` | 200 | 4372 B |
| `5173/`（前端首页） | 200 | 714 B |

`/ready` 关键字段：`status=ok`、`wormBackend=memory`、`auditStore=pg`、`dbReachable=true`、`sealDisabled=true`（`audit-backfill-truncated`，audit.events 2877 > 回填上限 1000，既有状态）、`uptimeSec=28104`。

---

## 四、本轮处理项

### P0-1 源码与脚本里的厂商拼音别名（`5193e0fc`）

- `src\bff\routes\m600Routes.ts`：招标采购记录的供应商字段用厂商拼音命名（**8 处**）。核实该字段只进内存 `prStore`（`prStore.set(rec.id, rec)`），**无 DB 列、`web/src` 无任何引用**，故改为中性占位 `vendorXSupplierId`，不改数据结构、不受影响调用方。
- `scripts\brand-scan.mts`：`EXCLUDE_WORDS` 里原本就写着这个拼音标识 —— **等于门禁给泄漏词开了白名单**，是"brand 长期报 0"的成因之一；改为中性占位后白名单不再豁免任何真实泄漏。
- `scripts\gen_api_docs.py`：API 文档生成器里厂商 `target` 枚举描述改为脱敏代称，避免每次重新生成文档时把真名又写回 `docs/api/**`。

### P0-2 自有文档与历史简报的真名/别名（`6508c69e`）

两批，均为等行替换，保留原结构、编码与行尾：

- **批次一（中文真名 + 精确大小写拉丁别名）**，10 文件 12 行：5 份历史巡检简报把硬禁词表原文逐字抄进正文（等于把词表外发）；`RELEASE_NOTES` 与最终交付清单写了厂商适配清单（含真实厂商名）；`docs/technical/04` 的 YAML 与代码示例 4 处直接是厂商别名（`vendor:` / `version:` / `base_url` / `case:`）。
- **批次二（大小写不敏感的拉丁别名）**，14 文件：`docs/api` 三份文档里的厂商拼音适配器文件名与 vendor 枚举、6 份简报里的厂商拼音字段名、以及此前批次一漏掉的大小写变体。

**教训（本轮实测）**：上一轮"docs 真名命中 0"的结论只对中文有效 —— 拉丁词按精确大小写扫，漏掉了大小写变体这一整批（首字母大写与全大写两种形态均有命中）；**拉丁词必须 `-i` / `(?i)`**。

### 复核口径

- 逐文件计数归零后，再对工作区做一次大小写不敏感复核（四类拉丁别名：厂商平台名 / AI 产品名 / 厂商英文名 / 厂商拼音 id），非 `pgsql` 的改动文件 **0 残留**。
- 第三方 vendored 目录（`pgsql/pgAdmin 4/python/Lib/site-packages/**`）的命中全部是误报（`pywintypes`、`_winxptheme.pyd`、Google discovery 文档里的英文普通词（竞标语境）、`colorama` METADATA 里的英文普通词），**未改动**。

---

## 五、提交与推送

| 提交 | 内容 | numstat |
|---|---|---|
| `5193e0fc` | 源码与脚本脱敏（3 文件） | 见 `git show --numstat` |
| `6508c69e` | 文档与历史简报脱敏（15 文件） | 15 files changed，等行替换 |

双推结果：

- `git push gitcode consult-agent-m86:master consult-agent-m86` → exit 0（`logs\patrol-1423-push-gitcode.txt`）
- `git push mirror consult-agent-m86:master consult-agent-m86`（`-p 443`）→ exit 0（`logs\patrol-1423-push-mirror.txt`）

四 ref 逐位核对（`git ls-remote`）：

| 远端 | refs/heads/master | refs/heads/consult-agent-m86 |
|---|---|---|
| gitcode | `6508c69e4872ba0d30761047086f14dc28c48a40` | `6508c69e4872ba0d30761047086f14dc28c48a40` |
| mirror | `6508c69e4872ba0d30761047086f14dc28c48a40` | `6508c69e4872ba0d30761047086f14dc28c48a40` |

与当时本地 HEAD **完全一致**。未推 `origin`（HTTPS token 口径）、未推 `heagentos`、未打 tag。

> 说明：上表为**代码收口 `6508c69e`** 的四 ref 实测值。本简报文件自身的提交在此之后单独推送，故推送完成时的 HEAD 会再前进一笔（仅新增本简报，不改代码与文档内容）；下一轮简报会记录该笔的最终四 ref 值。

---

## 六、仓库卫生

| 项 | 本轮值 |
|---|---|
| 根目录 `*.txt` | 1361 |
| 根目录 `*.log` | 762 |
| `logs/` 文件数 | 5135 |
| `pgdata/` 被跟踪文件 | **2220**（既有技术债，未摘除，待拍板） |
| 未跟踪 `reports/patrol/*.md` | **39** |
| 提交后剩余 dirty | **107**：`docs/` 99（含 36 份 API 工具文档、`_m2xx` 台账、`m2xx-result.json` 等，属另一路 consult 流水线）、`pgdata/` 8、未跟踪 `reports/patrol` 39、未跟踪 `pgdata/pg_stat` 1 |

边界遵守：另一路 consult 的未跟踪产物（`docs/_m2xx*`、`pgdata/`）**未代提交、未删除**。

---

## 七、遗留风险与下一轮重点

1. **反向替换执行者仍未定位**（本轮新增两条硬证据）：19 个 docs 文件的 index 层写着真名而 worktree 干净（某进程改盘后被 `git add` 过一次）；`.git/objects` 在 11:00–12:31 无新增对象（排除 git 自身写）。组织侧也无从查清 —— 需在其自查报告里给可复现路径。
2. **docs 域短名残留 55 处**（4 组：27/10/9/9）与 `web\src\mock\systemMock.ts` 2 处：这些短名**不在词表内**，门禁报 0 属漏检。本轮只量化未处理，等 P5-31 映射表落地。
3. **`reports/` 905 处证据性引用的豁免口径未落地**：本轮是按真名逐个替换，不是走豁免机制，后续若启用 `-ExemptPaths reports`，需复核本轮改动是否与豁免语义冲突。
4. **`pgsql/` 目录** 与 `pgdata/` 同属技术债（`pgsql` 下 2220 规模第三方二进制被跟踪），扫品牌/全量 grep 时会被大量误报，下一轮起统一先排除。
5. **BFF 第七代孤儿进程（pid 46600）**：父进程已死、仍稳定服务；"消失无异常栈"的根因仍未查明。
6. **39 份未跟踪历史简报**范围口径双方不一致（我方 39 / 组织侧称该窗口 112 文件、1 个需脱敏），下一轮对齐边界后再决定是否入库。

## 八、待用户拍板（跨轮累积，本轮未动）

`AUDIT_BACKFILL_LIMIT` 策略（A 调大 / B 归档后截断 / C 冷热分离）；`pgdata/` 2220 文件是否摘除；`WORM_BACKEND=memory` 是否改 `fs`；`layered.put` 断网兜底；`AUDIT_DB_SCHEMA` 优先级；演示环境明文口令取舍；P5-30 B/C 方案边界；P5-31 的 E1/E2 拆分、`reports` 豁免、55 处短名是否做。

---

*本轮证据日志：`logs\patrol-1423-gateall.txt`（第一遍）、`logs\patrol-1423-gateall-final.txt`（收口遍）、`logs\patrol-1423-push-gitcode.txt`、`logs\patrol-1423-push-mirror.txt`；清洗脚本 `logs\tmp_scrub_names_1423.py`、`logs\tmp_scrub_latin_1423.py`。*
