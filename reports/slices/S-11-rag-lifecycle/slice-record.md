# S-11 切片记录：RAG 知识生命周期基础

- **切片编号**：S-11
- **产品口径**：健澜AI原生医院操作系统OS
- **署名**：杭州健澜科技有限公司
- **基线仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`，基线 HEAD `1d0dc546e5d32e42dc8313d4601cb09a8f72abe6`
- **实现形态**：纯类型 + 纯函数 + 进程内存台账，离线闭环；不接 DB、不发起网络请求、不调用真实 Embedding；测试使用 demo 合成夹具，无院方实名、无明文端点、无密钥口令。

## 1. 目标与契约依据

### 1.1 技术文档章节（`docs/technical/YXS20261026-development-spec-2026-10-26.md`）

| 章节 | 行号 | 落地内容 |
|---|---|---|
| 3.3.2 知识域与知识块模型扩展（S-11） | 343–388 | 六知识域枚举；知识库扩展字段（`domain / ownerDepartment / approver / reviewCycleMonths / reviewDueAt / patientScope='none'`）；条目扩展字段（`effectiveDate / expireDate / securityLevel / owner / approver / approvedAt / specialty / origin / sectionTitle / pageRef / conflictGroup / versionRef`）；患者诊疗文档不入知识中台、相似病例索引归 S-13 独立建模 |
| 3.3.4 知识生命周期设计（S-11） | 402–417 | 状态机 `draft → pending_review → approved → expired / superseded / deprecated`；准入提交人填写来源 / 专科 / 适用范围 / 密级，责任人审批签字留痕；生效日期到达进入可检索、失效日期到达转历史；冲突分组人工确认保留 / 融合与版本链；按 `reviewCycleMonths` 到期评审，结论继续有效 / 修订 / 停用归档；历史病历绑定当时知识版本快照 |
| 3.3.6 验收标准（S-11、S-12、S-13） | 444–446 | 六域台账 CRUD 与单测；元数据六要素缺项入库拦截；过期知识不进入召回结果；准入审批留痕可查；既有知识中台测试不回归 |
| 台账 S-11 验收口径 | 1416 | 「RAG 生命周期基础：六域台账、元数据要素、生效期、准入留痕；缺字段拦截；过期不召回」 |

### 1.2 差距矩阵（`docs/research/YXS20261026-gap-matrix-2026-10-26.md`）

| 编号 | 行号 | 差距说明 | 本切片落地 |
|---|---|---|---|
| R-02 | 196 | 批量接入与 API 推送有雏形；文件夹监听（增量 watch）、定时增量同步任务、接入失败重试与告警台账未见 | 本切片只落地台账类型与准入 / 评审状态机；增量监听、定时同步与重试告警台账归后续采集批次（见第 7 节遗留项） |
| R-03 | 197 | 扫描件 OCR 链路与人工校对界面缺失；OFD 格式类型未补齐 | 本切片不做解析链路与校对界面，归 S-22 与前端 `knowledge-intake` 批次 |
| R-04 | 198 | 章节路径与来源溯源具备；机构、生效日期、专科、密级为自由 `metadata`，无类型约束与默认填充规则 | 条目类型化六要素字段 + `registerEntry` 入库前逐项校验，缺项拒绝登记（见 6.1 校验规则表） |
| R-05 | 199 | 结构化标量索引（科室 / 专科 / 密级 / 生效期 / 权威等级 / 类型精确过滤）无独立存储与结构化 schema | 本切片在召回清单提供六域 / 专科 / 密级 / 科室 / 知识库精确过滤口径；独立标量索引存储与双索引切换协议归 R-05 / 10.4 后续批次 |
| R-09 | 203 | 无准入审核流（谁提交、谁审批、签字留痕）；无生效 / 失效日期与过期自动转历史；无条目冲突检测；季度评审计划与记录未见持久化 | 准入留痕台账（提交人 / 审批人 / 适用范围 / 密级 / 用途 / 时间）；`effectiveDate / expireDate` 生效判定与 `scanExpired` 自动转历史；`conflictGroup` 分组与冲突标记；评审周期 `reviewDueAt` 推算、到期台账与三结论归档；持久化落库归后续批次 |
| 台账 S-11 | 356 | 六知识域台账；接入增量监听；OFD/OCR 解析与人工校对；切分元数据六要素类型化；结构化标量索引；生效 / 失效期 + 准入签字 + 冲突版本链 + 季度评审；双索引切换；历史知识版本快照 | 本切片交付六域台账、六要素类型化拦截、准入签字留痕、生效 / 失效与过期不召回、冲突分组与版本链、季度评审、历史版本快照检索；其余子项按台账登记分批（见第 7 节） |

### 1.3 切片边界（本切片明确不做）

- OFD / OCR 解析链路与人工校对界面（R-03 / S-22）；
- 文件夹增量监听与定时同步任务、接入失败重试告警台账（R-02 增量部分）；
- 结构化标量索引独立存储与双索引切换（R-05 / 10.4）；
- 混合检索重排模型接入、跨文档去重与阈值拒答协议（R-06 / S-12）；
- 前端知识生命周期页面、管理台台账持久化落库；
- 患者级隔离索引实现（S-13）：本切片仅在类型模型固定 `patientScope='none'` 并拦截患者标识字段；
- 引用编号协议与前端原文锚点弹窗（R-07 / S-12）。

## 2. 输入输出契约

### 2.1 输入（本切片只读消费，不改动语义）

- 既有 `src/knowledge-platform/types.ts`（`KnowledgeBase / RawDocument / KnowledgeChunk / RetrievalHit / SourceProvenance / VersionManager / TermEntry`）：新类型与之并存，不回改既有接口、不破坏既有存储。
- 既有 `src/knowledge-platform/retrieval/hybrid.ts`、`src/knowledge-platform/version/VersionManager.ts`、`src/knowledge-platform/service/KnowledgeService.ts`、`src/knowledge-platform/terminology/TerminologyService.ts`：只读参照，未修改。
- 既有 `src/knowledge/` 运行时（`KnowledgeBaseManager / RetrievalEngine / TextSplitter / VectorStore / searchMedicalKnowledge / medicalRecordQc`）：未改动，其测试断言保持原样。
- 既有 S-08 审计事件模型：知识版本号 `versionRef` 供后续四维留痕绑定，本切片不解析审计事件。

### 2.2 输出（本切片新增公共符号，经 `src/knowledge-platform/lifecycle/index.ts` 与 `src/knowledge-platform/index.ts` 双桶挂接）

**类型**：`KnowledgeDomain`、`SecurityLevel`、`KnowledgeStatus`、`KnowledgeReviewConclusion`、`KnowledgeReviewResult`、`ProvenanceRef`、`KnowledgeChangeEntry`、`KnowledgeReviewEntry`、`KnowledgeBaseMeta`、`KnowledgeEntry`、`KnowledgeAdmissionRequest`、`AdmissionTrailRecord`、`RetrievalFilter`。

**错误码常量**：`KB_ERROR_VALIDATION='KB-001'`（元数据必填 / 枚举 / 结构校验未通过）、`KB_ERROR_DUPLICATE_ID='KB-002'`（重复 id）、`KB_ERROR_INVALID_TRANSITION='KB-003'`（状态机非法迁移，错误信息含合法出边提示）、`KB_ERROR_MISSING_ELEMENT='KB-004'`（条目六要素缺项入库拦截）、`KB_ERROR_PATIENT_SCOPE='KB-005'`（患者标识污染 / `patientScope` 非法）、`KB_ERROR_NOT_FOUND='KB-006'`（操作对象不存在）。

**纯函数**：`validateKnowledgeBaseMeta(meta)`（返回中文错误信息数组，空数组 = 通过）；`validateKnowledgeEntry(entry, lookupBaseOwnerDepartment?)`（六要素 + 结构校验，返回中文错误信息数组）。

**类**：`KnowledgeLifecycleRegistry`，方法 `registerBase` / `registerEntry` / `submitForReview` / `approve` / `reject` / `deprecate` / `supersede` / `isActive` / `scanExpired` / `listActiveForRetrieval` / `listConflictGroup` / `flagConflict` / `listReviewDue` / `recordReview` / `listAdmissionTrail` / `getEntryByVersion` / `getBase` / `getEntry`。

**单例**：`getKnowledgeLifecycleRegistry()`、`_resetKnowledgeLifecycleRegistry()`（测试重置）。

### 2.3 状态与留痕口径

- 台账为进程内存 `Map`；所有回读方法返回深拷贝，外部修改不影响内部状态。
- 准入留痕记录提交人、审批人、审批时间、适用范围、密级、用途、状态与提交时间；条目留痕密级取条目 `securityLevel`，知识库留痕密级缺省 `internal`；条目留痕经所属知识库映射知识域供按域检索。
- 知识库 `reviewCycleMonths` 缺省 3；`approve` 时按 `approvedAt + reviewCycleMonths` 推算 `reviewDueAt`。
- 版本快照：被替代 / 过期历史条目仍可按 `versionRef` 检索，供历史病历四维留痕引用，但不进入 `listActiveForRetrieval`。

## 3. 新增 / 修改文件清单（实测行数与字节）

| 操作 | 路径 | 行数 | 字节 | 说明 |
|---|---|---:|---:|---|
| 新增 | `src/knowledge-platform/lifecycle/knowledgeRegistry.ts` | 758 | 31773 | 类型契约、两个校验纯函数、`KnowledgeLifecycleRegistry`（六域台账 / 六要素拦截 / 状态机 / 准入留痕 / 生效失效 / 冲突分组 / 评审周期 / 版本快照）、单例与错误码常量 |
| 新增 | `src/knowledge-platform/lifecycle/index.ts` | 8 | 217 | `export * from './knowledgeRegistry.js'` |
| 修改 | `src/knowledge-platform/index.ts` | 46 | 1940 | 末尾追加 `export * from './lifecycle'`；既有 13 条导出与 `MEDICAL_DISCLAIMER` 保持不变 |
| 新增 | `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts` | 496 | 22741 | bun:test 单测，8 个 describe 共 24 例 |
| 新增 | `reports/slices/S-11-rag-lifecycle/slice-record.md` | 193 | 22556 | 切片记录（含六要素校验规则表、状态机迁移表、遗留风险与 S-12 / S-13 建议） |

> 未改动：`src/knowledge-platform/types.ts`、`retrieval/hybrid.ts`、`version/VersionManager.ts`、`service/KnowledgeService.ts`、`terminology/TerminologyService.ts`、`src/knowledge/` 运行时全部源码、9 份知识 / 编排既有测试、3 份安全域测试，以及 S-02 / S-03 / S-04 / S-06 / S-08 全部源码与测试；未新增任何依赖。

## 4. 测试清单与结果

### 4.1 新增测试（S-11）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts` | 24 | 0 | 90 | 1045 ms | `logs/s11-lifecycle-test-20261026-2208.log` |

覆盖用例分组：

- **六域台账**：六类 `domain` 各登记一条可按 id 回读；非法 `domain` 拒绝；重复 id 在知识库与条目命名空间内均拒绝；召回清单按 `domain / specialty / securityLevel / ownerDepartment / knowledgeBaseId` 精确过滤。
- **六要素拦截**：来源 `sourceId / sourceName / fetchedAt`、章节 `sectionTitle`、机构（`origin.publisher` 或知识库 `ownerDepartment`）、生效日期 `effectiveDate`、专科 `specialty`、密级 `securityLevel` 缺项分别拒绝，错误信息含要素名；患者标识字段（`patientId / visitId / partitionKey / patientScopeId / medicalRecordNo`）携带即拒绝；`patientScope` 非 `'none'` 拒绝；校验失败不写入台账。
- **状态机**：`draft → pending_review → approved` 合法迁移；`approve` 写 `approver / approvedAt` 并追加变更记录；`pending_review → draft` 退回修订并标注 `rejected`；非法迁移抛 `KB-003` 且含合法出边提示；终态不可再迁；`supersede` 新旧版本链双向可溯（旧版本 `supersededBy` 指新版本，新版本 `changeLog[0].parentVersionRef` 指旧版本）。
- **生效 / 失效与召回**：未生效条目不在召回清单；到期条目经 `scanExpired` 转 `expired` 且不在召回清单；`superseded / deprecated` 不在召回清单；过滤器组合正确；无匹配返回空数组；`isActive` 口径为 `approved` + 已生效 + 未到期。
- **冲突分组**：同组多条 `approved` 条目进入 `listConflictGroup`；`flagConflict` 评审结论写入 `reviewHistory` 并可回读。
- **季度评审**：`approve` 后 `reviewDueAt` 按 3 个月推算；`listReviewDue` 命中到期台账；`recordReview` 三结论分别顺延（`continue`）、退回 `draft`（`revise`）、停用 `deprecated`（`retire`）。
- **准入留痕**：提交人、审批人、适用范围、密级、用途可按审批人 / 时间窗 / 知识域检索；未审批条目 `approver` 为空。
- **版本快照与深拷贝隔离**：被替代历史条目可按 `versionRef` 检索且不出现在 active 召回；返回对象为深拷贝，外部修改不影响台账内部状态。

### 4.2 既有回归（数字不劣化，未修改这些测试与对应源码；2208 批次全部 exit=0）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/orchestrator/engine.test.ts` | 16 | 0 | 36 | 1010 ms | `logs/s11-regression-tests-unit-orchestrator-engine-20261026-2208.log` |
| `tests/unit/orchestrator/e2e.test.ts` | 2 | 0 | 8 | 1052 ms | `logs/s11-regression-tests-unit-orchestrator-e2e-20261026-2208.log` |
| `tests/unit/ragTuningV5.test.ts` | 5 | 0 | 8 | 923 ms | `logs/s11-regression-tests-unit-ragTuningV5-20261026-2208.log` |
| `tests/unit/knowledge/KnowledgeBaseManager.test.ts` | 6 | 0 | 15 | 971 ms | `logs/s11-regression-tests-unit-knowledge-KnowledgeBaseManager-20261026-2208.log` |
| `tests/unit/knowledge/RetrievalEngine.test.ts` | 9 | 0 | 21 | 1050 ms | `logs/s11-regression-tests-unit-knowledge-RetrievalEngine-20261026-2208.log` |
| `tests/unit/knowledge/TextSplitter.test.ts` | 10 | 0 | 27 | 878 ms | `logs/s11-regression-tests-unit-knowledge-TextSplitter-20261026-2208.log` |
| `tests/unit/knowledge/VectorStore.test.ts` | 14 | 0 | 17 | 922 ms | `logs/s11-regression-tests-unit-knowledge-VectorStore-20261026-2208.log` |
| `tests/unit/knowledge/searchMedicalKnowledge.test.ts` | 9 | 0 | 23 | 1042 ms | `logs/s11-regression-tests-unit-knowledge-searchMedicalKnowledge-20261026-2208.log` |
| `tests/unit/knowledge/medicalRecordQc.test.ts` | 12 | 0 | 29 | 932 ms | `logs/s11-regression-tests-unit-knowledge-medicalRecordQc-20261026-2208.log` |
| `tests/unit/security/audit.test.ts` | 19 | 0 | 34 | 1225 ms | `logs/s11-regression-tests-unit-security-audit-20261026-2208.log` |
| `tests/unit/security/outputGuard.test.ts` | 18 | 0 | 40 | 1032 ms | `logs/s11-regression-tests-unit-security-outputGuard-20261026-2208.log` |
| `tests/unit/security/aiAudit.test.ts` | 21 | 0 | 85 | 989 ms | `logs/s11-regression-tests-unit-security-aiAudit-20261026-2208.log` |

> 说明：9 份知识 / 编排测试与 3 份安全域测试复跑数字与基线逐项一致；桶文件追加 `export * from './lifecycle'` 未造成类型或行为回归；未删用例、未改既有断言换绿灯。

## 5. 双 tsc 门禁

| 门禁 | 命令（工作目录） | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit`（仓库根） | 0 | `logs/s11-tsc-root-20261026-2208.log` | 0 |
| web tsc | `bun x tsc --noEmit`（`web/` 目录） | 0 | `logs/s11-tsc-web-20261026-2208.log` | 0 |

> 过程留痕：首轮根 tsc 退出码 2（`logs/s11-tsc-root-20261026-2203.log`，3345 字节），原因为判别联合 `KnowledgeBaseMeta | KnowledgeEntry` 上访问单侧字段（`securityLevel / reviewDueAt / reviewCycleMonths / updatedAt`）触发 TS2339；改为 `ResolvedTarget` 判别联合并为条目补可选 `updatedAt` 后复跑清零（`logs/s11-tsc-root-20261026-2204.log` 0 字节）。新测试首轮 22 pass / 2 fail / 87 expect（`logs/s11-lifecycle-test-20261026-2205.log`）：① 评审 `revise` 退回目标状态与 `submitForReview` 前置条件不一致，改为 `approved → draft`；② 准入留痕按域检索时条目记录未携带所属知识库 `domain`，补 `AdmissionTrailRecord.domain` 字段并在提交时映射；修复后 2206 批次全绿，最终门禁以 2208 两份 0 字节日志与 `s11-lifecycle-test-20261026-2208.log` 为准。

## 6. 附录

### 6.1 元数据六要素校验规则表（3.3.2 第 366–367 行 / 3.3.6 第 446 行 / R-04 第 198 行）

| # | 要素 | 字段 | 校验口径 | 错误码 |
|---:|---|---|---|---|
| 1 | 来源 | `origin.sourceId` | 非空字符串 | `KB-004` |
| 1 | 来源 | `origin.sourceName` | 非空字符串 | `KB-004` |
| 1 | 来源 | `origin.fetchedAt` | 非空字符串（获取 / 更新时间） | `KB-004` |
| 2 | 章节 | `sectionTitle` | 非空字符串 | `KB-004` |
| 3 | 机构 | `origin.publisher` 或关联知识库 `ownerDepartment` | 二者至少一项非空；条目登记时按 `knowledgeBaseId` 回查所属知识库兜底 | `KB-004` |
| 4 | 生效日期 | `effectiveDate` | 非空且 `Date.parse` 合法；非法日期格式按 `KB-001` 报错 | `KB-004` / `KB-001` |
| 5 | 专科 | `specialty` | 非空字符串数组 | `KB-004` |
| 6 | 密级 | `securityLevel` | 枚举 `public / internal / confidential / restricted` 之一 | `KB-004` |

> 附加结构校验：`id / knowledgeBaseId / title / owner / content / versionRef` 非空；`status` 为状态机合法状态；`approved` 状态必须有 `approver` 与 `approvedAt`；`patientScope` 固定 `'none'`；条目携带 `patientId / visitId / partitionKey / patientScopeId / medicalRecordNo` 任一字段即按 `KB-005` 拒绝。

### 6.2 状态机迁移表（3.3.4 第 405–409 行）

| 现态 | 合法出边 | 触发动作 | 留痕口径 |
|---|---|---|---|
| `draft` | `pending_review` | `submitForReview(id, submitter, scopeSummary, intendedUse)` | 写准入留痕台账（提交人 / 适用范围 / 密级 / 用途 / 提交时间）；变更记录入 `changeLog` |
| `pending_review` | `approved` | `approve(id, approver)` | 写 `approver / approvedAt`；知识库自动推算 `reviewDueAt`；回填留痕审批人 / 审批时间 / 状态；变更记录标注 `approved` |
| `pending_review` | `draft` | `reject(id, reviewer, note)` | 变更记录标注 `rejected`；留痕状态回 `draft` |
| `approved` | `deprecated` | `deprecate(id, operator, reason)` | 变更记录写明停用归档原因 |
| `approved` | `superseded` | `supersede(id, newEntry, operator)` | 旧版本写 `supersededBy`；新版本入库并在 `changeLog` 首条写 `parentVersionRef`，双向版本链可溯 |
| `approved` | `expired` | `scanExpired(now?)` | 到达 `expireDate` 自动转历史；变更记录写明失效日期；不参与召回 |
| `expired` | 终态，不可再迁 | — | — |
| `superseded` | 终态，不可再迁 | — | — |
| `deprecated` | 终态，不可再迁 | — | — |

> 评审驱动迁移（`recordReview`）：`approved → draft`（`revise`，退回修订）、`approved → deprecated`（`retire`，评审停用）；`continue` 仅顺延知识库 `reviewDueAt`，不迁移状态。非法迁移抛 `[KB-003]`，错误信息含当前状态合法出边提示。

### 6.3 召回过滤口径（3.3.4 生效 / 失效；R-05 第 199 行）

`listActiveForRetrieval(filter, now?)` 仅返回 `isActive` 为真的条目：`status='approved'`、`now ≥ effectiveDate`、无 `expireDate` 或 `now < expireDate`；过期、被替代、停用、未生效条目一律不出现在结果。过滤器：`knowledgeBaseId` / `securityLevel` 条目级精确匹配；`specialty` 包含匹配；`domain` / `ownerDepartment` 经所属知识库映射精确匹配；无匹配返回空数组。

## 7. 遗留风险与后续建议

### 7.1 本切片已预留但未闭环项（不谎称通过）

1. **增量采集接入（R-02，196 行）**：文件夹监听钩子、定时增量同步任务、接入失败重试计数与告警台账未实现；本切片仅提供台账类型与状态机底座，接入器扩展归后续采集批次。
2. **OFD / OCR 解析与人工校对（R-03，197 行；S-22）**：扫描件 OCR 链路、OFD 格式类型、解析失败人工校对队列与前端校对界面未实现；依赖外部组件选型验证，归 S-22 与前端 `knowledge-intake` 批次。
3. **结构化标量索引独立存储（R-05，199 行；10.4 双索引切换）**：本切片过滤口径在内存台账内完成；独立标量索引存储、向量 / 标量双索引并行与切换协议、旧索引回滚窗口归后续批次。
4. **台账持久化落库**：本切片为进程内存台账；知识库 / 条目 / 留痕 / 评审记录持久化到既有 `JsonFileStore` 口径或 DB 仓储、接入失败重试与周期巡检归后续 BFF / 数据层批次。
5. **前端生命周期页面**：六域台账浏览、准入审批台、冲突人工确认界面、评审到期提醒页归后续前端批次；本切片只落后端类型、服务方法与单测。
6. **患者级隔离索引（R-08 / S-13）**：本切片在类型层固定 `patientScope='none'` 并拦截患者标识字段；相似病例患者级索引、强制就诊标识过滤、跨患者召回拒绝与越权审计测试归 S-13 专项。
7. **引用编号协议（R-07 / S-12）**：`versionRef` / `origin` / `sectionTitle` / `pageRef` 已按溯源字段留存；正文 `[n]` 编号协议、`Citation` 结构与前端锚点弹窗归 S-12。
8. **历史病历版本快照绑定**：`getEntryByVersion` 已提供历史版本检索能力；历史生成记录与生成当时知识版本快照的强制绑定、四维留痕导出联动归 S-08 / S-12 联调批次。

### 7.2 对 S-12（检索质量闭环）的接口预留建议

- `listActiveForRetrieval` 过滤器可直接挂接 `hybrid.ts` 结构化标签前置过滤；建议 S-12 将 `domain / specialty / securityLevel / ownerDepartment / knowledgeBaseId` 精确条件下沉到向量路与关键词路召回之前。
- `versionRef` 与 `origin` 字段可直接映射 S-12 `Citation` 的 `chunkId / sourceName / effectiveDate`；冲突分组 `conflictGroup` 可作为跨文档相似片段归并的分组键。
- 过期 / 被替代 / 停用条目已保证不进入召回；S-12 落地阈值拒答协议时可复用本切片 `isActive` 口径作为无依据提示前置条件。

### 7.3 对 S-13（患者数据隔离专项）的接口预留建议

- 条目类型已拒绝 `patientId / visitId / partitionKey / patientScopeId / medicalRecordNo` 字段并固定 `patientScope='none'`；建议 S-13 在接入校验层（IngestGuard）复用本切片污染字段清单，对进入知识中台的患者诊疗文档统一拦截。
- 相似病例索引独立建模时建议另立 `SimilarCaseIndex` 类型与 `scope='patient-isolated'` 口径，不与本切片通用知识库台账混用。

### 7.4 工程自检记录

- TypeScript strict、ESM、`@/*` 别名 + `.js` 后缀；未新增依赖（仅使用语言内置 `structuredClone` 与既有类型模块）。
- 本地开发态未执行 `git add / commit / push / tag`；未删除用户源码；未移动 / 重命名既有文件；未清理历史 backlog；未改动未点名既有路由 / 页面 / 挂载 / 权限码 / 函数签名。
- 代码 / 测试 / 日志 / 文档无真实密码、token、密钥与明文端点；测试夹具为合成演示数据，无院方实名；日志不含大段患者文本。
