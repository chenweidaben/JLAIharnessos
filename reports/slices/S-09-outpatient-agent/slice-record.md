# S-09 切片记录：门诊病历智能体包与离线运行时规则

- **切片编号**：S-09
- **产品口径**：健澜AI原生医院操作系统OS
- **署名**：杭州健澜科技有限公司
- **基线仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`，基线 HEAD `0adeb7a60bee53e7fcd011eb48308756a7ebe21b`
- **实现形态**：独立声明包 + 纯类型 + 纯函数 + 进程内存态离线运行器；不接 DB、不连 Redis、不发起网络请求、不调用真实 LLM、不调用真实 ASR 与向量相似度；测试使用合成夹具，无院方实名、无明文端点、无密钥口令。

## 1. 目标与契约依据

### 1.1 技术文档章节（`docs/technical/YXS20261026-development-spec-2026-10-26.md`）

| 章节 | 行号 | 落地内容 |
|---|---|---|
| 4.2.1 场景定位 | 790–792 | 面向门诊医师，将医患对话与既有门诊资料转化为结构化初稿；覆盖初诊、复诊；提供鉴别诊断方向与检查建议并标注依据；实时要素质控；门诊/住院共用解读组件；风险等级 `medium`，医师确认后回写 |
| 4.2.2 输入 | 794–801 | 患者上下文、对话素材、历史资料、知识素材四类输入；患者实时资料由工具节点获取，不预入通用知识库 |
| 4.2.3 工作流 DAG | 803–822 | 意图分流 → 取患者档案 → 取既往与近期资料 → 指南检索 → 对话归一 → 大纲 → 分节生成 → 实时质控 → 输出防护 → 人工复核 → 回写 → 事件预留；问题回退修订最多 2 次 |
| 4.2.4 工具集与知识绑定 | 824–827 | 8 个工具、4 个知识域；工具风险等级与频次配额沿用 S-06 `ToolBinding` 口径声明 |
| 4.2.5 输出 Schema | 829–846 | `encounterKind`、主诉、现病史、既往史、查体、辅助检查、诊断条目、建议条目、缺项清单、引用清单与证据级别 |
| 4.2.6 验收要点 | 848–850 | 初诊/复诊分流正确；诊断与检查建议每条挂引用；无依据结论标注待核实；缺项清单完整；时间线与事实快照一致；解读组件单一实现；覆盖注入、越权取数、确定性表述红线、Schema 失败重试降级 |

### 1.2 差距矩阵（`docs/research/YXS20261026-gap-matrix-2026-10-26.md`）

| 编号 | 行号 | 差距说明 | 本切片落地 |
|---|---|---|---|
| C-01 | 246 | 门诊病历智能体缺独立声明包、工作流 DAG、说话人分离接入预留、初诊/复诊分流、实时要素链质控与门诊/住院共用解读组件；鉴别诊断依据标注协议需标准化 | 落地独立 `medical-record-outpatient` 声明包、离线运行时规则模块、五规则实时质控、S-12 引用编号强制校验、共用解读组件；ASR 供应商对接仅留接入点与合成夹具 |
| S-09 | 354 | 独立声明包 + 工作流 DAG + 门诊/住院共用解读组件抽取；验收口径为声明包通过 DSL 校验、要素链质控规则测试、解读组件复用门诊住院两侧；依赖 S-04、S-05、S-12；说话人分离 ASR 供应商对接属环境依赖 | 声明包经 DSL 结构与语义校验；9 例 QC 正反用例；共用组件 5 例单测证明门诊流程可调用、住院侧 S-10 可直接复用；未越界实现 ASR、真实 RAG、真实工具接线与事件总线挂载 |

### 1.3 切片边界（本切片明确不做）

- 说话人分离 ASR 供应商、语音转写通道与真实语音采集页面；
- 真实 HIS/EMR、药典、ICD 字典、指南知识库与 RAG 召回链路接线；
- BFF HTTP 路由、门诊工作台页面、前端引用弹窗与人工复核界面；
- 事件总线真实挂载、审计事件持久化落库与数据库连接；
- `agents/manifest.json` 目录清单登记；catalog 挂载归后续 BFF/前端批次；
- S-10 住院病历包、S-05 编排持久化协议与真实 RBAC 会话解析。

## 2. 输入输出契约

### 2.1 只读复用模块（未回改源码与测试断言）

- **S-01 输出校验**：`src/security/ai/types.ts` 复用 `EvidenceLevel`、`FactSnapshot`、`CitationRef`、`OutboundContext`、`OutboundVerdict`、`AgentRole`、`AgentRiskLevel`；`src/security/ai/outputGuard.ts` 复用 `guardOutbound(ctx)` 与 `OutboundGuardConfig`。门诊文书角色为 `writer`，风险等级为 `medium`。
- **S-06 准入**：`src/bff/agents/agentAdmission.ts` 复用 `AgentRecord`、`ToolBinding`、风险-复核角色匹配口径；只读工具 6 个、写工具 2 个，写工具须医生角色与知情同意确认。
- **S-11 知识台账**：`src/knowledge-platform/lifecycle/knowledgeRegistry.ts` 知识域枚举；本包绑定 `writing-standard`、`clinical-guide`、`data-standard`、`hospital-policy`。
- **S-12 引用协议**：`src/knowledge-platform/citation/citationProtocol.ts` 复用 `Citation`、`buildNoEvidenceAnswer`、引用标记提取与证据级别口径；诊断方向、检查建议、用药建议必须挂载引用编号。
- **S-13 患者隔离**：`src/knowledge-platform/isolation/patientIsolation.ts` 口径对齐；患者诊疗文档不预入通用知识库，门诊上下文由工具节点按患者/就诊标识实时调取。
- **编排 DSL**：`src/orchestrator/dsl/types.ts` 12 类节点类型、`AgentDefinition`、`WorkflowDefinition`、`NodeDefinition`、`EdgeDefinition`、`ValidationResult`；声明包节点与边集合严格对齐既有枚举与校验规则。

### 2.2 门诊草稿 Schema（对齐 4.2.5 第 833–845 行）

| 字段 | 类型 | 口径 |
|---|---|---|
| `encounterKind` | `'initial' \| 'follow-up'` | 初诊/复诊文书流；`renewal`、`lab-review` 归入 `follow-up` 文书流并在分流原因中标注 |
| `chiefComplaint` | `string` | 主诉；缺失由 QC 阻断 |
| `presentIllness` | `string` | 现病史，须覆盖主诉核心症状与发病经过 |
| `historyIllness` | `string` | 既往史、慢性病、手术史、过敏史与用药史摘要 |
| `physicalExam` | `string` | 查体；仅转录资料已有体征，不虚构 |
| `auxiliaryExams` | `string` | 辅助检查结论、报告日期与出处 |
| `diagnosis` | `DiagnosisEntry[]` | `code`、`name`、`certainty: 'likely' \| 'possible' \| 'differential'`；禁止 `certain` 等确定性枚举 |
| `suggestions` | `SuggestionEntry[]` | `kind: 'exam' \| 'medication' \| 'referral' \| 'follow-up'`；`content`、`citations: string[]`、`basisNote`；`exam`/`medication` 建议必须挂引用编号 |
| `missingInfo` | `string[]` | 初诊/复诊缺项清单与 Schema 错误清单 |
| `citations` | `Citation[]` | S-12 引用清单；由草稿与建议引用编号交叉校验 |
| `evidenceLevel` | `'supported' \| 'partial' \| 'none'` | 与引用数量、缺项数量保持一致；无引用不得记为 `supported` |

### 2.3 运行器状态与人工决策口径

- **修订上限**：`MAX_REVISIONS = 2`；Schema 失败、QC 阻断、人工退回累计进入修订计数；超限状态为 `revised-twice-and-held`，只产出缺项骨架，不返回伪造完整稿。
- **人工决策**：`adopted` → 回写草稿；`modified` → 人工修改稿先过 Schema 校验再走 Guard；`rejected` → 状态 `rejected`；`returned-for-revision` → 回到修订计数内，超限转挂起。
- **写路径三重校验**：角色必须为 `doctor`；`consentConfirmed === true`；`patientId`、`visitId` 均存在；任一不满足即阻断并记 `UNAUTHORIZED_WRITE` 审计条目。
- **离线降级**：未注入工具适配器时，只读工具返回空合成占位并在审计台账标注 `degraded-offline`；离线未注入写工具时记 `draft-written-offline`，不接真实 EMR 回写接口。

### 2.4 共用解读组件契约

- `ClinicalInterpretationInput`：`reportKind: 'lab' | 'imaging' | 'exam'`、条目清单、`focus`、`audience: 'doctor' | 'patient'`、引用清单。
- `ClinicalInterpretationResult`：摘要、异常发现、危急值清单、建议、固定免责声明、引用清单与证据级别。
- 固定免责声明：`本解读为辅助参考，不作为诊断依据；请以执业医师判断为准。`
- 无引用时 `evidenceLevel='none'`，摘要前缀追加「（待核实）」；医生版使用专业复核措辞，患者版使用通俗温和措辞并包含「请勿自行判断」口径。

## 3. 新增 / 修改文件清单（实测行数与字节）

| 操作 | 路径 | 行数 | 字节 | 说明 |
|---|---|---:|---:|---|
| 新增 | `src/bff/agents/outpatient/types.ts` | 218 | 7292 | 门诊场景类型契约：意图、对话分段、归一结果、时间线、诊断/建议条目、草稿、QC 发现、人工决策、运行结果、审计条目与适配器类型 |
| 新增 | `src/bff/agents/outpatient/intentClassifier.ts` | 104 | 4297 | 规则 + 可选模型判定的意图分流；`renewal`/`lab-review` 映射 `follow-up`；非法模型判定回退规则 |
| 新增 | `src/bff/agents/outpatient/dialogueNormalizer.ts` | 152 | 5533 | 去口语化、术语展示归一、相对时间解析、时间线排序、初诊/复诊必备章节缺项挂起 |
| 新增 | `src/bff/agents/outpatient/qcRealtime.ts` | 312 | 11844 | 五条实时 QC 规则；主诉规则剥离时间词与修饰词后匹配核心症状；复制粘贴阈值 80 字；合成用药字典粗匹配 |
| 新增 | `src/bff/agents/outpatient/draftSchema.ts` | 275 | 10577 | `validateOutpatientDraft`、`buildOutpatientDraft`、证据级别推导、无依据段装配与待核实标记 |
| 新增 | `src/bff/agents/outpatient/outpatientWorkflow.ts` | 444 | 18580 | 离线内存运行器：DAG 编排、工具适配器注入、Guard 调用、修订上限、人工四决策、写路径校验、审计台账与事件预留 |
| 新增 | `src/bff/agents/outpatient/index.ts` | 15 | 459 | 门诊模块聚合导出 |
| 新增 | `src/bff/agents/shared/clinicalReportInterpretation.ts` | 155 | 6396 | 门诊/住院共用单一报告解读组件；S-10 禁止重复实现 |
| 新增 | `src/bff/agents/shared/index.ts` | 10 | 286 | 共用模块聚合导出 |
| 修改 | `src/bff/agents/index.ts` | 19 | 725 | 末尾纯追加 `export * from './outpatient/index.js'` 与 `export * from './shared/index.js'`；既有 4 条导出原位保留 |
| 新增 | `agents/medical-record-outpatient/agent.yaml` | 277 | 10132 | `medical-record-outpatient` 声明包、`outpatient-main` 工作流、8 工具、4 知识域、18 个 DAG 节点与主路径/修订回退边集合 |
| 新增 | `agents/medical-record-outpatient/README.md` | 63 | 3727 | 包说明、风险等级、人工确认、工具/知识绑定、环境依赖边界 |
| 新增 | `agents/medical-record-outpatient/prompts/system.md` | 47 | 3144 | 门诊系统提示词：资料边界、引用强制、禁止确定性表述、身份一致与免责口径 |
| 新增 | `agents/medical-record-outpatient/examples/input.json` | 46 | 1216 | 合成演示输入：`patient-demo-001`、`visit-demo-001`、分段对话与事实快照占位 |
| 修改 | `src/orchestrator/pack/directoryLoader.ts` | 149 | 5435 | 新增 manifest 清单门控：清单存在时仅加载登记目录，未登记独立包跳过；清单缺失回退全量扫描；`agents/manifest.json` 本身未修改 |
| 新增 | `tests/unit/bff/agents/outpatient/fixtures.ts` | 66 | 2230 | 合成事实快照、引用清单、对话分段与工作流入参装配夹具 |
| 新增 | `tests/unit/bff/agents/outpatient/intentClassifier.test.ts` | 82 | 3283 | 7 例意图分流正反用例 |
| 新增 | `tests/unit/bff/agents/outpatient/dialogueNormalizer.test.ts` | 73 | 2882 | 6 例对话归一、时间线与缺项清单用例 |
| 新增 | `tests/unit/bff/agents/outpatient/qcRealtime.test.ts` | 124 | 5189 | 9 例五条 QC 规则正反用例，含修饰词误报回归用例 |
| 新增 | `tests/unit/bff/agents/outpatient/draftSchema.test.ts` | 106 | 4149 | 10 例 Schema、引用、证据级别与待核实标记用例 |
| 新增 | `tests/unit/bff/agents/outpatient/outpatientWorkflow.test.ts` | 225 | 9458 | 12 例工作流集成：主路径、S-01 红线、Schema 降级、越权阻断、人工四决策 |
| 新增 | `tests/unit/bff/agents/outpatient/agentPackage.test.ts` | 107 | 3986 | 4 例声明包元数据、工具/知识绑定、DAG 覆盖与 DSL 校验；以 `import.meta.url` 上溯五级解析仓库根 |
| 新增 | `tests/unit/bff/agents/shared/clinicalReportInterpretation.test.ts` | 91 | 3990 | 5 例共用解读组件医生/患者双版本、危急值、无引用证据与结构稳定性用例 |
| 新增 | `reports/slices/S-09-outpatient-agent/slice-record.md` | 237 | 27477 | 本切片记录 |

> 未改动：`agents/manifest.json`、`src/orchestrator/dsl/*`、既有 `agents/*` 包、既有 BFF 路由、既有前端页面、S-01/S-06/S-11/S-12/S-13 源码与既有测试断言、30 份基线回归测试；未新增第三方依赖，`package.json` 与锁文件无差异。

## 4. 测试清单与结果

### 4.1 新增测试（S-09，7 份，合计 53 pass / 0 fail / 155 expect）

| 测试文件 | pass | fail | expect | 日志 |
|---|---:|---:|---:|---|
| `tests/unit/bff/agents/outpatient/agentPackage.test.ts` | 4 | 0 | 29 | `logs/s09-agentPackage-20261026-2327.log` |
| `tests/unit/bff/agents/outpatient/dialogueNormalizer.test.ts` | 6 | 0 | 18 | `logs/s09-dialogueNormalizer-20261026-2327.log` |
| `tests/unit/bff/agents/outpatient/draftSchema.test.ts` | 10 | 0 | 21 | `logs/s09-draftSchema-20261026-2327.log` |
| `tests/unit/bff/agents/outpatient/intentClassifier.test.ts` | 7 | 0 | 18 | `logs/s09-intentClassifier-20261026-2327.log` |
| `tests/unit/bff/agents/outpatient/outpatientWorkflow.test.ts` | 12 | 0 | 39 | `logs/s09-outpatientWorkflow-20261026-2327.log` |
| `tests/unit/bff/agents/outpatient/qcRealtime.test.ts` | 9 | 0 | 11 | `logs/s09-qcRealtime-20261026-2327.log` |
| `tests/unit/bff/agents/shared/clinicalReportInterpretation.test.ts` | 5 | 0 | 19 | `logs/s09-clinicalReportInterpretation-20261026-2327.log` |

### 4.2 验收要点与用例覆盖对照

| 验收要点（4.2.6 + gap S-09） | 覆盖测试 | 结果 |
|---|---|---|
| 初诊/复诊分流正确；`renewal`、`lab-review` 映射复诊文书流 | `intentClassifier.test.ts`：首诊 `initial`；复诊关键词；续方 `renewal → follow-up`；检验解读 `lab-review → follow-up`；既往诊断倾向复诊；模型判定优先；非法模型值回退规则 | 7 例全绿 |
| 初诊/复诊必备章节缺失清单完整；相对时间解析；无法解析日期进入缺项 | `dialogueNormalizer.test.ts`：口语/归一；昨天/上周时间线升序；模糊时间挂起；初诊五项缺项；复诊六项缺项；章节覆盖后缺项为空 | 6 例全绿 |
| 五条 QC 规则正反用例：主诉-现病史、时间线、ICD-诊断-用药、复制粘贴、要素完整性 | `qcRealtime.test.ts`：主诉覆盖不发现；反复咳嗽咳痰修饰词不误报；胸痛/头痛矛盾出 caution；事实快照否认诊断出 block；未来日期出 caution；高血压配降糖药出 caution；高血压配氨氯地平不发现；80 字以上重复出 caution；初诊缺章节出 caution | 9 例全绿 |
| 诊断方向与 exam/medication 建议每条挂引用；缺引用被 Schema 拦截；无依据结论标注待核实；证据级别与 S-12 口径一致 | `draftSchema.test.ts`：合法草稿；exam 无引用拦截；`certainty` 非法拦截；证据级别不一致拦截；就诊类型非法拦截；supported/none/partial 推导；无依据段与待核实前缀不重复叠加 | 10 例全绿 |
| S-01 红线集成：确定性表述、虚构身份、BLOCK 不出稿 | `outpatientWorkflow.test.ts`：`certainty-redline` 命中后 `status='blocked'`、无草稿、无完成事件；虚构年龄触发 `fictional-identity` 并阻断 | 2 例全绿 |
| Schema 失败重试降级：两次失败进入 `revised-twice-and-held`，产出缺项骨架，不返回伪造完整稿 | `outpatientWorkflow.test.ts`：无引用 exam 建议两次修订后挂起；`missingInfo` 非空；建议清空；无完成事件 | 1 例全绿 |
| 越权取数/越权写：非 doctor、未知情同意、缺 `patientId`/`visitId` 阻断并记 `UNAUTHORIZED_WRITE` | `outpatientWorkflow.test.ts`：nurse 角色阻断；`consentConfirmed=false` 阻断；缺双标识阻断；审计动作均为 `UNAUTHORIZED_WRITE`；无完成事件 | 3 例全绿 |
| 人工确认：`adopted` 落草稿并发事件；`modified` 重走 Schema + Guard；`rejected` 状态正确；`returned-for-revision` 计入修订次数 | `outpatientWorkflow.test.ts`：拒绝后 `status='rejected'`；修改稿复核通过完成；退回后修订成功完成；主路径采纳发出 `outpatient-record-completed` | 4 例全绿 |
| 共用解读组件：医生/患者措辞差异；危急值进 `criticalAlerts`；无引用 evidenceLevel=none；门诊流程调用结构稳定 | `clinicalReportInterpretation.test.ts`：医生版异常方向与复核建议；患者版「请勿自行判断」口径与危急值保留；无引用待核实与固定免责声明；正常项不进异常清单；返回字段结构稳定 | 5 例全绿 |
| 事实一致性：转写时间线与 `FactSnapshot` 矛盾被 timeline 规则拦截 | `qcRealtime.test.ts`：快照已有高血压，草稿否认既往史出 block；未来日期表述出 caution | 2 例全绿 |

### 4.3 既有回归（30 份全部 exit=0、fail=0，计数与基线逐项一致；未删用例、未改既有断言换绿灯）

汇总日志：`logs/s09-regression-summary-20261026-2327.txt`。

| 测试文件 | pass | fail | expect | 日志 |
|---|---:|---:|---:|---|
| `tests/unit/outpatientAssistant.test.ts` | 16 | 0 | 40 | `logs/s09-regression-outpatientAssistant-20261026-2327.log` |
| `tests/unit/labInterpretation.test.ts` | 14 | 0 | 32 | `logs/s09-regression-labInterpretation-20261026-2327.log` |
| `tests/unit/labInterpretEngine.test.ts` | 6 | 0 | 14 | `logs/s09-regression-labInterpretEngine-20261026-2327.log` |
| `tests/unit/emrAiOutpatientRecordGenV14.test.ts` | 5 | 0 | 13 | `logs/s09-regression-emrAiOutpatientRecordGenV14-20261026-2327.log` |
| `tests/unit/emrAiLabInterpretV14.test.ts` | 5 | 0 | 10 | `logs/s09-regression-emrAiLabInterpretV14-20261026-2327.log` |
| `tests/unit/emrAiLabInterpretDetailV14.test.ts` | 5 | 0 | 10 | `logs/s09-regression-emrAiLabInterpretDetailV14-20261026-2327.log` |
| `tests/unit/emrAiOutpatientFollowupRecoV14.test.ts` | 5 | 0 | 10 | `logs/s09-regression-emrAiOutpatientFollowupRecoV14-20261026-2327.log` |
| `tests/unit/emrAiOutpatientPreTriageV14.test.ts` | 5 | 0 | 10 | `logs/s09-regression-emrAiOutpatientPreTriageV14-20261026-2327.log` |
| `tests/unit/aiBrainV2Outpatient.test.ts` | 13 | 0 | 49 | `logs/s09-regression-aiBrainV2Outpatient-20261026-2327.log` |
| `tests/unit/orchestrator/agents.load.test.ts` | 24 | 0 | 114 | `logs/s09-regression-orchestrator-agents-load-20261026-2327.log` |
| `tests/unit/orchestrator/agents.exec.test.ts` | 3 | 0 | 10 | `logs/s09-regression-orchestrator-agents-exec-20261026-2327.log` |
| `tests/unit/orchestrator/engine.test.ts` | 16 | 0 | 36 | `logs/s09-regression-orchestrator-engine-20261026-2327.log` |
| `tests/unit/orchestrator/e2e.test.ts` | 2 | 0 | 8 | `logs/s09-regression-orchestrator-e2e-20261026-2327.log` |
| `tests/unit/security/audit.test.ts` | 19 | 0 | 34 | `logs/s09-regression-security-audit-20261026-2327.log` |
| `tests/unit/security/outputGuard.test.ts` | 18 | 0 | 40 | `logs/s09-regression-security-outputGuard-20261026-2327.log` |
| `tests/unit/security/aiAudit.test.ts` | 21 | 0 | 85 | `logs/s09-regression-security-aiAudit-20261026-2327.log` |
| `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts` | 24 | 0 | 90 | `logs/s09-regression-kp-lifecycle-20261026-2327.log` |
| `tests/unit/knowledge-platform/citation/citationProtocol.test.ts` | 27 | 0 | 80 | `logs/s09-regression-kp-citation-20261026-2327.log` |
| `tests/unit/knowledge-platform/isolation/patientIsolation.test.ts` | 33 | 0 | 98 | `logs/s09-regression-kp-isolation-20261026-2327.log` |
| `tests/unit/knowledge/KnowledgeBaseManager.test.ts` | 6 | 0 | 15 | `logs/s09-regression-knowledge-KnowledgeBaseManager-20261026-2327.log` |
| `tests/unit/knowledge/RetrievalEngine.test.ts` | 9 | 0 | 21 | `logs/s09-regression-knowledge-RetrievalEngine-20261026-2327.log` |
| `tests/unit/knowledge/TextSplitter.test.ts` | 10 | 0 | 27 | `logs/s09-regression-knowledge-TextSplitter-20261026-2327.log` |
| `tests/unit/knowledge/VectorStore.test.ts` | 14 | 0 | 17 | `logs/s09-regression-knowledge-VectorStore-20261026-2327.log` |
| `tests/unit/knowledge/searchMedicalKnowledge.test.ts` | 9 | 0 | 23 | `logs/s09-regression-knowledge-searchMedicalKnowledge-20261026-2327.log` |
| `tests/unit/knowledge/medicalRecordQc.test.ts` | 12 | 0 | 29 | `logs/s09-regression-knowledge-medicalRecordQc-20261026-2327.log` |
| `tests/unit/ragTuningV5.test.ts` | 5 | 0 | 8 | `logs/s09-regression-ragTuningV5-20261026-2327.log` |
| `tests/unit/modelProvider.test.ts` | 4 | 0 | 20 | `logs/s09-regression-modelProvider-20261026-2327.log` |
| `tests/unit/core/SystemPromptBuilder.test.ts` | 11 | 0 | 21 | `logs/s09-regression-core-SystemPromptBuilder-20261026-2327.log` |
| `tests/unit/promptGovernanceV5.test.ts` | 5 | 0 | 7 | `logs/s09-regression-promptGovernanceV5-20261026-2327.log` |
| `tests/unit/coordinator/AgentRegistry.test.ts` | 8 | 0 | 13 | `logs/s09-regression-coordinator-AgentRegistry-20261026-2327.log` |

## 5. 双 tsc 门禁与过程留痕

| 门禁 | 命令（工作目录） | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit`（仓库根） | 0 | `logs/s09-tsc-root-20261026-2326.log` | 0 |
| web tsc | `bun x tsc --noEmit`（`web/` 目录） | 0 | `logs/s09-tsc-web-20261026-2326.log` | 0 |

**整改留痕（过程说明，不作为最终门禁证据）**：

1. 首轮类型错误集中在 S-01 类型模块与 Guard 模块的导入边界、Schema 校验窄化赋值、S-12 `CitationHit` 构造不完整；最终证据级别改为本地同口径推导，未反向构造不完整溯源对象。
2. 主诉规则初版双字组全量子集匹配会把「反复咳嗽咳痰3天」中的修饰词误判为缺失；已改为先剥离时间词与修饰/语气前缀词表，再匹配核心症状词，仅核心症状完全缺失才出 caution。
3. 审计条目默认透传 `input.patientId`、`input.visitId`；主路径测试补充「不存在 `patientId === undefined` 或 `visitId === undefined` 条目」断言；缺标识阻断分支由 `UNAUTHORIZED_WRITE` 用例单独覆盖。
4. 共用解读组件患者版措辞统一为「请勿自行判断」口径；医生版措辞不受影响。

## 6. 协议层与既有模块对接口径

### 6.1 与 S-01 输出防护

- 门诊运行器构造 `OutboundContext` 时固定 `role='writer'`、`riskLevel='medium'`；初诊必填字段与必备章节关键词按 4.2.5 配置，复诊按诊疗经过、病情变化、查体、辅助检查等口径配置。
- S-12 `Citation` 映射为 S-01 `CitationRef`，保留 `refId`、`chunkId`、`title`、`sectionPath`；`BLOCK` 直接终止，`CAUTION` 留痕后继续，不覆盖 S-01 判定语义。

### 6.2 与 S-06 准入和工具绑定

- 声明包工具清单按只读/写操作分组；写工具 `submit_outpatient_draft`、`raise_qc_alert` 受角色、知情同意与双标识三重校验。
- 频次配额、专家复核与医师确认角色沿用 S-06 `ToolBinding` 与角色常量；本切片不修改准入注册表与风险映射源码。

### 6.3 与 S-12 引用协议

- 诊断方向、`exam`、`medication` 建议必须携带 `citations: string[]`；空引用在 Schema 层拦截。
- 无命中知识条目时调用 S-12 拒答/缺项口径生成「（待核实）」段与 `missingInfo` 条目，不伪造引用编号。

### 6.4 与 S-13 隔离口径

- 患者诊疗文档不预入通用知识库；门诊上下文由工具节点按 `patientId`、`visitId` 实时调取。
- 运行时事实快照、诊断、用药、过敏史等仅作为单次门诊工作流输入，不写入通用知识台账；后续检索接线仍须遵守 S-13 患者级隔离规则。

## 7. 遗留风险与未闭环项台账

### 7.1 本切片已预留但未闭环项（不谎称通过）

1. **ASR 供应商对接**：说话人分离、语音转写、实时录音入口属环境依赖；本轮仅预留 `speaker: 'patient' | 'doctor' | 'system'` 分段结构与合成夹具，不接真实 ASR 服务。
2. **真实 RAG 与知识库接线**：`rag_guidelines` 节点与 `kb_search` 工具为声明/适配器占位；真实指南、路径、书写规范、ICD 字典、药品字典与检验检查项目字典召回归后续知识中台接线批次。
3. **真实工具与 EMR 回写接线**：患者档案、既往就诊、近期检查、用药清单与草稿回写均经注入适配器；未注入时返回离线空占位，不调用真实 HIS/EMR 授权接口。
4. **BFF 路由与前端页面**：本切片不提供 HTTP 接口、工作台页面、人工复核弹窗与引用锚点组件；归前后端联调批次。
5. **事件总线真实挂载**：`outpatient-record-completed` 仅在离线运行器 `events` 数组中预留；未接真实事件通道、内涵质控实时提醒订阅与事件持久化。
6. **持久化落库**：审计台账、修订记录、人工决策与草稿快照均为进程内存态；WORM/哈希链、数据库表与审计检索归 S-08 后续接线批次。
7. **manifest 目录登记**：独立包当前不挂接目录加载器；`agents/manifest.json` 清单登记与 catalog 挂载归后续 BFF/前端批次。
8. **临床术语与药品字典边界**：QC 用药匹配使用内置合成字典粗匹配，不替代真实药典、ICD-10 编码库与处方规则引擎；上线前须接入院方标准字典并补充医学专家评审。

### 7.2 对 S-10 住院切片的复用提示

- **共用解读组件**：直接复用 `src/bff/agents/shared/clinicalReportInterpretation.ts` 的 `interpretClinicalReport`、`ClinicalInterpretationInput`、`ClinicalInterpretationResult` 与固定免责声明；禁止在 S-10 重复实现住院侧解读逻辑。
- **双版本措辞**：医生版保留专业复核建议，患者版必须延续「请勿自行判断」与温和免责口径；危急值进入 `criticalAlerts`，无引用时 `evidenceLevel='none'`。
- **隔离口径**：住院病历与患者诊疗资料继续对齐 S-13 `src/knowledge-platform/isolation/patientIsolation.ts`；患者文档不得预入通用知识库，取数工具必须携带患者/就诊标识并记录审计。
- **复用边界**：住院侧七类文书大纲、时限规则、移动查房体征解析属于 S-10 新职责；本切片门诊草稿 Schema 不替代住院记录 Schema。

### 7.3 工程自检记录

- TypeScript strict、ESM、`@/*` 别名 + `.js` 后缀；未新增第三方依赖；新模块仅复用既有安全、知识中台、编排 DSL 与本地纯函数。
- 品牌扫描：新代码、测试、声明包、提示词与本记录对任务书列明的历史品牌旧称与旧场景称谓扫描均为 0 命中；产品正式名仅使用「健澜AI原生医院操作系统OS」。
- 本切片未执行 `git add`、`git commit`、`git push`、`git tag`；未删除用户源码；未移动、重命名既有文件；未改动未点名既有路由、页面、挂载、权限码与函数签名。
- 代码、测试、日志与文档无真实密码、token、密钥与明文端点；测试患者标识使用 `patient-demo-001`、`visit-demo-001` 类合成夹具；日志不落患者正文大段文本。
