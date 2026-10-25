# consult-agent M86 重建 · F 分片汇总报告（安全/集成测试补齐 + 全量静态门禁收口 + B 类改动独立验证）

- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 分支：`consult-agent-m86`；任务书基线 HEAD：`3f0190788ce05fd7231bbefb68618cecccbc470e`；报告撰写期间分支经 G 十组提交演进至 HEAD `44fe568b`，收口三组提交（F 授权两组 + 并发品牌组）SHA 见 §7.2 / §7.3（演进留证见 §0）；备份分支 `backup/pre-m86-rebuild`
- 执行时间：2026-10-25 19:38（Asia/Shanghai）
- 环境：PowerShell 5.1（禁 bash）；node v22.23.2；bun 1.2.0，绝对路径 `C:\Users\lenovo\.bun\bin\bun.exe`；`node_modules\.bin\tsc.cmd/eslint.cmd/prettier.cmd` 在位；`tests/support/testEnv.ts` 经 bunfig preload 全局置 `DEMO_MODE=1`；本机无运行中 PostgreSQL；无 LLM 凭证，走确定性引导文案。
- 口径依据：`CONTRACT-m86.md` §1 类型 / §11 SSE 帧 / §12 十二端点 / §15 红线 / §16 门禁 / §17 提交纪律；`STAGING-DISCIPLINE.md` §0、§1、§3.1 混合文件 hunk 归属；`baseline-survey.md` §4 范式 / §7 验收门禁。

## 0. 红线遵守声明（F 分片自证）

1. **编写阶段** F 未自行执行任何 `git add` / `git commit` / `git push` / `git reset`；收口阶段 F 授权两组提交（`73a2b2ae`、`d3d4b696`，§7.2）按 Organizer 指令显式分组 `git add` 与 `git commit` 完成，身份固定 `chenweidaben <chenweidaben@users.noreply.github.com>`；`749d529d` 为并发品牌组（§7.2 留档）；全程未 `git push`、未修改 origin 配置；除授权分组外，工作区与索引保持现场。
2. F 未改写 `src/core/agent/consult/**`、BFF 路由/仓储、`web/**`、`docs/**`、`deploy/**` 既有 consult 产物；除两个新测试目录外**未新增任何源码**；收口授权提交不触碰 consult 源码/测试/前端/SQL/文档。
3. F 新增测试仅落在 `tests/security/consult-agent/` 与 `tests/integration/consult-agent/` 两个目录；测试不连库、不联网、无 LLM 凭证依赖。
4. 两个新测试文件版权头均为 `Copyright (c) 2026 杭州健澜科技有限公司`；consult 新增树旧称扫描 `TOTAL_HITS=0`，提交后复扫仍为 0（见 §6 证据索引 `F-brand-grep.log`、`F-brand-grep-postcommit.log`）。
5. 本报告与 `reports/consult-rebuild/F-*.log` 为组织者留证底稿，不纳入测试断言；随 §7.2 docs 授权提交入库，但不计入 consult 产品交付清单（纪律 §1 排除项口径）。

> **暂存区既有状态留证（非 F 动作）**：F 启动时 `git diff --cached --stat` 已含 **656 个历史探针/取证 txt/csv 与 web 过程日志的删除（0 新增 / 35169 行删除）**。该状态先于 F 分片存在，F 既未新增暂存、也未 unstage；按纪律 §0.1，G 在进入提交前须先 `git reset`（只清索引、不动工作区），再按分组显式 `git add`。

> **报告撰写期间的分支演进留证（非 F 动作）**：F 全部测量以任务书基线 `3f019078` 为对照；报告撰写期间，G 分片按纪律 §17 完成十组提交（作者 `chenweidaben <chenweidaben@users.noreply.github.com>`，时间 2026-10-25 19:51 起）：
>
> | 提交 | 主题 | 规模 |
> |---|---|---|
> | `42c98a3d` | `feat(consult-agent)` M86 在线咨询智能体全链路（BFF 编排/路由/仓储 + 前端 + SQL/文档/测试） | 62 文件，+10459（含 F 两个新测试文件 423 + 475 = 898 行） |
> | `b5ecf42e` | `fix(bff-security)` 生产 fail-closed 加固、路由顺序与错误契约修复 | 11 文件，+342 / −46 |
> | `3985342a` | `fix(brand)` 品牌合规收口（正式名、包元数据、文档、展示串与镜像标签） | 51 文件，+96 / −95 |
> | `378f9928` | `fix(web-router)` 重复挂载去重、失效权限码更正、类型债修复与遗漏页面入库 | 7 文件，+235 / −22 |
> | `db3ace9f` | `chore(deploy)` 编排/旁路配置安全加固、密钥参数化与 README 口径对齐实测 | 27 文件，+1680 / −237 |
> | `65802b20` | `chore(ignore)` 临时探针产物去索引并补齐忽略规则（本地文件保留） | `.gitignore` 32 行调整、`web/.gitignore`、`probe_m416.txt` 与历史探针 txt/csv 去索引；无 `src/` 后端改动 |
> | `ea1fe58f` | `docs(audit)` 2026-10-25 架构与全栈审计整改报告及取证归档 | 审计报告、`reports/audit-2026-10-25/`、`reports/patrol/` 与首批 F 底稿入库；另含一组与 F 无关的 `web/src/pages/medical-record-version-compare` 审计页面；无 `src/` 后端改动 |
> | `256cbcdd` | `docs(consult-rebuild)` 补录五组提交落地后现场复核留证 | 仅 `reports/consult-rebuild/F-gate-exits.txt`、`F-shard-report.md` 两份底稿增量；无 `src/` 后端改动 |
> | `f238cbba` | `docs(audit)` 终轮门禁口径回填与 F1/F2 基线失败提交后留证 | 审计报告、`F-gate-exits.txt` 提交后 F1/F2 记录与 `F-shard-report.md` 旧稿回填；仅 `reports/` 三份底稿，无 `src/` 后端改动 |
> | `44fe568b` | `style(consult-agent)` G10 Prettier 格式收口 `sessionRuntime.ts` 并回填留证 | `sessionRuntime.ts` 折行修复（3 插入 / 1 删除，无逻辑变更）+ 三份 `reports/` 底稿回填；G10 闭环 |
> | `73a2b2ae` | `fix(brand)` 在线问候兜底文案产品名收口（server.ts 单 hunk，非 consult 改动） | 仅 `src/bff/server.ts`，1 插入 / 1 删除；F 授权 `fix(brand)` 组 |
> | `d3d4b696` | `docs(consult-rebuild)` F 分片报告、门禁留证与 20:09 巡检记录回填 | 3 份 `reports/` 底稿，+240 / −38；F 授权 docs 组 |
> | `749d529d` | `fix(brand)` .dockerignore 构建上下文忽略清单头部旧称收口 | `.dockerignore`、`web/.dockerignore` 各 1/1；并发品牌组，非 F 授权清单，留档不混入 consult 交付 |
>
> F 编写阶段未自行执行 `git add / commit / push / reset`；上述十组产品/housekeeping 提交由 G 分片按纪律 §17 完成；收口阶段 `73a2b2ae`、`d3d4b696` 两组授权提交按 §7.2 执行，`749d529d` 为并发品牌组；提交身份统一 `chenweidaben <chenweidaben@users.noreply.github.com>`，全程未 `git push`、未改 origin。F 两个新测试文件经 `git show 42c98a3d --stat` 核实已被该提交纳入。§2.7 提交后门禁复跑以 `db3ace9f` 为现场对照；其后 `65802b20`、`ea1fe58f`、`256cbcdd`、`f238cbba` 仅涉及忽略规则、探针去索引与 `reports/` 底稿归档，未触碰 `src/` 后端 consult 源码；`44fe568b` 仅含 G10 折行修复与底稿回填；收口现场状态见 §3.6。§3 B 类盘点与基线对比均为**提交前对照 `3f019078` 的实测快照**。

---

## 1. F 新增测试产物（唯一允许新增的源码）

### 1.1 清单与规模

| 绝对路径 | 用例数 | `expect()` 数 | 单跑退出码 | 单跑耗时 |
|---|---:|---:|---:|---:|
| `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\tests\security\consult-agent\permissions.test.ts` | 69 | 177 | 0 | 1.56s（首跑）；交付前复跑 1.66s；终轮单跑 1.40s（`F-permissions-final.log`） |
| `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\tests\integration\consult-agent\consultFlow.test.ts` | 7 | 181 | 0 | 11.47s（首跑；回放用例 `timeout 30000ms`）；交付前复跑 11.27s；终轮单跑 11.22s（`F-flow-final.log`） |

测试范式：`import { describe, expect, it } from "bun:test"`；相对路径 `../../src/...`；fake Ctx 直驱路由 handler，仿写 `tests/integration/inpatient-routes.test.ts` 的 `makeCtx` 与既有 `tests/unit/consult-agent/helpers.ts` 夹具；`DEMO_MODE=1` 进程内共享 `createConsultAgentRepo()` 单例仓储，不连库不联网。

### 1.2 权限测试覆盖点（permissions.test.ts，69 用例）

夹具：`ANONYMOUS = null`；`u-perm-none`（roles doctor，perms `[]`）；`u-perm-read`；`u-perm-write`；`u-perm-audit`（roles auditor）；`u-perm-admin`（roles admin，直通）。12 个端点模板（前缀 `/api/v1/consult-agent`，契约 §12）：

| 权限码 | 端点（Method / Path） |
|---|---|
| `consult-agent:read` | GET `/threads`、GET `/threads/:threadId/messages`、GET `/threads/:threadId/stream/replay`、GET `/rules/snapshot`、GET `/threads/:threadId/drafts/:kind`、GET `/profile` |
| `consult-agent:write` | POST `/threads`、POST `/threads/:threadId/messages`、POST `/threads/:threadId/transcribe`、POST `/threads/:threadId/stream`、POST `/threads/:threadId/exit` |
| `consult-agent:audit` | GET `/threads/:threadId/audit` |

覆盖断言（与 `src/bff/types.ts` 信封、`middleware/auth.ts` 的 `requirePermissionCode` 签名/拒绝形状对齐）：

- **未登录**（`c.user` 缺失/null）→ 12 端点逐一返回 **401 / code 40100 / `data=null`**；
- **已登录缺码**（`u-perm-none`）→ 12 端点逐一返回 **403 / code 40300 / `data=null`**；
- **持码放行**：read 码 6 个读端点、write 码 5 个写端点、audit 码 1 个审计端点均通过权限闸；放行后允许返回 200 或业务 400/404，断言**不出现 401/403**；
- **码间隔离**：read 码访问 5 个写端点 + 审计端点 → 403；write 码访问 6 个读端点 + 审计端点 → 403；audit 码访问 6 个读端点 + 5 个写端点 → 403；
- **拒绝路径不落库**：缺码创建会话前后 `listThreads` 计数不变；缺码发送消息前后消息数、诊断草稿数不变；未登录创建会话在空用户名下不产生会话；
- **守卫直测**：admin 角色直通三条码；精确码匹配（持 read 不放行 write）；未登录 401、缺码 403 信封 `code=40300`；
- 专项细节：read 码读取规则快照返回三条权限码与免责声明；read 码画像返回事实数组；write 码转写返回归一化文本；write 码流式问诊在权限闸之后因入参非法返回 400（非 401/403）；write 码退出会话返回 `closed`。

### 1.3 集成 E2E 主链路覆盖点（consultFlow.test.ts，7 用例，会话推进顺序执行、共享闭包线程 ID）

夹具：`FLOW_USER=u-flow-m86`、`FLOW_TRACE=trc-flow-m86`，perms = read + write；`sharedRepo = createConsultAgentRepo()` 与路由模块共享同一 DEMO 进程内单例运行时；`findRoute` 按方法 + 模板段匹配并自动抽取 `:threadId` / `:kind` 路径参数；`parseSseFrames` 按 `data: {json}\n\n` 切帧、结束帧 `data: [DONE]`（契约 §11）。

| # | 用例标题 | 关键断言（对应任务书交付范围一 B 节） |
|---|---|---|
| 1 | 创建会话：初始 idle、消息列表为空，免责声明随后续产物附着 | POST `/threads` → 200；`thread.status='idle'`、`closedAt=null`、`messages=[]`；仓储 `findThread` 回读 idle；`userId=FLOW_USER` |
| 2 | 普通问诊：编排完成、回复落库附免责声明、审计留痕、草稿恒需复核 | 发送「头痛三天、咳嗽乏力」→ 200；`message.role='assistant'`、`roleKind='doctor'`、`content` 与 `disclaimer` 均为 `DISCLAIMER`、`traceId=FLOW_TRACE`；线程 `review_pending`；仓储消息含 assistant 且附免责声明；审计条目非空；诊断草稿 `kind='diagnosis'`、`needsPhysicianReview=true`、`isOutOfHospitalPrescription=false`、`status='pending_review'`、`evidence` 非空、正文含免责声明与「待复核」 |
| 3 | 急症旁路：escalated + safety:acute 引导，不产草稿，acute_bypass 留痕 | 发送「胸痛伴大汗，呼吸困难，意识不清」→ 线程 `escalated`；消息内容 = `ACUTE_GUIDANCE`、`safetyLevel='acute'`；响应层草稿为空；事件序列含 `safety:acute`（`matched` 非空、`guidance=ACUTE_GUIDANCE`）且**不含** `draft` 帧；仓储 diagnosis/prescription 两类草稿均为空数组；审计含 `action='acute_bypass'`、`actorRole='system'`、`traceId=FLOW_TRACE`、`detail.matched` 非空；首条持久化消息为急症引导且附免责声明 |
| 4 | 草稿链路：用药咨询生成处方草稿，非院外处方、待医师复核 | 发送「布洛芬怎么服用、副作用与注意事项」→ 处方草稿 `kind='prescription'`；`needsPhysicianReview=true`、`isOutOfHospitalPrescription=false`、`status='pending_review'`；正文含「在院医嘱」与免责声明；`evidence` 含 `kind='drug'`；仓储处方草稿 1 条、三红线字面量一致；诊断草稿为空数组 |
| 5 | 审计轨迹：升序排列、actorRole/traceId/action 齐全；工具记录字段白名单、无原始入参 | `listAudit` 按 `createdAt` 非降序；`actorRole` 属于 `supervisor/examiner/doctor/pharmacist/system/user`；`traceId=FLOW_TRACE`；`action` 非空；工具类审计 `toolStatus` 非空、`durationMs/evidenceCount` 为 number、`errorClass` 为 null 或 string，`detail` 键集合仅 `['summary','tool']`；持久化 `toolCalls` 键集合仅 `callId/durationMs/errorClass/evidenceCount/name/status/summary`；序列化审计不含 `rawArgs/raw_args/toolArgs/原始入参` |
| 6 | 事件回放：帧类型集合与顺序符合契约 §11，末尾 `[DONE]`，重复回放幂等一致 | GET `/threads/:threadId/stream/replay` → 200、`Content-Type: text/event-stream`；末帧载荷 `[DONE]`；帧类型仅取自 `delta/tool/safety:acute/draft/disclaimer/meta/done/error`；本线程序列不含 `error`、不含 `safety:acute`；必含 `tool/delta/disclaimer/draft/meta/done`；`meta` 末位先于 `done` 末位、`done` 位于最后；`tool` 先于 `delta`；第二次回放原始字节与第一次完全一致（幂等） |
| 7 | 终态：关闭会话后再发消息 → 409 THREAD_CLOSED 语义 | POST `/exit` → 200、线程 `closed`、`closedAt` 非空；审计含 `thread_exit`；关闭后 POST `/messages` → **409 / code 40900 / `data=null`**；重复 `/exit` 亦返回 409；仓储线程保持 `closed`、消息列表为空 |

> 说明（偏差留痕，非契约违反）：急症旁路 `result.draft=null` 经 BFF messages handler 合并为响应层 `undefined`，测试断言改为宽松空值（`payload.draft == null`）；仓储层两类草稿空数组断言独立成立。

---

## 2. 全量静态门禁实测（退出码均取自真实运行，未伪造通过）

### 2.1 根类型检查

| 命令（仓库根执行） | 退出码 | 结果 | 证据 |
|---|---:|---|---|
| `node_modules\.bin\tsc.cmd --noEmit` | **0** | 日志 0 字节、零输出；无 consult 新增导致错误，亦无既有基线编译错误；交付前复跑 `TSC_FINAL_EXIT=0`、`F-tsc-final.log` 0 字节 | `F-tsc.log`、`F-tsc-final.log`、`F-gate-exits.txt`（`TSC_EXIT=0` / `TSC_FINAL_EXIT=0`） |

### 2.2 ESLint（consult 新增路径，`--max-warnings 0`）

**(a) 后端 consult 路径（根配置）**，命令：

```powershell
node_modules\.bin\eslint.cmd tests/security/consult-agent tests/integration/consult-agent tests/unit/consult-agent src/core/agent/consult src/bff/routes/consultAgentRoutes.ts src/db/repositories/consultAgentRepo.ts --max-warnings 0
```

| 项 | 结果 | 证据 |
|---|---|---|
| 退出码 | **0**（`ESLINT_BACKEND_EXIT=0`；交付前复跑 `ESLINT_BACKEND_FINAL_EXIT=0`） | `F-eslint-backend.log`、`F-eslint-backend-final.log`、`F-gate-exits.txt` |
| lint 问题 | 0；日志仅含 Node 侧 `.eslintignore` 弃用提示（配置迁移通知，非 lint 报错；单条 `NativeCommandError` 为 PowerShell 对该 stderr 的分类标签） | 同上 |

**(b) web consult 两文件（任务书 §4-2 列举路径），两口径并列**：

| 口径 | 命令（工作目录） | 退出码 | 结果 | 证据 |
|---|---|---:|---|---|
| 根配置（仓库根） | `node_modules\.bin\eslint.cmd web/src/services/api/consultAgent.ts web/src/pages/consult-agent --max-warnings 0` | **1** | 9 问题（7 errors / 2 warnings），全部位于 E 分片既有 consult 前端产物；红线禁止 F 改写 `web/**`，归属 E 分片债务，见 §5.4 | `F-eslint-webE.log`、`ROOT_ESLINT_WEB_E_EXIT=1` |
| web 本地配置（`web/` 目录） | `npx eslint src/services/api/consultAgent.ts src/pages/consult-agent --max-warnings 0` | **0** | 0 问题；`web/eslint.config.js` 仅 recommended，未启用类型检查/风格规则 | `F-eslint-webE-local.log`、`WEB_ESLINT_EXIT=0` |

根口径 9 问题明细（`ConsultAgentChatPage.tsx` 8 + `consultAgent.ts` 1）：

- `ConsultAgentChatPage.tsx:19:1` `simple-import-sort/imports` warning；`:540:41`、`:691:21` `@typescript-eslint/prefer-nullish-coalescing` error；`:586:19`、`:596:21`、`:632:23`、`:854:28`、`:863:23` `@typescript-eslint/no-misused-promises` error（5 处）；
- `consultAgent.ts:14:1` `simple-import-sort/imports` warning。

### 2.3 Prettier

**(a) 后端 consult 路径**，命令：

```powershell
node_modules\.bin\prettier.cmd --check tests/security/consult-agent tests/integration/consult-agent tests/unit/consult-agent src/core/agent/consult src/bff/routes/consultAgentRoutes.ts src/db/repositories/consultAgentRepo.ts
```

退出码 **0**（`PRETTIER_BACKEND_EXIT=0`；交付前复跑 `PRETTIER_BACKEND_FINAL_EXIT=0`），日志：`All matched files use Prettier code style!`（`F-prettier-backend.log`、`F-prettier-backend-final.log`）。两个新测试文件编写过程中曾出现格式偏差，`--write` 后复查 exit 0。

> 以上为提交前快照；提交后后端 Prettier 唯一告警文件与处置见 §2.7 与 §5.1 缺口 G10。

**(b) web consult 两文件**（`web/` 目录 `npx prettier --check`）：退出码 **0**（`WEB_PRETTIER_EXIT=0`），`All matched files use Prettier code style!`（`F-prettier-webE.log`）。

### 2.4 consult 专项测试（三目录合并）

命令（仓库根）：

```powershell
$env:DEMO_MODE='1'; & "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent
```

| 指标 | 值 |
|---|---:|
| 退出码 | **0**（`BUN_CONSULT_EXIT=0`；交付前复跑 `BUN_CONSULT_FINAL_EXIT=0`） |
| pass | **177** |
| fail | **0** |
| `expect()` calls | **659** |
| 文件数 | 15 |
| 耗时 | 12.08s（首轮）；交付前复跑 11.87s，证据 `F-bun-consult-final.log` |

逐文件 pass 数（`F-bun-consult.log`，合计 177）：

| 测试文件 | pass |
|---|---:|
| `tests/integration/consult-agent/consultFlow.test.ts` | 7 |
| `tests/security/consult-agent/permissions.test.ts` | 69 |
| `tests/unit/consult-agent/typesSchema.test.ts` | 15 |
| `tests/unit/consult-agent/intentClassifier.test.ts` | 11 |
| `tests/unit/consult-agent/toolRegistry.test.ts` | 10 |
| `tests/unit/consult-agent/memory.test.ts` | 9 |
| `tests/unit/consult-agent/orchestrator.test.ts` | 8 |
| `tests/unit/consult-agent/roles.test.ts` | 7 |
| `tests/unit/consult-agent/sentinel.test.ts` | 7 |
| `tests/unit/consult-agent/acuteVocabulary.test.ts` | 6 |
| `tests/unit/consult-agent/demoSeed.test.ts` | 6 |
| `tests/unit/consult-agent/disclaimer.test.ts` | 6 |
| `tests/unit/consult-agent/draftHash.test.ts` | 6 |
| `tests/unit/consult-agent/safetyGate.test.ts` | 5 |
| `tests/unit/consult-agent/stateMachine.test.ts` | 5 |

`tests/unit/consult-agent/` 共 14 个条目（13 测试 + `helpers.ts` 夹具，非测试文件）。

### 2.5 B 类对应回归测试

**(a) 任务书点名命令**：`$env:DEMO_MODE='1'; & "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/apiDocs.test.ts` → 退出码 **0**（`BUN_APIDOCS_EXIT=0`），**13 pass / 0 fail / 204 expect / 1 文件 / 1167.00ms**（`F-bun-apidocs.log`）。

**(b) B 类既有后端文件对应用例合并批次**：`git diff --name-only` 匹配出的被改文件逐一对应到 8 个测试文件，合并一批跑通（含 (a) 的 `apiDocs.test.ts` 复跑），退出码 **0**，**140 pass / 0 fail / 1143 expect / 8 文件 / 1.52s**（`F-bclass.log`、`F-bun-bclass.log`）：

| 测试文件 | pass | 覆盖的 B 类改动 |
|---|---:|---|
| `tests/unit/apiDocs.test.ts` | 13 | `src/bff/routes/apiDocs.ts`、`src/bff/aggregators/apiDocsAggregator.ts` 品牌标题断言同步 |
| `tests/unit/twin3DInpatient.test.ts` | 18 | `src/bff/routes/twin3DInpatient.ts` 对应聚合器纯函数（**不覆盖路由 handler**，缺口见 §5.1） |
| `tests/unit/bff/demoModeGuard.test.ts` | 9 | DEMO 模式聚合器短路守卫回归 |
| `tests/unit/bff/prodDemoFailClosed.test.ts` | 18 | `auth.ts` 生产拒绝、`sessionGuard.ts` fail-closed、`audit.ts` 不跳过审计、`runtimeEnv.ts` 启动期拒绝 |
| `tests/unit/core/SystemPromptBuilder.test.ts` | 11 | `SystemPromptBuilder.ts` 品牌标识断言同步 |
| `tests/unit/security/audit-report.test.ts` | 6 | 审计报告生成回归 |
| `tests/unit/security/audit.test.ts` | 19 | 审计事件、哈希链、日志存储回归 |
| `tests/unit/security/encryption.test.ts` | 46 | `src/security` 桶导出的 HashUtils / EncryptionService / 哈希链回归（**不直连 FieldCipher**，缺口见 §5.1） |

### 2.6 `tests/unit` 宽范围回归（本机分批、超时如实记录）

本机无 PostgreSQL，进程内 DEMO 短路；`tests/integration/**` 不纳入本轮宽范围执行（§5.2）。

| 轮次 | 命令形态 | 文件头覆盖 | pass | fail | expect | 退出码 / 状态 | 证据 |
|---|---|---:|---:|---:|---:|---|---|
| 首轮 | `bun test tests/unit`（600s 超时截断） | 1948 | 13,961 | 1 | 日志未形成最终汇总 | 超时截断，非全绿 | `F-bun-unit-wide.log` |
| 第二轮 批次 1 | 分批 `bun test <chunk>` | 24 | 325 | 1 | 3149 | 退出码 1（基线失败 1 例） | `F-bun-unit-pass2.log` |
| 第二轮 批次 2 | 同上 | 24 | 185 | 0 | 440 | 退出码 0 | `F-bun-unit-pass2.log` |
| 第二轮 批次 3 | 同上 | 13（截断前已出现文件头） | — | 0（段内无 fail 行） | — | 超时截断，批次未跑完、无汇总 | `F-bun-unit-pass2.log` |
| 第三轮 批次 1 | 补跑未覆盖清单 | 16 | 293 | 0 | 884 | 退出码 0 | `F-bun-unit-pass3.log` |
| 第三轮 批次 2 | 同上 | 15 | 193 | 0 | 871 | 退出码 0 | `F-bun-unit-pass3.log` |

- 三轮合并去重后覆盖 **2040 / 2040** 个 `tests/unit/*.test.ts` 文件（`tests/unit` 目录实测总数 2040，未跑清单终值 = 0）。
- 三轮独立失败用例合计 **2 例**，均为基线问题、非 consult 引入、非 B 类引入（源文件与测试在 HEAD 均未修改），明细见 §5.3。
- 口径声明：首轮与第二批批次 3 被超时截断，未生成最终 expect 汇总；上表 expect 数仅来自形成汇总的批次，不以部分批次数字冒充全量 expect 总量。

### 2.7 提交后现场复跑（对照 HEAD `db3ace9f`，五组提交落地后）

五组提交落地后，F 在当前工作区复跑以下门禁，退出码与统计取自真实运行（日志 `F-*-postcommit.log`）；其后 `65802b20` / `ea1fe58f` / `256cbcdd` / `f238cbba` 仅调整忽略规则、探针去索引与 `reports/` 底稿归档（不含 `src/` 后端改动，见 §3.6 阶段二），本节门禁结论对 HEAD `44fe568b` 仍然成立；G10 修复前一轮复跑证据见 §2.8，G10 收口证据见 §2.9，G10 入库后干净现场终轮复跑见 §2.10。

| 命令（仓库根 / `web/`） | 退出码 | 结果 | 证据 |
|---|---:|---|---|
| `node_modules\.bin\tsc.cmd --noEmit` | **0** | 0 字节输出；提交后类型检查通过 | `F-tsc-postcommit.log`、`TSC_POSTCOMMIT_EXIT=0` |
| `node_modules\.bin\eslint.cmd <后端 consult 六路径> --max-warnings 0` | **0** | 0 问题；仅 `.eslintignore` 弃用提示 | `F-eslint-backend-postcommit.log`、`ESLINT_BACKEND_POSTCOMMIT_EXIT=0` |
| `node_modules\.bin\prettier.cmd --check <后端 consult 六路径>` | **1** | 仅 `src/core/agent/consult/runtime/sessionRuntime.ts` 1 个文件格式告警；F 两个新测试文件单独 `--check` **exit 0**。该文件属 A 类已提交核心源码（`42c98a3d` 入库），F 红线禁止改写 `src/core/agent/consult/**`，列入 §5.1 缺口 G10 交对应源码分片收口 | `F-prettier-backend-postcommit.log`、`PRETTIER_BACKEND_POSTCOMMIT_EXIT=1` |
| `bun test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent` | **0** | **177 pass / 0 fail / 659 expect / 15 文件 / 11.75s** | `F-bun-consult-postcommit.log`、`BUN_CONSULT_POSTCOMMIT_EXIT=0` |
| `bun test` B 类 8 个既有测试文件 | **0** | **140 pass / 0 fail / 1143 expect / 8 文件 / 1.54s**；提交后 B 类安全/品牌改动与其既有测试仍然相容 | `F-bun-bclass-postcommit.log`、`BUN_BCLASS_POSTCOMMIT_EXIT=0` |
| 根配置 `eslint web/src/services/api/consultAgent.ts web/src/pages/consult-agent --max-warnings 0` | **1** | 仍为 9 问题（7 errors / 2 warnings），规则与位置同 §2.2(b)，G 提交未消化该 E 分片债务 | `F-eslint-webE-postcommit.log`、`ROOT_ESLINT_WEB_E_POSTCOMMIT_EXIT=1` |
| `web/` 本地 `eslint` 同两文件 | **0** | 0 问题 | `F-eslint-webE-local-postcommit.log`、`WEB_LOCAL_ESLINT_POSTCOMMIT_EXIT=0` |
| `web/` 本地 `prettier --check` 同两文件 | **0** | `All matched files use Prettier code style!` | `F-prettier-webE-postcommit.log`、`WEB_LOCAL_PRETTIER_POSTCOMMIT_EXIT=0` |

> 说明：提交前 §2.1–§2.4 的后端 Prettier 为 exit 0；提交后 `sessionRuntime.ts` 格式告警来自 `42c98a3d` 入库版本，与 F 新增测试无关。F 未对该文件执行 `--write`。

### 2.8 G10 修复前轮次复跑（对照 HEAD `f238cbba`，G10 尚开放时点证据）

`f238cbba` 落地后（仅 `reports/` 底稿，无 `src/` 后端改动），F 在交付前对当时现场再跑一轮门禁，退出码与统计取自真实运行（日志 `F-*-latest.log`、`F-permissions-final.log`、`F-flow-final.log`）；本轮 Prettier 仍仅 `sessionRuntime.ts` 告警（G10，时间点证据，收口情况见 §2.9）：

| 命令（仓库根 / `web/`） | 退出码 | 结果 | 证据 |
|---|---:|---|---|
| `node_modules\.bin\tsc.cmd --noEmit` | **0** | 0 字节输出；类型检查通过 | `F-tsc-final.log`、`TSC_LATEST_EXIT=0` |
| `node_modules\.bin\eslint.cmd <后端 consult 六路径> --max-warnings 0` | **0** | 0 问题；仅 `.eslintignore` 弃用提示 | `F-eslint-backend-latest.log`、`ESLINT_BACKEND_LATEST_EXIT=0` |
| `node_modules\.bin\prettier.cmd --check <后端 consult 六路径>` | **1** | 仍仅 `sessionRuntime.ts` 1 个文件告警（G10）；F 两个新测试文件单独 `--check` **exit 0** | `F-prettier-backend-latest.log`、`F-prettier-f-tests-latest.log`、`PRETTIER_BACKEND_LATEST_EXIT=1`、`F_TESTS_PRETTIER_LATEST_EXIT=0` |
| `bun test tests/security/consult-agent/permissions.test.ts` | **0** | **69 pass / 0 fail / 177 expect / 1 文件 / 1.40s** | `F-permissions-final.log`、`PERMISSIONS_LATEST_EXIT=0` |
| `bun test tests/integration/consult-agent/consultFlow.test.ts` | **0** | **7 pass / 0 fail / 181 expect / 1 文件 / 11.22s** | `F-flow-final.log`、`FLOW_LATEST_EXIT=0` |
| `bun test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent` | **0** | **177 pass / 0 fail / 659 expect / 15 文件 / 11.76s** | `F-bun-consult-latest.log`、`BUN_CONSULT_LATEST_EXIT=0` |
| `bun test` B 类 8 个既有测试文件 | **0** | **140 pass / 0 fail / 1143 expect / 8 文件 / 1.53s** | `F-bun-bclass-latest.log`、`BUN_BCLASS_LATEST_EXIT=0` |
| 根配置 `eslint web/src/services/api/consultAgent.ts web/src/pages/consult-agent --max-warnings 0` | **1** | 9 问题（7 errors / 2 warnings），规则与位置同 §2.2(b)，E 分片债务未消化 | `F-eslint-webE-latest.log`、`ROOT_WEB_ESLINT_LATEST_EXIT=1` |
| `web/` 本地 `eslint` 同两文件 | **0** | 0 问题 | `F-eslint-webE-local-latest.log`、`WEB_LOCAL_ESLINT_LATEST_EXIT=0` |
| `web/` 本地 `prettier --check` 同两文件 | **0** | `All matched files use Prettier code style!` | `F-prettier-webE-latest.log`、`WEB_LOCAL_PRETTIER_LATEST_EXIT=0` |

> 时点口径（§2.8 快照，`f238cbba`）：consult 专项后端门禁（tsc、后端 ESLint、consult 测试、B 类回归）在当时现场复跑均 exit 0；唯一后端 Prettier 告警为 G10 单列项；web 根口径 ESLint 9 问题归属 E 分片，web 本地口径 exit 0。G10 修复过程与入库闭环见 §2.9；入库后干净现场终轮复跑见 §2.10。

### 2.9 G10 收口过程（`sessionRuntime.ts` Prettier 格式，工作树修复 → 收口提交入库）

收口动作仅对 `src/core/agent/consult/runtime/sessionRuntime.ts` 的 `listAudit` 单行 `localeCompare` 表达式按 Prettier 规则折行（diff 3 插入 / 1 删除），无逻辑变更、无接口与签名改动；其余 consult 后端文件格式此前即合规。F 全程未改写该文件，折行由对应源码分片在收口阶段执行。

**(a) 工作树修复后复跑（未提交时点，日志 `F-*-final2.log`）**：

| 命令 | 退出码 | 结果 | 证据 |
|---|---:|---|---|
| `node_modules\.bin\prettier.cmd --check <后端 consult 六路径>` | **0** | `All matched files use Prettier code style!`；G10 告警清零 | `F-prettier-backend-final2.log`、`PRETTIER_BACKEND_FINAL2_EXIT=0` |
| `node_modules\.bin\eslint.cmd <后端 consult 六路径> --max-warnings 0` | **0** | 0 问题；仅 `.eslintignore` 弃用提示 | `F-eslint-backend-final2.log`、`ESLINT_BACKEND_FINAL2_EXIT=0` |
| 根 `node_modules\.bin\tsc.cmd --noEmit` | **0** | 0 字节诊断；折行未引入类型错误 | `F-tsc-final2.log`、`TSC_FINAL2_EXIT=0` |
| `bun test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent` | **0** | 177 pass / 0 fail / 659 expect / 15 文件 | `F-bun-consult-final2.log`、`BUN_CONSULT_FINAL2_EXIT=0` |
| `bun test` B 类 8 个既有测试文件 | **0** | 140 pass / 0 fail / 1143 expect / 8 文件 | `F-bun-bclass-final2.log`、`BUN_BCLASS_FINAL2_EXIT=0` |

**(b) 入库闭环**：折行 hunk 随 `44fe568b style(consult-agent)` 入库（同提交含三份 `reports/` 底稿回填，无其他源码改动）；入库后干净现场终轮复跑见 §2.10。G10 闭环状态同步至 §5.1 与 §7.2。

### 2.10 HEAD `44fe568b` 干净现场终轮复跑（交付口径证据）

`44fe568b` 入库后（§2.10 时点快照）工作区干净（`git status --short` 为空），F 对当时现场再跑一轮门禁，退出码与统计取自真实运行（日志 `F-*-final3.log`）：

| 命令（仓库根 / `web/`） | 退出码 | 结果 | 证据 |
|---|---:|---|---|
| `node_modules\.bin\tsc.cmd --noEmit` | **0** | 0 字节输出；类型检查通过 | `TSC_FINAL3_EXIT=0`（`F-gate-exits.txt`；`F-tsc-final3.log`） |
| `node_modules\.bin\eslint.cmd <后端 consult 六路径> --max-warnings 0` | **0** | 0 问题；仅 `.eslintignore` 弃用提示 | `F-eslint-backend-final3.log`、`ESLINT_BACKEND_FINAL3_EXIT=0` |
| `node_modules\.bin\prettier.cmd --check <后端 consult 六路径>` | **0** | `All matched files use Prettier code style!`；G10 告警清零、后端 consult 格式全绿 | `F-prettier-backend-final3.log`、`PRETTIER_BACKEND_FINAL3_EXIT=0` |
| `bun test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent` | **0** | **177 pass / 0 fail / 659 expect / 15 文件 / 12.85s** | `F-bun-consult-final3.log`、`BUN_CONSULT_FINAL3_EXIT=0` |
| `bun test` B 类 8 个既有测试文件 | **0** | **140 pass / 0 fail / 1143 expect / 8 文件 / 1.80s** | `F-bun-bclass-final3.log`、`BUN_BCLASS_FINAL3_EXIT=0` |
| 根配置 `eslint web/src/services/api/consultAgent.ts web/src/pages/consult-agent --max-warnings 0` | **1** | 9 问题（7 errors / 2 warnings），规则与位置同 §2.2(b)，E 分片债务未消化 | `F-eslint-webE-final3.log`、`ROOT_WEB_ESLINT_FINAL3_EXIT=1` |
| `web/` 本地 `eslint` 同两文件 | **0** | 0 问题 | `F-eslint-webE-local-final3.log`、`WEB_LOCAL_ESLINT_FINAL3_EXIT=0` |
| `web/` 本地 `prettier --check` 同两文件 | **0** | `All matched files use Prettier code style!` | `F-prettier-webE-final3.log`、`WEB_LOCAL_PRETTIER_FINAL3_EXIT=0` |

> 交付口径：HEAD `44fe568b` 上，consult 专项后端门禁（tsc、后端 ESLint、后端 Prettier、consult 测试、B 类回归）全部 exit 0；唯一未消化项为 web 根口径 ESLint 9 问题（E 分片债务，§5.4）；web 本地 ESLint/Prettier exit 0。

---

## 3. B 类既有改动独立验证（不回退、不分入 consult，只验证与留证）

> **口径边界**：本章 §3.1–§3.5 的文件清单、增删行数、ESLint/Prettier 基线对比，均为 F 在提交前对照基线 `3f019078` 的实测快照（底稿 `F-numstat-tracked.txt`、`F-eslint-bclass.log` 等）；五组提交落地后的现场状态见 §3.6。F 未回退、未改写任何 B 类文件。

### 3.1 全量盘点（`git status --short` + `git diff HEAD --numstat`）

| 类别 | 文件数 | 新增行 | 删除行 | 说明 |
|---|---:|---:|---:|---|
| 产品类跟踪改动 | 89 | 823 | 2159 | 明细 `F-numstat-tracked.txt`；下分 §3.2 各桶 |
| 历史探针/取证 txt、过程 csv 与 web 过程日志 | 656 | 0 | 35169 | 排除项，不 `git add`；其中 656 个删除已先于 F 进入暂存区（§0 声明），交 G 按 `chore(housekeeping)` 处置 |
| 合计跟踪改动记录 | 745 | 823 | 37328 | 不含未跟踪 consult 新增产物与未跟踪 B 新增辅助模块 |

> 任务书口径「2101 行删除」为历史快照数；F 实测产品类删除 **2159 行**（含删除资产 1780 行），以 `F-numstat-tracked.txt` 为准。

### 3.2 B 类文件分类清单与逐文件 diff 规模（增 / 删）

#### 3.2.1 C3 安全与信封逻辑调整（9 文件，80 / 39）

| 文件 | 增 | 删 | 改动性质（`git diff HEAD` 逐行核对） | 测试证据 |
|---|---:|---:|---|---|
| `src/bff/middleware/auth.ts` | 18 | 11 | 生产环境缺 `JWT_SECRET` 直接抛错，禁止回落开发默认密钥；`verifyJwt` 捕获密钥异常返回 null（验签失败拒绝令牌）；DEMO 短路授予 demo admin 仅限非生产；接入 `runtimeEnv` 判定 | `prodDemoFailClosed.test.ts`：生产误配 DEMO 不授予演示身份 2 例、未登录 401；非生产演示放行 1 例；生产未开启演示未登录 401 |
| `src/bff/middleware/audit.ts` | 11 | 2 | 新增导出 `shouldSkipAuditForDemo()`；演示模式跳过审计落库仅限非生产，生产误配 DEMO 也必须留痕 | `prodDemoFailClosed.test.ts` 3 例：生产误配不跳过、非生产跳过、生产未配不跳过 |
| `src/bff/middleware/sessionGuard.ts` | 22 | 15 | 断库由 fail-open 改为 **fail-closed**（DB 异常按未登录拒绝、不写入「有效」缓存）；导出 `checkSessionActive(jti)` 供直测；演示模式跳过 jti 查库仅限非生产 | `prodDemoFailClosed.test.ts`：`enforceSession` 生产不跳过查库、DB 故障清空会话 4 例；`checkSessionActive` DB 异常 false / 有效 true / 吊销过期 false 共 3 例 |
| `src/db/pool.ts` | 4 | 0 | 生产必须显式 `DATABASE_URL`，禁止回落本地默认主机/账号/口令，否则启动抛错 | 无专属测试（§5.1 缺口 G1） |
| `src/security/encryption/FieldCipher.ts` | 4 | 0 | 生产必须配置 `FIELD_ENCRYPTION_KEY`（或复用 `JWT_SECRET`），禁止回落开发态密钥，否则抛错 | 无专属生产分支测试（§5.1 缺口 G2）；`encryption.test.ts` 不直连本模块 |
| `src/bff/routes/health.ts` | 13 | 7 | 探活响应由裸对象改为 `ok()` 信封包装并携带 `traceId` | 无专属路由测试（§5.1 缺口 G3） |
| `src/bff/routes/imaging.ts` | 2 | 2 | 重复签名由 `400/BAD_REQUEST` 改为 `409/CONFLICT`，响应状态码仍为 409 | 无专属路由测试（§5.1 缺口 G4） |
| `src/bff/routes/twin3DInpatient.ts` | 1 | 1 | 失败信封补 `c.traceId` 并显式携带 400 状态码 | `twin3DInpatient.test.ts` 仅覆盖聚合器纯函数，未覆盖 handler（§5.1 缺口 G5） |
| `services-java/jlmedaios-monolith/src/main/java/com/jlmedaios/monolith/common/JwtAuthenticationFilter.java` | 5 | 1 | JWT 密钥 fail-closed 口径对齐后端 | services-java 本机无 Maven，未独立构建（§5.2 缺口 G8） |

#### 3.2.2 C1 品牌旧称替换 — 后端 / 前端代码（后端 13 文件 17/17 + web 16 文件 26/26，合计 29 文件 43/43；逐文件单行或同口径文案替换，无逻辑改动）

后端源码与既有测试（13 文件，17 / 17）：

| 文件 | 增 | 删 |
|---|---:|---:|
| `src/bff/aggregators/apiDocsAggregator.ts` | 1 | 1 |
| `src/bff/aggregators/chatAggregator.ts` | 1 | 1 |
| `src/bff/routes/apiDocs.ts` | 2 | 2 |
| `src/bff/routes/system.ts` | 1 | 1 |
| `src/core/agent/SystemPromptBuilder.ts` | 1 | 1 |
| `src/entrypoints/cli.tsx` | 2 | 2 |
| `src/medical-tools/emr/generateMedicalRecord.ts` | 1 | 1 |
| `src/security/compliance/ComplianceChecker.ts` | 1 | 1 |
| `src/ui/commands/medicalCommands.ts` | 3 | 3 |
| `src/ui/components/layout/HeaderBar.tsx` | 1 | 1 |
| `src/ui/screens/DashboardScreen.tsx` | 1 | 1 |
| `tests/unit/apiDocs.test.ts` | 1 | 1 |
| `tests/unit/core/SystemPromptBuilder.test.ts` | 1 | 1 |

web 前端代码（16 文件，26 / 26，含 `web/Dockerfile.frontend` 文案；`web/package.json` 包名替换归入 §3.2.4 C2）：

| 文件 | 增 | 删 |
|---|---:|---:|
| `web/src/components/demo/Navbar.tsx` | 1 | 1 |
| `web/src/components/layout/TopHeader.tsx` | 1 | 1 |
| `web/src/mock/demoMock.ts` | 3 | 3 |
| `web/src/mock/medicalReplyEngine.ts` | 1 | 1 |
| `web/src/mock/system.ts` | 1 | 1 |
| `web/src/mock/systemMock.ts` | 2 | 2 |
| `web/src/pages/agent/index.tsx` | 2 | 2 |
| `web/src/pages/demo/ArchitecturePage.tsx` | 1 | 1 |
| `web/src/pages/demo/ChatDemoPage.tsx` | 2 | 2 |
| `web/src/pages/demo/FeaturesPage.tsx` | 1 | 1 |
| `web/src/pages/demo/HomePage.tsx` | 3 | 3 |
| `web/src/pages/demo/ScenariosPage.tsx` | 2 | 2 |
| `web/src/pages/emergency/index.tsx` | 1 | 1 |
| `web/src/pages/LoginPage.tsx` | 2 | 2 |
| `web/src/utils/config.ts` | 1 | 1 |
| `web/Dockerfile.frontend` | 2 | 2 |

实测核对：上述 diff 均为 `Gang-OS / 健澜科技数智医院智能体 / 杠OS` 等旧称替换为「健澜AI原生医院操作系统OS」（`cli.tsx`、`medicalCommands.ts` 同时更新版权行至「杭州健澜科技有限公司」），未出现条件分支、状态读写或接口签名变更；两个被改测试文件的断言同步新品牌，已在 §2.5 跑通。

#### 3.2.3 C1 品牌文档替换（根目录 / 开源指南 / services README，11 文件，293 / 124；与 `docs/architecture` 11 文件同归 B `docs(brand)`）

| 文件 | 增 | 删 |
|---|---:|---:|
| `README.md` | 96 | 68 |
| `README_EN.md` | 56 | 12 |
| `CONTRIBUTING.md` | 2 | 2 |
| `DEPLOYMENT_GUIDE.md` | 1 | 1 |
| `SECURITY.md` | 1 | 1 |
| `docs/DEPLOYMENT_GUIDE.md` | 2 | 2 |
| `docs/open-source/GitHub发布指南.md` | 4 | 4 |
| `services-java/README.md` | 62 | 6 |
| `services-python/README.md` | 35 | 15 |
| `services/radar-inference/README.md` | 6 | 4 |
| `services-java/jlmedaios-monolith/README.md` | 28 | 9 |

`docs/architecture/` 11 个 md（28 / 28，品牌与决策文案替换）：`00-架构宪法.md` 9/9、`00-决策基线.md` 1/1、`01-PRD-产品需求.md` 2/2、`02-技术架构.md` 1/1、`03-开发指南.md` 1/1、`04-迁移路线.md` 1/1、`05-合规清单.md` 1/1、`06-团队与成本.md` 1/1、`review-1-architect.md` 1/1、`review-2-compliance.md` 2/2、`review-4-business-cost.md` 8/8。

#### 3.2.4 C2 链接 / 包名 / 镜像名 / 配置加固（21 文件，303 / 117）

| 文件 | 增 | 删 | 改动性质 |
|---|---:|---:|---|
| `package.json` | 6 | 5 | name `jianlan-gang-os` → `jlmedaios`；homepage / repository / bugs 改 `github.com/chenweidaben/JLAIharnessos`；keywords `杠OS` → `AI原生医院操作系统`，补 `hospital-os` |
| `web/package.json` | 1 | 1 | name `gang-os-web` → `jlmedaios-web`（归入本表，替代 §3.2.2 计数） |
| `web/package-lock.json` | 2 | 2 | 与 web 包名联动 |
| `.github/ISSUE_TEMPLATE/config.yml` | 3 | 3 | 仓库链接与品牌名替换 |
| `Dockerfile.backend` | 2 | 2 | 镜像名 / 构建参数品牌替换 |
| `deploy/nginx/Dockerfile` | 5 | 5 | 镜像名替换 |
| `deploy/observability/Dockerfile.jaeger` | 2 | 2 | 镜像名替换 |
| `deploy/observability/alertmanager/alertmanager.yml` | 3 | 3 | 告警接收人 / 品牌标签替换 |
| `deploy/postgres/backup.sh` | 5 | 5 | 容器名 / 卷名品牌替换 |
| `deploy/postgres/restore.sh` | 5 | 5 | 同上 |
| `deploy/prometheus/prometheus.yml` | 1 | 1 | 服务发现目标 / 标签品牌替换 |
| `deploy/grafana/provisioning/dashboards/dashboards.yml` | 2 | 2 | provider name/uid `gangos` → `jlmedaios`；`folderName` 已是新品牌；无具体 json 文件名引用（§3.4 复核） |
| `docker-compose.yml` | 93 | 36 | 服务名 / 镜像名 / 卷名 / 环境变量品牌对齐 |
| `docker-compose.prod.yml` | 8 | 3 | 同上生产口径 |
| `.env.compose.example` | 36 | 9 | 品牌名与占位变量对齐 |
| `.env.example` | 27 | 10 | 纪律 §3.100 实测**全部归 B**：APP_NAME 品牌、Redis/Kafka/ES 占位、JWT/加密主密钥 fail-closed 占位、Java 旁路变量、LLM provider 替换、文件头品牌；**无 consult 专属环境变量，consult 提交不得纳入** |
| `bun.lock` | 1 | 1 | 与 `package.json` 包名联动 |
| `services-python/docker-compose.yml` | 29 | 4 | 服务名 / 旁路 profile / 品牌对齐 |
| `services-java/jlmedaios-monolith/docker-compose.yml` | 58 | 11 | 同上 |
| `services-java/pom.xml` | 7 | 0 | 模块清单与 artifact 品牌对齐 |
| `services-java/jlmedaios-monolith/src/main/resources/application.yml` | 7 | 7 | 环境变量占位化；端口 5433 → 5432 对齐主干；services-java 本机无 Maven，未独立构建（§5.2 缺口 G8） |

#### 3.2.5 C5 删除资产（3 文件，0 / 1780）

| 文件 | 删行 | 替换新资产（未跟踪，交 G 盘点） |
|---|---:|---|
| `deploy/grafana/dashboards/gangos-infra.json` | 813 | `deploy/grafana/dashboards/jlmedaios-infra.json`（未跟踪） |
| `deploy/grafana/dashboards/gangos-overview.json` | 837 | `deploy/grafana/dashboards/jlmedaios-overview.json`（未跟踪） |
| `deploy/prometheus/rules/gangos.yml` | 130 | `deploy/prometheus/rules/jlmedaios.yml`（未跟踪） |

#### 3.2.6 C6 混合文件 hunk 归属（4 文件，75 / 27；纪律 §3.1）

| 文件 | 增 | 删 | A 类（consult）hunk | B 类（既有整改）hunk |
|---|---:|---:|---|---|
| `src/bff/permissions.ts` | 22 | 0 | **纯 A 类追加**：199–218 行 `CONSULT_AGENT_PERMISSIONS` 三条码、类型、`ALL_CONSULT_AGENT_PERMISSION_CODES`；0 删除，既有段字节未改，整文件归 A | 无 |
| `src/bff/server.ts` | 15 | 8 | 仅 2 行：`import { consultAgentRoutes } from './routes/consultAgentRoutes.js'`；allRoutes 末尾 `...consultAgentRoutes,` | 其余 M 系列路由顺序整改与补挂载 hunk（m209/m232/dataMartDeep/adminSurgeryOptimize/performance 系列前移与补挂）归 B 独立组；**收口阶段追加第 3 个 B 类 hunk**：6676 行兜底问候文案品牌改名（「健澜数智医院智能体」→「健澜AI原生医院操作系统OS」，1 插入 / 1 删除，非 consult 改动），单独进入 `fix(brand)` 提交（§7.2） |
| `web/src/router/index.tsx` | 18 | 17 | 仅两段：`ConsultAgentChatPage` lazy import 段；`consult-agent/chat` 的 `RequirePermission permission="consult-agent:read"` + Route 块 | 6 组既有路由去重与权限码/组件别名对齐 hunk（EmergencyTriage、dict、nursing_admin 码、EmergencyV2、billing:read、重复 order/detail）归 B 独立组 |
| `.gitignore` | 20 | 2 | 支撑规则 `/*.txt`（锚定根目录散落探针/取证 txt，保护排除项不被误 add） | 文件头旧称注释与版权行品牌替换归 B `chore(brand)`；其余过程文件忽略规则归 `chore(housekeeping)` |

#### 3.2.7 排除项（不纳入任何 consult 提交，保持未暂存、不回退）

| 文件 / 范围 | 增 | 删 | 处置 |
|---|---:|---:|---|
| `web/src/store/cdrQueryV2M636Store.ts` | 1 | 1 | 未暂存修改（` M`），遗留脏文件，不纳入任何 consult 提交（纪律 §1 排除项） |
| 656 个历史 txt/csv/web 过程日志（含 `probe_m416.txt` 0/6） | 0 | 35169 | 取消跟踪删除已先于 F 进入暂存区（`D ` 首列）；一律不 `git add`，交 G `chore(housekeeping)` 组在 `git reset` 后按分组处置，不进 consult 交付 |

### 3.3 B 类静态检查与 HEAD 基线对比

#### 3.3.1 ESLint（`--max-warnings 0`，逐文件对比 HEAD 临时副本）

方法：对当前有告警的 6 个被改文件，用 `git show HEAD:<file>` 写成同目录 `*.baseline.ts` 临时副本单独跑基线 ESLint；对比完成后临时副本已全部删除（复核残留 0）。当前 0 问题的 3 个文件未生成基线副本。日志：`F-eslint-bclass.log`（当前）、`F-eslint-baseline-head.log`（HEAD 基线）。

| 文件 | 当前问题 | HEAD 基线问题 | 结论 |
|---|---|---|---|
| `src/bff/aggregators/apiDocsAggregator.ts` | 5 errors：`@typescript-eslint/array-type`（30:10、57:14、68:12、69:9、78:13） | 同 5 条 `array-type`，同规则同位置 | 存量债务，B diff 零新增 |
| `src/bff/middleware/auth.ts` | 2 errors `prefer-optional-chain`（299:9、319:7）+ 1 error `prefer-nullish-coalescing`（343:20） | 同 3 条规则（292:9、312:7、336:20）；HEAD 行号较当前上移 7 行，系 B 新增 hunk 顶推所致 | 存量债务，B diff 零新增 |
| `src/bff/routes/apiDocs.ts` | 1 warning `simple-import-sort/imports`（13:1） | 同 1 条 | 存量债务 |
| `src/bff/routes/health.ts` | 1 warning `simple-import-sort/imports`（22:1） | 同 1 条 | 存量债务 |
| `src/bff/routes/twin3DInpatient.ts` | 1 warning `simple-import-sort/imports`（15:1）+ 4 errors `prefer-nullish-coalescing`（36:40、37:44、38:38、39:47） | 同 5 条规则同位置 | 存量债务 |
| `src/db/pool.ts` | 2 warnings `unused eslint-disable directive`（11:1、30:1） | 同 2 条 | 存量债务 |
| `src/bff/routes/imaging.ts` | 0 | —（当前 0 问题，未生成基线副本） | 干净 |
| `src/security/encryption/FieldCipher.ts` | 0 | —（同上） | 干净 |
| `tests/unit/apiDocs.test.ts` | 0 | —（同上） | 干净 |

合计：当前 **17 问题（12 errors / 5 warnings）**；6 个基线副本文件的 HEAD 基线同样为 **17 问题（12 errors / 5 warnings）**，规则与文件集合逐条相同。B diff 未引入任何新 ESLint 问题；F 未对 B 文件执行 `--fix`。

#### 3.3.2 Prettier（`--check`，同样 HEAD 临时副本对比）

日志：`F-prettier-bclass.log`（当前）、`F-prettier-baseline-head.log`（HEAD 基线）。

- 当前 6 文件 warn：`src/bff/routes/imaging.ts`、`src/bff/routes/twin3DInpatient.ts`、`src/bff/routes/health.ts`、`src/bff/aggregators/apiDocsAggregator.ts`、`src/security/encryption/FieldCipher.ts`、`src/bff/middleware/auth.ts`；
- HEAD 基线副本同样为这 6 个文件 warn；`src/bff/routes/apiDocs.ts`、`src/db/pool.ts`、`tests/unit/apiDocs.test.ts` 当前 `--check` 通过（当前 0 问题，未生成基线副本）；
- 结论：6 处格式问题全部为存量债务，B diff 未引入新格式问题；F 未对任何 B 文件执行 `--write`。

### 3.4 删除资产引用清零核验（`F-deleted-asset-grep.log`）

扫描范围：`src/`、`web/src/`、`deploy/`、`scripts/`、`.github/`、根目录配置与脚本。

| 资产文件名 | 源码 / 配置 / 脚本命中 | 文档命中（均为未修改 HEAD 基线文件，B 类文档遗留债务） |
|---|---|---|
| `gangos-infra.json` | 0 | 0（`reports/patrol/*.md` 为组织者底稿，不计产品残留） |
| `gangos-overview.json` | 0 | `docs/operations/01-监控手册.md:87` |
| `gangos.yml` | 0 | `docs/operations/01-监控手册.md:85`、`docs/operations/02-告警手册.md:65`、`CHANGELOG.md:64` |

- `deploy/grafana/provisioning/dashboards/dashboards.yml` diff 仅 provider name/uid `gangos` → `jlmedaios`，未引用任何已删除的具体 json 文件名；
- 4 处文档残留均位于 F 无权改动的 `docs/` 与 `CHANGELOG.md`，源文件在 `git status` 中未修改（HEAD 基线遗留），列入 §5.5 缺口交文档组清理；
- `reports/patrol/` 内提及属组织者巡检底稿，不计产品源码残留；
- **提交后复核**（`F-deleted-asset-grep-postcommit.log`，对照 HEAD `db3ace9f`）：`src/`、`web/src/`、`deploy/`、`scripts/`、`.github/` 三资产文件名命中仍为 **0**；上述 4 处文档残留提交后复扫位置与行号不变。

### 3.5 排除项复核

- `probe_m416.txt`、`web/src/store/cdrQueryV2M636Store.ts` 保持未暂存；未跟踪探针 / 日志 txt 一律未 `git add`；
- `reports/consult-rebuild/` 底稿不纳入测试断言与产物清单；
- 本轮未对 `node_modules` 执行重装，变更仅核对 diff 摘要。

### 3.6 提交后现场复核（分三阶段，最终对照 HEAD `44fe568b` 与收口三组提交）

**阶段一：五组提交落地后（对照 `db3ace9f`）**，`git diff HEAD --numstat` 跟踪改动仅剩 3 个文件，B 类产品类改动已分别由 `b5ecf42e`（安全加固）、`3985342a`（品牌）、`378f9928`（路由）、`db3ace9f`（部署/配置/README）吸收入库：

| 文件 | 增 | 删 | 当时性质与处置 |
|---|---:|---:|---|
| `.gitignore` | 30 | 2 | 提交前快照中的 A 支撑规则 `/*.txt` 与 B 品牌头注释混合；后由 `65802b20` 按纪律拆分入库 |
| `web/.gitignore` | 8 | 0 | B 类忽略规则追加；后由 `65802b20` 入库 |
| `probe_m416.txt` | 11 | 6 | 历史探针日志被后续探测覆写（`ERR 404 /api/v1/timeline/...` 11 行替换原 6 行 OK 记录）；`chore(housekeeping)` 排除项，后由 `65802b20` 去索引 |

**阶段二：最终现场（`65802b20` / `ea1fe58f` / `256cbcdd` / `f238cbba` / `44fe568b` 落地后，对照 HEAD `44fe568b`）**：产品类、B 类、consult 源码与前端零残留，未跟踪文件数 = 0；`git status --short` 为空（干净工作树，§2.10 时点快照）。期间一度仅剩 `reports/**` 底稿工作区修改，已由 `f238cbba`、`44fe568b` 分批入库；G10 折行 hunk 随 `44fe568b` 一并提交。

- `reports/consult-rebuild/F-gate-exits.txt` 提交后 F1/F2 基线记录与终轮退出码已由 `f238cbba`、`44fe568b` 吸收入库；
- `web/src/store/cdrQueryV2M636Store.ts` 在后续提交中已被 G 处理，当前工作区与 HEAD 一致；阶段一记录的 `reports/archive/`、`reports/audit-2026-10-25/`、`reports/patrol/`、`miniprogram/README.md`、`services/radar-inference/app/data/` 等未跟踪项均已由 `ea1fe58f` / `65802b20` 归档或忽略；
- 提交后 B 类 8 个既有测试文件复跑 **140 pass / 0 fail / 1143 expect**（§2.7 对照 `db3ace9f`、§2.10 对照 HEAD `44fe568b`、§7.3 对照 `73a2b2ae`），证明入库后的 B 类改动与其既有测试相容；§3.3 的 ESLint/Prettier 基线对比结论（B diff 零新增问题）以提交前快照为准；
- `65802b20`、`ea1fe58f`、`256cbcdd`、`f238cbba` 经 `git show --name-only` 复核均不含 `src/` 后端改动；`44fe568b` 仅含 `sessionRuntime.ts` G10 折行修复与底稿回填；`ea1fe58f` 另含一组与 F 无关的 `web/src/pages/medical-record-version-compare` 审计页面，不计入 consult 交付。

**阶段三：收口授权提交落地（基线 HEAD `44fe568b`，实测 `git show --numstat`）**。提交前现场残留与原指令清单一致：`server.ts` 6676 行品牌文案单 hunk、两份 `reports/` 底稿修改、20:09 巡检记录未跟踪；落地分组如下：

| 提交 | 分组 | 文件 / 增删 | 性质 |
|---|---|---|---|
| `73a2b2ae` | `fix(brand)` | `src/bff/server.ts`，1 插入 / 1 删除 | 6676 行兜底问候文案品牌改名（「健澜数智医院智能体」→「健澜AI原生医院操作系统OS」），非 consult；F 授权组 |
| `d3d4b696` | `docs(consult-rebuild)` | `F-gate-exits.txt` 17/1、`F-shard-report.md` 97/37、`patrol-20261025-2009.md` 126/0；合计 +240 / −38 | F 底稿与 20:09 巡检记录回填；F 授权组 |
| `749d529d` | `fix(brand)`（并发，非 F 授权清单） | `.dockerignore` 1/1、`web/.dockerignore` 1/1 | 仅构建上下文忽略清单头部注释旧称替换，无逻辑改动；留档不混入 consult 交付 |

- 提交纪律执行：`fix(brand)` 与 `docs(consult-rebuild)` 物理分组，未混组；`web/src/store/cdrQueryV2M636Store.ts` 保持已提交状态不动；根目录 `*.txt` / `*.csv` 探针与 `web/build_out.txt` / `coverage_out.txt` 一律未 `git add`；提交身份统一 `chenweidaben <chenweidaben@users.noreply.github.com>`；未执行 `git push`、未修改 origin；
- 阶段三 F 授权两组落地后，除并发品牌组 `749d529d` 外无产品类残留；F 终稿回填（§7.3 表内 post2 证据行）仅涉及两份 `reports/` 底稿，归入 docs 组。

---

## 4. 契约合规自检（§15 红线逐条）

| # | 红线条款 | F 自检结果 | 证据 |
|---|---|---|---|
| 1 | consult 新增交付树旧称零命中 | 10 个根路径扫描 `TOTAL_HITS=0`（`gang-os` / `jianlan-gang-os` / `Gang-OS` / `gangos` / `杠OS` / `GangOS` / `Jianlan Gang`，含大小写与连字符变体）；提交后对照 `db3ace9f` 复扫 `BRAND_HITS=0` | `F-brand-grep.log`、`F-brand-grep-postcommit.log` |
| 2 | 急症旁路优先、`safety:acute` 帧、免责声明常驻 | 集成用例 3 断言 `escalated` + `safety:acute` + 急症引导语 + 免责声明；用例 2/4 断言回复与草稿附免责声明 | `consultFlow.test.ts` 用例 2/3 |
| 3 | 草稿 `needsPhysicianReview=true`、`isOutOfHospitalPrescription=false`、`status='pending_review'` | 诊断草稿（用例 2）与处方草稿（用例 4）三字面量逐一断言；处方正文含「在院医嘱」、非院外 | `consultFlow.test.ts` 用例 2/4 |
| 4 | 写操作三件套：权限码 + 审计 + 幂等键 | 权限测试覆盖写端点权限闸；集成用例 2/3/4/7 断言审计落库（`acute_bypass`、`thread_exit` 等）；幂等键为 BFF 既有 `withIdempotency` 中间件职责，F 未改写 | `permissions.test.ts`、`consultFlow.test.ts` |
| 5 | 工具审计只留白名单字段、不回显原始入参 | 用例 5 断言工具记录键集合白名单与序列化不含 `rawArgs/toolArgs/原始入参` | `consultFlow.test.ts` 用例 5 |
| 6 | 角色降级审计归属正确、四角色审计透传 traceId | 用例 5 断言 `actorRole` 合法集合、`traceId=FLOW_TRACE`；角色归属由 `orchestrator.test.ts`（8 例）等既有单测覆盖 | `consultFlow.test.ts` 用例 5、`F-bun-consult.log` |
| 7 | LLM 凭证仅取 `process.env`；无凭证确定性降级；不联网 | 测试全程 DEMO 进程内确定性引导，无网络请求、无凭证读取 | 两个新测试文件 |
| 8 | 不改动主干历史旧称文件 | F 未编辑 `package.json`/README/`docs/**`/`deploy/**` 既有 consult 产物；B 类品牌替换由另一路整改独立成组 | §0 声明、§3 分类 |

**契约偏差：零。** 未发现 F 新增测试与契约 §1 类型、§11 帧契约、§12 端点权限映射、§13 DDL 字段、§14 服务层/页面契约相冲突之处。

---

## 5. 未闭环缺口清单（如实标注，禁止伪造通过）

### 5.1 测试覆盖缺口（G1–G5 为 B 类后端改动缺专属测试；G10 已闭环单列留档；本机 F 未新增测试，红线限定仅两个新目录）

| 编号 | 文件 / 分支 | 缺口描述 | 现有覆盖 |
|---|---|---|---|
| G1 | `src/db/pool.ts` 生产抛错分支 | 生产缺 `DATABASE_URL` 抛错路径无直测；本机无 PostgreSQL，未演练断库启动 | 无专属测试 |
| G2 | `src/security/encryption/FieldCipher.ts` 生产抛错分支 | 生产缺 `FIELD_ENCRYPTION_KEY` 抛错路径无直测 | `encryption.test.ts` 46 例仅覆盖 `src/security` 桶导出的 HashUtils / EncryptionService / 哈希链，不直连 FieldCipher |
| G3 | `src/bff/routes/health.ts` 信封包装 | `ok()` 信封 + `traceId` 包装无专属路由测试 | 无 |
| G4 | `src/bff/routes/imaging.ts` 409 语义 | 重复签名 409/CONFLICT 分支无专属路由测试 | 无 |
| G5 | `src/bff/routes/twin3DInpatient.ts` handler | 路由 handler 无测试；`twin3DInpatient.test.ts` 18 例仅覆盖聚合器纯函数 | 聚合器层 18 例 |
| ~~G10~~ | ~~`src/core/agent/consult/runtime/sessionRuntime.ts` Prettier 格式~~ **已闭环（§2.9、§2.10，随 `44fe568b` 入库）** | 提交后 `prettier --check` 唯一告警文件（A 类已提交核心源码，`42c98a3d` 入库版本）；收口仅对折行告警修复（3 插入 / 1 删除），无逻辑变更、无接口签名改动；HEAD `44fe568b` 上后端 consult 六路径 `prettier --check` exit 0、根 tsc exit 0、后端 ESLint exit 0 | consult 两新测试文件 `--check` exit 0；终轮证据 `F-prettier-backend-final3.log`、`F-tsc-final3.log`、`F-eslint-backend-final3.log`；G10 不再列入未闭环缺口 |

### 5.2 环境依赖未跑范围

| 编号 | 范围 | 原因 | 说明 |
|---|---|---|---|
| G6 | `tests/integration/**` 136 个文件中除 F 新增 `consultFlow.test.ts` 外的 **135 个既有集成用例** | 依赖运行中 PostgreSQL；本机无数据库，进程内 DEMO 不覆盖真实库链路 | 本轮未执行；consult 集成主链路已由 F 新增 `consultFlow.test.ts` 以 DEMO 进程内仓储覆盖 |
| G7 | `tests/integration/user-sessions.test.ts`、`tests/integration/mfa-login.test.ts` 等 auth 集成用例 | 依赖 DB 会话台账与 jti 查库 | 未执行；`sessionGuard` fail-closed 新逻辑由 `prodDemoFailClosed.test.ts` 进程内用例覆盖 |
| G8 | services-java（JwtAuthenticationFilter、application.yml、pom.xml、两份 compose） | 本机无 Maven / JVM 构建环境 | 未独立编译与测试；改动仅完成 diff 级核对 |
| G9 | 六表 DDL（380–385）真实库演练 | 本机无 PostgreSQL | 未在真实库执行建表/触发器/索引校验；`bun run scripts/db/check-sql.ts` 粗检未将 380–385 列入错误清单（§5.3 第 2 例） |

### 5.3 宽范围单测 2 例独立基线失败（非 consult、非 B 类引入）

| 编号 | 测试用例 | 失败现象 | 基线属性证据 |
|---|---|---|---|
| F1 | `tests/unit/onlineConsult.test.ts` > `endConsultation 结束问诊 > 空小结拒绝结束；非咨询中状态拒绝` | 测试硬编码 `acceptedAt='2026-10-16T08:00:00Z'`（用例内 `createConsultation`/`acceptConsultation` 时间戳，文件第 32/58/59/62 行）；当前日期 2026-10-25，30 分钟时限早已过去，`endConsultation` 短路返回超时、不再校验空小结。提交后复跑：**9 pass / 1 fail / 38 expect / 10 文件用例**，同一用例失败、exit 1（`F-onlineConsult-postcommit.log`） | 源 `src/bff/aggregators/onlineConsultAggregator.ts` 与测试文件相对 HEAD 均无本地修改（`git status` 无匹配记录）；属日期硬编码型基线失败，与 consult-agent 无关 |
| F2 | `tests/unit/db/ddl.test.ts` > `表/序列/触发器/种子全部齐全且自洽`（断言 `verifySql().ok === true`，第 25 行） | `scripts/db/check-sql.ts` 粗检在 12 个历史 M 系列 SQL 上报括号不配平误报：`255-surgery-schedule.sql`（19/23）、`306-smart-schedule.sql`（15/20）、`316-group-multi-hospital.sql`（32/37）、`319-patient-service-deep.sql`（13/16）、`323-health-plan.sql`（9/19）、`324-emergency.sql`（14/21）、`342-emergency-deep.sql`（14/20）、`352-drg-deep.sql`（33/35）、`356-medical-record-deep.sql`（33/36）、`360-finance-deep.sql`（15/17）、`363-party-culture.sql`（25/32）、`366-insurance-deep.sql`（51/55）。提交后复跑：**5 pass / 1 fail / 2360 expect / 6 用例**，同一断言失败、exit 1（`F-ddl-postcommit.log`）；`check-sql.ts` 复扫同为 12 条（`F-check-sql-postcommit.log`：462 表、种子 2385 行） | `check-sql.ts`、`ddl.test.ts` 相对 HEAD 均无本地修改；consult 380–385 未出现在错误清单；提交前复跑日志 `F-check-sql.log`；属粗检括号计数误报与历史 SQL 注释/字符串括号干扰，与 consult 无关 |

### 5.4 web consult 前端根配置 ESLint 债务（归属 E 分片，红线禁止 F 改写 `web/**`）

- 根配置 `--max-warnings 0` 退出码 1：9 问题（7 errors / 2 warnings），明细见 §2.2(b)；web 本地配置口径退出码 0、Prettier 退出码 0；
- **提交后复核**（§2.7）：五组提交落地后根口径仍为 exit 1、9 问题（7 errors / 2 warnings），规则与位置未变，G 提交未消化该债务；**终轮复核**（§2.10，HEAD `44fe568b`，`F-eslint-webE-final3.log`）：根口径仍 exit 1、同 9 问题同位置，web 本地 ESLint / Prettier 仍 exit 0；
- 待 E 分片在不违反根配置口径前提下修复：2 处 `prefer-nullish-coalescing`、5 处 `no-misused-promises`、2 处 import 排序；
- F 未对 `web/src/pages/consult-agent`、`web/src/services/api/consultAgent.ts` 执行任何 `--fix` 或 `--write`。

### 5.5 文档旧文件名残留（B 类文档组债务）

- `docs/operations/01-监控手册.md:85`（`gangos.yml`）、`:87`（`gangos-overview.json`）；`docs/operations/02-告警手册.md:65`（`gangos.yml`）；`CHANGELOG.md:64`（`gangos.yml`）；
- 上述文件已随基线入库、工作区无本地修改，F 无权改 `docs/**`；提交后复扫位置与行号不变（§3.4）；建议 B 类文档组在 `chore(brand)` / `docs(brand)` 组内替换为 `jlmedaios.yml`、`jlmedaios-overview.json` 新资产名。

### 5.6 范围声明

- 本轮未宣称 `tests/unit` 全量 expect 总量全绿：首轮与第二批批次 3 被 600s 超时截断；上表仅汇总形成退出码与 expect 汇总的批次；覆盖文件数 2040/2040 经日志文件头去重核对。
- `tests/integration/**`、services-java、真实 PostgreSQL 演练范围见 G6–G9。

---

## 6. 证据底稿索引（`reports/consult-rebuild/`，均为 F 实测留证）

| 文件 | 内容 |
|---|---|
| `F-gate-exits.txt` | 门禁退出码汇总：提交前 10 条 + 交付前复跑 4 条 `*_FINAL_EXIT=0` + 提交后复跑 8 条 `*_POSTCOMMIT_EXIT`（含后端 Prettier exit 1 单列说明）+ 提交后 F1/F2 基线失败 3 条 + G10 修复轮 `*_FINAL2_EXIT` 5 条 + 干净 HEAD `*_FINAL3_EXIT` 9 条 + 收口 `*_POST2_EXIT` 8 条（§7.3） |
| `F-tsc.log` | 根 `tsc --noEmit` 输出（0 字节，退出码 0） |
| `F-eslint-backend.log` | 后端 consult 路径 ESLint 输出（0 问题；仅 `.eslintignore` 弃用提示） |
| `F-eslint-consult.log` | 编写中途的合并口径快照（3 处 `non-nullable-type-assertion-style` 与 web 9 问题，均已修复/归属 E 分片）；最终状态以 `F-eslint-backend.log` 与 `F-eslint-webE.log` 为准 |
| `F-prettier-backend.log` | 后端 consult 路径 Prettier `--check` 通过记录 |
| `F-bun-consult.log` | consult 专项三目录 177 pass / 0 fail / 659 expect / 15 文件逐文件输出 |
| `F-tsc-final.log`、`F-eslint-backend-final.log`、`F-prettier-backend-final.log`、`F-bun-consult-final.log` | 交付前复跑四份最终门禁日志（tsc 0 字节、ESLint 0 问题、Prettier 全通过、177 pass / 0 fail / 659 expect / 15 文件 / 11.87s），退出码见 `F-gate-exits.txt` 末尾四条 `*_FINAL_EXIT=0` |
| `F-tsc-postcommit.log`、`F-eslint-backend-postcommit.log`、`F-prettier-backend-postcommit.log`、`F-bun-consult-postcommit.log`、`F-bun-bclass-postcommit.log`、`F-eslint-webE-postcommit.log`、`F-eslint-webE-local-postcommit.log`、`F-prettier-webE-postcommit.log` | 五组提交落地后对照 HEAD `db3ace9f` 的复跑日志：tsc 0、后端 ESLint 0、后端 Prettier 仅 `sessionRuntime.ts` 告警（G10）、consult 177 pass / 0 fail / 659 expect、B 类 140 pass / 0 fail / 1143 expect、根口径 web ESLint 仍 9 问题、web 本地 ESLint/Prettier 0 |
| `F-permissions-final.log`、`F-flow-final.log` | G10 修复前单文件独立复跑：permissions 69 pass / 0 fail / 177 expect / 1 文件 / 1.40s；consultFlow 7 pass / 0 fail / 181 expect / 1 文件 / 11.22s，均 exit 0 |
| `F-tsc-latest.log`、`F-eslint-backend-latest.log`、`F-prettier-backend-latest.log`、`F-prettier-f-tests-latest.log`、`F-bun-consult-latest.log`、`F-bun-bclass-latest.log`、`F-eslint-webE-latest.log`、`F-eslint-webE-local-latest.log`、`F-prettier-webE-latest.log` | 对照 HEAD `f238cbba`（G10 尚开放时点，§2.8）：tsc 0、后端 ESLint 0、后端 Prettier 仅 `sessionRuntime.ts` 告警（G10）、F 两测试文件单独 Prettier 0、consult 177 pass / 0 fail / 659 expect / 15 文件 / 11.76s、B 类 140 pass / 0 fail / 1143 expect / 8 文件 / 1.53s、根口径 web ESLint 9 问题、web 本地 ESLint/Prettier 0 |
| `F-tsc-final2.log`、`F-eslint-backend-final2.log`、`F-prettier-backend-final2.log`、`F-bun-consult-final2.log`、`F-bun-bclass-final2.log` | G10 工作树修复后未提交时点复跑（§2.9(a)）：tsc 0、后端 ESLint 0、后端 Prettier 0（G10 清零）、consult 177 pass / 0 fail / 659 expect / 15 文件、B 类 140 pass / 0 fail / 1143 expect / 8 文件 |
| `F-tsc-final3.log`、`F-eslint-backend-final3.log`、`F-prettier-backend-final3.log`、`F-bun-consult-final3.log`、`F-bun-bclass-final3.log`、`F-eslint-webE-final3.log`、`F-eslint-webE-local-final3.log`、`F-prettier-webE-final3.log` | 干净 HEAD `44fe568b` 终轮复跑（§2.10）：tsc 0、后端 ESLint 0、后端 Prettier 0、consult 177 pass / 0 fail / 659 expect / 15 文件 / 12.85s、B 类 140 pass / 0 fail / 1143 expect / 8 文件 / 1.80s、根口径 web ESLint 仍 9 问题（7 errors / 2 warnings）、web 本地 ESLint/Prettier 0 |
| `F-tsc-post2.log`、`F-eslint-backend-post2.log`、`F-prettier-backend-post2.log`、`F-tsc-web-post2.log`、`F-eslint-webE-local-post2.log`、`F-prettier-webE-post2.log`、`F-bun-consult-post2.log`、`F-bun-bclass-post2.log` | 收口 `fix(brand)` 提交 `73a2b2ae` 后终轮复跑（§7.3）：根 tsc 0、后端 ESLint 0、后端 Prettier 0、web 本地 tsc 0、web 本地 ESLint 0、web 本地 Prettier 0、consult 177 pass / 0 fail / 659 expect / 15 文件 / 12.04s、B 类 140 pass / 0 fail / 1143 expect / 8 文件 / 1.67s |
| `F-bun-apidocs.log` | `tests/unit/apiDocs.test.ts` 独立单跑 13 pass / 0 fail / 204 expect |
| `F-bclass.log`、`F-bun-bclass.log` | B 类回归 8 文件 140 pass / 0 fail / 1143 expect 逐用例输出 |
| `F-eslint-bclass.log` | B 类当前 17 问题（12 errors / 5 warnings）逐文件逐规则输出 |
| `F-eslint-baseline-head.log` | B 类 HEAD 基线临时副本同 17 问题对比输出 |
| `F-prettier-bclass.log` | B 类当前 6 文件 Prettier warn 清单 |
| `F-prettier-baseline-head.log` | B 类 HEAD 基线副本同 6 文件 warn 对比清单 |
| `F-eslint-webE.log` | 根口径 web consult 两文件 9 问题输出（exit 1，E 分片债务） |
| `F-eslint-webE-local.log` | web 本地配置 ESLint 输出（exit 0） |
| `F-prettier-webE.log` | web 本地 Prettier `--check` 通过记录 |
| `F-bun-unit-wide.log` | 首轮 `tests/unit` 宽范围输出（1948 文件头，超时截断） |
| `F-bun-unit-pass2.log` | 第二轮分批补跑输出（批次 1/2 完成，批次 3 截断） |
| `F-bun-unit-pass3.log` | 第三轮补跑输出（31 文件全绿） |
| `F-unrun-list.txt`、`F-unrun-list-2.txt` | 前两轮未跑清单演进；第三轮后未跑清单终值 = 0 |
| `F-numstat-tracked.txt` | `git diff HEAD --numstat` 全量 745 条跟踪改动明细 |
| `F-brand-grep.log` | consult 新增树旧称扫描（`TOTAL_HITS=0`，提交前基线 `3f019078`） |
| `F-deleted-asset-grep.log` | 删除资产文件名引用扫描（源码配置零命中 + 4 处文档残留，提交前基线 `3f019078`） |
| `F-brand-grep-postcommit.log`、`F-deleted-asset-grep-postcommit.log` | 提交后对照 HEAD `db3ace9f` 复扫：旧称 `BRAND_HITS=0`；源码/配置/脚本/部署三资产文件名 `DELETED_ASSET_HITS=0`，4 处文档残留位置不变 |
| `F-check-sql.log` | DDL 粗检复跑：12 个历史 SQL 括号误报清单，380–385 未列入（提交前基线 `3f019078`） |
| `F-onlineConsult-postcommit.log`、`F-ddl-postcommit.log`、`F-check-sql-postcommit.log` | 提交后对照 HEAD `db3ace9f` 复跑 F1/F2 基线失败用例：onlineConsult 9 pass / 1 fail / 38 expect；ddl 5 pass / 1 fail / 2360 expect；check-sql 同为 12 条历史 SQL 括号误报、462 表 / 种子 2385 行，380–385 仍未列入 |

## 7. 交回 G 分片的收口提示

### 7.1 提交前纪律归档（已由 G 在五组提交中执行，留档备查）

1. A 类提交仅显式纳入 `STAGING-DISCIPLINE.md` §0.2 清单的 61 个新增文件与 `permissions.ts` 整文件、`server.ts` 2 行 consult hunk、`web/src/router/index.tsx` 两段 consult hunk；混合文件其余 hunk 与 §3.2 全部 B 类文件物理分开。
2. 提交前先 `git reset` 清掉暂存区既有 656 个历史删除；`.env.example` 整体归 B，不得纳入 `feat(consult-agent)`。
3. 上述口径已由 `42c98a3d`（consult A 全链路）、`b5ecf42e`（B 安全加固）、`3985342a`（B 品牌）、`378f9928`（B 路由）、`db3ace9f`（B 部署/配置/README）五组产品提交落地；其后 `65802b20`（忽略规则/探针去索引）、`ea1fe58f`（审计归档与无关审计页面）、`256cbcdd`（F 底稿增量）、`f238cbba`（终轮门禁口径回填与 F1/F2 留证）、`44fe568b`（G10 Prettier 收口与底稿回填）为 housekeeping / docs / style 提交；其中 `f238cbba`、`44fe568b` 不含 consult 产品源码改动。F 两个新测试文件经 `git show 42c98a3d --stat` 核实已纳入（423 + 475 行）。收口阶段 `73a2b2ae`（`fix(brand)` 兜底文案）、`d3d4b696`（`docs(consult-rebuild)` 底稿回填）为 F 授权两组，`749d529d` 为并发品牌组（§7.2），均不含 consult 源码/测试/前端/SQL/文档改动。

### 7.2 收口提交实测（基线 HEAD `44fe568b`，身份统一 `chenweidaben <chenweidaben@users.noreply.github.com>`）

1. **F 授权两组（指令原口径，禁止混组）**：
   - `73a2b2ae fix(brand): 在线问候兜底文案产品名收口（server.ts 单 hunk，非 consult 改动）`：仅 `src/bff/server.ts`，6676 行兜底问候文案 1 插入 / 1 删除（「健澜数智医院智能体」→「健澜AI原生医院操作系统OS」）；
   - `d3d4b696 docs(consult-rebuild): F 分片报告、门禁留证与 20:09 巡检记录回填`：仅 `reports/consult-rebuild/F-gate-exits.txt`、`reports/consult-rebuild/F-shard-report.md`、`reports/patrol/patrol-20261025-2009.md` 三份底稿（numstat 17/1、97/37、126/0）。
2. **并发追加组（非 F 授权清单，同身份同纪律，留档备查、不计入 consult 交付）**：
   - `749d529d fix(brand): .dockerignore 构建上下文忽略清单头部旧称收口`：`.dockerignore`、`web/.dockerignore` 各 1 插入 / 1 删除，仅头部注释旧称替换，无逻辑改动；由并发流程按品牌组落地，F 未暂存、未改写该两文件。
3. **禁止事项执行记录**：未 `git add` 根目录任何 `*.txt` / `*.csv` 探针、`web/build_out.txt`、`coverage_out.txt`；`web/src/store/cdrQueryV2M636Store.ts` 保持已提交状态未动；未改动 consult 源码/测试/前端/SQL/文档；全程未 `git push`、未修改 origin 远端配置。
4. **G10（已闭环，`44fe568b`）**：`src/core/agent/consult/runtime/sessionRuntime.ts` Prettier 折行收口（§2.9），无逻辑变更、无接口签名改动；§2.10 终轮复跑后端 consult 六路径 `prettier --check` exit 0、根 tsc exit 0、后端 ESLint exit 0。
5. **§5.4 web 根口径 ESLint**：终轮仍 exit 1、9 问题（7 errors / 2 warnings），归属 E 分片；web 本地 ESLint / Prettier 口径 exit 0。
6. **§5.5 文档残留**：4 处旧文件名引用仍在已入库的 `docs/` 与 `CHANGELOG.md`，待 B 类文档组替换为 `jlmedaios.yml`、`jlmedaios-overview.json`。
7. **不阻塞项**：§5.1 G1–G5、§5.2 G6–G9 为环境与覆盖缺口；consult 专项后端门禁（tsc、后端 ESLint、后端 Prettier、consult 测试、B 类回归）终轮复跑均 exit 0。

### 7.3 收口提交与终轮门禁回填表（提交后实测回填，禁止预填）

| 项 | 内容 / 退出码 | 证据 |
|---|---|---|
| `fix(brand)` 提交 SHA | `73a2b2aedd6e7602c2f66632017b4474e5b0e519` | `git show --stat 73a2b2ae` |
| `fix(brand)` 文件清单与增删 | 仅 `src/bff/server.ts`，1 插入 / 1 删除（6676 行兜底问候文案品牌改名，非 consult） | `git show --stat 73a2b2ae` |
| `docs(consult-rebuild)` 提交 SHA | `d3d4b69686a9b9474024c8771403ae7f62b92910` | `git show --stat d3d4b696` |
| `docs(consult-rebuild)` 文件清单与增删 | `reports/consult-rebuild/F-gate-exits.txt` 17/1；`reports/consult-rebuild/F-shard-report.md` 97/37；`reports/patrol/patrol-20261025-2009.md` 126/0；合计 3 文件，240 插入 / 38 删除 | `git show --numstat d3d4b696` |
| 并发 `fix(brand)`（非 F 授权，留档） | `749d529d38c306c8954b25d1f0c0068742ffa93e`；`.dockerignore` 1/1、`web/.dockerignore` 1/1，仅头部注释旧称替换 | `git show --stat 749d529d` |
| F 终稿回填 docs 提交 SHA | 本提交（SHA 以 `git log -1 --format=%H` 实测为准，见回报消息） | `git show --stat` |
| 根 `tsc.cmd --noEmit` | **exit 0**（0 字节诊断） | `F-tsc-post2.log` |
| 后端 consult `eslint --max-warnings 0` | **exit 0**（仅 `.eslintignore` 弃用提示，非代码告警） | `F-eslint-backend-post2.log` |
| 后端 consult `prettier --check` | **exit 0**（`All matched files use Prettier code style!`） | `F-prettier-backend-post2.log` |
| `web/` 本地 `npx tsc --noEmit` | **exit 0**（0 字节诊断） | `F-tsc-web-post2.log` |
| `web/` 本地 `eslint src/pages/consult-agent src/services/api/consultAgent.ts --max-warnings 0` | **exit 0**（仅 `.eslintignore` 弃用提示） | `F-eslint-webE-local-post2.log` |
| `web/` 本地 `prettier --check` 两文件 | **exit 0**（`All matched files use Prettier code style!`） | `F-prettier-webE-post2.log` |
| `bun test` consult 三目录 | **exit 0**；**177 pass / 0 fail / 659 expect() calls / 15 文件 / 12.04s** | `F-bun-consult-post2.log` |
| B 类既有测试回归（补充证据） | **exit 0**；**140 pass / 0 fail / 1143 expect() calls / 8 文件 / 1.67s** | `F-bun-bclass-post2.log` |
| 根配置 web ESLint（E 分片债务，非本轮门禁口径） | 本轮未复跑；终轮 `F-eslint-webE-final3.log` exit 1、9 问题（7 errors / 2 warnings），归属 E 分片，未消化 | §5.4 |
| 提交后 `git status --short` | 除被忽略探针 txt/csv、构建产物与 `.env` 外为空（终轮实测，主报告 §7.4） | 终端实测 |
