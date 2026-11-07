# 巡检简报 · 2026-11-07 16:23 轮（主线）

- **轮次**：2026-11-07 16:23（两小时滚动巡检，主线独立复跑，不采信组织侧自报）
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- **轮次基线**：`7e9cb86b24b56a5ba7d715cf7a61d48a281b8f73`（14:23 轮收口值，四 ref 一致）
- **本轮代码收口 HEAD**：`cde84098084b8727a70fc99e390690efb16dec25`（简报自身提交在代码收口之后单独推送，其 SHA 见第 5 节说明）

## 1. 组织智能体进度

- 智能体 `o_000Rfj7NkAk`：`status=2 finished`、100%、version **791**（上轮 784）、round 12131–12133、`reason=flush`。
- 本窗口内**无新代码切片落地**：仓库 HEAD 在入段时至恢复时仍是 `7e9cb86b`，工作区无组织侧新增文件。
- 摘要仍写"P5-31 方案终验 ALL_GREEN（HEAD=47197e6f）"——该 HEAD **已过期**（现为 `cde84098`），摘要未随基线更新。
- 状态为 idle-resumable standby。本轮已向其交付新任务（见第 7 节），等待下一片产出。

## 2. 工具链与门禁（主线实测）

| 项 | 结果 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（`C:\Users\lenovo\.bun\bin\bun.exe`） |
| npm | 10.9.8 |
| root tsc | exit 0（35s，0 字节输出） |
| web tsc | exit 0（66s） |
| 单测 | 181 pass / 0 fail / 512 expect（13 files） |
| E2E | 23 pass / 0 fail / 83 expect（1 file） |
| brand-gate（src,web/src） | 9816 文件 / 0 硬违规（code=0 doc=0）/ backlog 13 |
| brand-gate（docs） | 294 文件 / 0 硬违规 / backlog 14 |
| gate-all | 5/5 PASS，`OVERALL: PASS`，exit 0（证据 `logs\patrol-1623-gateall.txt`） |

- 路由自检：`lazy_imports=2872 / dangling=0 / route_paths=2870 / dup_paths=0`（证据 `logs\patrol-1623-router-check.txt`）。无悬空 lazy import、无重复 Route。
- 门禁 0 违规的**边界说明**：本轮的 0 是"词表覆盖范围内的 0"。词表只有厂商全名与部分别名，对短名、驼峰/全大写拉丁标识、以及"短名+产品线后缀"组合形态不命中，因此 0 不能等同于"真干净"。本轮 P0 正是靠独立扫描（不依赖词表）才挖出来的。

## 3. 运行态实测（16:24–16:26）

| 端口 | 状态 | 归属 |
|---|---|---|
| 3000 | 无监听 | — |
| 5173 | LISTEN pid 51604 | node.exe，启动 06:02:17（外部沙箱 vite，非本仓前端） |
| 5174 | 无监听 | 本仓 vite 未起 |
| 8080 | LISTEN pid 46600 | bun.exe，启动 06:52:46（BFF，uptimeSec 34517） |
| 8000 | LISTEN pid 36640 | python.exe（他项目） |
| 8081 / 9090 | 无监听 | — |
| 5433 | LISTEN pid 240 | postgres.exe（启动 08:26:54） |

六端点全部 200：

| 端点 | 状态 | 字节 |
|---|---|---|
| `/health` | 200 | 2 |
| `/ready` | 200 | 235 |
| `/api/v1/health` | 200 | 166 |
| `/api/v1/system/health` | 200 | 145 |
| `/metrics` | 200 | 4149 |
| `5173/` | 200 | 630 |

`/ready` 正文：`status=ok`、`wormBackend=memory`、`wormS3Client=none`、`auditStore=pg`、`dbReachable=true`、`sealDisabled=true`（`audit-backfill-truncated`，既有状态）。BFF 与 PG 均存活，无崩溃、无端口冲突。

## 4. 本轮处理项（P0：厂商真名残留，A 组）

**发现方式**：不依赖品牌词表，用独立候选词表（中英文共 50 项）对 `docs` + `src` + `web/src` 全量逐词扫描（大小写不敏感），初扫 **28 文件 / 147 处**。扣除 `gangos_` 存量指标前缀（属 backlog 不计违规）与误报后，真名约 94 处。

**误报清单（下一轮勿重复认定）**：

- `handleAi<…>` 系列函数名里的拉丁串 = "AI + Medical" 拼接，非厂商标识（6 处）
- 某开源 EMR 项目名（首字母三字前缀与厂商 PaaS 标识同形），非厂商标识（4 处）
- `天健` = "42 天健康检查""7 天健康回访"里的跨词子串（2 处）
- `创业团队`/`AI创业公司` 里的普通中文词（2 处）
- `gangos_`/`Gangos` 指标前缀与注释（41 处，backlog）

**本轮处置（A 组：纯代称枚举与表头，机械可换，无语义损失）— 8 文件 47 处 → 0**

| 文件 | 清理前 | 清理后 |
|---|---|---|
| `docs\technical\04-安全合规与系统集成设计.md` | 28 | 0 |
| `docs\technical\01-系统总体架构设计.md` | 5 | 0 |
| `docs\technical\05-开发任务分解与团队协作规范.md` | 2 | 0 |
| `docs\api\adapters\01-his-adapter.md` | 4 | 0 |
| `docs\api\services\11-integration-adapter.md` | 4 | 0 |
| `docs\ai-native-hospital\01-top-level-design.zh-CN.md` | 1 | 0 |
| `src\bff\routes\cryptoSignature.ts` | 1 | 0 |
| `web\src\mock\systemMock.ts` | 2 | 0 |

- 统一改用 `HIS厂商A-E` 代称；拉丁别名改 `VENDOR_PAAS` / `VENDOR_INTEGRATION_PLATFORM` 等占位。
- 顺带修掉一处**文档与代码不一致**：适配器清单原写 5 个小写文件名（其中 2 个在仓库中不存在），已改为仓库实存类名 `VendorAHISAdapter`~`VendorEHISAdapter` + Mock。
- 方向核对：`git diff` 新增 24 行中含真名 **0 行**；改动 8 文件 +24/−24。证据 `logs\patrol-1623-scrub-groupA.txt`。

## 5. 提交与推送

| 提交 | 内容 |
|---|---|
| `acf5216c` | docs(compliance)：安全合规与集成类 6 份文档清除厂商真名与拉丁别名（+22/−22） |
| `cde84098` | fix(brand)：源码注释（密码机厂商）与前端系统管理 mock 供应商字段改中性表述（+2/−2） |

- 双推 `gitcode` 与 `mirror` 均 exit 0；`git ls-remote` 四 ref 逐位核对**全等 `cde84098…`**，与本地 HEAD 一致（证据 `logs\patrol-1623-push-gitcode.txt`、`logs\patrol-1623-push-mirror.txt`）。
- 未推 `origin`（HTTPS token 口径）、未推 `heagentos`、未打 tag。
- 说明：本简报文件自身的提交在此之后单独推送，推送完成时 HEAD 再前进一笔（仅新增本简报，不动代码与文档）。

## 6. 仓库卫生

- 根目录 `*.txt` 1361、`*.log` 762；`logs/` 5165 文件（`logs/` 已被 `.gitignore` 第 33 行覆盖）。
- 未跟踪 40（`reports/patrol/*.md` 39 + `pgdata/pg_stat` 1）；被跟踪的 `pgdata/` 仍为 **2220** 文件（既有技术债，属另一路口径，未动）。
- tracked 脏项 115 → 本轮两笔提交后回到 **107**（`docs/` 99 + `pgdata/` 8），属另一路 consult 流水线与 `pgdata` 漂移，按红线未代提交、未删除。
- 本轮临时脚本与取证全部落 `logs/`（gitignored）：`patrol-1623-vendor-scan.py`、`patrol-1623-vendor-context.py`、`tmp_scrub_groupA_1623.py`、`patrol-1623-router-check.py`。

## 7. 遗留风险与下一轮重点

**（1）B 组真名仍在，本轮未清（43 处 / 5 份业务文档）**

| 文件 | 剩余 |
|---|---|
| `docs\architecture\review-4-business-cost.md` | 19 |
| `docs\architecture\01-PRD-产品需求.md` | 11（含财务软件厂商 2 处） |
| `docs\MEDMUSE-FEASIBILITY.md` | 6 |
| `docs\architecture\06-团队与成本.md` | 5 |
| `docs\architecture\00-决策基线.md` | 2 |

未在本轮处理的原因是**与纯枚举不同**：这些命中嵌在营收数字、竞业协议、挖人成本、Plan B 等叙述句子中，机械替换会改变语义或读起来别扭，需逐句重写。已作为下一片任务指派给组织智能体，要求给出"文件 + 行号 + 处置"清单后再改。

**（2）词表口径缺陷（门禁报 0 的结构性成因）**

- 只覆盖厂商全名/部分别名，不覆盖短名、驼峰与全大写拉丁标识、"短名+产品线后缀"组合形态；
- 两字拼音在拉丁侧做子串匹配必然大面积误报（实测某两字母标识 138 处全为子串误报），要么加词边界、要么整组放弃直扫改走映射；
- `EXCLUDE_WORDS` 曾把泄露词当白名单（已在 14:23 轮 `5193e0fc` 修掉），后续任何豁免项必须写明"为什么这个词不是泄漏"。

**（3）`reports/` 证据性引用仍未定口径**：约 894 处（541 文件），其中一部分是脱敏对照表本身（记录不是泄漏），一部分是简报正文照抄词表（必须改写）。豁免逻辑要能区分这两类。

**（4）反向替换执行者仍未定位**：现有两条硬证据（19 文件 index 层带真名而 worktree 干净；`.git\objects` 在 11:00–12:31 零新增）只能推出"外部进程写盘后被 `git add`"，具体进程不可追溯。组织侧提出过"复用旧 blob"假设，已被 `9b068a80` blob 实测 0 命中证伪。按现状登记，不再重复挖。

**（5）建议新增的门禁预检**（尚未落地，待确认）：提交前对比 `git diff --name-only` 与 `git diff --cached --name-only`，`docs/` 下分叉即 fail——可拦住"`git add` 之后 worktree 又被改，提交上去的是旧版本"这一类。

**（6）运行态**：BFF 仍为第七代孤儿进程（pid 46600，父进程已逝），本仓前端 5173 未起、现占用者为外部沙箱 vite。不影响端点实测，但本地工作台入口仍在他人进程上。

## 8. 待拍板（跨轮累积，一行未动）

- `AUDIT_BACKFILL_LIMIT` 策略（A 调大 / B 归档后截断（推荐但高危，须 dry-run + 开关默认关）/ C 冷热分离）
- `pgdata/`（2220 文件）与 `pgsql/` 同类第三方二进制是否摘除
- `WORM_BACKEND=memory` 是否改 `fs`
- `reports/` 豁免口径与"脱敏对照表 vs 正文顺写"的判别规则
- B 组 43 处的处置方式（逐句重写 / 整段改写为行业性描述 / 分批做）
- P5-30 B 方案边界、C 方案"到生产再验"；P5-31 E1/E2 拆分与词表加词
- 演示环境明文口令取舍（位置 `src\bff\routes\auth.ts` L104-113，仅可引用位置）
