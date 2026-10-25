# consult-agent 深化阶段 · Round 0 基线档案（深化前快照）

> 采集时间：2026-10-26 00:00（Asia/Shanghai）。本机 Windows PowerShell 实测，退出码与问题清单取自真实运行，不沿用旧会话口径。本档案是 #30–#38 深化任务的旧问题边界：新改动不得把历史债务伪装成 consult 新增，也不得把 consult 新增问题算进历史债务。

## 1. 环境与工具链

| 项 | 值 |
|---|---|
| 仓库根 | `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1` |
| 分支 | `consult-agent-m86` |
| 基线 HEAD | `d0c2d79756cacd75960bd7563ba8d9b186127270`（采集时点） |
| 基线 master | `3f0190788ce05fd7231bbefb68618cecccbc470e` |
| node / npm | node v22.23.2 / npm 10.9.8 |
| bun | `C:\Users\lenovo\.bun\bin\bun.exe`（未入 PATH，脚本内绝对路径），bun 1.2.0 |
| 提交身份 | `chenweidaben <chenweidaben@users.noreply.github.com>` |
| 运行模式 | Windows PowerShell；Bash 禁用；路径用 `-LiteralPath`；ESLint 前端一律传**具体文件**，禁止把 `web/src/pages/consult-agent` 目录传给根配置 projectService（会解析崩溃退出 -1） |

## 2. 静态门禁基线退出码（本轮实跑，日志见本目录）

| 门禁 | 命令口径 | 退出码 | 基线结果 |
|---|---|---:|---|
| 根类型检查 | 仓库根 `node_modules\.bin\tsc.cmd --noEmit` | **0** | 诊断 0 字节 |
| 后端 consult ESLint | 根配置 `--max-warnings 0`；路径 `src/core/agent/consult`、`src/bff/routes/consultAgentRoutes.ts`、`src/db/repositories/consultAgentRepo.ts` | **0** | 零代码告警（仅 `.eslintignore` 弃用框架提示，非代码问题，不计入 `--max-warnings`） |
| 前端 web 本地口径 | cwd=`web`，`web/node_modules/.bin/eslint.cmd`，相对路径两文件，`web/eslint.config.js`（非 type-checked，recommended 口径） | **0**（手动实测） | 两文件零问题；`.eslintignore` 弃用警告除外 |
| 前端根口径 · service | 仓库根，根 `eslint.config.js`（recommendedTypeChecked + stylisticTypeChecked，projectService），单文件 `web/src/services/api/consultAgent.ts` | **0**（仅 warning，不阻断） | 1 warning：14:1 `simple-import-sort/imports`（可 autofix） |
| 前端根口径 · page | 仓库根，根配置，单文件 `web/src/pages/consult-agent/ConsultAgentChatPage.tsx` | **1** | **7 errors + 1 warning**，明细见 §3 |
| Prettier consult 全文件 | `prettier --check` core 目录、BFF 路由、repo、web service、web page、tests 三目录 | **0** | `All matched files use Prettier code style!` |

## 3. 前端根口径待消化问题明细（#30 目标：清零，根配置两文件 EXIT=0、`--max-warnings 0` 通过）

文件：`web/src/pages/consult-agent/ConsultAgentChatPage.tsx`（910 行）

| 行:列 | 规则 | 级别 | 说明 |
|---|---|---|---|
| 19:1 | `simple-import-sort/imports` | warning | import 排序，可 `--fix` |
| 540:41 | `@typescript-eslint/prefer-nullish-coalescing` | error | `\|\|` 改为 `??`（须确认左操作数不应把 `0`/`''` 当假值） |
| 586:19 | `@typescript-eslint/no-misused-promises` | error | Promise 返回函数直接挂到期望 void 的 JSX 回调属性，包 `() => { void handler() }` 或 `async () => { await handler() }` 收口 |
| 596:21 | `@typescript-eslint/no-misused-promises` | error | 同上 |
| 632:23 | `@typescript-eslint/no-misused-promises` | error | 同上 |
| 691:21 | `@typescript-eslint/prefer-nullish-coalescing` | error | `\|\|` 改为 `??` |
| 854:28 | `@typescript-eslint/no-misused-promises` | error | 同上 Promise 回调收口 |
| 863:23 | `@typescript-eslint/no-misused-promises` | error | 同上 |

文件：`web/src/services/api/consultAgent.ts`（550 行）

| 行:列 | 规则 | 级别 | 说明 |
|---|---|---|---|
| 14:1 | `simple-import-sort/imports` | warning | import 排序，可 `--fix` |

约束：修复**只改写法，不改功能契约、不改权限码、不改医疗红线字面量**；修复后 web 本地口径保持 EXIT=0；Prettier `--check` 通过；根 tsc 保持 0。

## 4. 测试基线（bun 1.2.0，`DEMO_MODE=1`，日志 `baseline-bun-consult-round0.log`）

命令：`bun test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent`，**BUN_TEST_EXIT=0**。

| 套件 | 文件 | 用例 | 断言 |
|---|---|---:|---:|
| 单元 `tests/unit/consult-agent/` | 13 测试文件 + `helpers.ts` 夹具 | 101 | 301 |
| 安全 `tests/security/consult-agent/permissions.test.ts` | 1 | 69 | 177 |
| 集成 `tests/integration/consult-agent/consultFlow.test.ts` | 1 | 7 | 181 |
| **合计** | **15** | **177 pass / 0 fail** | **659 expect()，12.57s** |

## 5. 后端端点与权限映射（12 端点，已实测在位；#31 前端接线对照依据）

| # | 方法 | 路径 | 权限码 | 前端服务函数 |
|---|---|---|---|---|
| 1 | POST | `/api/v1/consult-agent/threads` | WRITE | `createThread` |
| 2 | GET | `/api/v1/consult-agent/threads` | READ | `listThreads` |
| 3 | POST | `/api/v1/consult-agent/threads/:threadId/messages` | WRITE | `sendMessage` |
| 4 | GET | `/api/v1/consult-agent/threads/:threadId/messages` | READ | `listMessages` |
| 5 | POST | `/api/v1/consult-agent/threads/:threadId/transcribe` | WRITE | `transcribe`（预留，未挂 UI） |
| 6 | GET | `/api/v1/consult-agent/threads/:threadId/audit` | AUDIT | `listAudit`（预留，未挂 UI） |
| 7 | GET | `/api/v1/consult-agent/rules/snapshot` | READ | `getRulesSnapshot`（预留，未挂 UI） |
| 8 | POST | `/api/v1/consult-agent/threads/:threadId/stream` | WRITE | `streamReply`（SSE 主路径，已用） |
| 9 | GET | `/api/v1/consult-agent/threads/:threadId/stream/replay` | READ | `replayEvents`（预留，未挂 UI） |
| 10 | GET | `/api/v1/consult-agent/threads/:threadId/drafts/:kind` | READ | `getDraft`（已用） |
| 11 | GET | `/api/v1/consult-agent/profile` | READ | `getProfile`（预留，未挂 UI） |
| 12 | POST | `/api/v1/consult-agent/threads/:threadId/exit` | WRITE | `exitThread`（已用） |

#31 缺口：`transcribe`/`listAudit`/`getRulesSnapshot`/`replayEvents`/`getProfile` 已导出但页面未挂 UI；`meta.confidence` 未渲染标签；`onDone.messageId` 未落本地状态。后端 12 端点均已存在，**不得在前端假连**；UI 入口须按上表权限码受 `RequirePermission` 保护。

> 口径订正（round 1 终态复核回填）：端点 8 `streamReply` 方法为 **POST**（路由 `src/bff/routes/consultAgentRoutes.ts:378`、OpenAPI `docs/api/consult-agent-openapi.yaml` 264 行 post、前端服务 `web/src/services/api/consultAgent.ts:544` method POST 三处一致）；本表初版误记 GET，2026-10-26 深化轮按源码实测更正，避免契约漂移。

## 6. 仓储层现状（#32 测试对象，`src/db/repositories/consultAgentRepo.ts`，404 行）

13 个方法，全部 `getDb()` 直连，当前无 mock pool 直测（集成 E2E 走内存 demoRuntime）：

- `findThread(threadId, userId)`、`listThreads(userId)`、`saveThread(thread)`（`ON CONFLICT (id) DO UPDATE` + `RETURNING *`）
- `listMessages(threadId)`、`saveMessage(message)`（`RETURNING *`）
- `listDrafts(threadId, kind)`、`saveDraft(draft)`（`ON CONFLICT (id)` + `RETURNING *`）
- `listAudit(threadId)`、`saveAudit(entry)`（无 RETURNING，void）
- `getProfile(userId)`、`saveProfile(profile)`（`ON CONFLICT (user_id) DO UPDATE` + `RETURNING *`）
- `listDocuments(threadId)`、`saveDocument(document)`（`RETURNING *`）
- 工厂 `createConsultAgentRepo(): ConsultAgentPort`

测试方式：mock `../pool.js` 的 `getDb` 返回可记录 SQL 片段与参数的假查询器；断言表名、列、`RETURNING *`、upsert 冲突键、行映射蛇形→驼峰、空结果分支、错误透传；不连真实 PostgreSQL。

## 7. 迁移 380–385（#33 静态自洽测试对象）

`deploy/postgres/init/`：`380-consult-threads.sql`(6587B)、`381-consult-messages.sql`(2615B)、`382-consult-documents.sql`(2076B)、`383-consult-drafts.sql`(3841B)、`384-consult-audit-trail.sql`(2560B)、`385-consult-profile-memory.sql`(2053B)。schema 为 `consult`。静态测试校验表/列/索引/外键/唯一约束/序列存在性与类型，并与仓储 SQL 引用列对齐；本机未做真实库建表/触发器/索引演练，须在测试与报告中如实标注差异。

## 8. 合规红线（深化全过程不得回退）

- 产品名「健澜AI原生医院操作系统OS」在位；consult 交付树内旧称 `gang-os|jianlan-gang-os|gangos|杠OS|健澜科技杠|Gang-OS` 零命中。
- 权限三码：`consult-agent:read` / `consult-agent:write` / `consult-agent:audit`（`src/bff/permissions.ts:208-210`）；写操作经全局 `withIdempotency`（`server.ts:6823`）与全局 `auditOperation`（`server.ts:6839`）；SSE 流路由不消费 `Idempotency-Key`。
- 草稿红线：`needsPhysicianReview: true`、`isOutOfHospitalPrescription: false`、`status: 'pending_review'`；schema 反例（false/true/approved/rejected）必须被拒绝。
- 急症 `ESCALATED` 旁路、`DISCLAIMER` 常驻、每条回复下方免责、120 急救提示不得移除；工具入参不下发前端，审计条目仅留脱敏摘要。
- 提交/日志/简报不得写入密码、token、凭据；`origin` 历史内嵌 token 不沿用。

## 9. 边界（不越权）

- G1–G5（`pool.ts`/`FieldCipher.ts`/`health.ts`/`imaging.ts`/`twin3DInpatient.ts`）属另一路 B 类后端改动，本轮不越权改其源码与专属测试。
- B 类品牌旧称 55 命中/6 文件、C 类基线遗留 52 命中/11 文件归属其他组，不计 consult 债务。
- `web/src/router/index.tsx`、`server.ts` 历史基线债务不在本轮改写范围。
- GitHub mirror 本轮不主动推送、只核对；JLMEDAIOS `master` 普通 fast-forward（禁止 force），HEAGENTOS `main` 维持 force-main 覆盖口径。

## 10. 本机不可闭环项（如实标注，禁止伪造通过）

- 无运行中 PostgreSQL：380–385 未做真实建表/触发器/索引/约束演练；135 个既有 DB 集成用例本机未跑。
- 无 LLM 凭证：核心链路走确定性引导文案；未做真实 SSE/HTTP 联调、断线重连、超时降级、token 计量、浏览器视觉走查。
- `bun run build`、`bun test --coverage` 覆盖率、services-java（无 Maven/JVM）、services-python/radar-inference 不在本机已验证范围；覆盖率数字必须实测，不估算。
- 基线遗留失败（非 consult 引入，留证不修复）：`tests/unit/onlineConsult.test.ts` 日期硬编码 1 fail；`tests/unit/db/ddl.test.ts` check-sql 对历史 M 系列 SQL 误报 1 fail。

## 11. 深化验收口径（#37 终态对照本档案）

1. 根 tsc EXIT=0；后端 consult ESLint `--max-warnings 0` EXIT=0；前端根配置两文件 `--max-warnings 0` EXIT=0；web 本地口径 EXIT=0；Prettier consult 全文件 EXIT=0。
2. consult 三目录测试只增不减：基线 177 pass / 0 fail / 659 expect 之上新增用例全绿；记录最终 pass/fail/expect/files/时长。
3. 新增测试覆盖仓储 13 方法契约、BFF 12 端点权限分码/错误分支、核心未覆盖分支、380–385 DDL 静态自洽。
4. 覆盖率实测数字与未覆盖清单落档；不可闭环项在交付报告 §缺口 如实列示。
5. 文档补齐 ADR、权限矩阵、状态机迁移表、FMEA、测试覆盖矩阵、运行/排障手册；OpenAPI/BFF/前端三端契约一致。
6. 分组提交 `feat/test/docs/chore(consult-agent)` 规范；仅显式 add consult 深化文件；推送后两仓 SHA 与本地 HEAD 逐位一致，mirror 保持基线未推。
