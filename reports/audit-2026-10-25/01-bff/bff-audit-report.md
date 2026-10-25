# TS BFF 层审计、缺陷修复与测试实测报告

- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 审计范围：`src/**`、`tests/**`、根 `tsconfig*.json`；未触碰 `web/**`、`deploy/**`、`docker-compose*.yml`、`.env*`、`services-java/**`、`services-python/**`、`services/**`、`README*`、根 `package.json`；未执行 `git add/commit`；未新建业务生产端点；未删除既有路由与测试。
- 审计时间：2026-10-25（Windows NT，PowerShell 5.1，Node v22.23.2，Bun 1.2.0）
- 基线档案：`.../agents/o_000pKWRkDCO/scratch/baseline-findings.md`（按 §1 类型检查、§3 品牌串、§7 安全线索、§8 文件归属执行）

---

## 一、审计发现清单（P0 / P1 / P2，含证据、影响、处置）

### P0（生产安全阻断级，本轮已闭环修复）

#### P0-1 JWT 密钥在生产环境失效开放（fail-open）
- 证据：`src/bff/middleware/auth.ts:47-57`（修复前：未配置 `JWT_SECRET` 时直接回落到硬编码开发默认 `dev-only-insecure-jwt-secret-change-me`，无环境区分）；`verifyJwt` 原无异常保护。
- 影响：生产环境漏配 `JWT_SECRET` 时，攻击者可用公开的开发默认密钥伪造任意用户 JWT，等同于认证体系整体失效。
- 处置：**已修复（本侧）**。生产判定复用共享模块 `src/bff/config/runtimeEnv.ts` 的 `isProductionEnv()`；`auth.ts:47-57` `getJwtSecret()` 生产缺密钥在 `:51-54` 直接 `throw`，非生产保留开发默认并 `console.warn`；`auth.ts:92-96` `verifyJwt` 对取钥异常 `try/catch` 返回 `null`（拒绝令牌）。

#### P0-2 字段加密主密钥在生产环境失效开放
- 证据：`src/security/encryption/FieldCipher.ts:18-32`（修复前：`FIELD_ENCRYPTION_KEY` 缺失时生产/非生产均回落到 `dev-only-insecure-field-key-change-me` 派生密钥）。
- 影响：生产漏配字段加密密钥时，敏感字段（身份证号、联系方式等）以公开可推导出的密钥加密，密文可被离线解密。
- 处置：**已修复（本侧）**。`FieldCipher.ts:22-25` 生产缺 `FIELD_ENCRYPTION_KEY`（或复用 `JWT_SECRET`）直接 `throw`；非生产保留开发默认并告警。

#### P0-3 数据库连接在生产环境回落到本地默认账号口令
- 证据：`src/db/pool.ts:48-62`（修复前：未配置 `DATABASE_URL` 时不分环境回落到 `localhost:5432` / `postgres` / `postgres` 默认账号口令）。
- 影响：生产漏配连接串时进程误连默认本地库，或在公网环境暴露弱口令默认值；连接目标不可控。
- 处置：**已修复（本侧）**。`pool.ts:51-54` 生产缺 `DATABASE_URL` 直接 `throw('[db] 生产环境必须配置 DATABASE_URL 环境变量，禁止回退本地默认账号口令')`；非生产保留 `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD` 本地默认。

#### P0-4 生产环境误开 DEMO_MODE 即短路授予 admin 全权限（fail-open，已修复）
- 证据：修复前 `src/bff/middleware/auth.ts` `requireAuth` 内 `if (process.env.DEMO_MODE === '1') { c.user = c.user ?? { id:'demo', name:'演示用户', roles:['admin'], permissions:['*'] }; return null; }`，不区分环境；配套旁路 `src/bff/middleware/sessionGuard.ts` 演示模式跳过 jti 会话吊销查库；`src/bff/middleware/audit.ts` 演示模式跳过审计落库。
- 影响：生产若误配 `DEMO_MODE=1`，未登录请求即获 admin 全权限，且会话吊销校验与操作审计同时失效，等同认证与审计体系整体旁路。
- 处置：**已修复（本侧）**。新增统一判定模块 `src/bff/config/runtimeEnv.ts`（`isProductionEnv()` / `isDemoModeEnabled()` / `assertProductionNotDemoMode()`）；`auth.ts:171-181` 演示短路加 `!isProductionEnv()` 守卫；`sessionGuard.ts:78-84` 生产不跳过 jti 校验；`audit.ts:89-94` 生产不跳过审计；`server.ts:6884-6885` 启动路径在绑定端口前调用 `assertProductionNotDemoMode()`，生产 + `DEMO_MODE=1` 直接抛错退出。非生产保留既有演示行为；断言见 `tests/unit/bff/prodDemoFailClosed.test.ts`（18 用例）。

### P1（功能/一致性缺陷，本轮可闭环项已修复；遗留项如实登记）

#### P1-1 动态路由遮蔽 9 个静态端点（已修复，修复后 shadows=0）
- 机制：`src/bff/server.ts:6591-6594` 将 `allRoutes` 顺序编译为 `compiled`；`server.ts:6794-6826` 按注册顺序首个匹配即返回，**先注册的动态 `:param` 路由会永久遮蔽后注册的同前缀静态路径**。
- 修复前静态审计检出 9 处遮蔽（同 method、动态段先注册、正则匹配静态路径），全部通过把静态组移动到动态父组**之前**解决，未删除任何路由：

| # | 静态端点（证据行号） | 动态父路由（证据行号） | server.ts 调整锚点 |
|---|---|---|---|
| 1 | `GET /api/fhir/Encounter/P001`，`src/bff/routes/m209Routes.ts:154` | `GET /api/fhir/Encounter/:id`，`src/bff/routes/fhir.ts:245` | `server.ts:4112` m209Routes 先于 `:4113` fhirRoutes |
| 2 | `GET /api/v1/patient/360/full`，`m232Routes.ts:242` | `GET /api/v1/patient/360/:patientId`，`patient360.ts:92` | `server.ts:4161` m232Routes 先于 `:4162` patient360Routes |
| 3 | `GET /api/v1/patient/360/summary`，`m232Routes.ts:243` | 同上 `patient360.ts:92` | 同上 |
| 4 | `GET /api/v1/admin/data-mart/catalog`，`dataMartDeep.ts:42` | `GET /api/v1/admin/data-mart/:name`，`dataMart.ts:62` | `server.ts:4581` dataMartDeepRoutes 先于 `:4582` dataMartRoutes |
| 5 | `GET /api/v1/admin/data-mart/lineage`，`dataMartDeep.ts:56` | 同上 `dataMart.ts:62` | 同上 |
| 6 | `GET /api/v1/admin/performance/report`，`performanceReport.ts:18` | `GET /api/v1/admin/performance/:period`，`performanceReview.ts:32` | `server.ts:4784-4787` 四组静态先于 `:4788` performanceReviewRoutes |
| 7 | `GET /api/v1/admin/performance/stress-test`，`performanceStress.ts:18` | 同上 `performanceReview.ts:32` | 同上 |
| 8 | `GET /api/v1/admin/performance/benchmark`，`performanceBenchmark.ts:124` | 同上 `performanceReview.ts:32` | 同上 |
| 9 | `GET /api/v1/admin/performance/kpi`，`performanceDeep.ts:79` | 同上 `performanceReview.ts:32` | 同上 |

- 影响：被遮蔽静态端点在运行时永远不会被命中，前端/集成方调用得到动态父路由的响应（参数解析为空或 404/业务错误），属于隐蔽功能失效。
- 处置：**已修复（本侧，纯顺序调整）**。修复后重跑静态审计 `shadows=0`。

#### P1-2 错误码与 HTTP 状态错配：重复签名场景（已修复）
- 证据：`src/bff/routes/imaging.ts:315-320`（修复前：资源已复核的重复提交返回 `ErrorCode.BAD_REQUEST(40000)` 配 HTTP 409）。
- 影响：语义冲突（资源状态已存在）应使用 409/CONFLICT；400 错误码会让网关/前端按"参数非法"分支处理，监控告警分类也会错位。
- 处置：**已修复（本侧）**。改为 `ErrorCode.CONFLICT(40900)` + HTTP 409，traceId 透传。

#### P1-3 错误响应省略 HTTP 状态参数，错误体默认挂 200（已修复）
- 证据：`src/bff/routes/twin3DInpatient.ts:45`（修复前：`json(fail(ErrorCode.BAD_REQUEST, 'action=beds 必须提供 floor 参数（7 / 8）'))`，缺少第三个状态参数，`json()` 缺省 200）。
- 影响：客户端拿到 HTTP 200 + `code=40000` 错误体，按"成功"分支解析；与错误码契约不一致。
- 处置：**已修复（本侧）**。补 `c.traceId` 与状态码 `400`；复扫全 routes 目录，省略状态参数导致默认挂 200 的 `fail()` 由 1 处降为 **0 处**；静态错误码-HTTP 状态配对扫描 `errStatusMismatch=0`（`fail()` 调用总数 1274，与 §3.1 静态脚本口径一致）。

#### P1-4 `GET /api/v1/health` 返回裸对象、未走统一信封（已修复）
- 证据：`src/bff/routes/health.ts:31-51`（修复前：直接 `json({status, uptime, db, version})`，无 `code/message/data/traceId` 结构）。
- 影响：与其余 BFF 响应契约不一致，前端通用拦截器/监控无法统一解析。
- 处置：**已修复（本侧）**。改为 `json(ok({...状态字段}, 'ok', _c.traceId))`，原有 `status/uptime/db/version` 字段原样保留在 `data` 内。

#### P1-8 会话校验 DB 故障 fail-open：断库期间吊销/过期会话可继续访问（已修复）
- 证据：修复前 `src/bff/middleware/sessionGuard.ts` `isSessionActive` `catch { return true; }`——缓存未命中且数据库异常时直接视为会话有效。
- 影响：数据库抖动/断连期间，已登出、被强制下线、已过期的令牌仍可通过鉴权，违反最小权限与会话吊销语义。
- 处置：**已修复（本侧）**。原函数导出为 `checkSessionActive`（`sessionGuard.ts:50-66`），catch 分支 `console.warn` 告警后 `return false`（fail-closed，后续 `requireAuth` 返回 401）；异常路径不写入"有效"缓存，防止故障窗口内被复用；保留既有 30s 进程内 TTL 缓存承担正常路径性能。**选型理由与边界**：鉴权关键路径优先拒绝，本轮未引入熔断/缓存宽限——DB 抖动期间合法会话会收到 401，需 DB 恢复后重试；后续若需降低误杀，可再加受限 TTL 负缓存 + 熔断 + 告警。断言见 `prodDemoFailClosed.test.ts` `checkSessionActive` 三组用例（DB 异常 false / 有效 true / 吊销 false）。

#### P1-5【遗留·不在本轮点名修复范围】`onlineConsult` 用例稳定失败：测试夹具日期耦合 + 巡检先于校验
- 证据：`tests/unit/onlineConsult.test.ts:94` 隔离复现 9 pass / 1 fail；源码 `src/bff/aggregators/onlineConsultAggregator.ts:235-237` 先 `sweepTimeouts(now)`，命中超时单直接 `return { ...sweptC }`，绕过 `:244` 空小结校验。
- 根因：夹具 `acceptedAt='2026-10-16T08:00:00Z'` 早于真实当前日期 2026-10-25，`sweepTimeouts(now)` 先把陈旧单标记为 `timeout` 并返回，`endConsultation(c.id, '   ')` 不再抛错，与测试"空小结必须拒绝"的期望冲突。
- 影响：不影响生产运行时（语义为"已超时单直接返回 timeout 记录"）；表现为单元测试长期红灯，掩盖真实回归。
- 处置：**本轮未改**（属聚合器状态机契约与测试夹具之间的二选一决策：要么夹具传 `now` 回放固定时钟，要么巡检分支先做空小结/状态校验）。建议后续由业务口径决策后修复。

#### P1-6【遗留·超出可改范围】DDL 静态完整性测试失败：12 个 deploy SQL 括号不配平告警
- 证据：`tests/unit/db/ddl.test.ts:25`（5 pass / 1 fail，可稳定复现）；`verifySql()` 实测输出 `ok=false, tables=462, seed=2385`，报错清单（`scripts/db/check-sql.ts` 静态括号计数）：
  `255-surgery-schedule.sql` (19 vs 23)、`306-smart-schedule.sql` (15 vs 20)、`316-group-multi-hospital.sql` (32 vs 37)、`319-patient-service-deep.sql` (13 vs 16)、`323-health-plan.sql` (9 vs 19)、`324-emergency.sql` (14 vs 21)、`342-emergency-deep.sql` (14 vs 20)、`352-drg-deep.sql` (33 vs 35)、`356-medical-record-deep.sql` (33 vs 36)、`360-finance-deep.sql` (15 vs 17)、`363-party-culture.sql` (25 vs 32)、`366-insurance-deep.sql` (51 vs 55)。
- 影响：测试红灯；括号计数为纯文本扫描，可能把字符串字面量/注释内括号误计入，需 deploy 侧结合真实 SQL 复核。
- 处置：**本轮未改**（`deploy/**` 在禁止改动清单内）。建议 deploy 侧逐文件核对括号配平，或把检查器升级为 SQL 语法级解析。

#### P1-7【遗留·平台兼容】两个单元测试文件在 Bun 1.2 / Windows 下挂起，未能跑完
- 证据与卡点：
  - `tests/unit/core/DeepSeekProvider.test.ts`：隔离运行 30s 超时，5 pass 后挂起于"重试/鉴权与终止 / factory"描述块，0 fail；疑似 mock Response body 流或 `unref` 定时器在 Bun 1.2 Windows 下不收尾（`src/core/agent/providers/DeepSeekProvider.ts:148-149` 附近指数退避实现）。
  - `tests/unit/resilience/bulkhead.test.ts`：隔离运行 20s 超时，2 pass 后挂起于第 3 用例"获取超时抛受控错误"（`bulkhead.test.ts:43-52`）；对应实现 `src/resilience/ConcurrencyLimiter.ts:88-90` 对超时定时器调用 `unref()`，Bun 1.2 Windows 下未触发 reject，信号量永久等待。
- 影响：两份测试覆盖未闭合；非生产功能故障（信号量正常路径用例已通过）。
- 处置：**本轮未改**（属测试运行时/定时器平台兼容问题，非本轮点名 BFF 审计项）。建议升级 Bun 至 1.4+ 后复跑，或去掉超时定时器 `unref()`、改用可确定性收尾的测试时钟。

### P2（技术债 / 合规增强项，本轮登记不批量改写）

#### P2-1 约 362 处裸 `json({code:...})` 响应未走 `ok()/fail()` 统一信封
- 证据：静态脚本 `audit-bff.mjs` 统计 `rawCodeEnvelope=362`、涉及 71 个路由文件；补充正则复扫口径为 365 处 / 73 文件（两套正则宽度差异，量级一致）。对照 `ok()` 4964 处、`fail()` 1274 处。
- 影响：响应字段形状不统一，前端通用解析与监控埋点需逐处兼容。
- 处置：本轮不批量改写；建议按路由分组逐步迁移到 `ok()/fail()`，并在 CI 增加裸信封拦截规则。

#### P2-2 127 个同 method+path 重复注册（42 个文件内自重复 + 85 个跨文件重复）
- 证据：`audit-report.json` `dupes=127`；先注册者生效、后者在首个匹配语义下不可达。样例：`GET /api/v1/emr/version-compare`（`emrVersion.ts:22` 先于 `m214Routes.ts:242`）、`GET /api/v1/emr/versions`（`emrVersion.ts:21` 先于 `m239Routes.ts:116`）、`GET /api/v1/auth/permissions`（`auth.ts:397`，跨文件另有重复定义）。
- 影响：死代码级路由悬挂，排查问题时易误判；个别跨文件重复若实现不一致，行为取决于注册顺序。
- 处置：本轮未删路由（边界要求）；建议后续建立"单一权威注册"清单，收敛重复定义。

#### P2-3 审计落库与脱敏缺口
- 证据：
  - 审计表结构 `src/bff/middleware/audit.ts:35-43`：`audit.operation_log(id, user_id, method, path, body, created_at)`，**无 `trace_id` 列**，无法与请求日志/错误链路串联。
  - 落库路径为原始 URL 查询串：`audit.ts:72-73` `VALUES (..., ${c.req.url}, ...)`，查询参数夹带 PII 时未脱敏。
  - 脱敏字段白名单 `src/bff/utils/mask.ts:77-88`：仅姓名（`name/realname/patientName/userName/doctorName/appointmentName`）、证件号（`idcard/idno/certno/identitycard`）、手机号（`phone/mobile/telephone/phonenumber`）；**遗漏 `password`、`email`、地址、银行卡号**；`maskBody` 递归实现见 `mask.ts:103-126`。
  - 审计只记录请求、不记录响应状态码与结果；`src/bff/middleware/log.ts:39,52` 同样打印完整原始 URL（含查询串）。
- 处置：本轮登记不改；建议补 `trace_id` 列、路径/查询串脱敏、扩充敏感字段白名单、审计记录响应状态码。

#### P2-4 LLM 端点/占位模型/占位密钥仅告警不失效关闭
- 证据：`src/bff/config/env.ts:43` `DEFAULT_LLM_API_ENDPOINT='http://localhost:8000/v1'`、`:45` 占位模型 `qwen2.5-72b-instruct`、`:47` 占位密钥 `sk-local`；`loadEnv()` `env.ts:128-139` 对缺失密钥/端点仅 `console.warn`，生产不抛错。另有 4 个聚合器/工具把 `LLM_BASE_URL` 缺省回退到 `https://api.deepseek.com/v1`：`chatAggregator.ts:270`、`aiRecordAggregator.ts:58`、`medical-tools/interpret/llmClient.ts:42`、`emergencyAggregator.ts:423`。
- 影响：生产漏配 LLM 凭证/端点时不拒绝启动，可能产生对外调用或走非预期默认端点。
- 处置：本轮登记；建议生产模式下对 LLM 端点与密钥做 fail-closed 校验，默认外网端点不入生产代码。

#### P2-5 部署配置聚合器内占位口令与模板插值
- 证据：`src/bff/aggregators/deployConfigAggregator.ts:79` `PLACEHOLDER_SECRET='CHANGE_ME_BEFORE_PRODUCTION'`；`:218-220` compose 模板经 `${DB_PASSWORD:-...}`、`${REDIS_PASSWORD:-...}`、`${JWT_SECRET:-...}` 环境插值，模板内无内嵌真实口令。
- 处置：合规样例保留；建议前端生成文案继续强提示运维落盘前替换。

#### P2-6 品牌旧称残留（点名三处已由主 Agent 清零，本侧复扫确认；其余为 P2 观察项）
- 点名项复核结论：`src/bff/routes/apiDocs.ts:23` `<title>健澜AI原生医院操作系统OS · API 文档</title>`、`:38` `<h1>健澜AI原生医院操作系统OS · 统一 API 文档</h1>`；`src/bff/aggregators/apiDocsAggregator.ts:505` `title: '健澜AI原生医院操作系统OS BFF API'`；`tests/unit/apiDocs.test.ts:48` 断言 `toContain('健澜AI原生医院操作系统OS')`——**已对齐**。复扫 `Gang-OS / jianlan-gang / GangOS / 杠OS`：`tests/**` 零命中；`src/**` 仅剩 2 处文件头注释（下条列出），运行时展示串零命中；技术指标前缀 `gangos_*` 另见下条。
- 复核进展：首轮登记的 9 处运行时「健澜科技数智医院智能体」锚点（`chatAggregator.ts:135`、`system.ts:26` siteName、`SystemPromptBuilder.ts:78`、`generateMedicalRecord.ts:198` 病历水印、`ComplianceChecker.ts:348`、`medicalCommands.ts:714/718/785`）本轮回读均已是正式名「健澜AI原生医院操作系统OS」；唯 `bff/server.ts:6679` 问候语仍为旧称，见下条遗留。
- 遗留观察（未在本轮点名替换范围内，不批量改写）：
  - 运行时另一组词面「健澜数智医院操作系统/平台/智能体」（非正式名但非 `Gang-OS`），代表锚点：`bff/server.ts:6679`（问候语）、`bff/agents/agentRegistry.ts:33/48/62/71/86/95/104`（7 个岗位智能体系统提示词）、`bff/agents/toolRegistry.ts:1208`、`bff/aggregators/i18nDeepAggregator.ts:268`、`bff/aggregators/llmClientAggregator.ts:138`、`bff/aggregators/userManualAggregator.ts:732`、`bff/routes/fhir.ts:96`、`core/buddy/specialties/` 8 个专科提示词（`emergency.ts:31`、`icu.ts:33`、`internal-medicine.ts:33`、`medical-technology.ts:30`、`obstetrics-gynecology.ts:32`、`operating-room.ts:32`、`pediatrics.ts:32`、`surgery.ts:34`）、`skills/integration/realInvoker.ts:118/122/125/245`。
  - 注释头旧称：`src/knowledge-platform/types.ts:2`、`src/knowledge-platform/index.ts:2` 仍含 `（GangOS / Jianlan OS）`；本轮回扫 `src/**` 同类旧称合计 416 处 / 5043 文件（其中 `GangOS` 2 处，均为注释头）、`tests/**` 94 处 / 2189 文件（`Gang-OS` 0 命中）；绝大多数为文件头注释，不影响运行时展示。
  - 技术指标命名空间 `gangos_*` 前缀：`src/bff/observability/metrics.ts:45/47/51/56/58/61`、`src/core/observability/metrics.ts:206/210/217/223/226`——属运维标识，改名会影响既有仪表盘/告警规则，需随可观测性迁移统一更换，不建议随文档串批量改。
  - 根 `package-lock.json` 包名仍为 `jianlan-gang-os`（根 lockfile 在禁止改动清单内；根 `package.json` `name=jlmedaios` 已为新口径）。

#### P2-7 三个空占位路由数组（去重纪律锚点，非缺陷）
- 证据：`src/bff/routes/m575Routes.ts`、`m576Routes.ts`、`m580Routes.ts`，仅导出空数组以维持 `server.ts` 注册锚点顺序；对应端点已由既有 `progressNote.ts / dischargeSummary.ts / surgeryRecord.ts` 注册。静态脚本 `unresolved=3` 即此三项，属有意设计。

#### P2-8 测试质量：无 DB 时守卫早退被 bun 计为通过（false-pass）
- 证据：`tests/integration/real-persistence.test.ts:57` `if (!dbAvailable) return;` 模式（8 个用例同构，行号 57/81/92/145/191/225/262/310）；本机 5432 端口关闭、`DATABASE_URL` 未设置，`dbAvailable=false`，用例未执行断言即返回，bun 计为 `pass`。
- 处置：建议改用 `test.skip()` 语义或在守卫内显式记录跳过，避免"绿色假象"。

#### P2-9 404 兜底错误文案含尾随空格（外观瑕疵，已修复）
- 证据：修复前 `src/bff/server.ts:6831` `fail(ErrorCode.NOT_FOUND, '路由不存在： ', ctx.traceId)`，状态码 404 配对正确，仅文案末尾多一个空格。
- 处置：**已修复（本侧）**。`server.ts:6832` 文案改为 `'路由不存在：'`，尾随空格移除；状态码配对不变。

---

## 二、已落地修复清单

### 2.1 本侧（A3：`src/**` / `tests/**`）实际改动（10 个源码文件，含 1 个新增共享模块；另新增 1 个测试文件；另含 2.2 主 Agent 已落地项）

**A. 本轮新闭环安全加固（P0-4 / P1-8 / P2-9）**

| 文件 | 改动摘要 |
|---|---|
| `src/bff/config/runtimeEnv.ts`（新增，37 行） | 统一运行环境判定：`isProductionEnv()`、`isDemoModeEnabled()`、`assertProductionNotDemoMode()`；供 JWT 密钥、字段密钥、DB、演示短路等全部安全判定复用，消除口径漂移。 |
| `src/bff/middleware/auth.ts:15, 171-181` | `requireAuth` 演示短路加 `!isProductionEnv()` 守卫：生产即使误配 `DEMO_MODE=1` 也不授予 demo admin；本地 `isProductionEnv()` 移除，改为复用共享模块。 |
| `src/bff/middleware/sessionGuard.ts:22, 50-66, 78-84` | 生产不跳过 jti 会话吊销校验；`checkSessionActive` DB 异常 `warn` 后 `return false`（fail-closed），不写"有效"缓存；30s 进程内 TTL 缓存保留。 |
| `src/bff/middleware/audit.ts:17, 89-94` | 抽出 `shouldSkipAuditForDemo()`：生产环境即使误配 `DEMO_MODE=1` 也不跳过操作审计落库；非生产演示行为保留。 |
| `src/bff/server.ts:22, 6884-6885` | 启动路径在 `Bun.serve` 绑定端口前调用 `assertProductionNotDemoMode()`，生产 + `DEMO_MODE=1` 直接抛错退出；顺带修复 `:6832` 404 文案尾随空格（P2-9）。 |
| `tests/unit/bff/prodDemoFailClosed.test.ts`（新增，18 用例） | 覆盖启动拒绝、requireAuth 生产不短路、enforceSession 生产不跳过、DB 故障 fail-closed、审计生产不跳过、checkSessionActive 三态；非生产演示行为保持原义。 |

**B. 首轮已闭环修复（P0-1~P0-3、P1-1~P1-4，本轮保留复跑通过）**

| 文件 | 改动摘要 |
|---|---|
| `src/bff/server.ts` | 纯路由顺序调整，未删端点：m209Routes 移至 fhirRoutes 前（`:4112`）；m232Routes 移至 patient360Routes 前（`:4161`）；dataMartDeepRoutes 移至 dataMartRoutes 前（`:4581`）；performanceReport/Stress/Benchmark/Deep 四组移至 performanceReviewRoutes 前（`:4784-4787`）。 |
| `src/bff/routes/health.ts:37-49` | `GET /api/v1/health` 由裸对象改为 `json(ok({status, uptime, db, version}, 'ok', traceId))` 统一信封，状态字段保留在 `data`。 |
| `src/bff/routes/imaging.ts:315-320` | 重复签名冲突由 `BAD_REQUEST + 409` 改为 `CONFLICT(40900) + 409`，错误码与 HTTP 状态语义对齐。 |
| `src/bff/routes/twin3DInpatient.ts:45` | 补 `c.traceId` 与显式状态 `400`，消除裸 `fail()` 默认 200 的错配。 |
| `src/bff/middleware/auth.ts:47-57, 92-96` | JWT 密钥生产 fail-closed：缺 `JWT_SECRET` 在 `:51-54` 直接抛错；`verifyJwt` 取钥异常捕获后返回 `null`；非生产保留开发默认并告警。 |
| `src/security/encryption/FieldCipher.ts:18-32` | 字段加密密钥生产 fail-closed：缺 `FIELD_ENCRYPTION_KEY`/`JWT_SECRET` 直接抛错；非生产保留开发默认并告警。 |
| `src/db/pool.ts:51-54` | 生产缺 `DATABASE_URL` 直接抛错，禁止回落本地默认账号口令；非生产保留 PG* 环境变量默认。 |

### 2.2 主 Agent 16:23 已就地落地、本侧仅复核留证项（不计入本轮修复）
- 品牌串：`src/bff/routes/apiDocs.ts:23/38`、`src/bff/aggregators/apiDocsAggregator.ts:505`、`tests/unit/apiDocs.test.ts:48`，复扫一致（见 P2-6）。
- `adminSurgeryOptimizeRoutes` **已接线已复核**：import `server.ts:661`，挂载 `server.ts:4603`，路由定义 `src/bff/routes/adminSurgeryOptimize.ts:33`、`POST` 方法 `:35`（`POST /api/v1/admin/surgery/schedule/optimize`）。非本轮新补挂，未重复操作。
- 在线咨询智能体新特性（主 Agent 未跟踪源码）：`src/bff/routes/consultAgentRoutes.ts`、`src/core/agent/consult/`、`src/db/repositories/consultAgentRepo.ts`、`tests/unit/consult-agent/`；import `server.ts:4095`、挂载 `server.ts:6520`；`src/bff/permissions.ts` 追加三权限码。本侧仅核对接线存在，未改动其实现。

### 2.3 边界复核
- 未改动 `web/**`、`deploy/**`、`docker-compose*.yml`、`.env*`、`services-java/**`、`services-python/**`、`services/**`、`README*`、根 `package.json`；工作区内其余已跟踪/未跟踪改动属其他任务历史遗留，本侧未触碰。
- 未新建任何业务生产端点；未删除既有路由与测试；未执行 `git add/commit`。

---

## 三、实测计数表（命令 + 输出摘要，禁止沿用旧口径）

### 3.1 静态结构计数（脚本：本侧 scratch `audit-bff.mjs`，只读解析 `server.ts` import 映射、`allRoutes` spread 顺序与各路由文件 method/path）

命令（仓库根）：
```
node <scratch>\audit-bff.mjs
```
输出（修复后复跑）：
```
{
  "spreadGroups": 2415,
  "inlineRoutes": 0,
  "registeredEntries": 5211,
  "uniqueMethodPath": 5084,
  "routeFiles": 2402,
  "aggregatorFiles": 1945
}
unresolved: 3 {"empty placeholder array":3}
importedNotSpread: 0
spreadNotImported: 0
dupes: 127
shadows: 0
style: {"ok":4964,"fail":1274,"rawCodeEnvelope":362,"newResponse":12,"filesRaw":71}
errStatusMismatch: 0
```

口径说明：
- **BFF 真实注册路由数（按 `allRoutes` 聚合后 method+path 去重计数，非文件数）= `uniqueMethodPath=5084`**；`registeredEntries=5211` 为聚合后展开的路由条目总数（去重前）；差额 127 即重复注册（42 文件内自重复 + 85 跨文件重复，先注册者生效，后注册者不可达）。`spreadGroups=2415` 仅为 `allRoutes` 中 spread 的路由组数量，不代表端点数。
- `routeFiles=2402`：`src/bff/routes/**/*.ts` 文件数（旁证，非端点数）；`aggregatorFiles=1945`：`src/bff/aggregators/**/*.ts` 纯函数模块数（0 个模块内出现 `new Response(`，无直返响应）。
- `importedNotSpread=0`、`spreadNotImported=0`：已定义路由无漏挂、无悬挂挂载。
- `newResponse=12` 全部属合理豁免：SSE 流 4（`assistantLlmChat.ts:170`、`chat.ts:172`、`consultAgentRoutes.ts:165`、`medmuseStream.ts:148`）；CSV/附件下载 5（`auditLogQuery.ts:138`、`export.ts:38`、`exportReport.ts:43`、`reportExport.ts:61`、`settlementReport.ts:57`）；Swagger HTML 1（`apiDocs.ts:64`）；纯文本存活探针 1（`system.ts:96`）；备份 JSON 附件 1（`adminBackup.ts:40`）。

PowerShell 独立旁证命令与输出：
```powershell
$root="C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1"
(Get-ChildItem "$root\src\bff\routes" -Recurse -Filter *.ts).Count      # 2402
(Get-ChildItem "$root\src\bff\aggregators" -Recurse -Filter *.ts).Count # 1945
(Get-ChildItem "$root\tests\unit" -Recurse -Filter *.test.ts).Count      # 2040
(Get-ChildItem "$root\tests\integration" -Recurse -Filter *.test.ts).Count # 136
# 合计测试文件 2176（unit 2040 + integration 136）
```

### 3.2 健康检查端点实测清单（代码走查，本机无外部流量回放条件）

| 方法 | 路径 | 状态码 | 响应形状 | 证据 |
|---|---|---|---|---|
| GET | `/health` | 200 | 纯文本 `ok`（存活探针约定，不套信封） | `system.ts:93-97` |
| GET | `/ready` | 200 / 503 | `ok()` 信封 / `fail(SERVICE_UNAVAILABLE, 503)` | `system.ts:75-92` |
| GET | `/api/v1/system/health` | 200 / 503 | `ok()` 信封 / `fail(SERVICE_UNAVAILABLE, 503)` | `system.ts:54-72` |
| GET | `/api/v1/health` | 200 | `ok()` 信封（data: status/uptime/db/version） | `health.ts:32-49` |
| GET | `/api/v1/health/detailed` | 200（需登录 + 权限码 `system:view`，否则 401/403） | `ok()` 信封，仅返回聚合计数/比率 | `health.ts:53-65` |
| GET | `/api/v1/system/health/dashboard` | 200 / 500（需登录 + 权限码 `system:view`，否则 401/403） | `ok()` 信封（进程/DB 池/outbox 积压/熔断四维状态）；采集失败 `fail(INTERNAL_ERROR, 500)` | `systemHealth.ts:22-35`；import `server.ts:848`、挂载 `:4748` |

结论：健康检查无缺口，未新建任何端点。其余 `health-*` / `healthcheck*` 路径均为业务模块（健康宣教、体检套餐等），不属于存活/就绪探针。

### 3.3 统一响应体与错误码覆盖
- 信封结构：`src/bff/types.ts:7-13` `ApiResponse{code, message, data, timestamp, traceId?}`；工具 `ok()` `:29-31`、`fail()` `:33-35`、`json()` `:37-42`、`newTraceId()` `:71-73`。
- 错误码枚举 `types.ts:16-27`：`SUCCESS=0 / BAD_REQUEST=40000 / UNAUTHORIZED=40100 / TOKEN_EXPIRED=40101 / FORBIDDEN=40300 / NOT_FOUND=40400 / CONFLICT=40900 / RATE_LIMITED=42900 / INTERNAL_ERROR=50000 / SERVICE_UNAVAILABLE=50300`——任务要求覆盖的 200 / 400 / 401 / 403 / 404 / 409 / 500 全部齐备（另含 429、503）。
- 中间件配对抽样：限流 429/RATE_LIMITED（`rateLimit.ts:37-38`、登录限流 `:63-67`）；CSRF 403/FORBIDDEN（`csrf.ts:68`）；租户 403/FORBIDDEN 与 500/INTERNAL_ERROR（`tenant.ts:46-52`）；幂等键 400/BAD_REQUEST（`idempotency.ts:69-70`）、409/CONFLICT（`:121-125`、`:132-136`）；认证 401/UNAUTHORIZED（`auth.ts:178,186,316`）、角色/权限 403/FORBIDDEN（`auth.ts:192-194,323-325`）；兜底 404/NOT_FOUND（`server.ts:6828-6834`）；兜底 500 不外泄堆栈（`error.ts:48-54`，堆栈仅服务端 `console.error` `:49`）。
- 静态配对扫描 `errStatusMismatch=0`；省略状态参数的 `fail()` 已清零（1 → 0）。

### 3.4 密钥与环境变量扫描结论
- 运行时凭证来源：JWT `auth.ts:47-57`（`process.env.JWT_SECRET`，生产缺省抛错）；字段密钥 `FieldCipher.ts:20`；DB `db/pool.ts:32`；Redis `src/cache/factory.ts:49`；LLM Key `core/agent/providers/factory.ts:31`、`DeepSeekProvider.ts:148`、`bff/llm/llmAdapter.ts:389`、`medical-tools/interpret/llmClient.ts:41`、`chatAggregator.ts:269`、`aiRecordAggregator.ts:54`、`emergencyAggregator.ts:421`；LLM BaseURL 同源 `factory.ts:32`、`DeepSeekProvider.ts:149` 等。
- 全仓 `src/**`、`tests/**` 扫描 `sk-<20+>`、`postgres://user:pass@`、`redis://:pass@`、`PRIVATE KEY`、`secret/password/apiKey/token/passphrase = '<6+字符>'` 字面量赋值：**未发现生产真实硬编码口令/连接串/LLM 凭证**；`tests/**` 零命中，仅合成夹具（`Test@123456`、`postgres://u:p@...`、`sk-test` 等）。src 仅 3 处占位性质命中：`deployConfigAggregator.ts:218-220` 模板内 `${DB_PASSWORD:-...}` / `${REDIS_PASSWORD:-...}` / `${JWT_SECRET:-...}` 环境插值（无内嵌真实口令，见 P2-5）；`deploymentDocAggregator.ts:147` 为 `postgres://user:password@host:port/...` 文档示例串。`src/**` 内无 `secret/password/apiKey/token/passphrase` 等号直接赋字面量密钥的语句。
- `.env` 真实文件在磁盘、被 `.gitignore:17` 忽略、`git ls-files` 未跟踪；跟踪文件仅 `.env.example`、`.env.compose.example`，其中除 `.env.example:24` 本地开发默认 `postgres://postgres:postgres@localhost:5432/jlmedaios` 外，其余全部为 `CHANGE_ME_*` / `*-placeholder-replace-me` 占位符，无生产真实凭证。

### 3.5 日志、traceId 与审计现状（缺口见 P2-3，本轮不批量改写）
- **traceId**：`newCtx`（`auth.ts:328-357`）在 `:351` 优先取请求头 `x-trace-id`，缺失时由 `newTraceId()`（`types.ts:71-73`，格式 `trc_<时间戳36进制>_<随机串>`）生成；`ok()` / `fail()` 把 traceId 写入响应信封（`types.ts:29-35`），错误响应与业务响应均可经 `c.traceId` 透传。
- **请求日志**：`logRequest`（`log.ts:31-53`）；生产环境（`NODE_ENV=production`）输出结构化 JSON，字段 `timestamp / level / message / durationMs / method / status / traceId`（`:35-47`），非生产为单行文本并附 `[traceId]`（`:50-52`）；接线于 `server.ts:6837`。
- **审计落库**：`auditOperation`（`audit.ts:93-100`）fire-and-forget，写库异常仅 `console.warn` 不阻断主请求；仅对 `POST / PUT / DELETE / PATCH` 留痕（方法白名单 `audit.ts:22`、判断 `:95-96`）；演示模式跳过仅限非生产环境（`shouldSkipAuditForDemo()` `audit.ts:89-91`），生产环境不跳过；请求体先经 `maskBody` 脱敏再落库（`:61`、`:70-73`）；表 `audit.operation_log` 幂等建表（`:32-45`）；接线于 `server.ts:6839`。
- **遥测口径**：`recordHttpRequest`（`server.ts:6840-6845`）只记录 `method / routeLabel（路由模板，:6801 赋值）/ code / durationSeconds`；`recordSystemHttpRequest()`（`:6846`）与 `recordRequestPerformance`（`:6848`）同口径，仅存路由模板与状态码，不含原始 URL 参数与 PII。
- 已识别缺口（审计表无 `trace_id` 列、原始查询串未脱敏、白名单遗漏字段、不记响应状态码等）统一列入 **P2-3**，本轮不改写。

---

## 四、类型检查与测试实测结果

### 4.1 环境前置条件（必读）
- 本机 `bun` 不在 PATH，必须使用绝对路径：`C:\Users\lenovo\.bun\bin\bun.exe`；**环境前置条件：bun ≥ 1.3 需加入系统 PATH**（当前本机 1.2.0，与 `package.json:38` 声明的 `packageManager=bun@1.4.2` 版本不符；批量脚本已用绝对路径绕过 PATH 问题，但 CI/新机器须先对齐版本）。
- 本机未设置 `DATABASE_URL`、`REDIS_URL`、`LLM_API_KEY`；5432 端口关闭。`bunfig.toml [test].preload=./tests/support/testEnv.ts`，非 `TEST_REAL=1` 时强制 `DEMO_MODE=1`（`tests/support/testEnv.ts:20-22`）。
- `Start-Process` 方式下 bun.exe shim 的 `ExitCode` 不可靠；测试计数以 stderr 中 `(pass)/(fail)/(skip)` 标记为准，用例失败定位以前台隔离复跑为准。

### 4.2 `tsc --noEmit`（本轮全部源码改动后最终一轮）
命令（仓库根）：
```
.\node_modules\.bin\tsc.cmd --noEmit
```
最终结果：**`EXITCODE=0`，诊断输出 0 字节（零错误零警告）**；结论标记留存 `scratch/tsc-output-final.txt`（`EXITCODE=0 diagnostic bytes=0`）。基线 §1 口径保持成立。

### 4.3 单元测试 `tests/unit`（磁盘 2040 个 `.test.ts`，本轮 v2 全量复跑）
执行方式：因 Bun 1.2 Windows 下全量进程会在个别用例挂起，按 BatchSize 40 分批（60s 超时杀进程）；2 个挂起批次剔除已知挂起文件后二分重跑；挂起批次超时前打出的 `pass` 标记不计入干净口径，避免重复计数。干净执行集 2038 个文件与磁盘 2040 个 `.test.ts` 逐一比对，仅缺下方 2 个挂起文件。

| 批次口径 | 文件数 | pass 标记 | fail 标记 | skip | 说明 |
|---|---|---|---|---|---|
| v2unit 首轮存活 49 批 | 1960 | 14155 | 2（1 个真实用例，bun 重复打印两次） | 0 | 失败 `onlineConsult.test.ts:94` |
| b49 二分重跑（替代挂起批 49，剔除 `DeepSeekProvider.test.ts`） | 39 | 347 | 2（1 个真实用例，重复打印两次） | 0 | 失败 `db/ddl.test.ts:25` |
| b51 二分重跑（替代挂起批 51，剔除 `bulkhead.test.ts`） | 39 | 584 | 0 | 0 | — |
| **合计（干净执行集）** | **2038** | **15086** | **4（=2 个真实失败用例）** | **0** | 2 个文件挂起未跑完（见下） |

隔离/定向复跑证据（本轮改动后复跑）：
- `tests/unit/bff/prodDemoFailClosed.test.ts`（本轮新增）：**18 pass / 0 fail / 0 skip**，覆盖 P0-4 启动拒绝、requireAuth 生产不短路、enforceSession 生产不跳过、审计生产不跳过、checkSessionActive 三态。
- `tests/unit/bff/` 目录同进程（含新增 `prodDemoFailClosed.test.ts` 18 用例及 `demoModeGuard`、`metrics` 等既有文件）：**34 pass / 0 fail / 0 skip**；上一条 18 用例为该新文件隔离单跑认证，两层证据不重复计入 §4.3 合计口径。
- 定向回归（本轮 7 个首轮修复文件直接覆盖面，同进程）：`authFix.test.ts`、`security/encryption.test.ts`、`systemHealth.test.ts`、`systemHealthDashboard.test.ts`、`agentHealth.test.ts`、`agentHealthV12.test.ts`、`imagingQualityControlV13.test.ts` 共 **106 pass / 0 fail / 0 skip**。
- `tests/unit/twin3D.test.ts` + `twin3DInpatient.test.ts` + `apiDocs.test.ts` 同进程：**52 pass / 0 fail**（twin3D 39 + apiDocs 13；apiDocs 隔离单跑 204 expect() calls）。
- `tests/unit/onlineConsult.test.ts`：9 pass / 1 fail；失败用例 `endConsultation 结束问诊 > 空小结拒绝结束；非咨询中状态拒绝`（`onlineConsult.test.ts:94`），根因见 P1-5。
- `tests/unit/db/ddl.test.ts`：5 pass / 1 fail；失败用例 `PostgreSQL DDL 静态完整性 > 表/序列/触发器/种子全部齐全且自洽`（`ddl.test.ts:25`），12 个 deploy SQL 括号告警见 P1-6。
- consult-agent 目录（13 个 `.test.ts`，主 Agent 未跟踪新特性配套测试，已包含在干净执行集内）：本轮整目录同进程复跑 **101 pass / 0 fail / 0 skip**，作为同进程复跑佐证。

**挂起未跑完（不计入通过，未删除用例）：**
- `tests/unit/core/DeepSeekProvider.test.ts`：5 pass 后挂起（30s 隔离复现），0 fail；卡点见 P1-7。
- `tests/unit/resilience/bulkhead.test.ts`：2 pass 后挂起（20s 隔离复现），0 fail；卡点见 P1-7。

### 4.4 集成测试 `tests/integration`（磁盘 136 个 `.test.ts`）
命令口径：`C:\Users\lenovo\.bun\bin\bun.exe test <file...>`；135 个按 6 批（每批 25/10 文件，60s 超时）跑完，清单快照后新增的 `tests/integration/consult-agent/consultFlow.test.ts` 隔离单跑补测。

| 批次 | 文件数 | pass | fail | skip |
|---|---|---|---|---|
| v2int-batch001 | 25 | 9 | 0 | 187 |
| v2int-batch002 | 25 | 126 | 0 | 226 |
| v2int-batch003 | 25 | 7 | 0 | 127 |
| v2int-batch004 | 25 | 17 | 0 | 155 |
| v2int-batch005 | 25 | 41 | 0 | 236 |
| v2int-batch006 | 10 | 3 | 0 | 94 |
| consultFlow（清单快照后新增，隔离补测） | 1 | 7 | 0 | 0 |
| **合计** | **136** | **210** | **0** | **1025** |

- 挂起批次：0。`consultFlow.test.ts` 7 个用例为真实断言通过（非 DB 守卫早退、非 skip）。
- 跳过构成（本轮 `int-skips.mjs` 分类口径，合计 1025）：DB/真实模式守卫 **612**（含"数据库不可用，跳过（不冒充通过）"显式说明；M12-A AI 智能解读套件 10 个用例同样由 `describe.skipIf(!dbAvailable || !realMode)` 守卫，见 `ai-interpretation.test.ts:155`——该套件在库可用后会在测试内主动 `delete process.env.LLM_API_KEY` 验证降级路径，**不属于** LLM 缺失导致的跳过，全集成目录无 `LLM_API_KEY` 缺失型 `skipIf`，llm 桶 = 0）；其余条件聚合器/路由专用 `describe.skip` 套件 **413**。
- **false-pass 提示**：`tests/integration/real-persistence.test.ts` 8 个用例在无 `DATABASE_URL`、5432 关闭时 `dbAvailable=false`，守卫早退未断言即被 bun 计为 pass（见 P2-8）；这 8 个标记不代表真实 PostgreSQL 链路已验证。
- 阻塞原因：本机无 PostgreSQL / Redis、未开启真实模式（非 `TEST_REAL=1`，`bunfig.toml` preload 强制 `DEMO_MODE=1`）；真实持久化、真实库事务等链路须在配置 `DATABASE_URL`、`REDIS_URL` 并置 `TEST_REAL=1`（配种子库）的环境复跑；LLM 凭证缺失不是本批集成测试的跳过原因。

### 4.5 真实失败/阻塞清单汇总（不伪造通过）
本轮新闭环的 P0-4（DEMO_MODE 生产 fail-closed）、P1-8（会话 DB 故障 fail-closed）已由 `tests/unit/bff/prodDemoFailClosed.test.ts` 18 个断言覆盖并通过（见 §2.1-A、§4.3），不计入下方失败/阻塞清单。

| # | 文件:行号 | 性质 | 状态 | 处置归属 |
|---|---|---|---|---|
| 1 | `tests/unit/onlineConsult.test.ts:94` | 稳定失败（日期耦合 + 巡检先于空小结校验） | 已隔离复现，9 pass / 1 fail | P1-5，待业务口径决策 |
| 2 | `tests/unit/db/ddl.test.ts:25` | 稳定失败（12 个 deploy SQL 括号告警） | 5 pass / 1 fail | P1-6，deploy 侧复核 |
| 3 | `tests/unit/core/DeepSeekProvider.test.ts` | 挂起未跑完，5 pass / 0 fail | Bun 1.2 Windows 兼容 | P1-7，升级 Bun / 修定时器 |
| 4 | `tests/unit/resilience/bulkhead.test.ts` | 挂起未跑完，2 pass / 0 fail | `unref()` 定时器未触发 reject | P1-7，同上 |
| 5 | 集成 `real-persistence.test.ts` 8 用例 | 守卫早退 false-pass | 无 DB | P2-8，测试语义改为 skip |
| 6 | 集成 1025 个 skip（DB 守卫 612 + 条件 describe.skip 413 + LLM 缺失 0） | 外部 DB 未就绪 / 条件套件 | 环境阻塞 | 配置真实凭证、`TEST_REAL=1` 后复跑 |

---

## 五、遗留风险与建议

1. **优先恢复测试绿灯**：P1-5（onlineConsult 日期耦合）与 P1-6（deploy SQL 括号）建议在下一轮收口前闭环；P1-7 两个挂起文件随 Bun 1.4+ 升级复跑，若仍挂起再修定时器/流收尾。
2. **错误契约统一**：按 P2-1 把 362 处裸 `json({code:...})` 分组迁移到 `ok()/fail()`；CI 增加静态规则拦截新写裸信封；同时收敛 P2-2 的 127 个重复注册，建立单一权威路由清单。
3. **审计合规加固**：补 `trace_id` 列、查询串/路径脱敏、扩充 `maskBody` 敏感字段白名单（password/email/地址/银行卡），审计记录响应状态码；审计保留期默认 180 天（`src/constants/medical.ts:314`），可由 `AUDIT_RETENTION_DAYS` 覆盖（`src/config/ConfigManager.ts:80`）。
4. **生产密钥与演示模式策略**：本轮已完成 JWT 密钥、字段加密密钥、`DATABASE_URL` 三处 fail-closed，以及 DEMO_MODE 启动期拒绝、requireAuth 演示短路、jti 会话校验、审计落库四处生产旁路关闭、会话 DB 故障 fail-closed；后续把 LLM 端点、占位模型、`sk-local` 也纳入生产失效关闭（P2-4），移除聚合器层外网默认 BaseURL 回退。残余观察：`csrf.ts:39`、`rateLimit.ts:29,54`、`error.ts:24` 仍保留 DEMO_MODE 分支，当前已被启动期 `assertProductionNotDemoMode()` 在生产路径整体阻断；建议后续同样加 `!isProductionEnv()` 守卫，形成中间件层纵深防御。
5. **品牌收口**：运行时残余「数智医院」组词面（P2-6 代表锚点清单）随下一轮品牌统一替换；注释头与 lockfile 包名、`gangos_` 指标前缀按文档/可观测性迁移计划分批处理，避免影响仪表盘与告警。
6. **测试环境门禁**：CI 固定 Bun 1.4.2（与 `packageManager` 对齐）并加入 PATH；无外部依赖时集成测试应以显式 skip 表达，杜绝守卫早退 false-pass；`TEST_REAL=1` 环境单独跑真实持久化套件。
7. **路由顺序防回归**：建议在 CI 静态检查中保留本次 `audit-bff.mjs` 同类规则（动态先于静态、漏挂、配对错配、重复注册），`shadows/importedNotSpread/spreadNotImported/errStatusMismatch` 任一非零即阻断合并。

---

### 附：本轮取证产物（均在本代理 scratch，未写回仓库）
- `audit-bff.mjs`：只读静态审计脚本（路由顺序/遮蔽/重复/信封/错误码配对），可 `node` 复跑覆盖 `audit-report.json`。
- `audit-report.json`：最终静态审计结果（计数、重复明细、未挂载清单、配对错配）。
- `tsc-output-final.txt`：最终 `tsc --noEmit` 输出（0 字节诊断）。
- `unit-batches-v2/`：v2 全量单元 51 批 + b49/b51 各 3 批二分 + v2int 6 批集成，原始 `.txt/.err` 与 `*.summary.csv`；`reconcile-v2.mjs` 为干净执行集对账脚本（2038 文件 / 15086 pass / 4 fail 标记 / 0 skip，缺 2 个挂起文件）。
- `test-aggregate.json`：单元/集成测试计数聚合口径（含 8 个 real-persistence false-pass 登记）。
- `my-changes.diff`：9 个已跟踪源码文件的整文件工作区 diff 留档（`git diff` 口径，同一文件内其他任务的既有改动也一并包含；本侧专属改动以 §2.1-A / §2.1-B 表格逐条为准）；新增 `src/bff/config/runtimeEnv.ts` 与 `tests/unit/bff/prodDemoFailClosed.test.ts` 为未跟踪新文件（git status `??`），未执行 `git add`。
