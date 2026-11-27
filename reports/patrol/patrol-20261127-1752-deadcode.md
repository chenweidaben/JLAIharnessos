# 巡检简报 2026-11-27 17:52 轮（死代码 A/B 类小批量清理 · 未用导入/类型/局部变量零引用证据闭合 · 门禁双 0 · 核心与聚合器 unit 181 pass）

## 概要
本轮在干净基线 `14bdad8a`（三远端逐字一致、0 领先 / 0 落后）上续接台账 #143/#148 死代码可自主项。以 eslint `@typescript-eslint/no-unused-vars` 清单为准，逐符号词边界复核引用、排除 barrel 出口 / 再导出 / 动态引用 / 同名驼峰与类型成员干扰后，分批删除未使用导入、类型绑定与低风险局部变量；C 类未使用参数（接口契约形参）一律未删。后端 `tsc --noEmit` 与前端 web typecheck 双 **exit 0**；核心引擎/安全/知识解析 5 文件 **83 pass / 0 fail / 228 expect**，聚合器/仓储/技能 unit 10 文件 **98 pass / 0 fail / 428 expect**。全量 eslint 复核：errors **1291 与基线持平**（无新增 error），warnings 3521 → **3438**；no-unused-vars 245 → **166**。本轮共改动 **66 个 src 文件**（routes 26 / aggregators 22 / core·repo·integration·knowledge·security 等 18）。剩余 B 类模块级常量表 / 状态 `let` / 前端 `.tsx` 项与 A 类本地定义死函数留待后续批次逐项甄别，未凭词法扫描直接删。

## 工具链版本与现场基线（本轮实测）
- Node v22.23.2 / Bun 1.2.0；后端根 TypeScript 6.0.2；前端 `web/` TypeScript 5.6.3。
- 起点 HEAD：`14bdad8a0f9deb08e2067799ea624ff1c7189ec2`；三远端（origin / gitcode / mirror）`refs/heads/consult-agent-m86` 逐字一致，0 领先 / 0 落后。
- 工作区：本轮真实改动 **66 个 src 文件**；另 2 个 CRLF 噪音 aggregator（lessonRecordAggregator / teachingOnlineAggregator）忽略行尾后内容差异 0 行，不暂存；探针 / 台账 / 历史切片 / `_rep18_*` 留痕均不入库。

## 清理口径冻结（逐项闭合证据）
1. eslint 报 unused → Grep 词边界 `\b符号\b` 计数复核；count=1 且仅出现在导入/定义行方可进入删除候选。
2. count>1 项逐处读出现位置，区分类型成员 / 注释 / 同名驼峰 / 回调解构干扰，不凭计数删。
3. 多行导入块：仅摘除未用成员，保留同行在用绑定；整行仅含未用绑定才删整行；type-only 绑定单独摘除。
4. 删除前确认无 `export { … }` 再导出、无 barrel 出口、无动态 / 字符串 / 反射引用；错误工厂删除后确认同组其他工厂仍在用、错误类导入未连带变未用。
5. 每批删除前后过后端 tsc + 受影响测试；eslint 复核确认点名 unused 消除、对照改动前基线 `_rep18_eslint.txt` 确认剩余 error 均为存量（行号仅因删行漂移）。

## 专项① A 类未使用导入 / 类型绑定清除
- **routes 第一批（11 文件，ErrorCode/fail 成对未用导入）**：admissionCheckin、billingCharge、dischargeSettle、learningFlywheel、orderVerify、pdaMedAdmin、pharmacyDispenseConfirm、pharmacyPrepack、pharmacyReturn、registerRefund、vitalsChart；移除未用 `ErrorCode` / `fail`，保留 json/ok/Ctx/RouteDef。
- **routes 第二批（13 文件，单项未用导入）**：antibioticDeep(IncisionClass)、emrQcKnowledgeV14(QC_KB_ENTRIES_V14)、emrQcStatDashboardV14(buildStatDashboard)、emrTermDictV14(lookupStandardTerm)、emrTrainingV14(TrainingQuestionV14)、integrationHl7(FHIRResource)、multimodality(Ctx)、museLesson(Ctx)、orderCds(listByOrderView)、patientPortalV2(listAdminNotifs)、qualitySafety(RootCause)、securityEmergencyV5(assessFireSafetyV5)、vitalsTrend(VitalsError)。
- **aggregators / core / repos / integration 纯导入摘除**：patientNotificationAggregator(withTx 整行)、QueryEngine(MedicalAgentError 整行)、HL7MessageTypes(HL7Segment 整行)、voiceMedicalAggregator(type Sql + getPatientById 整行)、agentRuntimeAggregator(MockRagRetriever)、smartTriageAggregator(getDb)、wormArchiveAggregator(type WormStore)、lakehouseEtl(type TransactionSql)、drugRepo(dynamicSelect/QueryBuilder，保留 toJson)、internetPaymentRepo(withTx)、prescriptionAudit(sourceTag)、specialExecutors(WorkflowCancelledError)、realInvoker(SkillInvocationResult)。
- **待定与 count>1 复核后清除**：amsAggregator(titleToMaxLevel/computeDdds)、apptAggregator(getApptById)、chatAggregator(MedicalRole)、labInterpretAggregator(LlmTransportError)、pharmacyDispenseTradeAggregator(OrderCpoeError)、rectificationAggregator(getTaskById)、risAggregator(getAppointmentById)、securityRecheckAggregator(USER_SECURITY_DIRECTORY)；frontPageAggregator(type Visit)、nursingEventReviewAggregator(type RiskLevel)、outpatientAggregator(type OrderType)、postopFollowupAggregator(type Timepoint)、greenChannelRepo(type ChannelNodeTemplate)、triageRepo(type Sql)、server.ts(metrics 绑定；recordHttpRequest/renderMetrics 保留)、buildMedicalTool(z；仅存于 JSDoc 示例注释，整行删除)。

## 专项② B 类低风险局部变量 / 解构 / 错误工厂清除
- **局部死变量与解构省略（9 处，右侧纯计算 / 无副作用）**：expression.ts 死变量 `two`（slice 无副作用，`three` 保留）；icuNotes.ts 未用辅助箭头函数 `num`；m559Routes.ts 两处 for-of 解构未用键 `key`/`nurseId` 改为省略位 `[, …]`；ToolExecutor.ts 未用 `startTime`（计时直接 `Date.now()`，未读）；knowledgeRegistry.ts 未用 `now`（`nowIso()` 纯 `toISOString()`，同文件 381/513 两处 `now` 在用保留）；DocumentParser.ts 未用 `ns`（`ne` 保留）；departmentOperationAnalysis.ts 未用 `bedChange`（`pctChange` 纯函数，`drugChange` 保留）；SessionManager.ts for-of 解构未用 `id` 改省略位。
- **未用错误工厂箭头函数（6 处，构造错误对象未抛出、无副作用；同组其他工厂均在用）**：agentRuntimeAggregator(badRequest)、costAttributionAggregator(badRequest)、empiAggregator(forbidden)、orderCdsAggregator(conflict)、patientBillingAggregator(notFound)、researchAggregator(forbidden)；对应错误类导入仍被同组在用工厂引用，保留未动。

## 保留日志甄别结论（5 处，本轮只读定性、不强行迁移）
| 位置 | 级别 | 定性 | 处置结论 |
|---|---|---|---|
| routes/adminBackup.ts:100 | warn | 备份旁路：部分表导出为空跳过，业务运维告警，非审计 / 安全留痕 | 可迁 `rootLogger.warn`，留待下一批日志批次 |
| routes/assistantLlmChat.ts:113 | warn | LLM 提供方警告透传回调，运行时告警 | 可迁 `rootLogger.warn`，留待日志批次 |
| routes/cryptoSignature.ts:46 | warn | **国密密码学降级告警**：sm-crypto 加载失败回退 sha256 占位 SM3，安全敏感降级信号 | **保留** `console.warn`：降级事件需独立可见，避免被结构化聚合掩盖；TODO 生产替换 HSM / USBKey / 合规商密 SDK 后再评估 |
| routes/doctorPreference.ts:87 | warn | fire-and-forget 后台重算异常告警，异步任务异常留痕 | 可迁 `rootLogger.warn`，留待日志批次 |
| routes/auditEvents.ts:70 | error | 审计查询路由 catch 失败日志，与上一轮已迁 64 routes 同类；非审计链写入留痕本身 | 可迁 `rootLogger.error`，留待日志批次；不视为审计哈希链写入动作 |

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit`（TS 6.0.2） | 0 error | 0 error（b3/b5/b6 三轮复核） | **0** |
| 前端 `bun run --cwd web typecheck`（TS 5.6.3） | 0 error | 0 error | **0** |
| 核心改动 5 文件（expression / ToolExecutor / SessionManager / knowledgeRegistry / departmentOperationAnalysis） | — | 83 pass / 0 fail / 228 expect | **0** |
| 聚合器 / 仓储 / 技能 unit 10 文件（QueryEngine / prescriptionAudit / realInvoker / chat / costAttribution / labInterpretation / patientBilling / research / securityRecheck / smartTriage） | — | 98 pass / 0 fail / 428 expect | **0** |
| 全量 eslint `src` | 4812 problems（1291 errors / 3521 warnings） | 4729 problems（**1291 errors 持平** / 3438 warnings） | **1**（存量规则） |
| no-unused-vars 清单 | 245（args 106 / vars-defined 86 / vars-assigned 53） | 166（args 106 未动；vars-defined 21 / vars-assigned 38 残留） | — |

- **error 存量对照**：本轮改动文件复核出的 5 个 error（chat nullish/empty-method、rectification nullish、ris nullish/optional-chain、icuNotes type-assertion ×4、registry nullish、agentRuntime enum-comparison/empty-function 等）已逐条对照改动前 `_rep18_eslint.txt`，全部为存量，行号仅因删行漂移；本轮未引入任何新 error。
- **未跑全量 unit**：当前非低峰，全量并行批次在 bun 1.2.0 web 误纳段易被回收、无原生汇总行；留待低峰串行复跑取原生 pass/fail。基线 16677 pass / 163 fail / 113 errors 中 163 fail + 113 errors 全为 web 目录误纳；上一轮 3 个并行串扰疑似后端文件（wormArchive / LLMClient / monitoring）单独复跑 67 pass / 0 fail，判定并行环境串扰偶发，本轮未改其源码。
- **测试隔离核查**：本轮改动 src 文件无 `process.env =` 写入（Grep 扫描 0 命中），未新增进程级 env 改写缺口；NODE_ENV / TRUST_PROXY / DATABASE_URL / WORM_* 还原钩子维持上一轮 #144 结论。

## 本轮未纳入、保留待后续批次
- **A 类本地定义死函数（17 个，非导入，删除需复核函数体依赖与外部引用）**：coverageFixAggregator round2、diagnoseDeepAggregator fnv1a、drugLifecycleAggregator todayStr、inpatientAssistantAggregator maxLevel、medicalRecordDeepAggregator round2、pharmacyMgmtAggregator isAntibiotic、qualityGateAggregator baseScoreOf、risRepo numOrNull、pipeline sectionPathAt、TextSplitter matchDrugSection、notify/notifyChannels isDemoMode、infectionDashboardAggregator listByDepartment；routes cryptoAssessCn isAssessDomain、m210/m257 handleOutpatientQueue、m551/m581 notFound。
- **B 类模块级常量表 / 状态 `let` / 局部变量（38 项 vars-assigned 残留）**：含 ABNORMAL_KINDS、SPEC_BY_KEY、NEXT_STATUS、IRRATIONAL_LABEL、PRAISE_LEXICON、SUPPORTED_TYPES、ORDER_TYPES、SPECIAL_BASE_COLS、LIST_FIELDS 等映射表（需确认无动态字符串索引 / 无再导出）；lastCheckedAt、oldKey/key 等状态 `let`（需连同赋值点一并清理）；settlementAnalyticsRepo 模块级 `db = getDb()` 需复核连接获取副作用。
- **C 类未使用参数 106 项**：接口契约签名，禁删形参；仅在可改签名处加 `_` 前缀。
- **前端 `.tsx` 未使用项 12 处**：ChatMessageList formatTime、LabResultPanel / MedicalRecordViewer / OrderListPanel / PatientInfoBar / StatusLine / CommandPalette / DepartmentManagementScreen / WardRoundScreen / AlertBanner / ToolCallDisplay / DashboardScreen / OutpatientScreen 等；改动需过 web typecheck，独立批次处理。
- 最新分类指针：改动后剩余 unused 明细可从 `_rep18_eslint_after.txt` 回溯；改动前基线 `_rep18_eslint.txt`；245 项结构化清单 `_rep18_unused.csv`；历史分级 `_rep16_deadcode_ast.md`。

## 红线复核（拍板 / 裁决前未擅动）
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点；审计链 seq 1647 断点复测仍需测试库授权与备份。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审。

## 遗留阻塞与待办（如实记录，未编造通过结论）
- **全量原生汇总待补**：低峰串行或降并发复跑后端 unit（排除 web）取原生 pass/fail，与基线 16677/163/113 逐项对比；复核 3 个并行串扰文件串行稳定性，若仍复现须定位根因，不得判偶发了之。
- **日志批次**：上述 4 warn + 1 error 中 4 处可迁项并入下一批 rootLogger 迁移；cryptoSignature 安全降级告警保留并标注。
- **工具链只读方案（不擅自升级）**：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A Windows afterEach pump 根因；web→TS6 先评估 antd5 / React19 / vitest 2.1.8 / typescript-eslint 8.15 兼容矩阵，独立分支取证。
- **Python 测试**：本机缺 pytest / fastapi / httpx 且无 venv，仅 py_compile 通过，待具备依赖环境复跑，严禁伪造 pytest 通过。
- **未入库产物**：本轮临时留痕 `_rep18_*`（eslint 基线/复核、tsc、unit、CSV）、历史 patrol 切片、schema 备份、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`scripts/_*.py` 不入库；2 个 CRLF 噪音 aggregator 未暂存。
