# S-10 切片记录：住院病历智能体包与离线运行时规则

- **切片编号**：S-10
- **产品口径**：健澜AI原生医院操作系统OS
- **署名**：杭州健澜科技有限公司
- **基线仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`，开工基线 HEAD `77493548 docs(patrol): 归档 23:56 批次 S-09 门诊智能体包巡检简报`
- **实现形态**：独立声明包 + 纯类型 + 纯函数 + 进程内存态离线运行器；不接 DB、不连 Redis、不发起网络请求、不调用真实 LLM、不调用真实 ASR 与真实 EMR；测试使用合成夹具，无院方实名、无明文端点、无密钥口令。

## 1. 目标与契约依据

### 1.1 技术文档章节（`docs/technical/YXS20261026-development-spec-2026-10-26.md`）

| 章节 | 行号 | 落地内容 |
|---|---|---|
| 4.3.1 场景定位 | 854–856 | 覆盖入院记录、首次病程记录、日常病程记录、上级医师查房记录、阶段小结、出院记录、病情综合分析七类文书；支持移动查房语音体征录入；整体风险等级 `medium`；上级查房中涉及诊疗方案调整建议的部分按 `high` 处理，须上级医师确认 |
| 4.3.2 输入与工作流要点 | 858–863 | 住院登记、入院记录、既往资料、检验检查/医嘱/手术麻醉/护理时间线、查房语音与指南规范；入院 24h、首程 8h、日常病程按分级频次、阶段小结 30 天或病情突变、出院记录时限；DAG 取数 → 规范指南检索 → 文书类型分支 → 摘要提纲 → 分节草稿 → 一致性校验 → 输出防护 → 人工复核 → 回写；语音体征识别数值、单位、异常与危急值，单位换算并保留未识别片段 |
| 4.3.3 工具集与知识绑定 | 865–868 | 9 个工具：`get_inpatient_context`、`get_order_list`、`get_exam_results`、`get_nursing_notes`、`voice_to_vitals`、`kb_search`、`icd_lookup`、`submit_inpatient_draft`、`schedule_timeline_check`；知识域 `writing-standard`、`clinical-guide`、`data-standard`、`hospital-policy` |
| 4.3.4 输出 Schema（出院记录） | 870–883 | 入院诊断、出院诊断对照关系、诊疗经过、出院状态、随访安排、出院医嘱、时间线节点、引用清单与缺项清单；`consistent`/`adjusted`/`new` 对照关系在 Schema 层校验 |
| 4.3.5 验收要点 | 885–887 | 七类文书模板与时限规则测试齐全；长住院摘要不丢失危急值、手术、过敏、诊断变更等关键节点；语音体征数值/单位解析正反用例；诊断调整与入院诊断对照关系正确；查房记录人工确认模式符合风险分级 |

### 1.2 差距矩阵（`docs/research/YXS20261026-gap-matrix-2026-10-26.md`）

| 编号 | 行号 | 差距说明 | 本切片落地 |
|---|---|---|---|
| C-02 | 247 | 住院文书各场景页面分散存在；缺按七类文书组织的标准工作流模板与时限规则；移动查房语音体征“数值 + 单位识别 → 结构化回写体征项”链路未见独立实现与测试 | 落地独立 `medical-record-inpatient` 声明包、七类模板、时限规则引擎、语音体征解析器、一致性校验、出院记录 Schema 与离线工作流运行器；真实 ASR、真实字典与 EMR 回写仅留适配器接入点 |
| S-10 | 355 | 住院病历智能体包：七类文书标准工作流模板；移动查房语音体征数值单位识别回写工具；验收口径为七类文书模板时限规则测试、体征解析正反用例；依赖 S-05、S-09；语音移动端入口属前端后续切片 | 声明包通过 DSL 结构与语义校验；七类模板与时限规则 15 例测试；体征解析 9 例正反用例；复用 S-09 共用解读组件；未越界实现前端语音入口、真实 RAG、真实工具接线与事件总线挂载 |

### 1.3 切片边界（本切片明确不做）

- ASR 说话人分离、语音转写供应商、真实录音采集与移动端页面；
- 真实 HIS/EMR、药典、ICD-9-CM-3、检验参考范围、危急值字典、护理与医嘱字典接线；
- BFF HTTP 路由、查房/出院/引用弹窗等前端页面；
- 事件总线真实挂载、审计台账与草稿快照持久化落库；
- `agents/manifest.json` 目录清单登记；catalog 挂载归后续 BFF/前端批次；
- S-05 编排持久化协议、S-14 手术记录包、S-15 会诊记录包、S-16 护理记录包。

## 2. 输入输出契约

### 2.1 只读复用模块（未回改源码与既有测试断言）

- **S-01 输出防护**：`src/security/ai/types.ts` 复用 `EvidenceLevel`、`FactSnapshot`、`CitationRef`、`OutboundContext`、`OutboundVerdict`；`src/security/ai/outputGuard.ts` 复用 `guardOutbound(ctx)`。住院文书角色固定 `writer`，整体风险等级 `medium`。
- **S-06 准入**：`src/bff/agents/agentAdmission.ts` 复用 `EXPERT_REVIEW_ROLE='expert-review'`、`PHYSICIAN_CONFIRM_ROLE='physician-confirm'` 与风险-复核角色口径；本切片不修改准入注册表与风险映射源码。
- **S-11 知识台账**：知识域枚举沿用 `writing-standard`、`clinical-guide`、`data-standard`、`hospital-policy`。
- **S-12 引用协议**：`src/knowledge-platform/citation/citationProtocol.ts` 复用 `Citation`、`buildNoEvidenceAnswer`、`deriveEvidenceLevel`、引用标记提取与证据级别口径；诊断方向、检查建议、用药建议必须挂载引用编号。
- **S-13 患者隔离**：`src/knowledge-platform/isolation/patientIsolation.ts` 口径对齐；患者诊疗文档不预入通用知识库，取数工具必须携带 `patientId`、`visitId` 并记录审计；本切片不实现隔离索引逻辑。
- **S-09 共用解读组件**：直接复用 `src/bff/agents/shared/clinicalReportInterpretation.ts` 的 `interpretClinicalReport`、`ClinicalInterpretationInput`、`ClinicalInterpretationResult`、`AbnormalFinding`、`ReportKind` 与 `CLINICAL_INTERPRETATION_DISCLAIMER`；住院侧禁止重复实现解读逻辑。
- **编排 DSL**：`src/orchestrator/dsl/types.ts` 节点类型、`AgentDefinition`、`WorkflowDefinition`、`NodeDefinition`、`EdgeDefinition`、`ValidationResult`；声明包节点与边集合对齐既有枚举与校验规则。

### 2.2 七类文书与人工确认口径

| 文书类型 | 必备章节口径 | 确认角色 |
|---|---|---|
| `admission-record` 入院记录 | 主诉、现病史、既往史、体格检查、辅助检查、初步诊断、入院计划 | `physician-confirm` |
| `first-progress` 首次病程记录 | 病例特点、初步诊断、诊断依据、鉴别诊断、诊疗计划 | `physician-confirm` |
| `daily-progress` 日常病程记录 | 病情变化、查体、辅助检查、诊疗调整、下一步安排 | `physician-confirm` |
| `senior-round` 上级医师查房记录 | 查房意见、病情分析、诊断调整、诊疗方案、注意事项；存在方案调整建议时为 `high` 分支 | `expert-review` |
| `stage-summary` 阶段小结 | 入院情况、诊疗经过、当前诊断、病情评估、下一阶段计划 | `physician-confirm` |
| `discharge-record` 出院记录 | 入院诊断、出院诊断、诊疗经过、出院情况、出院医嘱、随访安排 | `physician-confirm` |
| `comprehensive-analysis` 病情综合分析 | 病情摘要、检验检查解读、诊断评估、风险提示、后续建议 | `physician-confirm` |

### 2.3 出院记录 Schema（对齐 4.3.4 第 874–881 行）

| 字段 | 类型 | 口径 |
|---|---|---|
| `admissionDiagnosis` | `{ code, name }[]` | 入院诊断清单；出院 `consistent` 诊断须按编码或名称对应 |
| `dischargeDiagnosis` | `{ code, name; relation: 'consistent' \| 'adjusted' \| 'new' }[]` | `adjusted` 须关联入院诊断并记录 `basisNote`；`new` 须记录新增依据；非法关系与缺对照在 Schema 层拦截 |
| `treatmentSummary` | `string` | 诊疗经过摘要；诊断方向与建议须挂引用编号 |
| `conditionOnDischarge` | `'cured' \| 'improved' \| 'unchanged' \| 'worsened' \| 'transferred' \| 'died'` | 非法枚举在 Schema 层拦截 |
| `followUp` | `{ timing, advice }[]` | 随访时间与建议均不得为空 |
| `dischargeInstructions` | `string` | 出院医嘱 |
| `timelineNodes` | `{ time, event, source }[]` | 诊断变更、手术、危急值、过敏史、输血、抢救等关键节点强制保留 |
| `citations` | `Citation[]` | S-12 引用清单；出院诊断方向必须挂引用编号 |
| `missingInfo` | `string[]` | 缺项、未识别语音片段与 Schema 错误清单 |

### 2.4 运行器状态与人工决策口径

- **修订上限**：`INPATIENT_MAX_REVISIONS = 2`；Schema 失败、一致性阻断、人工退回累计进入修订计数；超限状态为 `revised-twice-and-held`，只产出缺项骨架，不返回伪造完整稿。
- **人工决策**：`adopted` → 回写草稿；`modified` → 人工修改稿先过 Schema 校验再走 Guard；`rejected` → 状态 `rejected`；`returned-for-revision` → 回到修订计数内，超限转挂起。
- **写路径三重校验**：角色必须为 `doctor`；`consentConfirmed === true`；`patientId`、`visitId` 均存在；任一不满足即阻断并记 `UNAUTHORIZED_WRITE` 审计条目。
- **角色不匹配**：`senior-round` 且 `treatmentPlanAdjustment === true` 时要求 `expert-review`；其余六类要求 `physician-confirm`；角色不匹配记 `UNAUTHORIZED_REVIEW` 并阻断。
- **离线降级**：未注入工具适配器时，只读工具返回空合成占位并在审计台账标注 `degraded-offline`；离线未注入写工具时记 `draft-written-offline`，不接真实 EMR 回写接口。

## 3. 新增 / 修改文件清单（实测行数与字节）

| 操作 | 路径 | 行数 | 字节 | 说明 |
|---|---|---:|---:|---|
| 新增 | `src/bff/agents/inpatient/types.ts` | 326 | 11006 | 住院场景类型契约：七类文书、病情分级、时限状态、时间线、诊断/建议、出院记录、体征、一致性发现、人工决策、运行结果、审计条目与适配器类型 |
| 新增 | `src/bff/agents/inpatient/documentTemplates.ts` | 291 | 11476 | 七类文书模板、确认角色映射、缺失章节清单、时限规则引擎、长住院时间线关键节点折叠 |
| 新增 | `src/bff/agents/inpatient/vitalsParser.ts` | 207 | 6762 | `voice_to_vitals` 语音体征解析；内置合成参考范围、危急值、℃/℉ 与 mmol/L/mg/dL 换算、未识别片段留痕 |
| 新增 | `src/bff/agents/inpatient/consistencyCheck.ts` | 188 | 7759 | 主诉/诊断、查体/诊断、医嘱/诊断、检验引用、时间线一致性五条规则；产出 `info`/`caution`/`block` 发现 |
| 新增 | `src/bff/agents/inpatient/dischargeSchema.ts` | 476 | 19834 | 住院草稿与出院记录 Schema 校验、装配、证据级别推导、对照关系校验、无依据段装配与待核实标记 |
| 新增 | `src/bff/agents/inpatient/inpatientWorkflow.ts` | 643 | 23648 | 离线内存运行器：DAG 编排、工具/模型适配器、Guard 调用、风险角色校验、修订上限、人工四决策、写路径校验、审计台账、共用解读组件委派与事件预留 |
| 新增 | `src/bff/agents/inpatient/index.ts` | 82 | 2417 | 住院模块显式聚合出口；与门诊同名类型以 `Inpatient` 前缀别名导出，避免桶文件符号歧义 |
| 修改 | `src/bff/agents/index.ts` | 18 | 763 | 末尾纯追加 `export * from './inpatient/index.js'`；既有 5 条导出原位保留 |
| 新增 | `agents/medical-record-inpatient/agent.yaml` | 276 | 11736 | `medical-record-inpatient` 声明包、`inpatient-main` 工作流、9 工具、4 知识域、七类文书条件分支、修订循环、人工确认与回写节点 |
| 新增 | `agents/medical-record-inpatient/README.md` | 54 | 3842 | 包说明、风险等级、人工确认模式、工具/知识绑定、复用边界与环境依赖边界 |
| 新增 | `agents/medical-record-inpatient/prompts/system.md` | 18 | 3551 | 住院系统提示词：资料边界、引用强制、禁止确定性表述、七类文书口径、上级查房方案调整确认与免责声明 |
| 新增 | `agents/medical-record-inpatient/examples/input.json` | 54 | 1622 | 合成演示输入：`patient-demo-001`、`visit-demo-001`、`doctor-demo-001`、日常病程默认场景与事实快照占位 |
| 新增 | `tests/unit/bff/agents/inpatient/fixtures.ts` | 92 | 3643 | 合成事实快照、引用清单、工作流入参与合法草稿装配夹具 |
| 新增 | `tests/unit/bff/agents/inpatient/documentTemplates.test.ts` | 206 | 7935 | 七类模板章节、确认角色、时限规则正反用例、时间线关键节点折叠 |
| 新增 | `tests/unit/bff/agents/inpatient/vitalsParser.test.ts` | 100 | 4706 | 正常体征、异常/危急值、双单位换算、未识别片段、血压双值与缺数值兜底 |
| 新增 | `tests/unit/bff/agents/inpatient/consistencyCheck.test.ts` | 83 | 3791 | 五条一致性规则通过与正反阻断/提醒用例 |
| 新增 | `tests/unit/bff/agents/inpatient/dischargeSchema.test.ts` | 234 | 10080 | 出院对照关系、枚举拦截、引用闭环、证据级别、长住院关键节点保留与待核实标记 |
| 新增 | `tests/unit/bff/agents/inpatient/inpatientWorkflow.test.ts` | 306 | 13232 | 主路径、S-01 红线、Schema 降级、high/medium 角色、越权写、人工四决策与共用组件委派 |
| 新增 | `tests/unit/bff/agents/inpatient/agentPackage.test.ts` | 137 | 5729 | 声明包元数据、工具/知识绑定、七类条件分支、DAG 边集合、DSL 校验和、README/提示词/示例齐全性 |
| 新增 | `reports/slices/S-10-inpatient-agent/slice-record.md` | 193 | 33061 | 本切片记录 |

> 未改动：`agents/manifest.json`、`src/orchestrator/dsl/*`、既有 `agents/*` 包、既有 BFF 路由、既有前端页面、S-01/S-06/S-11/S-12/S-13/S-09 共用组件源码与既有测试断言、40 份基线回归测试；未新增第三方依赖，`package.json` 与锁文件无差异。

## 4. 测试清单与结果

### 4.1 新增测试（S-10，6 份正式测试 + 1 份夹具，合计 65 pass / 0 fail / 216 expect）

| 测试文件 | pass | fail | expect | 日志 |
|---|---:|---:|---:|---|
| `tests/unit/bff/agents/inpatient/documentTemplates.test.ts` | 15 | 0 | 49 | `logs/s10-documentTemplates-20261027-003000.log` |
| `tests/unit/bff/agents/inpatient/vitalsParser.test.ts` | 9 | 0 | 36 | `logs/s10-vitalsParser-20261027-003000.log` |
| `tests/unit/bff/agents/inpatient/consistencyCheck.test.ts` | 6 | 0 | 6 | `logs/s10-consistencyCheck-20261027-003000.log` |
| `tests/unit/bff/agents/inpatient/dischargeSchema.test.ts` | 13 | 0 | 26 | `logs/s10-dischargeSchema-20261027-003000.log` |
| `tests/unit/bff/agents/inpatient/inpatientWorkflow.test.ts` | 17 | 0 | 58 | `logs/s10-inpatientWorkflow-20261027-003000.log` |
| `tests/unit/bff/agents/inpatient/agentPackage.test.ts` | 5 | 0 | 41 | `logs/s10-agentPackage-20261027-003000.log` |

### 4.2 验收要点与用例覆盖对照

| 验收要点（4.3.5 + gap C-02/S-10） | 覆盖测试 | 结果 |
|---|---|---|
| 七类文书模板章节齐备；章节缺失进入待补充清单 | `documentTemplates.test.ts`：七类模板非空；入院/首程/日常/上级查房/阶段小结/出院/综合分析关键章节存在；齐备时缺项为空 | 3 例通过 |
| 时限规则正反用例：24h、8h、分级频次、30 天或病情突变、出院时限、临期提醒、缺上下文挂起 | `documentTemplates.test.ts`：入院 onTime/dueSoon；首程 onTime/overdue；病危 24h 与稳定 72h overdue；稳定 dueSoon；阶段小结 30 天 overdue 与病情突变 dueSoon；出院 onTime/overdue；缺上下文 `missing-context` 不抛错 | 8 例通过 |
| 语音体征解析：多体征并列、血压双值、超范围、危急值、℃/℉、mmol/L/mg/dL、未识别片段、缺单位/缺数值兜底 | `vitalsParser.test.ts`：正常六项；异常全部人工复核；六项危急值强制人工核对；℉→℃ 与 mg/dL→mmol/L 换算留痕；原口径不重复换算；未识别两段原文进 `missingInfo`；已知体征缺数值不生成残缺项；舒张压独立判异常 | 9 例通过 |
| 一致性校验正反用例：主诉/诊断、查体/诊断、医嘱/诊断、检验引用、时间线 | `consistencyCheck.test.ts`：一致时无阻断/提醒；主诉诊断不对应出 caution；快照诊断被否认出 block；医嘱与诊断冲突出 caution；检验结论缺引用出 caution；快照诊断未进入时间线且被否认出 block | 6 例通过 |
| 出院 Schema 对照关系与枚举拦截；长住院关键节点不丢失 | `dischargeSchema.test.ts`：合法出院记录；`adjusted` 关联入院诊断并记录依据；`new` 记录新增依据；关键节点保留；非法出院状态拦截；`consistent` 无对照拦截；`adjusted` 缺对照/依据拦截；出院诊断缺引用拦截；`followUp` 缺时间/建议拦截 | 13 例通过 |
| 引用闭环：诊断方向、检查/用药建议挂引用；缺引用被拦截；无依据结论标注「（待核实）」；证据级别与 S-12 口径一致 | `dischargeSchema.test.ts`：exam 建议无引用拦截；证据级别与引用/缺项不一致拦截；`appendPendingMarker` 不重复叠加；`buildNoEvidenceSections` 纳入缺项清单；`buildDischargeRecord` 字段装配 | 4 例通过 |
| high/medium 双确认模式；非上级/非医师角色阻断；未知情同意、缺双标识阻断 | `inpatientWorkflow.test.ts`：上级查房方案调整由 `expert-review` 完成；非 `expert-review` 阻断；普通文书非 `physician-confirm` 阻断；上级查房方案调整未注入人工决策阻断；nurse 角色阻断；`consentConfirmed=false` 阻断；缺 `patientId`/`visitId` 阻断并记录原因 | 7 例通过 |
| S-01 红线集成：确定性表述与虚构身份命中 Guard；BLOCK 不出稿 | `inpatientWorkflow.test.ts`：`certainty-redline` 命中后 `status='blocked'`、无草稿、无完成事件；虚构年龄触发 `fictional-identity` 并阻断 | 2 例通过 |
| Schema 失败重试降级：两次失败进入 `revised-twice-and-held`，产出缺项骨架，不返回伪造完整稿 | `inpatientWorkflow.test.ts`：无引用 exam 建议两次修订后挂起；`missingInfo` 非空；建议清空；无完成事件 | 1 例通过 |
| 人工四决策：`adopted` 落草稿发事件；`modified` 重走 Schema + Guard；`rejected` 状态正确；`returned-for-revision` 计入修订次数 | `inpatientWorkflow.test.ts`：拒绝后 `status='rejected'`；修改稿复核通过完成；退回后修订成功完成；主路径采纳发出 `inpatient-record-completed` | 3 例通过 |
| 共用解读组件委派：医生/患者措辞、危急值、无引用 evidenceLevel=none、固定免责声明、返回结构稳定 | `inpatientWorkflow.test.ts`：综合分析委派共用组件；危急值进入 `criticalAlerts`；无引用 `evidenceLevel='none'`；固定免责声明一致；审计记录 `clinical-interpretation-delegated` | 1 例通过 |
| 声明包元数据、工具/知识、DAG、七类分支、DSL 校验和 | `agentPackage.test.ts`：元数据/角色/风险/免责声明；9 工具与 4 知识域；写工具仅 `submit_inpatient_draft`；19 个 DAG 节点；七类条件分支；修订回退边集合；DSL 零问题与校验和有效；README、提示词、合成示例齐全且未登记 manifest | 5 例通过 |

### 4.3 既有回归（40 份全部 exit=0、fail=0，计数与基线逐项一致；未删用例、未改既有断言换绿灯）

汇总日志：`logs/s10-regression-final-20261027-002321-summary.md`；汇总 CSV：`logs/s10-regression-final-20261027-002321-summary.csv`；`MISMATCH_COUNT=0`。

| 测试文件 | pass | fail | expect | 日志 |
|---|---:|---:|---:|---|
| `tests/unit/outpatientAssistant.test.ts` | 16 | 0 | 40 | `logs/s10-regression-final-20261027-002321-outpatientAssistant.log` |
| `tests/unit/labInterpretation.test.ts` | 14 | 0 | 32 | `logs/s10-regression-final-20261027-002321-labInterpretation.log` |
| `tests/unit/labInterpretEngine.test.ts` | 6 | 0 | 14 | `logs/s10-regression-final-20261027-002321-labInterpretEngine.log` |
| `tests/unit/emrAiOutpatientRecordGenV14.test.ts` | 5 | 0 | 13 | `logs/s10-regression-final-20261027-002321-emrAiOutpatientRecordGenV14.log` |
| `tests/unit/emrAiLabInterpretV14.test.ts` | 5 | 0 | 10 | `logs/s10-regression-final-20261027-002321-emrAiLabInterpretV14.log` |
| `tests/unit/emrAiLabInterpretDetailV14.test.ts` | 5 | 0 | 10 | `logs/s10-regression-final-20261027-002321-emrAiLabInterpretDetailV14.log` |
| `tests/unit/emrAiOutpatientFollowupRecoV14.test.ts` | 5 | 0 | 10 | `logs/s10-regression-final-20261027-002321-emrAiOutpatientFollowupRecoV14.log` |
| `tests/unit/emrAiOutpatientPreTriageV14.test.ts` | 5 | 0 | 10 | `logs/s10-regression-final-20261027-002321-emrAiOutpatientPreTriageV14.log` |
| `tests/unit/aiBrainV2Outpatient.test.ts` | 13 | 0 | 49 | `logs/s10-regression-final-20261027-002321-aiBrainV2Outpatient.log` |
| `tests/unit/orchestrator/agents.load.test.ts` | 24 | 0 | 114 | `logs/s10-regression-final-20261027-002321-orchestrator-agents-load.log` |
| `tests/unit/orchestrator/agents.exec.test.ts` | 3 | 0 | 10 | `logs/s10-regression-final-20261027-002321-orchestrator-agents-exec.log` |
| `tests/unit/orchestrator/engine.test.ts` | 16 | 0 | 36 | `logs/s10-regression-final-20261027-002321-orchestrator-engine.log` |
| `tests/unit/orchestrator/e2e.test.ts` | 2 | 0 | 8 | `logs/s10-regression-final-20261027-002321-orchestrator-e2e.log` |
| `tests/unit/security/audit.test.ts` | 19 | 0 | 34 | `logs/s10-regression-final-20261027-002321-security-audit.log` |
| `tests/unit/security/outputGuard.test.ts` | 18 | 0 | 40 | `logs/s10-regression-final-20261027-002321-security-outputGuard.log` |
| `tests/unit/security/aiAudit.test.ts` | 21 | 0 | 85 | `logs/s10-regression-final-20261027-002321-security-aiAudit.log` |
| `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts` | 24 | 0 | 90 | `logs/s10-regression-final-20261027-002321-knowledgeRegistry.log` |
| `tests/unit/knowledge-platform/citation/citationProtocol.test.ts` | 27 | 0 | 80 | `logs/s10-regression-final-20261027-002321-citationProtocol.log` |
| `tests/unit/knowledge-platform/isolation/patientIsolation.test.ts` | 33 | 0 | 98 | `logs/s10-regression-final-20261027-002321-patientIsolation.log` |
| `tests/unit/knowledge/KnowledgeBaseManager.test.ts` | 6 | 0 | 15 | `logs/s10-regression-final-20261027-002321-KnowledgeBaseManager.log` |
| `tests/unit/knowledge/RetrievalEngine.test.ts` | 9 | 0 | 21 | `logs/s10-regression-final-20261027-002321-RetrievalEngine.log` |
| `tests/unit/knowledge/TextSplitter.test.ts` | 10 | 0 | 27 | `logs/s10-regression-final-20261027-002321-TextSplitter.log` |
| `tests/unit/knowledge/VectorStore.test.ts` | 14 | 0 | 17 | `logs/s10-regression-final-20261027-002321-VectorStore.log` |
| `tests/unit/knowledge/searchMedicalKnowledge.test.ts` | 9 | 0 | 23 | `logs/s10-regression-final-20261027-002321-searchMedicalKnowledge.log` |
| `tests/unit/knowledge/medicalRecordQc.test.ts` | 12 | 0 | 29 | `logs/s10-regression-final-20261027-002321-medicalRecordQc.log` |
| `tests/unit/ragTuningV5.test.ts` | 5 | 0 | 8 | `logs/s10-regression-final-20261027-002321-ragTuningV5.log` |
| `tests/unit/modelProvider.test.ts` | 4 | 0 | 20 | `logs/s10-regression-final-20261027-002321-modelProvider.log` |
| `tests/unit/core/SystemPromptBuilder.test.ts` | 11 | 0 | 21 | `logs/s10-regression-final-20261027-002321-SystemPromptBuilder.log` |
| `tests/unit/promptGovernanceV5.test.ts` | 5 | 0 | 7 | `logs/s10-regression-final-20261027-002321-promptGovernanceV5.log` |
| `tests/unit/coordinator/AgentRegistry.test.ts` | 8 | 0 | 13 | `logs/s10-regression-final-20261027-002321-AgentRegistry.log` |
| `tests/unit/inpatientAssistant.test.ts` | 14 | 0 | 30 | `logs/s10-regression-final-20261027-002321-inpatientAssistant.log` |
| `tests/unit/contextSummary.test.ts` | 14 | 0 | 26 | `logs/s10-regression-final-20261027-002321-contextSummary.log` |
| `tests/unit/emrAiDischargeSummaryGenV14.test.ts` | 5 | 0 | 13 | `logs/s10-regression-final-20261027-002321-emrAiDischargeSummaryGenV14.log` |
| `tests/unit/emrAiDischargeSummaryV14.test.ts` | 5 | 0 | 10 | `logs/s10-regression-final-20261027-002321-emrAiDischargeSummaryV14.log` |
| `tests/unit/emrAiPostopProgressTrackV14.test.ts` | 5 | 0 | 10 | `logs/s10-regression-final-20261027-002321-emrAiPostopProgressTrackV14.log` |
| `tests/unit/emrAiNursingNoteGenV14.test.ts` | 5 | 0 | 13 | `logs/s10-regression-final-20261027-002321-emrAiNursingNoteGenV14.log` |
| `tests/unit/emrCourseNodeV14.test.ts` | 5 | 0 | 10 | `logs/s10-regression-final-20261027-002321-emrCourseNodeV14.log` |
| `tests/unit/threeLevelWardRoundV13.test.ts` | 5 | 0 | 6 | `logs/s10-regression-final-20261027-002321-threeLevelWardRoundV13.log` |
| `tests/unit/morningBriefV11.test.ts` | 4 | 0 | 19 | `logs/s10-regression-final-20261027-002321-morningBriefV11.log` |
| `tests/unit/inpatientBrainV2.test.ts` | 6 | 0 | 6 | `logs/s10-regression-final-20261027-002321-inpatientBrainV2.log` |

## 5. 双 tsc 门禁与过程留痕

| 门禁 | 命令（工作目录） | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit`（仓库根） | 0 | `logs/s10-tsc-root-20261027-003000.log` | 0 |
| web tsc | `bun x tsc --noEmit`（`web/` 目录） | 0 | `logs/s10-tsc-web-20261027-003000.log` | 0 |

**过程说明（不作为最终门禁证据）**：

1. 首轮根 tsc 暴露 `vitalsParser.ts` 正则字面量中 `/min`、`mg/dL`、`mmol/L` 斜杠未转义导致正则提前结束；已全部转义。
2. 桶文件同时聚合门诊与住院模块时，`DiagnosisCertainty`、`HumanReviewDecision`、`HumanReviewResult`、`SuggestionEntry`、`SuggestionKind`、`MAX_REVISIONS` 等符号存在同名歧义；住院 `index.ts` 改为显式聚合导出，同名类型以 `Inpatient` 前缀别名暴露，`MAX_REVISIONS` 别名为 `INPATIENT_MAX_REVISIONS`，冲突工具函数不在住院桶文件重复导出。
3. 声明包条件节点按既有 DSL `switch` 口径使用 `cases` 声明出口端口；修订循环沿用 S-09 口径，`revise_loop` 为循环节点，不另建跨节点回边触发环检测告警。

## 6. 协议层与既有模块对接口径

### 6.1 与 S-01 输出防护

- 住院运行器构造 `OutboundContext` 时固定 `role='writer'`、`riskLevel='medium'`；各文书必填字段与必备章节按 4.3.1 模板配置。
- S-12 `Citation` 映射为 S-01 `CitationRef`，保留 `refId`、`chunkId`、`title`、`sectionPath`；`BLOCK` 直接终止，`CAUTION` 留痕后继续，不覆盖 S-01 判定语义。

### 6.2 与 S-06 准入和风险角色

- 声明包工具清单按只读/写操作分组；只读工具 8 个，写工具仅 `submit_inpatient_draft`。
- `senior-round` 且存在诊疗方案调整建议时，确认角色为 `EXPERT_REVIEW_ROLE='expert-review'`；其余六类为 `PHYSICIAN_CONFIRM_ROLE='physician-confirm'`。本切片不修改准入注册表与风险映射源码。

### 6.3 与 S-12 引用协议

- 诊断方向、`exam`、`medication` 建议必须携带 `citations: string[]`；空引用在 Schema 层拦截。
- 无命中知识条目时调用 S-12 拒答/缺项口径生成「（待核实）」段与 `missingInfo` 条目，不伪造引用编号。
- 出院记录 `adjusted`、`new` 诊断必须记录对照关系或新增依据；`consistent` 必须能与入院诊断按编码或名称对应。

### 6.4 与 S-13 隔离口径

- 患者诊疗文档不预入通用知识库；住院上下文由工具节点按 `patientId`、`visitId` 实时调取。
- 运行时事实快照、诊断、用药、过敏史、护理记录与检验结果仅作为单次住院工作流输入，不写入通用知识台账；后续检索接线仍须遵守 S-13 患者级隔离规则。

### 6.5 共用解读组件复用边界

- 病情综合分析涉及检验/检查解读时，住院运行器委派 `src/bff/agents/shared/clinicalReportInterpretation.ts`；未在 `src/bff/agents/inpatient/` 内重复实现解读逻辑。
- 患者版延续「请勿自行判断」温和免责口径；危急值进入 `criticalAlerts`；无引用时 `evidenceLevel='none'`；固定免责声明保持门诊/住院两侧一致。

## 7. 遗留风险与未闭环项台账

### 7.1 本切片已预留但未闭环项（不谎称通过）

1. **ASR 供应商对接**：说话人分离、语音转写、实时录音入口与移动端采集页面属环境依赖；本轮仅预留 `voice_to_vitals` 解析器接口与合成文本夹具，不接真实 ASR 服务。
2. **真实 RAG 与字典接线**：`kb_search`、`icd_lookup`、指南规范、药典、ICD-9-CM-3、检验参考范围、危急值字典、护理与医嘱字典均为声明/适配器占位；真实召回归后续知识中台与院方字典接线批次。
3. **真实工具与 EMR 回写接线**：住院上下文、医嘱、检验检查、护理记录、语音体征解析、时限检查与草稿回写均经注入适配器；未注入时返回离线空占位，不调用真实 HIS/EMR 授权接口。
4. **BFF 路由与前端页面**：本切片不提供 HTTP 接口、上级查房工作台、出院记录页、人工复核弹窗与引用锚点组件；归前后端联调批次。
5. **事件总线真实挂载**：`inpatient-record-completed` 仅在离线运行器 `events` 数组中预留；未接真实事件通道、订阅关系、事件持久化与总线审计。
6. **持久化落库**：审计台账、修订记录、人工决策、一致性发现与草稿快照均为进程内存态；WORM/哈希链、数据库表、审计检索与快照归档归后续 S-08 接线批次。
7. **manifest 目录登记**：独立包当前不挂接目录加载器；`agents/manifest.json` 清单登记与 catalog 挂载归后续 BFF/前端批次。
8. **时限规则院方制度校准**：24h、8h、分级频次、30 天、出院 24h 均为合成默认参数；临期阈值 `DUE_SOON_HOURS=2` 为测试口径，上线前须由医务部按院方核心制度校准。
9. **三级查房/会诊/手术分级制度规则库**：当前仅实现角色分流与人工确认边界；真实三级查房、会诊权限、手术分级、疑难病例讨论规则库归后续规则接线批次。
10. **`schedule_timeline_check` 真实定时调度**：当前由离线规则引擎在工作流内派生提醒清单；真实定时任务、工作台轮询、消息推送与逾期督办归后续运维调度批次。

### 7.2 后续切片复用提示

- **共用解读组件**：S-14 手术记录、S-15 会诊记录、S-16 护理记录及后续检验/影像解读场景，应继续复用 `src/bff/agents/shared/clinicalReportInterpretation.ts`，不得重复实现医生/患者双版本措辞、危急值清单与免责声明。
- **隔离口径**：后续取数工具必须携带 `patientId`、`visitId` 并记录审计；患者诊疗资料禁止预入通用知识库，检索侧仍须执行 S-13 患者级过滤。
- **防护与引用**：后续智能体继续复用 S-01 `guardOutbound`、S-12 引用协议与 S-06 角色常量；Schema 各自独立，住院 Schema 不替代门诊、手术、会诊或护理 Schema。

### 7.3 工程自检记录

- TypeScript strict、ESM、`@/*` 别名 + `.js` 后缀；未新增第三方依赖；新模块仅复用既有安全、知识中台、编排 DSL、S-09 共用解读组件与本地纯函数。
- 品牌扫描：新代码、测试、声明包、提示词与本记录对任务书列明的历史品牌旧称与旧场景称谓扫描为 0 命中；产品正式名仅使用「健澜AI原生医院操作系统OS」。
- 密钥与端点扫描：实现、测试、声明包扫描命中 5 处，均为 README 否定句声明或本地双字词变量名；未发现明文口令、凭据、密钥、认证凭据长值或明文服务端点；本记录自身审计说明不纳入秘密判定。
- 本切片未执行 `git add`、`git commit`、`git push`、`git tag`；未删除用户源码；未移动、重命名既有文件；未改动未点名既有路由、页面、挂载、权限码与函数签名。
- 代码、测试、日志与文档无真实院方实名；测试患者/就诊/医生标识使用 `patient-demo-001`、`visit-demo-001`、`doctor-demo-001` 类合成夹具；日志不落患者正文大段文本。

### 7.4 交付校验留痕

- 记录格式校验：`logs/s10-verifier-slice-record-20261027.log`，`result.passed=true`。
- 关键章节与锚点校验：`logs/s10-verifier-must-contain-20261027.log`，`result.passed=true`，必需术语 20/20 命中。
- 占位符审计：`logs/s10-verifier-placeholder-20261027.log`，`result.passed=true`，残留占位符 0 个。
- 品牌禁用词校验：`logs/s10-verifier-brand-20261027.log`，`result.passed=true`，禁用词 0 命中。
- 声明包格式、工具/知识绑定与占位符校验：`logs/s10-verifier-agent-yaml-format-20261027.log`、`logs/s10-verifier-agent-yaml-contains-20261027.log`、`logs/s10-verifier-agent-yaml-placeholder-20261027.log`，均 `result.passed=true`，YAML 必需术语 15/15 命中。
