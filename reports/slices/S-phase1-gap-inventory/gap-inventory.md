# 阶段①离线缺口只读盘点台账（gap-inventory）

- **产品口径**：健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）
- **署名**：杭州健澜科技有限公司
- **仓库根**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- **分支**：`consult-agent-m86`
- **阶段①收口基线 HEAD**：`b76facee079e14ec8e08573de804d463bda638b0`（代码收口）；主会话巡检简报收口 SHA `94bba97e1cbdf0b90080491178cdcfa8acc45312`（GitCode master = GitHub mirror master，three_way_match=True）
- **盘点日期**：2026-10-27（Asia/Shanghai）
- **任务性质**：只读盘点；本轮**不新增 `src/` 源码、不新增测试用例、不执行 `git add / commit / push / tag`、不新增第三方依赖、不发起网络请求、不运行 bun test / tsc**。
- **盘点方法**：对照差距矩阵全部 M/P/A/R/O/G/C/S 编号与技术规格阶段①条款，逐项核对已落地源码、既有测试与 11 份切片记录自报台账；每条缺口分入 A / B 两类。矩阵 2026-10-26 静态评级仅作线索，现状以现场源码、测试与切片记录复核为准。

## 0. 分类口径（A / B 判定标准，无歧义）

### A 类：阶段①内可离线闭环补齐

同时满足：

1. 仅涉及 **types + pure functions + 进程内内存态**；
2. 不依赖数据库持久化、网络 / 外部供应商、真实 LLM、真实 ASR、前端页面、运行态看板、跨实例聚合；
3. 不属阶段② / 阶段③职责边界；
4. 可在既有离线技术栈内以纯函数与内存台账实现，并配进程内单测固化。

A 类每条登记：最小实现口径、涉及文件（新增或纯追加）、配套单测要点、建议放行优先级（P1 = 阶段①闭环前优先；P2 = 阶段①收尾批次内可排期）。**本轮仅登记，不自行开工实现，等候主会话逐切片书面放行。**

### B 类：受环境或阶段边界阻塞

满足任一即归 B：

1. 依赖数据库 / 持久化仓储 / 事务层；
2. 依赖网络、外部供应商（真实 LLM、ASR、Embedding、重排模型、OCR/OFD、EMR/HIS、短信/邮件/微信通道）；
3. 依赖前端页面、BFF HTTP 路由、运行态监控看板、跨实例聚合仓储；
4. 属阶段②（S-05 剩余、S-07、S-14~S-17）或阶段③（S-21、S-22、S-23 及剩余开放项）职责；
5. 依赖院方 / 医务部 / 架构组外部评审签字后方可落码。

B 类每条登记：阻塞依赖、归属阶段或批次；本轮只登记，不做实现计划细化。

## 1. 编号宇宙覆盖核对清单

> 盘点基准：差距矩阵 `docs/research/YXS20261026-gap-matrix-2026-10-26.md`；阶段划分 `docs/technical/YXS20261026-development-spec-2026-10-26.md` 10.1（1404–1443 行）。下表"落点"列指向本台账 §2 已闭环证据、§3 A 类行号或 §4 B 类行号；阶段②③整块归 §5，合规 P0 归 §6。

| 编号 | 矩阵行 | 需求摘要（基线） | 现状判定 | 落点 |
|---|---|---|---|---|
| G-01 | 171 | 统一接入台账 / 接口清单 / 字段映射 / 健康状态 / 配额限流 / 订阅状态 | missing（阶段③ S-21） | B01 |
| G-02 | 172 | ASR 说话人分离、分段、术语纠错回显网关注册观测 | missing（阶段③ S-22 + 供应商） | B02 |
| G-03 | 173 | PDF/Word/OFD/Markdown/扫描件 OCR 类型与流水线 | missing（阶段③ S-22） | B03 |
| G-04 | 174 | 数据治理接入层统一台账（来源—治理动作—血缘去向） | missing（阶段③ S-23） | B04 |
| G-05 | 175 | 场景注册三维表 + 热更新协议 + 成本/满意度看板 | partial | A06 / B05 |
| M-01 | 181 | 模型卡片字段全集登记 / 查询 / 标签检索 | partial（内存台账已闭环，持久化与 HTTP 接口缺） | B06 |
| M-02 | 182 | 健康检查：存活 / 时延 / 成功率 / 错误率 / 异常摘除 | partial | A01 / B07 |
| M-03 | 183 | 模型版本台账、变更记录、一键回滚 | partial（元数据与指针已闭环） | B08 |
| M-04 | 184 | A-B 测试流量权重、双模型对照 | partial | A02 / B09 |
| M-05 | 185 | 场景策略路由六维（科室/任务/长度/时延/负载/成本） | partial | A03 / B10 |
| M-06 | 186 | 备用模型无缝切换、切换事件审计、质量比对 | partial（离线决策与事件留痕已闭环） | B11 |
| M-07 | 187 | 会话粘性一致性哈希固定模型版本 | partial | A04 / B12 |
| M-08 | 188 | 主力 / 辅助 / 专用三层模型体系注册 | partial | B13 |
| M-09 | 189 | 统一模型抽象层宽接口（流式 / token / 元数据 / 多模态） | partial（接口扩展未落地） | A05 / B14 |
| R-01 | 195 | 六知识域台账与归属责任人、域间关联 | partial | A23 / B15 |
| R-02 | 196 | 批量 + 增量采集、文件夹监听、接口推送、重试告警 | partial | A24 / B16 |
| R-03 | 197 | OCR/OFD 解析与人工校对界面 | missing（阶段③ S-22） | B17 |
| R-04 | 198 | 切分规则（表格/条款不跨块）+ 元数据六要素类型化 | partial | A25 |
| R-05 | 199 | 三路索引：向量 + 关键词 + 结构化标量 | partial | A26 / B18 |
| R-06 | 200 | 混合检索重排流程与阈值拒答生成侧强制 | partial（协议层闭环，运行时接线未做） | A27 / A28 / B19 |
| R-07 | 201 | 引用编号协议 + 前端锚点弹窗 | partial（协议层闭环） | A29 / B20 |
| R-08 | 202 | 患者诊疗数据禁入向量库、患者级隔离索引、强制标识过滤 | partial（隔离服务闭环，运行时接线未做） | A30 / B21 |
| R-09 | 203 | 准入审核流、生效/失效期、冲突检测、季度评审 | partial（内存状态机闭环，持久化未做） | A31 / B22 |
| R-10 | 204 | 七环节流水线进度报告与可观测 | closed（既有在库 `PipelineReport` / `DocumentIndexStatus`） | §2-1 |
| P-01 | 210 | 系统级红线版本化、不可绕过、变更审计 | partial | A07 / B23 |
| P-02 | 211 | 场景级任务/输入/输出/质量/示例；Few-shot 加载校验 | partial | A08 / B24 |
| P-03 | 212 | 科室级备案台账（版本/审批人/启用状态/适用范围） | partial | B25 |
| P-04 | 213 | 任务级动态上下文（已有内容 / 光标位置等） | missing（归 S-05 编排层） | A39 / B51 |
| P-05 | 214 | Schema 校验 + 重试 + 降级闭环 | partial | A09 / A10 / B26 |
| P-06 | 215 | 思维链分步；提纲→填充→润色标准流程模板 | missing（归 S-05 编排层） | A40 |
| P-07 | 216 | 引用标注 +「待核实」+ 缺失留空结构化输出 | partial | A41 |
| P-08 | 217 | 提示词生命周期：版本对比回滚、采纳率/修改字数告警、加密归属 | partial | A11 / A12 / B27 |
| A-01 | 223 | 准入台账字段全集与接口清单 | partial | A13 / A19 / B28 |
| A-02 | 224 | 三级风险与确认模式 / 复核角色映射 | partial | A14 / B29 |
| A-03 | 225 | 三类评测台账、评测集版本绑定、发布门禁 | partial | A15 / B30 |
| A-04 | 226 | 运行监控三维聚合、异常分类、阈值告警 | partial | A16 / A17 / B31 |
| A-05 | 227 | 五维灰度 + 一键回滚 | missing（阶段② S-07） | B32 |
| A-06 | 228 | 退役留痕状态机与归档检索 | partial（内存状态机闭环） | B33 |
| A-07 | 229 | 两套注册表统一（岗位 ↔ 声明包） | partial（映射视图闭环，写入侧合并未做） | A18 / B34 |
| S-01 | 235 | 输入侧敏感识别 + 注入检测 | closed（既有在库，见 §2-2） | §2-2 |
| S-02 | 236 | 提示词约束角色/边界/格式/禁止行为/不确定性 | partial（随 P-01~P-04 闭环，无独立缺口） | A07 等联动 |
| S-03 | 237 | 检索不到明确拒答、不强行生成 | partial | A20 / B35 |
| S-04 | 238 | 输出侧统一校验器（第五道防线） | partial（S-01 骨架与规则集闭环，语义级比对缺） | A21 / B36 |
| S-05 | 239 | 全过程审计专项字段与多维检索 | partial（内存台账与哈希链闭环，持久化未做） | A22 / B37 |
| S-06 | 240 | 等保 2.0 / 分级分类 / 字段加密 / 出口脱敏 | partial（机制在库，生产化沿用合规 P0） | B73~B78 |
| C-01 | 246 | 门诊病历智能体（声明包 + DAG + 要素质控 + 共用解读） | partial（S-09 离线包闭环） | A42 / B52 |
| C-02 | 247 | 住院病历智能体（七类文书模板 + 时限 + 体征解析） | partial（S-10 离线包闭环） | A43 / A44 / B53 |
| C-03 | 248 | 手术记录智能体 | missing（阶段② S-14） | B38 |
| C-04 | 249 | 会诊记录智能体 | missing（阶段② S-15） | B39 |
| C-05 | 250 | 护理记录智能体 | missing（阶段② S-16） | B40 |
| C-06 | 251 | 病历内涵质控智能体强化 | missing（阶段② S-17） | B41 |
| O-01 | 279 | 可视化流程节点类型覆盖（格式校验/通知/回写独立节点） | partial（三类新节点闭环，画布前端缺） | A33 / B47 |
| O-02 | 280 | 意图识别 + 任务规划器 | missing（阶段②，spec 1427） | B42 |
| O-03 | 281 | Function Calling 工具集参数 / 权限 / 频次限制 | partial | A34 / A35 / B48 |
| O-04 | 282 | 上下文管理与长住院压缩、跨会话持久化 | partial（内存快照与契约预留闭环） | A36 / B49 |
| O-05 | 283 | 多智能体协同标准消息信封、评审模式模板 | missing（阶段②，spec 1427） | B43 |
| O-06 | 284 | 人工确认三模式；采纳/修改/拒绝/多轮指令 | missing（阶段②，spec 1427） | B44 |
| O-07 | 285 | 异常处理降级链：重试 → 备用模型 → 转人工 | partial | A37 / B50 |
| O-08 | 286 | 运行监控事件与跨实例聚合看板 | partial（单实例事件闭环，跨实例聚合缺） | B45 |
| O-09 | 287 | 全链路追踪 + 断点接续持久化协议 | partial（内存快照与续跑闭环，DB 持久化缺） | A38 / B46 |

### 1.1 覆盖行映射（不另立缺口行，主编号见 §3 / §4）

| 覆盖行 | 矩阵行 | 主编号 | 说明 |
|---|---|---|---|
| 3.3 RAG 七环节 ① 采集接入 | 257 | R-02 | 增量监听 / 定时同步 / 重试告警归 A24 / B16 |
| 3.3 ② 格式解析结构化 | 258 | R-03 | OFD/OCR/人工校对归 B17（阶段③） |
| 3.3 ③ 清洗规范化 | 259 | R-04 补充 | 页眉水印 / 单位统一显式规则归 A32 |
| 3.3 ④ 切分 | 260 | R-04 | 表格 / 条款不跨块与六要素归 A25 |
| 3.3 ⑤ 向量化索引 | 261 | R-05 | 内存标量索引归 A26；持久化双索引归 B18 |
| 3.3 ⑥ 混合检索重排 | 262 | R-06 | 协议与纯规则归 A27 / A28；重排模型归 B19 |
| 3.3 ⑦ 引用溯源 | 263 | R-07 | 协议归 A29；前端弹窗归 B20 |
| 3.4 系统级 | 269 | P-01 | A07 / B23 |
| 3.4 场景级 | 270 | P-02 | A08 / B24 |
| 3.4 科室级 | 271 | P-03 | B25 |
| 3.4 任务级动态 | 272 | P-04 | A39 / B51 |
| 3.4 生命周期 | 273 | P-08 | A11 / A12 / B27 |
| 3.6 准入注册 | 293 | A-01 | A13 / A19 / B28 |
| 3.6 风险分级 | 294 | A-02 | A14 / B29 |
| 3.6 上线评测 | 295 | A-03 | A15 / B30 |
| 3.6 运行监控 | 296 | A-04 | A16 / A17 / B31 |
| 3.6 灰度发布 | 297 | A-05 | B32（阶段② S-07） |
| 3.6 退役留痕 | 298 | A-06 | B33 |
| 3.7 版本线 | 304 | S-07 | B57（阶段②） |
| 3.7 四维留痕 | 305 | S-08 | A22 / B58 |
| 3.7 六类升级 | 306 | S-07 | B59（阶段②） |
| 3.7 四级管控 | 307 | S-07 | B60（阶段②） |
| 3.7 模型升级七步 | 308 | S-07 / S-03 | B61（阶段②） |
| 3.7 知识升级 | 309 | S-11 | B62 |
| 3.7 提示词/编排升级 | 310 | S-04 / S-07 | B63 |
| 3.7 功能/平台升级七步 | 311 | S-07 | B64（阶段②） |
| 3.7 回滚 | 312 | S-07 | B65（阶段②） |
| 3.7 环境隔离 | 313 | S-07 | B66（阶段②） |
| 3.7 接口兼容 | 314 | S-07 | B67（阶段②） |
| 3.7 业务连续性 | 315 | S-07 | B68（阶段②） |

## 2. 阶段①已闭环证据（closed 基线，不计入缺口）

### 2-1 R-10 七环节流水线进度报告（矩阵 204，✅）

- 现状锚点：`src/knowledge-platform/processing/pipeline.ts`（`PipelineReport`：parse/clean/split/normalize/entity/relation/embed/ingest，含耗时/成功/消息/块数/实体数/质量分）；`src/knowledge/processing/DocumentParser.ts` 系列；`DocumentIndexStatus`（stage/progress/message/updatedAt）。
- 说明：流水线阶段报告结构在库，可作为后续接入进度看板底座；看板呈现归 B 类后续批次。

### 2-2 S-01 输入侧防线（矩阵 235，✅ 既有在库）

- 现状锚点：`src/security/input/InputValidator.ts`（SQL/命令/XSS 等）；`src/security/input/PromptInjectionGuard.ts`（指令覆盖/角色冒充等五层）；`src/security/classification/`；`src/security/desensitization/`。
- 测试锚点：`tests/unit/security/input.test.ts`、`tests/security/promptInjection.test.ts`、`tests/security/injection.test.ts`（既有在库，本轮不重跑）。

### 2-3 阶段①交付切片闭环证据（内存态 / 纯函数 / 离线单测口径）

| 切片 | 源码锚点 | 测试锚点（复核通过口径） | 闭环范围 |
|---|---|---|---|
| S-01 输出侧校验器 | `src/security/ai/outputGuard.ts`；`src/security/ai/types.ts` | `tests/unit/security/outputGuard.test.ts`（18 pass / 0 fail / 40 expect） | 虚构患者标识比对、确定性诊断红线、敏感词红线、原始事实矛盾字段比对、Schema 失败计数、未引用结论「待核实」标注；PASS / CAUTION / BLOCK 三级处置 |
| S-02 模型注册表 | `src/bff/agents/modelRegistry.ts`、`src/bff/agents/modelHealthProbe.ts` | `tests/unit/bff/agents/modelRegistry.test.ts`（36/0/106）；`modelHealthProbe.test.ts`（12/0/48） | 模型卡片字段全集、标签检索、健康快照台账、状态机迁移留痕、版本台账与 `previousVersion` 指针、注入式探针与熔断/半开语义；三层模型 `tier` 登记 |
| S-03 策略路由 | `src/bff/agents/modelRouter.ts` | `tests/unit/bff/agents/modelRouter.test.ts`（36/0/109） | 规则台账登记与校验、条件/优先级匹配、患者/就诊粘性哈希、同优先级流量权重分流、健康判定与主备降级决策、影子标记与路由事件内存留痕 |
| S-04 提示词治理 | `src/bff/prompt/assetRegistry.ts`、`schemaGuard.ts`、`metricsAggregator.ts`、`promptLoader.ts` | `assetRegistry.test.ts`（25/0/60）、`schemaGuard.test.ts`（13/0/47）、`metricsAggregator.test.ts`（8/0/24）、`promptLoader.test.ts`（8/0/28） | 四层资产模型与台账、发布状态机、版本对比预留、Few-shot 引用存在性/active 校验、Schema 轻量子集 + 重试决策 + 三级降级动作、按版本指标聚合、system→scenario→department→task→工具说明强制加载链 |
| S-06 智能体准入 | `src/bff/agents/agentAdmission.ts` | `tests/unit/bff/agents/agentAdmission.test.ts`（27/0/119） | `AgentRecord` 字段全集与完整性校验、三级风险与复核角色门禁、三类评测台账与发布门禁、四维运行指标内存聚合、退役状态机与留痕、两套注册表映射视图 |
| S-08 AI 审计 | `src/security/audit/aiAudit.ts` | `tests/unit/security/aiAudit.test.ts`（21/0/85） | `AiAuditEvent` 专项字段、四维版本快照、多维 AND 检索、采纳/修改/拒绝/升级/待确认留痕、SHA-256 内存哈希链、`exportTrace` 举证链导出、患者身份脱敏 |
| S-11 RAG 生命周期 | `src/knowledge-platform/lifecycle/knowledgeRegistry.ts` | `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts`（24/0/90） | 六知识域台账、条目六要素类型化入库拦截、准入签字留痕、生效/失效日期与 `scanExpired` 转历史、冲突分组与版本链、评审周期与三结论归档、历史版本检索 |
| S-12 引用协议 | `src/knowledge-platform/citation/citationProtocol.ts` | `tests/unit/knowledge-platform/citation/citationProtocol.test.ts`（27/0/80） | `Citation` 八字段、`CitationPopupData` 纯映射、编号装配、锚点定位与回查、证据级别推导、`buildNoEvidenceAnswer` 拒答模板、none 级别确定性约束、同 chunkId 去重 |
| S-13 患者隔离 | `src/knowledge-platform/isolation/patientIsolation.ts` | `tests/unit/knowledge-platform/isolation/patientIsolation.test.ts`（33/0/98） | `SimilarCaseIndex` / `SimilarCaseChunk`、`IngestGuard` 纯函数校验、分区强制过滤、缺失患者/就诊标识阻断、越权阻断审计入链与多维回查 |
| S-09 门诊智能体 | `agents/medical-record-outpatient/`；`src/bff/agents/outpatient/`（dialogueNormalizer / draftSchema / intentClassifier / outpatientWorkflow / qcRealtime / types）；`src/bff/agents/shared/clinicalReportInterpretation.ts` | 门诊 7 份合计 53/0/155 | 独立声明包与离线 DAG 运行器、初诊/复诊分流、五规则实时要素质控、引用编号强制校验、门诊/住院共用解读组件、风险等级 `medium` 医师确认口径 |
| S-10 住院智能体 | `agents/medical-record-inpatient/`；`src/bff/agents/inpatient/`（consistencyCheck / dischargeSchema / documentTemplates / inpatientWorkflow / types / vitalsParser） | 住院 6 份合计 65/0/216 | 独立声明包、七类文书模板与时限规则引擎、语音体征数值/单位解析器、入院—出院诊断对照一致性校验、出院记录 Schema、共用解读组件复用 |
| S-05（部分）编排基础 | `src/orchestrator/engine/snapshotStore.ts`、`snapshotService.ts`、`engine/auditBatchBridge.ts`、`engine/context.ts`、`nodes/specialExecutors.ts`、`adapters/similarCaseAdapter.ts`、`adapters/medicalToolAdapter.ts`、`adapters/ragAdapter.ts`、`adapters/voiceAsrToolAdapter.ts` | 6 份合计 41/0/135：specialNodes 14/0/23、snapshotStore 10/0/43、snapshotResume 4/0/16、monitoringEvents 3/0/13、similarCaseAdapter 5/0/15、auditBatchBridge 5/0/25 | `format-validate` / `notify` / `writeback` 三类独立节点与 DSL 白名单校验；内存快照仓储、序列化/反序列化、合法迁移校验、回填续跑（WAITING_HUMAN / PAUSED / FAILED）；监控事件字段与实例摘要；隔离适配与审计批量桥接；快照输出/错误脱敏 |

### 2-4 现场复核备注（本轮只读核实，不回改）

- `agents/manifest.json` 现行登记 10 包：`medical-record-writer`、`medical-record-qc`、`voice-medical-record`、`diagnosis-assistant`、`prescription-review`、`lab-imaging-interpreter`、`medical-coder`、`follow-up`、`triage-preconsult`、`medical-affairs-report`；`medical-record-outpatient`、`medical-record-inpatient` 两个新包**未登记**（归 A42 / A43 登记方案，B 类挂载后端批次见 B52 / B53）。
- `src/knowledge-platform/retrieval/hybrid.ts` 最后修改时间 2026-10-19，阶段①切片未改动；R-06 运行时接线缺口属实（见 A27 / B19）。
- `src/knowledge-platform/sources/connectors.ts` 未出现 OFD / OCR 格式类型；R-03 / G-03 缺口属实（见 B17 / B03）。
- 阶段②声明包目录 `medical-record-surgery`、`medical-record-consultation`、`medical-record-nursing`、`medical-record-qc-enhanced` 现场均不存在（见 B38~B41）。
- 既有 BFF 路由（`modelRouterV5.ts`、`promptGovernanceV5.ts`、`knowledgeLifecycleV13.ts`、`emrQcAuditLogV14.ts` 等）属 M3–M16 历史基线，与本轮 S-02/S-04/S-06/S-08/S-11/S-12/S-13 内存模块**未接线**；新一轮 HTTP 接口与前端页面归 B 类。

## 3. A 类缺口台账（阶段①内纯 types + pure functions + 进程内存态可离线闭环）

> 说明：以下各行仅为盘点登记，**本轮不实现、不开工**；放行顺序与排期由主会话逐切片裁定。涉及文件均为新增模块或对既有内存模块**纯追加**类型 / 纯函数，不改既有 BFF 调用面、前端路由 / 页面 / 挂载 / 权限码与公开函数签名，不新增第三方依赖。

### 3.1 平台模型域（S-02 / S-03）

| A 编号 | 关联编号 | 现状锚点（文件 / 测试 / 矩阵·spec 行） | 缺口描述 | 最小实现口径 | 涉及文件 | 单测要点 | 优先级 |
|---|---|---|---|---|---|---|---|
| A01 | M-02（矩阵 182；spec 3.2.4 295–311；S-02 记录 §7.1-2） | `src/bff/agents/modelRegistry.ts`（`ModelHealthSnapshot` 失败计数 / 熔断 / 半开语义）；`modelHealthProbe.test.ts` 12/0/48 | 成功率 / 错误率按时间窗聚合尚未形成纯计算口径；现有快照只保留累计计数与当前状态 | 在内存探针事件台账之上补纯函数：按滑动窗口（时间窗参数由入参给定）计算成功率、错误率、平均时延与连续失败计数；不主动发起 HTTP，不持久化 | 纯追加 `src/bff/agents/modelHealthProbe.ts`（窗口聚合纯函数 + 窗口类型）；测试 `tests/unit/bff/agents/modelHealthProbeWindow.test.ts`（新增） | 空台账比率记 0；窗口外事件不计入；连续失败触发熔断 / 半开迁移与现有状态机一致；时间戳入参可注入，不依赖系统时钟 | P1 |
| A02 | M-04（矩阵 184；S-03 记录 §7.1-4） | `src/bff/agents/modelRouter.ts`（`trafficWeight`、同组规则台账）；`modelRouter.test.ts` 36/0/109 | 同组权重和异常当前仅告警归一化，不阻断规则登记 / 路由决策 | 纯校验规则：同 `match` 分组内 `trafficWeight` 之和必须等于 100；非 100 时拒绝登记（返回结构化错误码），决策器不回退到归一化猜测；权重为 0 显式关闭 | 纯追加 `modelRouter.ts`（权重分组校验纯函数与错误类型）；测试追加 `tests/unit/bff/agents/modelRouter.test.ts`（禁止回改既有断言，新增用例追加） | 权重和 100 通过；和 ≠100 拒绝登记；单规则默认 100；非法负数 / 非整数被拒；既有默认单实例 provider 行为不变 | P2 |
| A03 | M-05（矩阵 185；S-03 记录 §7.1-2） | `modelRouter.ts`（`ContextLength`、`PerformanceTier` 枚举；`RouteRequest.tokenBudget?`） | `tokenBudget → contextLength` 映射、成本档 / 负载档位推导规则未建模；`latencyTier / costTier` 目前依赖上游传入 | 纯映射表 + 纯函数：按 token 预算区间推导 `contextLength`，按入参成本 / 时延标签推导 `costTier / latencyTier`；推导规则表与决策规则同口径登记；负载档在无真实指标时由入参显式给定，不自行采集 | 纯追加 `modelRouter.ts`（预算映射纯函数 + 规则表类型）；测试追加 `modelRouter.test.ts` | 边界预算值映射到正确档位；未给预算时该维不约束；映射表未命中返回显式未知档而非默认高配；不发起任何网络 / 进程外指标读取 | P1 |
| A04 | M-07（矩阵 187；S-03 记录 §7.1-3） | `modelRouter.ts`（`StickyKey` patientId / visitId / none，取模一致性哈希） | 取模哈希在模型池增减节点时粘性漂移过大；缺虚拟节点环口径 | 纯函数一致性哈希升级为带虚拟节点环的哈希选择器（环规模入参可配，默认值离线常量）；同一粘性键在同一张规则表内跨请求结果稳定；不引入加密哈希之外的新依赖 | 纯追加 `modelRouter.ts`（虚拟环纯函数，原取模实现保留供回归对照）；测试追加 `modelRouter.test.ts` | 同键跨调用结果一致；不同键分布不出现单节点压倒性倾斜；规则表增删一个模型后已固定键的映射在可接受范围内保持稳定；粘性键为空时退化为非粘性决策 | P2 |
| A05 | M-09（矩阵 189；S-02 记录 §1.3-2；S-03 记录 §1.3-1） | `src/bff/agents/modelProvider.ts`（窄 `chat(messages, tools)` 既有在库，不改签名） | `ModelProviderPort` 宽接口、`ChatRequest / ChatResponse`、`streamChat`、token 用量回传仅缺类型契约；实现接真实供应商归 B14 | 仅落地类型契约与离线适配占位接口：`ModelProviderPort`（`chat / streamChat? / describeModel`）、`ChatRequest / ChatResponse / TokenUsage` 纯类型；不写真实 HTTP 调用、不改造既有 provider 工厂 | 新增 `src/bff/agents/modelProviderPort.ts`（types + 无行为的接口签名）；测试 `tests/unit/bff/agents/modelProviderPort.test.ts`（类型可装配的离线适配器样例） | 类型可被 S-02 注册表引用；既有 `modelProvider.ts` 导出与行为零改动；离线占位适配器在未注入时返回结构化未实现错误而非抛异常；无网络读取 | P2 |
| A06 | G-05a（矩阵 175；spec 3.2 / S-02·S-05 联动） | `modelRegistry.ts`、`modelRouter.ts` 现有规则与卡片引用口径 | 缺「科室 × 人员 × 文书类型」三维场景注册表内存模型与热更新版本号契约；三维绑定当前散落在规则匹配条件中 | 纯类型 + 内存台账：`ScenarioBinding`（三维键、绑定模型卡片 / 知识台账 / 提示词资产引用、生效版本号、`enabled`、`updatedAt`）；纯查询 / 匹配函数按三维键解析当前绑定；热更新以版本号与变更记录留痕，不接 DB、不接管理台 | 新增 `src/bff/agents/scenarioRegistry.ts`；测试 `tests/unit/bff/agents/scenarioRegistry.test.ts` | 三维键缺失字段按不约束处理；禁用绑定回退默认规则；变更记录可追溯版本号；不读取系统环境配置；与 S-03 路由规则引用标识不重复建模 | P2 |

### 3.2 提示词工程域（S-04）

| A 编号 | 关联编号 | 现状锚点（文件 / 测试 / 矩阵·spec 行） | 缺口描述 | 最小实现口径 | 涉及文件 | 单测要点 | 优先级 |
|---|---|---|---|---|---|---|---|
| A07 | P-01（矩阵 210；spec 3.4.3 494–507；S-04 记录 §1.3-5、§7.1-5） | `src/core/agent/SystemPromptBuilder.ts`（`ETHICS_LAYER` 硬编码常量，既有在库不改行为）；`src/bff/prompt/assetRegistry.ts`（system 层资产台账与强制前置校验）；`promptLoader.test.ts` 8/0/28 | 系统级红线仍为硬编码常量，未迁入 system 资产库；版本化变更记录与「不可覆盖」校验目前只对登记资产生效，未覆盖兜底文本 | 将 `ETHICS_LAYER` 既有六条文本作为首条 `system` 资产登记进内存台账（`version=1`、`riskLevel='high'`、`status='active'`）；加载链缺失 / 失效拒绝口径不变；无资产库配置时仍回退既有 `SystemPromptBuilder.build()`，11 例岗位提示词测试不回归；不迁移其他岗位提示词 | 纯追加 `assetRegistry.ts`（系统种子资产登记纯函数）；`promptLoader.ts` 接入种子兜底口径；测试追加 `tests/unit/bff/prompt/assetRegistry.test.ts`、`promptLoader.test.ts` | system 资产在库可查且版本号留痕；智能体包 `systemPrompt` 引用不得覆盖 system 层；种子资产缺失时加载链按既有拒绝分支留安全事件；回退路径既有断言保持通过 | P1 |
| A08 | P-02（矩阵 211；spec 3.4.2 454–492；S-04 记录 §1.2-P-02） | `assetRegistry.ts`（`fewShotRefs` 存在性与 active 状态校验） | Few-shot 引用仅做存在性 / 状态校验，运行时未把命中资产正文装配进场景层上下文 | 纯装配函数：按 `fewShotRefs` 顺序从资产台账取 active 资产正文，拼装为场景层 Few-shot 区块；引用缺失 / 失效时返回结构化错误（复用现有报错口径），不静默跳过 | 纯追加 `assetRegistry.ts` 与 `promptLoader.ts`（装配纯函数）；测试追加 `assetRegistry.test.ts` | 多条示例按序装配；失效引用阻断并给错误码；空引用清单返回空区块不报错；装配结果不含未登记资产文本 | P2 |
| A09 | P-05（矩阵 214；spec 3.4.4 509–520；S-04 记录 §7.1-6） | `src/bff/prompt/schemaGuard.ts`（现有子集：`type / required / properties / enum`）；`schemaGuard.test.ts` 13/0/47 | Schema 子集缺 `pattern`（正则）、`minimum / maximum`、`maxLength / minLength`、`items`（数组元素 Schema）、`oneOf` 关键字校验 | 在既有 `validateSchema` 内纯追加规则实现：字符串 `pattern` 用离线正则匹配；数值 `minimum / maximum`；字符串长度边界；数组 `items` 递归复用同一校验；`oneOf` 多候选恰好命中一条；不引入 ajv 等第三方依赖 | 纯追加 `schemaGuard.ts`；测试追加 `schemaGuard.test.ts` | 五类关键字正反用例齐全；嵌套 `properties + items` 路径错误定位到字段路径；`oneOf` 命中 0 / 2 条均报错；既有 type/required/properties/enum 断言不回归 | P1 |
| A10 | P-05（矩阵 214；S-04 记录 §1.1 重试降级闭环） | `schemaGuard.ts`（`planSchemaRetry` 重试决策 + 三级降级动作） | 校验失败清单未回写为下一轮提示词错误上下文；降级动作与错误原因之间缺少结构化携带 | 纯函数：把校验错误清单（字段路径 + 错误原因 + 期望值约束）格式化为重试上下文片段；`planSchemaRetry` 输出携带错误摘要；达到重试上限后按现有风险等级映射 `template-fallback / manual-queue / block-submit` | 纯追加 `schemaGuard.ts`；测试追加 `schemaGuard.test.ts` | 错误清单按字段归并；重试上下文不含模型原始大段输出；降级动作选择与既有风险等级映射一致；计数口径计入 `schemaFailureRate` | P2 |
| A11 | P-08（矩阵 217；S-04 记录 §7.1-2） | `assetRegistry.ts`（条目级 `changeLog` 对比预留，无内容快照与文本 diff） | 版本对比只到条目级变更记录，缺资产正文快照与文本级差异 | 纯函数：登记时保存正文快照；版本对比输出行级 / 条目级 diff（增 / 删 / 改标记 + 片段位置）；历史快照在内存台账内按版本号可取；不落库、不接 UI | 纯追加 `assetRegistry.ts`（快照存储与 diff 纯函数）；测试 `tests/unit/bff/prompt/promptVersionDiff.test.ts`（新增） | 未变更版本 diff 为空集；改动词条定位到正确行；快照不可被后续变更覆盖；内存台账规模受测试入参边界约束 | P2 |
| A12 | P-08（矩阵 217；spec 3.4.5 522–526；S-04 记录 §7.1-3） | `metricsAggregator.ts`（按 `agentId + scenario + promptVersion + 时间窗` 聚合采纳 / 修改 / 拒绝 / 修改字符 / Schema 失败） | 阈值告警仅有聚合结果，缺超阈值判定纯规则与告警事件结构 | 纯判定函数：对聚合结果按资产 / 智能体维度阈值表判定 `normal / warn / block`，产出结构化告警事件（维度、指标值、阈值、时间窗、动作建议）；阈值表内存可配置；不发外部通知、不落库 | 纯追加 `metricsAggregator.ts`；测试追加 `metricsAggregator.test.ts` | 比率类指标分母为 0 记 0；边界阈值含等于；五类异常分类口径与 S-06 `AbnormalKind` 对齐；告警事件不含患者正文 | P2 |

### 3.3 智能体管理域（S-06）

| A 编号 | 关联编号 | 现状锚点（文件 / 测试 / 矩阵·spec 行） | 缺口描述 | 最小实现口径 | 涉及文件 | 单测要点 | 优先级 |
|---|---|---|---|---|---|---|---|
| A13 | A-01（矩阵 223；spec 3.5.2 547–594；S-06 记录 §1.2-A-01） | `src/bff/agents/agentAdmission.ts`（`AgentRecord` / `DataScope` / `InterfaceInventory` / `validateAgentRecord`）；`agentAdmission.test.ts` 27/0/119 | 接口清单当前由登记人手工填写，缺对既有声明包工具 / 知识 / 模型引用的离线扫描草案 | 纯扫描函数：读取声明包定义（`tools[] / knowledgeBases[] / modelBinding`）与岗位注册表条目，生成 `InterfaceInventory` 草案（工具名、风险等级、知识域、模型卡片引用），不反向写入源注册表；缺失项在映射视图中继续标 `missingRequired` | 纯追加 `agentAdmission.ts`（扫描纯函数）；测试追加 `agentAdmission.test.ts` | 扫描结果与包内声明一致；未声明依赖不落清单；扫描器只读 `AgentDefinition` 与既有岗位注册表，不修改源头；两套注册表视图投影口径不变 | P2 |
| A14 | A-02（矩阵 224；spec 3.5.3 596–608；S-06 记录 §1.2-A-02、§7.1-5） | `agentAdmission.ts`（`riskLevel` 三级枚举 + `reviewRole` 门禁映射：high=专家复核、medium=医师确认、low 抽检） | 确认模式（全量 / 差异 / 抽样）与风险等级、智能体场景的配置化映射未台账化；三模式执行本身归 O-06 阶段② | 纯配置表 + 纯判定函数：按 `riskLevel × agentCategory` 推荐确认模式与复核角色；配置表入内存台账，门禁校验时一并返回建议模式；不实现三模式运行时执行，不改人工节点状态机 | 纯追加 `agentAdmission.ts`（模式映射表与判定纯函数）；测试追加 `agentAdmission.test.ts` | high 强制专家复核；medium 默认差异确认；low 可抽样；未登记映射给显式默认并标记待评审；与既有 `reviewRole` 门禁不冲突 | P2 |
| A15 | A-03（矩阵 225；spec 3.5.3 596–608；S-06 记录 §7.1-4） | `agentAdmission.ts`（`EvaluationReportRef` 三类台账、`recordEvaluation / getEvaluation`、`activate` 门禁） | 评测仅按整体通过率 ≥95% 判定；核心 / 非核心分组清单与分组通过率门禁未建模；评测集版本绑定结构已预留但未参与门禁校验 | 纯类型 + 纯门禁函数：评测集版本号、用例分组（核心 / 非核心）、分组通过率阈值表；`activate` 门禁按分组判定（核心 100%、非核心 ≥95% 口径待评审确认后以配置表落值）；评测集版本与智能体版本绑定记录归档进内存台账；不执行真实质量评测 | 纯追加 `agentAdmission.ts`（分组评测类型与门禁纯函数）；测试追加 `agentAdmission.test.ts` | 核心用例任一不通过禁止发布；非核心分组低于阈值禁止发布；评测集版本缺失禁止发布；既有整体通过率门禁断言不回归；阈值表未配置时回退既有整体口径并标记待评审 | P2 |
| A16 | A-04（矩阵 226；spec 3.5.4 610–622；S-06 记录 §7.1-3） | `agentAdmission.ts`（`recordRuntimeMetrics / queryRuntimeMetrics` 按 `agentId::version::scenario::department` 聚合，五类异常计数） | 人工干预点指标（挂起 / 确认 / 退回次数与节点位置，工作流节点 × 智能体版本）未纳入指标模型；与 S-05 监控事件字段尚未对齐 | 纯类型扩展：`HumanInterventionMetric`（动作类型、节点位置、智能体 id / 版本、时间窗）；内存记录与分组聚合纯函数；指标口径与 S-05 `monitoringEvents` 事件字段一一映射；不消费进程外事件流 | 纯追加 `agentAdmission.ts`（干预点指标类型与聚合纯函数）；测试追加 `agentAdmission.test.ts` | 三类动作计数独立可查；节点位置缺失时显式记未知；分组维度与既有运行指标一致；不引入事件总线订阅 | P1 |
| A17 | A-04（矩阵 226；S-06 记录 §7.1-3） | `agentAdmission.ts`（内存聚合查询） | 异常率 / 修改率超阈值告警与降级 / 暂停建议动作仅停留在数据层，缺离线判定与建议事件结构 | 纯判定函数：按智能体维度阈值表对聚合结果产出 `normal / warn / suspend-suggestion` 建议事件；建议事件进内存变更记录；真实降级 / 暂停执行归 B31（运行时管控 + 落库） | 纯追加 `agentAdmission.ts`（阈值判定纯函数）；测试追加 `agentAdmission.test.ts` | 五类异常分类与 A16 口径一致；分母为 0 比率记 0；建议事件含阈值与观测值，不含患者正文；阈值表可被测试入参覆盖 | P2 |
| A18 | A-07（矩阵 229；spec 3.5.2 547–594；S-06 记录 §1.2-A-07、§7.2） | `agentAdmission.ts`（`mapBffEntry / mapDeclarativeDefinition / buildMappingView / missingRequired / fieldCoverage`） | 两套注册表工具白名单尚未做双向比对；岗位工具清单与声明包 `tools` 的交集 / 差异无报告 | 纯比对函数：对映射视图内同一智能体，输出工具交集、仅岗位侧、仅声明侧三类清单与差异计数；只报告不反向同步；接口清单扫描结果与 A13 草案合并展示 | 纯追加 `agentAdmission.ts`（双向比对纯函数）；测试追加 `agentAdmission.test.ts` | 两侧一致时差异为空；单侧缺工具在视图标红项；比对不修改 `agentRegistry.ts` 与 `AgentRegistry.ts` 源头数据；无网络 / DB 读取 | P2 |
| A19 | A-01 / A-07（矩阵 223·229；S-06 记录 §7.1-7） | `agentAdmission.ts`（`AgentRecord`）；既有 `AgentDefinition.disclaimer` 字段在声明包内存在 | 准入记录未单列 `disclaimer`，当前并入 `description / reviewRole` 承载，与既有声明包字段口径不对齐 | 纯类型补字段：`AgentRecord.disclaimer?: string`，映射视图从 `AgentDefinition.disclaimer` 投影；校验规则与既有免责声明文案口径对齐；不新增 BFF 接口 | 纯追加 `agentAdmission.ts`（字段与投影纯函数）；测试追加 `agentAdmission.test.ts` | 有免责声明的包在视图可见；缺失不阻断准入（标可选字段）；既有映射测试断言不回归 | P2 |

### 3.4 安全审计域（S-01 / S-08 / S-12 联动）

| A 编号 | 关联编号 | 现状锚点（文件 / 测试 / 矩阵·spec 行） | 缺口描述 | 最小实现口径 | 涉及文件 | 单测要点 | 优先级 |
|---|---|---|---|---|---|---|---|
| A20 | S-03（矩阵 237；spec 3.3.5 419–442；S-12 记录 §1.2-R-06） | `src/knowledge-platform/citation/citationProtocol.ts`（`deriveEvidenceLevel`、`buildNoEvidenceAnswer`、none 级别约束）；`src/orchestrator/nodes/specialExecutors.ts`（rag 节点隔离 / 配额口径） | 拒答协议停留在纯函数层；进程内离线守卫未把「无命中 / 证据级别 none → 强制无依据答复」挂接进模型输出前置流程；拒答审计标记未形成纯映射 | 纯编排守卫函数：输入检索命中清单与既有 `evidenceLevel`，判定 `none / unsupported` 时强制走 `buildNoEvidenceAnswer` 模板并附拒答标记；产出可交给 S-08 审计事件的结构化引用快照；不调用真实模型、不挂接真实事件总线 | 纯追加 `src/knowledge-platform/citation/`（守卫纯函数，不新建独立运行时服务）；测试 `tests/unit/knowledge-platform/citation/evidenceGuard.test.ts`（新增） | `none` 级别不得出现确定性结论；有命中但无引用时走 CAUTION 口径；守卫输出不含原始患者正文；既有协议测试断言不回归 | P1 |
| A21 | S-04（矩阵 238；spec 3.6.4 683–737；S-01 既有在库） | `src/security/ai/outputGuard.ts`（虚构标识比对、确定性诊断红线、敏感词、矛盾字段、Schema 失败计数、未引用结论；PASS/CAUTION/BLOCK）；`tests/unit/security/outputGuard.test.ts` 18/0/40 | 规则集覆盖面仍偏骨架：矛盾表述模式、敏感词词表配置化、确定性表述变体模式可离线扩充；语义级比对归 B36 | 纯规则扩充：矛盾模式字典与敏感词表外置为内存配置表（可被测试替换）；确定性表述模式补充变体（「确诊 / 一定 / 保证」等分级）；规则输入沿用既有 `GuardContext`，不新增上下文字段；阈值配置化但默认值与现行行为一致 | 纯追加 `outputGuard.ts`（规则纯函数 + 词表配置）；测试追加 `outputGuard.test.ts` | 新增正反用例各覆盖一条规则；默认阈值下既有 18 例断言不回归；词表不含院方实名；规则纯函数无网络 / 时钟依赖 | P2 |
| A22 | S-05 / 四维留痕（矩阵 239·305；spec 3.6.5 738–767；S-08 记录 §7.1-6） | `src/security/audit/aiAudit.ts`（`AiVersionSnapshot` 四维字段、`exportTrace`）；`modelRegistry.ts`、`assetRegistry.ts`、`knowledgeRegistry.ts` 仅留存引用标识 | 四元组（模型 / 知识 / 提示词 / 发布版本）一致性仅做快照留存，缺跨台账离线强绑定校验：引用标识在对应台账存在、版本状态为 active、同一病历记录内四维快照一致 | 纯校验函数：审计入链前校验四元组引用标识可在内存注册表 / 资产台账 / 知识台账解析，版本状态有效；不一致返回结构化校验错误并阻断入链（与既有 `validateAiAuditInput` 口径衔接）；不解析 DB 仓储 | 纯追加 `aiAudit.ts`（绑定校验纯函数，复用既有三个内存注册表只读引用）；测试追加 `aiAudit.test.ts` | 四维齐全且有效通过；缺失 / 退役 / 版本不匹配被拒；校验错误不泄露台账内部结构；既有哈希链断言不回归 | P1 |

### 3.5 RAG 知识中台域（S-11 / S-12 / S-13）

| A 编号 | 关联编号 | 现状锚点（文件 / 测试 / 矩阵·spec 行） | 缺口描述 | 最小实现口径 | 涉及文件 | 单测要点 | 优先级 |
|---|---|---|---|---|---|---|---|
| A23 | R-01（矩阵 195；spec 3.3.2 343–388；S-11 记录 §1.2-R-01 联动） | `src/knowledge-platform/lifecycle/knowledgeRegistry.ts`（六域枚举、`ownerDepartment / owner / approver`、条目台账） | 域间交叉引用（病历规范引用制度条款等）无显式关联约束；条目引用其他域条目时缺少一致性 / 关联键校验纯规则 | 纯类型 + 纯校验函数：条目间交叉引用结构（引用条目 id、关联类型）；登记时校验被引条目存在且状态为 `approved`；域归属与引用规则表登记冲突即拒绝入库；不建图谱持久化存储 | 纯追加 `knowledgeRegistry.ts`（关联类型与校验纯函数）；测试追加 `knowledgeRegistry.test.ts` | 引用不存在 / 未批准条目被拒；同域交叉引用口径不变；关联记录随条目变更留痕；不读取外部知识目录 | P2 |
| A24 | R-02（矩阵 196；S-11 记录 §7.1-1） | `knowledgeRegistry.ts`（准入 / 评审状态机；`sources/connectors.ts` 五类接入器既有在库） | 接入失败重试计数、最后错误摘要、告警状态的内存台账类型与状态迁移规则未落地；文件夹监听 / 定时同步本身归 B16 | 纯类型 + 内存状态机：`IngestionAttempt`（接入器、条目键、尝试次数、最后错误码 / 摘要、告警状态 `silent / warned / escalated`、时间戳）；纯函数推进重试与告警状态；失败记录不含原文大段文本 | 纯追加 `knowledgeRegistry.ts`（接入尝试台账纯模块）；测试 `tests/unit/knowledge-platform/lifecycle/ingestionAttempt.test.ts`（新增） | 重试计数递增达阈值转 `warned` / `escalated`；成功后清除告警状态；错误摘要只存脱敏后的错误码与短消息；无定时任务、无文件监听 | P2 |
| A25 | R-04（矩阵 198；spec 3.3.2 343–388；S-11 记录 §1.2-R-04） | `knowledgeRegistry.ts`（六要素类型化入库拦截）；`src/knowledge/processing/TextSplitter.ts`（fixed/sentence/section/structure 策略既有在库，不改默认行为） | 表格 / 条款不跨块的专项切分规则未见；机构、生效日期等元数据缺省填充规则未类型化 | 纯切分规则纯函数：在既有结构策略上补表格边界、条款边界检测，边界冲突时整块保留 / 拆分到同一边界内；元数据缺省填充纯函数（机构 / 专科 / 密级默认值规则表，空值按规则补默认或标缺项拒绝，口径与现有拦截规则衔接）；不修改既有策略默认产出 | 纯追加 `src/knowledge-platform/processing/`（切分边界纯函数，与既有 `TextSplitter` 并存不回改）；测试 `tests/unit/knowledge-platform/processing/blockBoundary.test.ts`（新增） | 表格行不被切到两块；条款标题与其正文同块；缺省填充值可被测试入参覆盖；既有切分测试不回归；无外部字典查询 | P2 |
| A26 | R-05（矩阵 199；S-11 记录 §7.1-3） | `knowledgeRegistry.ts`（召回清单六域 / 专科 / 密级 / 科室 / 知识库精确过滤口径） | 缺进程内存态结构化标量索引视图：科室 / 专科 / 密级 / 生效期 / 权威等级 / 类型多维精确过滤索引；独立存储与双索引切换归 B18 | 纯函数构建内存标量索引（条目键 → 多维标量字段投影）；查询纯函数按条件集合做精确匹配与交集过滤；索引随内存台账变更重建；不落库、不接向量路 | 纯追加 `knowledgeRegistry.ts`（标量索引纯模块）；测试追加 `knowledgeRegistry.test.ts` | 六维条件组合过滤结果正确；过期 / 停用条目不进入索引；索引重建幂等；不引入数据库表结构 | P2 |
| A27 | R-06（矩阵 200；spec 3.3.5 419–442；S-12 记录 §1.2-R-06、§1.3-2） | `src/knowledge-platform/retrieval/hybrid.ts`（10/19 基线未改动；RRF + 规则重排既有在库）；`citationProtocol.ts`（命中去重 / 级别推导 / 拒答模板） | 协议层函数未挂接既有 hybrid 结果：标签前置过滤条件构造、`CitationHit` 映射、规则重排分值回填、低于阈值转 `buildNoEvidenceAnswer` 的进程内编排适配缺失；真实向量召回归 B19 | 纯适配器函数：把 `hybrid.search()` 既有命中结构映射到 `CitationHit`（chunkId / provenance / sectionPath / score）；调用 S-12 去重与级别推导；`minScore` 以下命中剔除并触发拒答模板；标签前置过滤条件由入参构造，不改动 hybrid 内部算法 | 纯追加 `src/knowledge-platform/citation/retrievalAdapter.ts`（新增纯适配模块，不回改 `hybrid.ts`）；测试 `tests/unit/knowledge-platform/citation/retrievalAdapter.test.ts`（新增） | 映射字段无损；阈值上下边界用例正确；剔除后命中为空时输出拒答结构；既有 hybrid 既有测试不回归；无 Embedding 供应商调用 | P1 |
| A28 | R-06（矩阵 200；S-12 记录 §7.1-3） | `citationProtocol.ts`（同 chunkId 首条去重） | 跨文档相似片段归并 / 重复引用折叠规则未实现；仅按 chunkId 去重 | 纯归并函数：按标题 + 章节路径 + 片段归一化哈希做近重复分组，同组保留代表片段、其余折叠为 `duplicates` 引用；分组阈值为离线配置常量；不计算语义向量相似度 | 纯追加 `citationProtocol.ts`（归并纯函数）；测试追加 `citationProtocol.test.ts` | 标题章节一致哈希命中归并；非同组不误折叠；折叠后引用编号连续；规则纯函数无网络依赖 | P2 |
| A29 | R-07 / P-07（矩阵 201·216；S-12 记录 §1.2-R-07；S-09 / S-10 输出 Schema） | `citationProtocol.ts`（`Citation` / `CitationPopupData` / `buildCitations`）；`src/bff/agents/outpatient/draftSchema.ts`、`src/bff/agents/inpatient/dischargeSchema.ts` | 门诊 / 住院草稿输出与 S-12 协议字段（`citations / missingInfo / evidenceLevel`）的对齐映射未补全；缺项清单与引用清单在两侧 Schema 的强制校验规则未统一 | 纯映射 + 纯校验函数：把门诊 / 住院输出结构映射到 S-12 协议字段；校验「诊断 / 建议类条目必须挂引用」「无依据结论 `evidenceLevel=none`」「缺失字段进 `missingInfo`」分级规则；不改两个包既有离线运行器行为断言 | 纯追加 `src/bff/agents/shared/citationAlignment.ts`（新增共享纯模块，门诊 / 住院两侧纯追加引用）；测试 `tests/unit/bff/agents/shared/citationAlignment.test.ts`（新增） | 无引用诊断建议被标 CAUTION；缺项清单与协议 `missingInfo` 结构一致；共用解读组件输出口径不变；前端展示归 B20 | P2 |
| A30 | R-08（矩阵 202；spec 3.3.2 373–388；S-13 记录 §7.1-7） | `src/knowledge-platform/isolation/patientIsolation.ts`（`IngestGuard` 纯函数校验与拒绝语义；`patientScope='none'` 类型拦截） | `IngestGuard` 未挂接既有通用知识接入器链路；通用知识类型模型对患者标识字段的显式禁止规则未纳入接入校验流程 | 离线适配模块：在既有接入器入口之前挂接 `IngestGuard` 调用点（拒绝响应码映射 + 接入事件记录纯函数），不改既有接入器公开签名与既有知识库类型模型；患者标识字段污染清单复用 S-11 既有拦截口径 | 纯追加 `src/knowledge-platform/isolation/ingestHook.ts`（新增纯适配模块）；测试 `tests/unit/knowledge-platform/isolation/ingestHook.test.ts`（新增） | 含患者标识文档被拒并产出拒绝事件；无患者标识文档放行；拒绝路径不写入通用知识库台账；不接 RBAC 会话、不做真实向量检索 | P2 |
| A31 | R-09（矩阵 203；spec 3.3.4 402–417；S-11 记录 §1.2-R-09） | `knowledgeRegistry.ts`（`conflictGroup` 分组与冲突标记、评审周期三结论归档） | 冲突候选自动检测规则缺失：同域同标题 / 同条款新版本进入时未自动归入冲突分组并挂人工确认状态；当前仅能手工指定 `conflictGroup` | 纯检测函数：登记新版本条目时按域 + 标题归一化 + 条款键匹配既有 active 条目，产出冲突候选分组建议；人工确认保留 / 融合决策驱动状态迁移；检测只给建议，不自动覆盖旧版 | 纯追加 `knowledgeRegistry.ts`（冲突检测纯函数）；测试追加 `knowledgeRegistry.test.ts` | 新版本命中同组候选；未命中不建组；人工确认状态迁移与现有状态机一致；检测规则纯字符串归一化，无向量相似度 | P2 |
| A32 | RAG ③ 清洗规范化（矩阵 259；S-11 记录 §1.3 边界对照） | `src/knowledge/processing/TextSplitter.ts`、`TerminologyService.ts` 既有在库；`sectionPath / provenance` 溯源在库 | 页眉 / 水印剔除、术语与单位统一尚未成为可复用的显式规则步骤纯函数；页码溯源完整性缺少离线校验口径 | 纯清洗规则纯函数集：页眉页脚 / 水印占位剔除规则表、单位归一化映射表、页码章节溯源字段完整性校验；规则以配置表注入，默认空规则不改变既有产出；不调用 OCR / 外部术语服务 | 纯追加 `src/knowledge-platform/processing/cleaningRules.ts`（新增纯模块）；测试 `tests/unit/knowledge-platform/processing/cleaningRules.test.ts`（新增） | 规则表可开关；未命中规则文本原样返回；单位映射冲突显式标记待人工；溯源字段缺失给出结构化缺项报告 | P2 |

### 3.6 编排层域（S-05 阶段①范围内补齐）

| A 编号 | 关联编号 | 现状锚点（文件 / 测试 / 矩阵·spec 行） | 缺口描述 | 最小实现口径 | 涉及文件 | 单测要点 | 优先级 |
|---|---|---|---|---|---|---|---|
| A33 | O-01（矩阵 279；spec 5.1 节点契约；S-05 记录 §1.2-O-01） | `src/orchestrator/dsl/schema.ts`、`nodes/registry.ts`、`nodes/specialExecutors.ts`（三类新节点已注册与白名单校验） | 子流程（`subagent` / 嵌套 loop / parallel）层级深度上限、入参 / 出参映射完整性 DSL 校验规则未固化；画布前端归 B47 | 纯 DSL 校验函数：子流程嵌套深度上限常量、子流程入参键存在性、出参映射目标键合法性、悬空映射报告；校验错误进入既有 DSL 校验错误清单；不改动既有节点执行语义 | 纯追加 `src/orchestrator/dsl/schema.ts` 与 `nodes/registry.ts` 校验段；测试追加 `tests/unit/orchestrator/specialNodes.test.ts` 或新增 `dslNestingRule.test.ts` | 超限深度拒绝；悬空映射报错；合法嵌套通过；既有工作流 DSL 既有用例不回归 | P2 |
| A34 | O-03（矩阵 281；spec 3.5.3 工具绑定口径；S-06 `ToolBinding`） | `src/bff/agents/agentAdmission.ts`（工具风险分级 / 确认模式声明）；`src/medical-tools/` 既有工具集在库；`toolRegistry.ts` 既有在库 | 工具频次 / 配额限制规则缺失：按工具 / 角色 / 时间窗的调用计数与限流判定纯函数未落地 | 纯类型 + 纯计数器模块：`ToolQuotaPolicy`（工具 id、角色集合、时间窗、上限）；内存计数器按键累计；判定函数返回 `allowed / throttled` 与剩余额度；计数进程内生命周期，不持久化 | 新增 `src/orchestrator/engine/toolQuota.ts`（纯内存模块）；测试 `tests/unit/orchestrator/toolQuota.test.ts`（新增） | 窗口内超限拒绝；窗口外计数不累计；未配置策略默认放行；计数不携带患者正文；不接外部配额服务 | P1 |
| A35 | O-03（矩阵 281；联动 A-01；S-05 记录 §1.3 边界） | `agentAdmission.ts`（`ToolBinding`）；`src/medical-tools/` 工具定义 | 工具清单与智能体准入台账未做交叉校验；ICD 查询等专用工具参数 Schema 规范化缺少离线校验 | 纯比对函数：声明包工具清单与注册表工具定义比对（存在性、风险等级一致性、确认模式匹配）；参数 Schema 轻量校验复用 A09 子集规则；不新增工具实现 | 纯追加 `agentAdmission.ts`（比对纯函数）；编排侧参数 Schema 校验纯函数落 `toolQuota.ts` 同模块；测试追加 `agentAdmission.test.ts`、`toolQuota.test.ts` | 未注册工具在准入视图标缺；风险等级不一致报警告；参数 Schema 非法给出字段路径错误；不修改工具白名单既有执行路径 | P2 |
| A36 | O-04（矩阵 282；spec 5.3 1068–1101；S-05 记录 §1.2-O-04） | `src/orchestrator/engine/context.ts`、`snapshotStore.ts`、`snapshotService.ts`（内存快照仓储与回填契约）；`agentContext.ts`、`contextSummary.ts` 既有在库 | 长住院「摘要 + 关键节点」压缩策略规则未固化；跨会话状态（患者档案 / 进度节点 / 未完成任务）纯类型契约未在编排器层定义；状态落库归 B49 | 纯规则 + 纯类型：关键节点类型保留清单（危急值 / 手术 / 过敏 / 诊断变更 / 出院节点等）与压缩触发条件纯函数；跨会话状态快照结构（患者档案引用、当前进度节点、未完成任务队列）纯类型与序列化 / 反序列化纯函数；不接 DB、不与 BFF 运行实例对齐 | 纯追加 `src/orchestrator/engine/context.ts` 与新增 `compactionPolicy.ts`；测试追加 `tests/unit/orchestrator/snapshotResume.test.ts` 或新增 `compactionPolicy.test.ts` | 关键节点类型不被压缩；触发条件按节点类型 / 条目数判定；状态快照可序列化回填；纯函数无系统时钟以外的进程外依赖 | P2 |
| A37 | O-07（矩阵 285；spec 5.5 异常处理；S-03 主备决策、S-05 降级节点既有在库） | `nodes/basicExecutors.ts`、`controlExecutors.ts`（RetryPolicy / fallbackNode / compensationNode / continueOnError 既有在库）；`modelRouter.ts`（离线主备决策） | 降级链有序决策纯状态机未统一：重试 → 备用模型决策 → 转人工提示的顺序判定与兜底文案模板表分散在既有节点配置中 | 纯决策函数：按节点重试计数 → 备用模型决策（复用 S-03 离线结果）→ 转人工占位的有序链产出 `nextAction`；三级兜底文案模板表内存配置；不执行备用模型真实调用、不创建人工队列 | 纯追加 `src/orchestrator/engine/fallbackChain.ts`（新增纯模块）；测试 `tests/unit/orchestrator/fallbackChain.test.ts`（新增） | 顺序不可跳级；重试耗尽才转备用决策；备用不可用转人工占位；文案模板不含确定性诊断表述；既有重试 / 回退节点断言不回归 | P2 |
| A38 | O-09（矩阵 287；S-05 记录 §7.1-2） | `snapshotStore.ts`、`engine/state.ts`（合法迁移校验；可续跑状态 WAITING_HUMAN / PAUSED / FAILED） | 节点成功完成边界快照状态为 `RUNNING`、不可作为续跑源的语义规则仅留存在记录文字中，迁移校验与拒绝分支未在离线代码内显式固化 | 纯状态迁移矩阵补全：成功完成边界快照标注不可续跑语义；`resumePlan` 对不可续跑快照返回结构化拒绝原因；可续跑状态集合白名单化；不改变既有三类可续跑用例断言 | 纯追加 `snapshotStore.ts` / `snapshotService.ts`（迁移矩阵纯函数）；测试追加 `snapshotResume.test.ts` | RUNNING / 已完成边界快照被拒续跑；三类可续跑状态通过；拒绝原因结构化可审计；哈希链桥接口径不变 | P2 |
| A39 | P-04（矩阵 213；spec 3.4 任务级上下文；S-04 记录 §1.3-1，归 S-05） | DSL `userTemplate` 变量插值既有在库；`agentContext.ts`、`contextSummary.ts` 既有在库；`draftSchema.ts` 门诊草稿结构 | 增量编辑上下文（已有病历内容段、光标位置 / 段落标识）纯数据契约与组装纯函数未建模；真实光标取自前端编辑器归 B51 | 纯类型：`IncrementalEditContext`（已有内容分段标识、光标所在段落 / 偏移、医师指令）；组装纯函数把该结构接入既有 DSL 上下文变量口径；患者信息 / 历史摘要 / 知识片段继续走既有上下文变量，不重复建模 | 纯追加 `src/orchestrator/engine/context.ts` 与 `src/bff/agents/shared/` 上下文映射纯函数；测试 `tests/unit/orchestrator/incrementalContext.test.ts`（新增） | 缺字段时上下文显式为空不报错；段落标识可被模板引用；不解析前端事件流；既有模板插值测试不回归 | P2 |
| A40 | P-06（矩阵 215；S-04 记录 §1.3-2，归 S-05） | `medical-record-writer` 既有提示词与 `src/knowledge/qc/intrinsicReasoning.ts` 推理分层既有在库 | 「提纲 → 填充 → 润色」三阶段标准流程模板与「事实提取 → 规范比对 → 差异识别 → 性质判断 → 建议」五步法提示词层规则未固化为可注册的离线 DSL 模板与规则纯函数 | 纯模板 + 纯规则模块：三阶段节点序列 DSL 样例（声明式，不接真实模型执行）；五步法检查项类型与逐条命中判定纯函数；模板注册进离线目录供校验；不改动既有岗位工作流 | 新增 `src/orchestrator/presets/outlineDraftPolish.ts`（纯模板 + 规则模块）；测试 `tests/unit/orchestrator/presetTemplates.test.ts`（新增） | 模板通过 DSL 结构 / 语义校验；五步法检查项缺项给出清单；模板不含院方实名与真实患者片段；既有 10 个声明包校验不回归 | P2 |
| A41 | P-07（矩阵 216；S-12 协议联动；S-09 / S-10 输出 Schema） | `citationProtocol.ts`（`missingInfo / evidenceLevel / citations`）；`outpatient/draftSchema.ts`、`inpatient/dischargeSchema.ts` | 缺失字段清单、引用清单与证据级别在门诊 / 住院草稿 Schema 层的强制校验规则未完全对齐到协议口径（与 A29 互补：A29 管映射，本行管分级校验纯规则） | 纯校验规则集：无依据结论标注「（待核实）」、缺失字段必须进 `missingInfo`、诊断 / 建议条目引用必填、`evidenceLevel=none` 禁止确定性表述；规则按文书类型分级配置；校验结果喂给既有 S-01 输出守卫 | 纯追加 `src/bff/agents/shared/citationAlignment.ts`（规则纯函数部分）；测试追加 `citationAlignment.test.ts` | 各级规则正反用例；规则不修改草稿正文；与 A20 拒答守卫口径一致；不接前端展示组件 | P2 |

### 3.7 门诊 / 住院智能体包挂载与配置（S-09 / S-10 / S-06 联动）

| A 编号 | 关联编号 | 现状锚点（文件 / 测试 / 矩阵·spec 行） | 缺口描述 | 最小实现口径 | 涉及文件 | 单测要点 | 优先级 |
|---|---|---|---|---|---|---|---|
| A42 | C-01（矩阵 246；S-09 记录 §7.1-7） | `agents/medical-record-outpatient/` 声明包在库；`agents/manifest.json` 现行 10 包未含该包；`src/orchestrator/pack/directoryLoader.ts` 既有在库 | 门诊新包未登记 `agents/manifest.json`；目录加载器挂载方案缺离线配置口径；真实 BFF 路由 / 工作台页面归 B52 | 纯配置方案：在 manifest 清单纯追加门诊包条目（包 id、版本、目录、风险等级、角色集合，口径对齐既有 10 条 schema）；directoryLoader 映射纯函数补该包加载路径；不改动既有 10 包条目、既有 BFF 调用面与公开函数签名；注册表写入侧合并归 B34 | 纯追加 `agents/manifest.json`（仅清单条目，桶文件追加）；纯追加 `src/orchestrator/pack/directoryLoader.ts` 映射；测试 `tests/unit/orchestrator/packManifest.test.ts`（新增） | 新包条目通过 schema 校验；加载器可解析该包目录元数据；既有 10 包加载结果不变；包内声明通过既有 DSL 校验；不产生 HTTP 路由 | P2 |
| A43 | C-02（矩阵 247；S-10 记录 §7.1-7） | `agents/medical-record-inpatient/` 声明包在库；manifest 未含该包；directoryLoader 既有在库 | 住院新包同样未登记 manifest；加载器挂载方案缺离线配置口径；真实 BFF 路由 / 查房 / 出院页面归 B53 | 同 A42 口径：manifest 纯追加住院包条目；directoryLoader 映射补加载路径；与门诊包条目并列，不改既有条目与签名 | 纯追加 `agents/manifest.json`；纯追加 `directoryLoader.ts`；测试并入 `packManifest.test.ts` | 两包条目均通过 schema 校验；加载器解析口径一致；既有包零回归；不接前端页面 | P2 |
| A44 | C-02（矩阵 247；S-10 记录 §7.1-8） | `src/bff/agents/inpatient/` 时限规则引擎（24h / 8h / 分级频次 / 30 天 / 出院 24h、`DUE_SOON_HOURS=2` 合成默认参数） | 时限参数硬编码在规则内，未形成外置配置表与「合成默认参数 / 院方校准参数」分离口径；院方制度校准决策归 B53 | 纯配置表 + 纯读取函数：时限参数外置为内存规则配置（文书类型 → 时限小时数、临期阈值）；默认合成参数保留为兜底；参数缺失回退默认并标记待校准；不发起制度文本评审、不改既有规则判定结果断言 | 纯追加 `src/bff/agents/inpatient/timeLimitConfig.ts`（时限配置表与纯读取函数）；测试 `tests/unit/bff/agents/inpatient/timeLimitConfig.test.ts`（新增用例追加） | 默认参数行为不变；配置覆盖默认参数生效；未配置文书类型回退兜底；参数表不含院方实名制度文号 | P2 |

## 4. B 类缺口台账（受环境或阶段边界阻塞，本轮只登记不实现）

> 列说明：阻塞依赖按「DB 持久化 / 网络供应商 / 真实 LLM·ASR·Embedding / 前端·BFF·看板 / 阶段边界 / 外部评审」标注；归属阶段对齐 spec 10.1（1404–1443 行）与矩阵 5.2 切片台账（347–365 行）。

### 4.1 平台网关与模型管理（G / M）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B01 | G-01（矩阵 171；S-21 台账 363） | `src/integration/` 50 文件；BFF `fhir.ts / fhirGatewayV5.ts / fhirResources.ts / fhirOperationsRoutes.ts`；HL7 / FHIR 集成测试既有在库 | 缺统一网关管理模型：接入系统台账、接口清单、字段映射、健康状态、配额 / 限流、消息总线订阅状态按系统维度展示 | BFF 台账路由 + 前端管理台；院方提供真实对接系统清单与字段映射；运行态健康探测与配额统计需进程外采集；DB 持久化 | 阶段③ S-21 |
| B02 | G-02（矩阵 172；S-22 台账 364） | `src/voice/` 8 文件；`src/orchestrator/adapters/voiceAsrToolAdapter.ts`；`agents/voice-medical-record/`；ASR 提供方可插拔接口 | 说话人分离、医嘱 / 口述分段、医疗术语纠错回显未在网关注册为可观测接入项；真实转写通道未接 | 真实 ASR 供应商凭证与语音流通道；供应商在网关注册台账；术语纠错回显涉及双向界面 | 阶段③ S-22 / 供应商选型批次 |
| B03 | G-03（矩阵 173；R-03 197；S-22 台账 364） | `src/knowledge-platform/sources/connectors.ts`（file/api/database/crawler/terminology；现场 grep 无 OFD/OCR 命中）；`RawDocument.format` 枚举 txt/md/pdf/docx/xlsx/csv/html/json | OFD 格式类型、扫描件 OCR 解析链路、人工校对界面在类型与流水线中均未登记；PDF/Word 解析深度待复核 | OCR/OFD 外部组件选型与许可证；解析结果人工校对队列与前端界面；扫描件图像输入通道 | 阶段③ S-22 |
| B04 | G-04（矩阵 174；S-23 台账 365） | EMPI 域 `src/bff/`；`src/security/desensitization/`；M5-E 数据质量规则引擎；M5-D 血缘加工引擎；`TerminologyService.ts` | 缺「接入层」统一台账视角：哪类数据从哪个系统来、经过哪些治理动作、血缘到哪个智能体 / 知识块 | 跨 M5 既有里程碑聚合器 + 前端治理视图；治理动作与血缘元数据持久化；跨系统数据字典对接 | 阶段③ S-23 |
| B05 | G-05b（矩阵 175；联动 M-02 / A-04） | `modelRouterV5.ts`、`agentHealth.ts`、`personalAgentAdoption.ts` 等历史路由；`AgentDefinition.allowedRoles`、`KnowledgeBase.tenantId` 既有在库 | 场景维度 Token 成本、满意度按科室 / 人员 / 文书类型聚合的数据链未闭环；看板不可用 | 指标落库（DB 时间窗聚合）；真实 LLM 用量与满意度采集；前端看板页面与 BFF 查询接口 | 阶段①收尾后的运营看板批次（非本轮离线范围） |
| B06 | M-01（矩阵 181；S-02 台账 347） | `src/bff/agents/modelRegistry.ts`（内存卡片台账与校验；测试 36/0/106） | 模型卡片台账进程内存态重启丢失；缺 DB 表结构与权威仓储；缺 BFF 模型信息路由与前端模型管理台 | DB 持久化表结构与迁移；BFF HTTP 接口；前端卡片管理页面；与 `clinical.medmuse_agents` 等既有权威表对齐 | 后续平台里程碑（合规 / 数据层批次） |
| B07 | M-02（矩阵 182；S-02 / S-03 联动） | `modelHealthProbe.ts`（注入式探针、失败计数、熔断 / 半开内存状态）；`modelRouter.ts` 健康判定离线决策 | 真实 HTTP 主动探测未接；时延 / 成功率 / 错误率未按模型维度持久化与展示；异常摘除后备用模型真实接管未编排 | 网络探测通道（真实供应商可达性）；指标 DB 持久化；前端健康看板；备用 provider 实例管理（见 B11） | 后续模型接入批次 |
| B08 | M-03（矩阵 183；S-02 / S-07 台账 352） | `modelRegistry.ts`（版本台账内存态、`previousVersion` 指针、退役留痕元数据） | 模型自身版本（基座升级、微调批次、提示词绑定版本）台账未持久化；真实一键回滚执行、灰度 / 影子编排未落地 | DB 版本台账与发布历史；模型升级七步流程状态机（B61）；版本指针回滚执行环境 | 阶段② S-07 主体；持久化随数据层批次 |
| B09 | M-04（矩阵 184；S-03 台账 348） | `modelRouter.ts`（`trafficWeight` 权重分流、影子模型标记仅留痕；测试 36/0/109） | 双模型并行真实调用对照、指标比对未做；影子模型不执行只记录；无 A/B 对照样本集与结论判定 | 真实双 LLM 调用通道；对照指标落库与统计；盲评 / 对照样本集；灰度期看板 | 阶段② S-07 / S-03 后续 |
| B10 | M-05（矩阵 185；S-03 台账 348） | `modelRouter.ts`（六维规则匹配离线决策） | 真实供应商时延 / 成本 / 负载指标未采集；长上下文（≥32K，建议 128K）选型依赖真实模型能力参数；温度等默认参数未按场景 / 卡片下发到真实 provider | 真实供应商指标与生产数据校准；provider 宽接口实现（B14）；运行时参数下发链路 | 后续模型接入批次 |
| B11 | M-06（矩阵 186；S-03 台账 348） | `modelRouter.ts`（`fallbackModelId` 离线切换决策与切换事件内存留痕） | 备用 provider 真实接管未接；切换后质量比对未做；切换事件未入持久化审计链 | 真实备用模型实例与调用通道；切换质量比对指标；事件持久化（B37 联动）；熔断状态跨进程共享 | 后续模型接入批次 / 阶段② S-07 |
| B12 | M-07（矩阵 187；S-03 台账 348） | `modelRouter.ts`（patientId / visitId 粘性哈希离线决策） | 粘性绑定跨会话 / 跨进程持久化缺失；进程重启后同一就诊过程模型版本漂移不可避免 | DB 粘性绑定记录与读取；会话上下文持久化层（B49 联动） | 后续数据层批次 |
| B13 | M-08（矩阵 188；S-02 台账 347） | `modelRegistry.ts`（`tier: primary/auxiliary/specialized` 与 `ModelRole` 枚举内存登记） | 向量化 / 重排 / ASR / OCR 等辅助模型未纳入注册表统一观测；专用规则与小模型边界未形成书面分层文档 | 辅助 / 专用模型供应商注册与指标采集；分层边界规程评审；知识库规则与小模型边界文档化 | 阶段③ 辅助模型接入批次（矩阵 1443 行剩余项） |
| B14 | M-09（矩阵 189；S-02 / S-03 边界声明） | `modelProvider.ts`（窄 `chat(messages, tools)` 既有在库）；`src/orchestrator/adapters/llmAdapter.ts`、`multimodality.ts` 既有在库 | `ModelProviderPort` 宽接口真实实现、流式传输、token 用量回传、模型元数据暴露、多模态纳入统一接口未落地；供应商切换需改代码而非配置 | 各供应商 SDK / 网络协议适配；流式响应通道；多模态接口契约评审；provider 工厂配置化改造（涉及既有调用面，需架构专项） | 后续模型接入批次（A05 仅先落类型契约） |

### 4.2 RAG 知识中台（R）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B15 | R-01（矩阵 195；S-11 台账 356） | `knowledgeRegistry.ts`（六域枚举与内存台账；测试 24/0/90） | 医院管理制度、运营问答两域真实内容占比薄弱；域间交叉图谱关联未建；真实知识内容需院方提供并完成准入评审 | 外部知识内容采集与院方授权；内容评审流程；知识条目 DB 持久化；跨域图谱关系存储 | 阶段①收尾内容补充 / 后续知识扩充批次（阶段③全院知识库扩充，1443 行） |
| B16 | R-02（矩阵 196；S-11 记录 §7.1-1） | `connectors.ts` 五类接入器既有在库；`knowledgeRegistry.ts` 台账类型 | 文件夹监听（增量 watch）、定时增量同步任务、接口推送接入器、接入台账与失败重试告警运行时未实现 | 进程调度器 / 文件系统监听在生产环境运行；外部系统接口推送网络对接；接入记录 DB 持久化；告警通知渠道 | 后续采集批次（S-11 后续）；通知渠道归 B 类运行态 |
| B17 | R-03（矩阵 197；S-11 记录 §7.1-2；S-22 台账 364） | `processing/pipeline.ts`、`DocumentParser.ts`、`TextSplitter.ts` 既有在库；`RawDocument.format` 无 OFD/OCR 类型 | 扫描件 OCR 链路、OFD 格式解析、解析失败人工校对队列与前端校对界面缺失 | OCR/OFD 外部组件选型与许可证；图像 / 版式解析服务；人工校对前端界面与队列持久化 | 阶段③ S-22 |
| B18 | R-05（矩阵 199；S-11 记录 §7.1-3；10.4 双索引切换） | `knowledgeRegistry.ts`（内存精确过滤口径）；`hybrid.ts` 向量 / 关键词 / 图谱三路既有在库 | 独立结构化标量索引持久化存储、向量 / 标量双索引并行与切换协议、旧索引回滚窗口未实现 | DB / 独立索引存储；索引重建与切换运维协议；检索回归测试集 | 后续检索服务批次（S-11 后续） |
| B19 | R-06（矩阵 200；S-12 记录 §1.3-2；S-12 台账 357） | `hybrid.ts`（RRF + 规则加权 `rerank()`）；`citationProtocol.ts` 协议层闭环 | 独立重排模型接入未做；向量路真实 Embedding 未接（当前 HashingEncoder 占位）；跨服务检索运行时部署未做 | 重排模型 / Embedding 供应商选型、凭证与网络调用；检索服务进程外部署；成本与延迟评估 | 阶段③ 辅助模型接入批次 / 后续检索服务批次 |
| B20 | R-07（矩阵 201；S-12 记录 §1.3-1） | `citationProtocol.ts`（`CitationPopupData` 纯映射、`findCitationByRef` 回查） | 前端 `[n]` 编号锚点定位、弹窗展示原文片段 / 章节 / 来源机构 / 生效日期 / 密级的组件与路由未做；引用台账持久化缺失 | 前端组件与路由开发；弹窗快照与引用记录 DB 持久化；与既有追溯页面（`ai-advice-trace` 等）归并方案 | 后续前端批次（spec 1417 验收「引用弹窗闭环」剩余前端部分） |
| B21 | R-08（矩阵 202；S-13 记录 §7.1-1~7；合规 P0-④ 328） | `patientIsolation.ts`（隔离服务、IngestGuard、越权审计内存闭环；测试 33/0/98） | 真实归档批量任务调度、向量相似度打分与 hybrid 接线、RBAC 会话真实解析、BFF 隔离路由、前端相似病例页、隔离索引持久化、患者文档实时取数工具节点改造均未落地 | 定时归档调度与业务系统历史病例抽取；真实向量相似度（B19）；RBAC 会话上下文中间件；BFF 路由 + 前端页面；DB 索引存储；患者文档实时取数接口（HIS/EMR 授权）；RLS 合规改造（B76） | 后续数据接入批次 / BFF 前端联调批次 / 合规 P0-④ 批次 |
| B22 | R-09（矩阵 203；S-11 记录 §7.1-4、§7.1-8） | `knowledgeRegistry.ts`（准入留痕、生效 / 失效、冲突分组、季度评审内存台账） | 知识台账 / 评审记录持久化落库缺失；评审到期提醒依赖外部通知渠道；历史生成记录与当时知识版本快照强制绑定归 S-08 / S-12 联调 | DB 台账仓储；通知渠道（B55 联动）；S-08 审计链与 S-12 引用记录联调；历史快照表（B74 联动） | 后续数据层批次 / 合规联调批次 |

### 4.3 提示词工程（P）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B23 | P-01（矩阵 210；S-04 记录 §7.1-4、§1.3-3） | `assetRegistry.ts`（system 层台账与强制前置校验内存态）；`SystemPromptBuilder.ETHICS_LAYER` 既有在库 | 系统级提示词管理台热更新页面、BFF 资产台账路由、资产持久化落库缺失；模型实际收到系统提示词的逐 provider 链路需运行时集成复核 | 前端管理台页面；BFF 路由与 DB 仓储；真实 provider 链路集成测试；资产变更审计与发布流程 | 后续 BFF / 前端批次 / 数据层批次 |
| B24 | P-02（矩阵 211；S-04 记录 §1.3 边界） | `assetRegistry.ts`（场景层台账、Few-shot 引用校验）；`LlmNodeConfig.userTemplate/jsonMode/jsonSchema` 既有在库 | Schema 校验失败后的自动重试在真实模型调用层端到端执行、降级到人工撰写的真实队列未接线 | 真实 provider 重试通道；人工队列持久化与 BFF 任务台；运行时事件落库 | 后续运行时批次（离线重试决策已由 S-04 / A10 闭环） |
| B25 | P-03（矩阵 212；S-04 记录 §1.3 边界） | `assetRegistry.ts`（department 层备案字段内存态）；`buildDepartmentLayer` 既有在库 | 科室提示词包与病历模板域统一治理未做；科室备案管理前端页面缺失；专科习惯模板跨域归属未对齐 | 架构专项确定提示词与模板两套体系归并口径；前端备案台；DB 台账持久化 | 后续架构专项 / 前端批次 |
| B26 | P-05（矩阵 214；S-04 台账 349） | `schemaGuard.ts`（轻量子集校验、重试决策、三级降级动作内存闭环） | 真实模型调用层重试执行、校验失败降级转人工队列、前端人工撰写入口未落地 | 运行时 provider 重试通道；人工队列持久化；前端撰写入口与任务通知 | 后续运行时 / BFF / 前端批次 |
| B27 | P-08（矩阵 217；S-04 记录 §7.1-2、§7.1-4） | `assetRegistry.ts`（变更记录 / 指标聚合内存态；`encrypted` 布尔标记 + 加密器接口预留默认透传） | 真实静态加密器接入 KeyManager；资产持久化；版本对比 / 回滚 BFF 路由与前端页面；采纳率埋点落库三维聚合；资产权属与医院归属证明流程未闭环 | 既有 AES-256-GCM / KeyManager 接入与密钥轮换（B77）；DB 资产仓储；前端版本管理台；埋点数据落库与统计服务；权属登记合规流程 | 后续数据层 / 前端 / 合规批次 |

### 4.4 智能体管理（A）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B28 | A-01（矩阵 223；S-06 记录 §7.1-2、§7.1-7） | `agentAdmission.ts`（`AgentRecord` 字段全集与完整性校验内存态；测试 27/0/119） | 写入层收敛与 DB 仓储未做；内存台账与 `clinical.medmuse_agents` 权威表对齐、两套注册表写入侧合并归后续批次；准入申请 / 审批页面缺失 | DB 表结构与迁移；ADR-01 第二步架构迁移（涉及既有 BFF 调用面，需分步）；前端准入申请 / 审批台 | 后续数据层 / 架构迁移批次（spec 1412 门禁中「两套注册表映射视图」第一步已离线闭环） |
| B29 | A-02（矩阵 224；S-06 记录 §7.1-5） | `agentAdmission.ts`（三级风险 + 复核角色门禁映射） | `medical-record-qc` 现包标 `low`，与方案「质控结论属高风险需专家复核」口径不一致；定级校准需医务部 / 架构组评审签字；复核角色组织架构需真实解析 | 外部评审决策（医务部 / 架构组）；真实 RBAC 组织架构与角色映射（B73 联动）；评审记录留痕落库 | 外部评审通过后的配置批次；不得在评审前自行改包定级 |
| B30 | A-03（矩阵 225；S-06 记录 §7.1-4） | `agentAdmission.ts`（三类评测台账内存态、发布门禁纯函数） | 评测集与评测记录持久化归档缺失；真实质量评测 / 安全对抗执行环境（评测集、样本、运行器）未建；评测管理前端页面缺失 | 评测数据集与版本管理仓储；评测执行工具链与运行环境；前端评测管理台；边界对抗用例库外部共建 | 后续质量工程批次 |
| B31 | A-04（矩阵 226；S-06 记录 §7.1-3） | `agentAdmission.ts`（四维内存聚合、五类异常计数） | 指标按智能体维度落库与时间窗持久化聚合缺失；异常率超阈值告警的真实降级 / 暂停动作未执行；监控看板前端页面缺失 | DB 指标仓储与聚合查询；运行时管控动作（挂起 / 暂停智能体）接入生产环境；前端监控看板；通知渠道 | 后续数据层 / 运行时管控 / 前端批次 |
| B32 | A-05（矩阵 227；3.6 灰度行 297；S-07 台账 352） | `agentAdmission.ts`（`DeploymentPolicy.dimensions` 仅配置结构与 `trafficPercent ∈ [0,100]` 校验） | 五维灰度（科室 / 医师 / 文书类型 / 患者分组 / 流量比例）运行时哈希分流、新旧版本并行指标对照、开关回滚与版本指针回滚全部未实现 | 灰度分流中间件与运行时配置；灰度期指标对照仓储与看板；模型 / 提示词版本联动回滚执行环境 | **阶段② S-07**（spec 1428；本轮禁止开工） |
| B33 | A-06（矩阵 228；S-06 记录 §7.1-1 联动） | `agentAdmission.ts`（`draft → review → staging → active → paused → retired` 状态机与 `retiredInfo` 内存闭环；`isCallable` 白名单） | 退役归档包持久化、DB 权威表对齐、历史版本检索 BFF 路由与前端页面缺失 | DB 归档仓储；归档包版本快照存储；BFF 检索接口与前端归档页 | 后续数据层 / BFF / 前端批次（状态机本体已离线闭环） |
| B34 | A-07（矩阵 229；S-06 记录 §7.1-2） | `agentAdmission.ts`（两套注册表映射视图、`missingRequired`、`fieldCoverage` 只读投影内存态） | 两套注册表写入侧合并、DB 权威模型统一、工具白名单双向校验后的源头数据修正未做；合并涉及既有 BFF 调用面 | ADR-01 第二步架构决策与分步迁移计划；DB 权威表改造；既有岗位注册表代码迁移评审 | 后续架构迁移批次（第一步映射视图已离线闭环） |

### 4.5 安全审计（S 行）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B35 | S-03（矩阵 237；S-12 记录 §1.3 边界） | `citationProtocol.ts`（`buildNoEvidenceAnswer` 拒答模板与 none 级别约束）；`outputGuard.ts`（unsupported-claim 规则） | 生成层真实模型在无检索命中时自由发挥的拦截需运行时集成；拒答审计标记落库与多维检索未做 | 运行时模型输出前置守卫全链路接线；审计事件持久化（B37）；真实模型输出回归测试集 | 后续运行时 / 合规批次 |
| B36 | S-04（矩阵 238；S-01 台账 346） | `outputGuard.ts`（六类规则骨架 + 三级处置；测试 18/0/40） | 语义级事实一致性比对（幻觉 / 事实矛盾语义判定）未做；校验器挂接全部既有 provider 出口的运行时接线未做；规则阈值需临床盲评校准 | 真实 LLM / 语义比对模型；provider 出口统一拦截点改造（涉及既有调用面，需架构评审）；临床专家盲评样本集与阈值校准 | 后续安全工程批次 / 阶段③ 语义模型接入 |
| B37 | S-05（矩阵 239；3.7 四维留痕 305；合规 P0-③ 327；S-08 台账 353） | `aiAudit.ts`（专项字段、四维快照、多维 AND 内存检索、SHA-256 内存链、`exportTrace`；测试 21/0/85） | WORM 持久化落库与周期 `verifyChain` 断裂告警未做；27 条病历写路径事务内入链未接线；AI 事件多维检索 BFF 路由与审计看板前端未做；真实 RBAC 判定未执行 | DB WORM 存储 / `audit.audit_logs` 链表；27 条写路径事务改造（合规 P0-③）；BFF 审计检索接口；前端审计看板；真实会话身份上下文（B73）；出口脱敏拦截（B78） | 合规 P0-③ 批次 / 后续 BFF 前端批次（内存台账与哈希链本体已离线闭环） |

### 4.6 阶段②智能体包（C-03 ~ C-06，spec 1429–1432，本轮禁止开工）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B38 | C-03（矩阵 248；S-14 台账 359；spec 1429） | 现场核实：`agents/medical-record-surgery/` 目录不存在；既有 `surgery*` / `anesthesia*` 页面与 M9-C 手术麻醉、`surgeryLogic.test.ts` 等基线在库 | 手术记录生成声明包整体未建：八段式经过结构化模板、意外情况主动提示规则、植入物耗材条目化、术前 / 麻醉 / 手术 / 术后七项一致性核查、术后首次病程自动生成触发 | 阶段②放行；与手麻系统接口字段映射现场对接；手术术语 / 字典外部接入；规则阈值临床专家评审 | **阶段② S-14** |
| B39 | C-04（矩阵 249；S-15 台账 360；spec 1430） | 现场核实：`agents/medical-record-consultation/` 目录不存在；`consultAgentRoutes.ts`、`multiAgent.ts`、MDT 集成测试既有在库 | 会诊记录生成声明包整体未建：病情背景自动摘要、会诊意见结构化字段、专科知识按受邀科室动态检索、多方发言按发言人分离归档、会诊时限与会诊医师资质一致性核查 | 阶段②放行；MDT 发言归属规则与专科知识召回接线；资质规则库院方制度评审 | **阶段② S-15** |
| B40 | C-05（矩阵 250；S-16 台账 361；spec 1431） | 现场核实：`agents/medical-record-nursing/` 目录不存在；`nursing-*` 页面、M16-A/B、`mobileNursing.test.ts`、`sbar.test.ts` 等基线在库 | 护理记录生成声明包整体未建：时间-观察-措施-效果四要素闭环校验、护理问题与措施匹配规则、交接班报告自动汇聚、Braden/Morse/导管/疼痛/GCS 五大量表评分工具封装、语音移动端采集入口声明 | 阶段②放行；量表评分规则外部护理标准校准；移动端采集页面与 ASR 通道 | **阶段② S-16** |
| B41 | C-06（矩阵 251；S-17 台账 362；spec 1432） | 现场核实：`agents/medical-record-qc-enhanced/` 目录不存在；既有 `medical-record-qc` 包、`src/knowledge/qc/` 规则集与 `emr-qc-*` 页面基线在库 | 内涵质控强化整体未建：风险等级口径校准、跨病历两层复制粘贴查重 + 白名单豁免、风险定向抽样规则集（住院 >30 天 / 死亡 / 非计划再手术 / 输血 / 高倍率）、病案首页一致性与 DRG 高靠低靠联动、三级提示阻断提交链路强制联动、六维内涵质控证据链留痕 | 阶段②放行；临床专家盲评阈值校准；DRG 分组规则与首页数据源对接；两级查重算法白名单制度评审；提交链路与 EMR 事务接线 | **阶段② S-17** |

### 4.7 编排层阶段②职责与运行时阻塞（O / P-04）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B42 | O-02（矩阵 280；spec 1427） | `consult/intentClassifier.ts` 诊断域专用分类器既有在库；`MedicalAgentLoop.ts` 既有在库 | 编排层独立意图识别节点与任务规划器（多步骤拆解 → 节点序列生成 → 动态路由）未建 | 阶段②放行；规划规则 / 意图词表需业务评审；真实 LLM 规划调用通道 | **阶段② S-05 剩余**（spec 1427 明示排除） |
| B43 | O-05（矩阵 283；spec 1427） | `subagent` 节点、`multiAgent.ts`、`consult/coordinator.ts / collaboration.ts / consensus.ts / delegation.ts`、`AgentEventBus` 既有在库 | 标准协同消息信封（发起人 / 被邀方 / 任务 / 输入 / 截止 / 结论 / 版本 / 证据）跨智能体契约未统一登记；评审模式（主智能体起草 → 评审智能体复核 → 修订循环）标准工作流模板缺失 | 阶段②放行；信封契约跨团队评审；评审循环运行时事件持久化 | **阶段② S-05 剩余** |
| B44 | O-06（矩阵 284；spec 1427；S-05 记录 §7.1-3） | `HumanNodeConfig`（assigneeRoles / assigneeUserIds / formSchema / timeoutMs / escalateToRoles）、`humanTaskHandler.ts`、`persistentHumanTaskHandler.ts` 既有在库；`HumanResolution` 仅 `approved / formData / reviewerId / comment` | 人工确认三模式（全量 / 差异 / 抽样）策略与按智能体 / 风险等级配置规则集未建；人工「修改」动作归类（`humanModificationCount` 仅显式 `humanAction='modified'` 累计）归本项；多轮指令（退回携带修改意见回到对应节点）状态机与 BFF 持久化闭环未做 | 阶段②放行；三模式规则医务部评审；人工任务持久化仓储；多轮退回链路与前端复核界面 | **阶段② S-05 剩余**（O-06 / 矩阵 284） |
| B45 | O-08（矩阵 286；spec 1427；S-05 记录 §7.1 跨实例项） | `src/orchestrator/engine/recorder.ts` 事件流与实例摘要内存态；`workflowMonitorV6.ts`、前端 `workflow-monitor` 既有在库 | 跨实例聚合仓储（完成率、平均耗时、人工干预点、人工修改率、模型调用分布多维切片）与运行态监控大盘未建；事件当前内存态重启丢失 | 阶段②放行；事件持久化 DB；跨实例聚合查询服务；前端大盘页面 | **阶段② S-05 剩余**（spec 1427「跨实例监控聚合」） |
| B46 | O-09（矩阵 287；S-05 记录 §7.1-1、§7.1-2） | `snapshotStore.ts` / `snapshotService.ts`（`InMemorySnapshotStore`、`resumePlan`、三类可续跑状态离线闭环；测试 10/0/43、4/0/16） | 快照 DB 持久化、跨进程 / 重启恢复、索引、过期清理、备份未做；崩溃恢复续跑点以后续持久化批次按合法迁移规则复核；成功完成边界快照状态口径见 A38 离线规则固化 | DB 快照表结构与事务；进程重启恢复协议；快照备份 / 过期清理运维任务；跨实例快照读取权限 | 后续持久化批次（阶段①离线协议已闭环，持久化归数据层批次） |
| B47 | O-01（矩阵 279；S-05 记录 §1.2-O-01） | `format-validate / notify / writeback` 三类独立节点与 DSL 白名单校验已落地；既有 `workflow` / `builder` 前端基线在库 | 可视化拖拽画布节点面板、连线编辑、子流程嵌套可视化配置未做 | 前端画布开发；节点配置表单与既有页面体系归并方案 | 后续前端批次（节点类型与校验规则本体已闭环） |
| B48 | O-03（矩阵 281；联动 A-01） | `toolRegistry.ts`、`src/medical-tools/` 190+ 工具既有在库；`ToolRiskManager`、`ToolNodeConfig` 风险分级与确认模式在库 | 频次 / 配额计数器持久化；工具真实执行接 HIS/EMR 授权接口；工具清单运行时注册中心与 BFF 管理页面未做 | DB 配额计数与限流状态；HIS/EMR 网络授权接口；BFF 工具管理路由与前端页面；工具参数 Schema 规范化评审 | 后续运行时 / BFF / 前端批次（离线配额规则见 A34） |
| B49 | O-04（矩阵 282；S-05 记录 §1.2-O-04） | `WorkflowContext`、`contextSummary.ts`、`ContextCompressor.ts`、`TokenBudgetTracker.ts` 既有在库；内存快照契约已预留 | 跨会话持久化状态（患者档案、进度节点、未完成任务）落库未做；编排器内存态与 BFF `agentEngine.ts` / `persistentHumanTaskHandler.ts` 运行实例持久化口径未对齐 | DB 会话 / 任务状态表；BFF 持久化实例服务对齐；跨进程状态一致性协议 | 后续数据层 / BFF 联调批次（离线压缩规则与契约见 A36） |
| B50 | O-07（矩阵 285；联动 M-06） | 节点 `RetryPolicy`、`fallbackNode / compensationNode / continueOnError`、provider 熔断与模板兜底既有在库；S-03 离线主备决策在库 | 备用模型真实调用中间级未接；转人工队列持久化；转人工后手工书写兜底入口与告知文案产品化（前端）未做 | 真实备用 provider 通道（B11）；人工队列 DB 持久化；前端手工书写入口与通知文案；降级动作运行时管控 | 后续运行时 / BFF / 前端批次（离线降级链决策见 A37） |
| B51 | P-04（矩阵 213；S-04 记录 §1.3-1，归 S-05） | DSL `userTemplate` 变量插值、`agentContext.ts`、`contextSummary.ts` 既有在库 | 已有病历内容 + 光标位置增量编辑上下文需从前端编辑器实时取数；历史摘要压缩策略与 Token 预算在运行时打通复核未做 | 前端编辑器光标 / 段落事件通道；运行时上下文组装服务；Token 预算与压缩策略生产参数校准 | 后续前端 / 运行时批次（离线数据契约见 A39） |

### 4.8 门诊 / 住院智能体包运行时阻塞（C-01 / C-02 剩余项）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B52 | C-01（矩阵 246；S-09 台账 354；S-09 记录 §7.1-1~8） | `agents/medical-record-outpatient/` 离线包；`src/bff/agents/outpatient/` 七模块；共用解读组件；测试 53/0/155 | ① ASR 说话人分离 / 转写 / 实时录音入口；② 真实 RAG 与指南 / 路径 / 规范 / ICD / 药品 / 检验检查字典召回；③ 真实工具与 EMR 回写接线（患者档案、既往就诊、近期检查、用药清单、草稿回写）；④ BFF 路由、门诊工作台页面、人工复核弹窗、引用锚点组件；⑤ `outpatient-record-completed` 事件总线真实挂载、内涵质控实时提醒订阅与事件持久化；⑥ 审计台账 / 修订记录 / 人工决策 / 草稿快照落库；⑦ 真实药典 / ICD-10 / 处方规则引擎与医学专家评审（QC 现为内置合成字典粗匹配） | 真实 ASR 供应商；真实知识库 / 字典供应商与检索服务；HIS/EMR 授权网络接口；BFF 路由 + 前端页面；事件总线运行时通道与 DB 持久化；合规字典库与专家评审 | 后续 BFF / 前端 / 运行时 / 合规联调批次（离线包与规则本体已闭环；manifest 离线登记方案见 A42） |
| B53 | C-02（矩阵 247；S-10 台账 355；S-10 记录 §7.1-1~10） | `agents/medical-record-inpatient/` 离线包；`src/bff/agents/inpatient/` 六模块；测试 65/0/216 | ① ASR 说话人分离 / 语音转写 / 移动端采集页面；② 真实 RAG 与药典 / ICD-9-CM-3 / 检验参考范围 / 危急值 / 护理与医嘱字典；③ 真实工具与 EMR 回写接线；④ BFF 路由、上级查房工作台、出院记录页、人工复核弹窗、引用锚点；⑤ `inpatient-record-completed` 事件总线挂载、订阅与持久化；⑥ 审计 / 修订 / 决策 / 一致性发现 / 草稿快照落库；⑦ 三级查房 / 会诊权限 / 手术分级 / 疑难病例讨论规则库；⑧ `schedule_timeline_check` 真实定时调度 / 工作台轮询 / 消息推送 / 逾期督办；⑨ 时限参数院方制度校准（医务部评审） | 真实 ASR 与移动端通道；真实字典 / 知识库供应商；HIS/EMR 授权接口；BFF + 前端页面；事件总线运行时与 DB；规则库院方制度与评审；定时调度器与通知渠道；医务部时限参数校准决策 | 后续 BFF / 前端 / 运行时 / 合规联调批次（离线包与规则本体已闭环；manifest 离线登记方案见 A43；参数外置配置见 A44） |

### 4.9 阶段①遗留运行时 / 持久化 / 接线缺口（跨切片登记）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B54 | RAG 运行时接线（矩阵 R-01~R-09 联动；S-11 记录 §7.1-4、§7.1-5） | `knowledgeRegistry.ts` 内存台账；`src/knowledge-platform/service/KnowledgeService.ts`、`hybrid.ts` 既有在库 | 内存台账未接检索服务运行时；缺 BFF 知识管理路由与管理台页面；台账持久化落库未做；既有 `knowledgeLifecycleV13.ts` 等历史路由与新台账未对齐 | DB 台账仓储；BFF 路由与前端管理台；新旧知识服务归并架构评审 | 后续 BFF / 前端 / 数据层批次 |
| B55 | 事件总线真实挂载（S-09 §7.1-5、S-10 §7.1-5；O-08 联动） | `outpatient-record-completed`、`inpatient-record-completed` 仅在离线运行器 `events` 数组预留；`src/bff/alertBus.ts`、`outboxRelay.ts` 既有在库 | 事件未接真实事件通道；订阅关系、内涵质控实时提醒订阅、事件持久化与总线审计未做 | 事件总线运行时部署；事件 DB 持久化与订阅注册表；跨实例事件分发 | 后续运行时 / 数据层批次 |
| B56 | 内存态台账持久化（S-02 / S-03 / S-04 / S-06 / S-08 / S-11 / S-13 / S-05 各记录 §7.1 一致声明） | 上述切片台账、变更记录、指标、隔离索引、审计台账、草稿快照均为进程内存 `Map` / 内存链 | 注册表 / 资产 / 指标 / 隔离索引 / 审计链 / 草稿快照进程重启即丢失；DB 表结构、权威仓储与迁移方案未做 | DB 持久化表结构与迁移脚本；仓储接口实现；既有权威表（`clinical.medmuse_agents` 等）对齐评审；事务与并发一致性测试 | 后续数据层批次（合规 P0 联动 B73~B78） |

### 4.10 升级体系（3.7 各行，S-07 阶段②，spec 1428；本轮禁止开工）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B57 | 3.7 版本线（矩阵 304） | 程序版本在 git 提交 / 里程碑 tag；知识 `VersionManager` 数据集版本；提示词 `promptGovernanceV5` 雏形；模型无独立台账 | 平台程序 / 模型 / 知识库 / 提示词规则四线独立版本号统一编码规则、发布台账、版本间依赖关系登记未建 | 阶段②放行；四线版本号规范评审；DB 版本台账 | **阶段② S-07** |
| B58 | 3.7 四维留痕（矩阵 305；联动 S-08） | `aiAudit.ts` 四维快照内存留存与 `exportTrace` 在库 | 病历生成记录绑定四维版本的持久化举证链、一键导出 BFF 接口与前端举证页面未做 | DB 审计链持久化（B37）；BFF 导出接口；前端举证链页面 | 后续合规联调批次（内存快照本体已闭环） |
| B59 | 3.7 六类升级（矩阵 306） | 各域零散升级动作在库 | 模型 / 知识 / 提示词编排 / 功能 / 平台版本 / 安全补丁六类升级分级台账与管控流程；配置级 vs 程序级部署约定未建 | 阶段②放行；升级分级规程评审；配置 / 程序分离部署环境 | **阶段② S-07** |
| B60 | 3.7 四级管控（矩阵 307） | `workflowSignoffV6.ts`、审批路由零散在库 | 一级紧急 / 二级配置 / 三级功能 / 四级平台分级标准、审批角色、变更评审记录与发布窗口登记未建 | 阶段②放行；院方审批角色与流程评审；发布窗口制度 | **阶段② S-07** |
| B61 | 3.7 模型升级七步（矩阵 308；联动 S-03） | 无影子机制（`shadow` 仅 S-03 离线标记）；无盲评；灰度仅部署层 | 准入评测三硬门槛 → 影子加载 → 影子比对盲评 → 小流量灰度 → 指标比对 → 逐档放量 → 全量切换归档七步闭环状态机未建 | 阶段②放行；真实双模型影子运行环境；盲评样本集与评审组织；灰度分流中间件（B32）；指标对照仓储 | **阶段② S-07 / S-03** |
| B62 | 3.7 知识升级（矩阵 309；联动 S-11） | `VersionManager` 版本登记 / checksum 增量去重 / 质量分在库；`provenance` 在库 | 谁的知识谁签字审批留痕；生效期自动降权与过期提示；增量重建；双索引并行切换；检索回归测试集；历史生成指向旧版本快照绑定未建 | 审批工作流与签字留痕 DB；双索引切换协议（B18）；检索回归测试集建设；历史快照表（B74）；S-08 / S-12 联调 | 后续知识工程批次（阶段② S-07 联动） |
| B63 | 3.7 提示词 / 编排升级（矩阵 310；联动 S-04） | 提示词治理雏形在库；编排工作流版本在 `AgentDefinition.version` | 提示词 Git / 资产库双轨管理、发布前评测门禁、灰度与口径确认流程未建 | 阶段②放行；资产库与代码库双轨规程；评测门禁接入（A15 离线规则先行）；灰度发布环境 | **阶段② S-07 / S-04** |
| B64 | 3.7 功能 / 平台升级七步（矩阵 311） | 既有里程碑流程在 git 历史与审计简报中体现（M3–M287） | 需求评审 → 开发 → 测试 → 预生产验证 → 灰度 → 全量 → 归档标准化七步清单；四环境基线绑定；回滚包预置未建 | 阶段②放行；四环境基线配置归档；预生产验证环境；回滚包仓库 | **阶段② S-07**（规程与环境层） |
| B65 | 3.7 回滚（矩阵 312） | 部署层回滚脚本零散在库；数据回滚未见规程 | 回滚顺序（流量 → 配置 → 模型 → 程序 → 数据；数据只前滚、补偿冲正）SOP、顺序校验、模型 / 提示词 / 知识版本指针回滚未建 | 阶段②放行；回滚 SOP 评审；版本指针回滚执行环境；数据补偿冲正规程与 DB 事务支持 | **阶段② S-07** |
| B66 | 3.7 环境隔离（矩阵 313） | `web/.env.development/.production/.test` 在库；`tests/integration` 隔离；本机 `DEMO_MODE` | 开发 / 测试 / 预生产 / 生产四环境配置基线；预生产同构脱敏数据集规程；生产禁止直接调试规程与审计未建 | 阶段②放行；四环境部署基线；预生产脱敏数据集建设；生产调试禁令制度与审计接入 | **阶段② S-07**（文档与规程层） |
| B67 | 3.7 接口兼容（矩阵 314） | BFF 路由版本号惯例（V5/V8/V12/V13/V14）；`fhirResources` 资源层在库 | 接口版本规范文档、字段只增不删 / 弃用提前公告台账、灰度双版本并行期配置未建 | 阶段②放行；接口规范评审；双版本并行部署环境；弃用公告流程 | **阶段② S-07**（规程层） |
| B68 | 3.7 业务连续性（矩阵 315） | M7-A 幂等键框架；M7-D 死信队列；降级兜底提示词；`idempotency-key` 测试在库 | 三层降级（功能降级回手工 / 只读兜底 / 人工支援）手册与触发条件；升级窗口日历；在途业务快照 / 排队 / 完成后核对规程；幂等键覆盖病历回写链路复核未建 | 阶段②放行；连续性手册评审；在途快照存储（B46）；排队与核对规程；幂等键链路全量复核 | **阶段② S-07**（规程与运维层） |

### 4.11 阶段③整块未开工（spec 1440–1443，本轮禁止开工）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B69 | S-21（矩阵 363；spec 1440；G-01 联动） | `src/integration/` 与 FHIR 路由基线在库 | 网关管理台整体：接入系统台账（接口 / 字段映射 / 健康状态 / 订阅滞后 / 限流配额）CRUD 与健康状态聚合展示 | BFF 台账路由 + 前端管理台；院方真实对接系统清单；运行态健康与配额采集；DB 持久化 | **阶段③ S-21** |
| B70 | S-22（矩阵 364；spec 1441；G-02 / G-03 / R-03 联动） | `connectors.ts` 五类接入器；`DocumentParser.ts` 基线在库 | OFD 解析、扫描件 OCR 组件接入、解析深度复核、人工校对界面整体未建 | OCR/OFD 组件选型与许可证确认；解析服务部署；人工校对队列与前端界面；扫描件输入通道 | **阶段③ S-22** |
| B71 | S-23（矩阵 365；spec 1442；G-04 联动） | EMPI / 脱敏 / 数据质量 / 血缘 / 术语服务分散在 M5 系列里程碑 | 数据治理接入统一视图：主数据映射 / EMPI / 脱敏 / 质量校验 / 血缘在接入层统一聚合展示，治理动作与数据来源 / 去向可追溯 | 跨里程碑聚合器归并；前端治理视图；血缘元数据持久化；跨系统字典对接 | **阶段③ S-23** |
| B72 | 阶段③剩余（spec 1443） | 辅助模型接口预留分散在 `EmbeddingService.ts`、`Reranker.ts`、`PromptInjectionGuard.ts` 等 | 辅助模型（重排 / 语义比对 / 专用 NER）接入；全院知识库扩充；科室自有提示词与最佳实践沉淀；能力开放接口与使用计量未建 | 阶段③放行；供应商选型与采购；全院知识采集组织；开放平台网关与计量计费体系；院方制度评审 | **阶段③** 剩余运营 / 开放能力批次 |

### 4.12 合规 P0 联动（矩阵 325–330；底稿 `docs/research/emr-gap-matrix-2026-10-25.md`，本轮不重复展开取证）

| B 编号 | 关联编号 | 现状锚点 | 缺口描述 | 阻塞依赖 | 归属阶段 / 批次 |
|---|---|---|---|---|---|
| B73 | P0-①（矩阵 325；联动 S-06 / S-08） | 本机 `DEMO_MODE=1`；`src/security/auth/` RBAC+ABAC、`PermissionChecker` 既有在库；`AiActor` 仅记录角色字段不判定 | 关闭 `DEMO_MODE` 接真实 RBAC 与口令哈希核验；智能体准入与审计字段依赖真实身份上下文 | 生产 RBAC 服务与会话上下文；口令哈希核验链路；身份组织架构数据；集成环境 | 合规 P0 批次（生产化改造，非离线范围） |
| B74 | P0-②（矩阵 326；联动 S-05 / S-08） | 既有 EMR 写入层基线在库；编排 `writeback` 节点为离线占位 | 病历正文 append-only 写入层 + 版本链 + 历史快照表；编排回写节点与四维留痕必须落在 append-only 层之上 | DB 表结构与事务层；版本链写入器；历史快照存储；与既有 EMR 写入层归并评审 | 合规 P0 批次（DB 事务改造） |
| B75 | P0-③（矩阵 327；联动 S-05 / S-08） | `aiAudit.ts` 内存哈希链；`writePath` 预留字段；27 条写路径台账登记在 S-08 记录附录 | 27 个未入链病历写路径在状态迁移 / 快照写入事务内接入审计链；AI 生成、人工修改、退回重写全部入链；WORM 持久化与周期链校验断裂告警 | DB WORM 存储；27 条聚合器事务改造；周期校验任务与告警通道；与 B74 写入层联动 | 合规 P0 ③ 分批整改（S-05 / S-08 后续批次） |
| B76 | P0-④（矩阵 328；联动 S-13 / S-11） | `patientIsolation.ts` 内存分区隔离；`TenantManager.ts` 既有在库 | 多租户 RLS 行级安全策略 + 越权集成测试；患者级隔离与知识库密级过滤依赖 RLS 落地 | DB RLS 策略与迁移；集成测试环境（真实 PostgreSQL）；租户数据模型对齐评审 | 合规 P0 ④ 批次（DB 层改造） |
| B77 | P0-⑤（矩阵 329；联动 S-07） | `src/security/encryption/` AES-256-GCM 双层密钥 + `KeyManager` 既有在库 | 密钥版本号 / 双密钥过渡轮换台账；refresh 令牌重放检测；模型供应商密钥与知识资产加密纳入轮换台账 | 密钥管理服务（KMS）接入；轮换流程与审计；令牌重放检测存储；密钥版本表结构 | 合规 P0 ⑤ 批次（安全工程 + DB） |
| B78 | P0-⑥（矩阵 330；联动 S-08 / S-01） | `src/security/desensitization/` 规则集在库；S-05 快照输出 / 错误已脱敏；S-08 摘要入链前脱敏 | 导出 / 批量 / 打印 / 共享出口逐字段统一脱敏拦截；输出侧校验器与出口脱敏形成最后两道防线 | 出口网关（BFF 导出 / 批量 / 打印 / 共享接口）逐字段拦截点改造；前端导出组件；字段级脱敏规则表评审；与既有 `desensitizePlain` 规则集归并 | 合规 P0 ⑥ 批次（BFF / 前端 / 规则评审） |

## 5. 阶段② / 阶段③整块未开工清单（边界声明，本轮一律不开工）

### 5.1 阶段②（spec 1423–1434；矩阵 370 行）

| 切片 | spec 行 | 内容 | 台账落点 |
|---|---|---|---|
| S-05 剩余 | 1427 | 意图识别独立规划器、标准协同消息信封、人工三模式规则、跨实例监控聚合 | B42、B43、B44、B45 |
| S-07 | 1428 | 四线版本台账、五维灰度、模型升级七步状态机、回滚 SOP、环境 / 接口兼容规程、业务连续性手册 | B32、B08、B09、B11、B57、B59、B60、B61、B63、B64、B65、B66、B67、B68；联动项 B58（S-08 四维留痕）、B62（S-11 知识升级） |
| S-14 手术记录 | 1429 | 八段式模板、意外提示、植入物条目、七项一致性核查、术后首程触发 | B38 |
| S-15 会诊记录 | 1430 | 背景摘要、意见结构化、专科知识动态检索、MDT 发言分离、时限资质核查 | B39 |
| S-16 护理记录 | 1431 | 四要素闭环、问题-措施匹配、交接班报告、五大量表工具、语音移动端 | B40 |
| S-17 内涵质控强化 | 1432 | 风险校准、两层查重、风险抽样、首页 / DRG 联动、三级阻断、六维证据链 | B41 |

### 5.2 阶段③（spec 1436–1443；矩阵 371 行）

| 切片 | spec 行 | 内容 | 台账落点 |
|---|---|---|---|
| S-21 网关管理台 | 1440 | 接入系统台账、健康状态、订阅滞后、限流配额 | B01、B69 |
| S-22 OFD/OCR 组件 | 1441 | OFD 解析、扫描件 OCR、人工校对界面 | B02、B03、B17、B70 |
| S-23 数据治理接入视图 | 1442 | 主数据映射 / EMPI / 脱敏 / 质量 / 血缘统一视图 | B04、B71 |
| 剩余开放项 | 1443 | 辅助模型（重排 / 语义比对 / 专用 NER）接入、全院知识库扩充、科室自有提示词与最佳实践沉淀、能力开放接口与使用计量 | B13、B15、B19、B36、B72 |

## 6. 合规 P0 联动索引（不重复展开，证据底稿 `docs/research/emr-gap-matrix-2026-10-25.md`）

| P0 编号 | 内容 | 台账落点 | 阶段归属 |
|---|---|---|---|
| P0-① | 关闭 DEMO_MODE 接真实 RBAC 与口令哈希核验 | B73 | 合规生产化批次 |
| P0-② | 病历正文 append-only 写入层 + 版本链 + 历史快照表 | B74 | 合规 DB 事务批次 |
| P0-③ | 27 条未入链病历写路径真实入链（WORM / 哈希链） | B37、B75 | 合规分批整改 |
| P0-④ | 多租户 RLS + 越权集成测试 | B21、B76 | 合规 DB 批次 |
| P0-⑤ | 密钥版本号 / 双密钥轮换 + refresh 重放检测 | B27、B77 | 合规安全工程批次 |
| P0-⑥ | 导出 / 批量 / 打印 / 共享出口逐字段脱敏拦截 | B37、B78 | 合规出口改造批次 |

## 7. 主会话点名既定未闭环项勾稽表（如实登记，不谎报通过）

| 序号 | 点名事项 | 台账落点 | 现状口径 |
|---|---|---|---|
| 1 | S-05 内存快照持久化 | B46 | 当前仅 `InMemorySnapshotStore`；跨进程 / 重启恢复、DB 表结构、索引、过期清理、备份未实现；属数据层批次，非离线范围 |
| 2 | 成功边界快照状态口径 | A38（离线规则固化）+ B46（持久化） | 节点成功完成边界快照状态为 `RUNNING`，按迁移校验不可作为续跑源；可续跑快照仅限 `WAITING_HUMAN / PAUSED / FAILED`；本台账登记 A38 将该语义固化进离线迁移校验纯函数，持久化与崩溃恢复归 B46 |
| 3 | 人工修改动作归类（阶段② O-06） | B44 | 现有 `HumanResolution` 仅含 `approved / formData / reviewerId / comment`；`humanModificationCount` 仅在显式 `humanAction='modified'` 负载下累计；人工「修改」动作归类随阶段②人工三模式规则落地 |
| 4 | notify / writeback 桩位 | B50、B52、B53 | `notify` 仅有离线占位与可选 sink；短信 / 邮件 / 微信真实投递、死信与超时升级未实现；`writeback` 仅有离线占位与可选适配器；真实 EMR 草稿、审计日志、工作流状态、患者记录回写未接线，不直写 DB |
| 5 | similar-case 真实向量召回 | B21 | S-05 相似病例适配器只调用 S-13 隔离判定；真实向量召回、相似度打分、跨科室知识检索未实现；依赖 Embedding 供应商与检索服务运行时 |
| 6 | S-09 / S-10 未登记 `agents/manifest.json` 与加载器挂载方案 | A42、A43（离线配置方案）+ B52、B53（真实 BFF / 前端挂载） | 现场核实 manifest 现行 10 包，两个新包未登记；A42 / A43 登记纯追加清单条目与目录加载器映射离线方案；catalog 真实挂载、工作台路由归后续 BFF / 前端批次 |
| 7 | RAG 运行时接线 | B54 | 内存台账未接检索服务运行时；缺 BFF 知识管理路由与管理台页面；新旧知识服务未归并 |
| 8 | OFD / OCR 与人工校对 | B17、B70 | 类型与流水线均未登记；依赖外部组件选型、扫描件输入通道与前端校对界面，归阶段③ S-22 |
| 9 | 前端知识生命周期页 / 相似病例页 / 引用弹窗 | B54、B21、B20 | 六域浏览 / 准入审批台 / 冲突确认 / 评审提醒页未建；相似病例命中列表 / 越权提示页未建；`[n]` 锚点弹窗组件与路由未建；协议层纯映射已由 S-11 / S-12 / S-13 离线闭环 |
| 10 | ASR 说话人分离 | B52、B53 | 仅预留 `speaker: 'patient' | 'doctor' | 'system'` 分段结构与合成夹具；真实转写、说话人分离、录音入口属供应商环境依赖 |
| 11 | 真实 RAG / 药典 / ICD / 检验检查字典接线 | B52、B53 | 指南 / 路径 / 规范 / ICD-10 / ICD-9-CM-3 / 药品 / 检验参考范围 / 危急值 / 护理医嘱字典均为声明 / 适配器占位；QC 用药匹配为内置合成字典粗匹配，不替代真实药典与处方规则；待院方标准字典接入与专家评审 |
| 12 | BFF 路由与前端人工复核页面 | B52、B53 | 门诊工作台、上级查房工作台、出院记录页、人工复核弹窗、引用锚点组件均未提供 HTTP 接口与前端文件 |
| 13 | 事件总线真实挂载 | B55 | `outpatient-record-completed`、`inpatient-record-completed` 仅在离线运行器 `events` 数组预留；未接真实事件通道、订阅关系、事件持久化与总线审计 |
| 14 | 草稿快照持久化落库 | B56 | 审计台账、修订记录、人工决策、一致性发现与草稿快照均为进程内存态；WORM / 哈希链、数据库表与审计检索归后续 S-08 接线批次 |

## 8. 自检记录

### 8.1 编号覆盖核对

- 主题编号 60 个：G-01~G-05（5）、M-01~M-09（9）、R-01~R-10（10）、P-01~P-08（8）、A-01~A-07（7）、S-01~S-06（6）、C-01~C-06（6）、O-01~O-09（9），已在 §1 清单逐行列出落点；`closed` 编号 2 个（R-10、S-01 矩阵 235），其余 58 个编号至少归入一条 A 类或 B 类记录。
- 覆盖行：3.3 RAG 七环节（257–263）、3.4 提示词四层与生命周期（269–273）、3.6 生命周期六行（293–298）、3.7 升级体系十二行（304–315）已在 §1.1 映射到主编号行；阶段②切片 S-05 剩余 / S-07 / S-14~S-17 归 §5.1；阶段③ S-21~S-23 与剩余项归 §5.2；合规 P0-①~⑥ 归 §6 与 B73~B78。
- 缺口记录统计：A 类 **44** 条（A01~A44）；B 类 **78** 条（B01~B78）；合计 **122** 条记录。

### 8.2 边界纪律自检（本轮只读盘点）

- 未执行 `git add / commit / push / tag`；未新增第三方依赖；未新增 `src/` 源码与测试用例；未运行 `bun test` / `tsc`；未发起网络请求；未读取 `node:fs` 之外的真实环境配置。
- 未回改 S-01 / S-06 / S-08 / S-11 / S-12 / S-13 等既有模块源码与既有测试断言；未改动既有 BFF 调用面、前端路由 / 页面 / 挂载 / 权限码与公开函数签名；台账所述未来改动文件均标注「新增 / 纯追加」。
- 品牌口径：本台账使用公司名「健澜科技」、产品正式名「健澜AI原生医院操作系统OS」、署名「杭州健澜科技有限公司」；测试夹具仅使用 `patient-demo-001` / `visit-demo-001` / `doctor-demo-001` 合成标识；未写院方实名、密码、token、密钥、Bearer 长值或明文端点。
- 本台账为阶段①离线盘点结论；A 类条目仅登记最小口径与优先级，**不构成开工指令**，等候主会话逐切片书面放行；B 类条目阻塞依赖与归属阶段如实登记，不在本轮实现。

### 8.3 取证限制与存疑点

1. 既有 BFF 历史路由（`modelRouterV5.ts`、`promptGovernanceV5.ts`、`knowledgeLifecycleV13.ts` 等）与本轮内存模块未接线的判定，基于切片记录自报边界与现场目录 / 文件存在性复核；历史路由内部数据源真伪未逐路由通读，沿用矩阵 6.2 节取证限制声明（387–391 行）。
2. S-10 时限规则参数（24h / 8h / 分级频次 / 30 天 / 出院 24h、`DUE_SOON_HOURS=2`）为合成默认口径，院方校准值待医务部评审；A44 仅登记离线参数外置方案，不预设院方阈值。
3. A 类条目中涉及既有模块「纯追加」的文件路径为规划口径，实际放行开工时须以当时源码现状复核字段与签名兼容；未放行前不改动任何文件。
4. 本机 `DEMO_MODE=1`，无 PostgreSQL / Redis / 真实 LLM / 真实 ASR / Maven / Docker / JDK21 / OCR-OFD 供应商凭证；B 类阻塞判定以该环境基线为准。

### 8.4 配套结构化清单

- `gap-inventory.json`：122 条缺口记录 + 2 条 closed 参照记录的结构化台账；字段 `id, domain, requirement, gapAnchor, specAnchor, currentStatus, sourceFiles, testFiles, sliceRecord, gapDescription, category, minimalScope, blocker, ownerSlice, priority, overlapWith`，JSON 可 `JSON.parse`，UTF-8、无注释。
- `gap-inventory.csv`：同口径扁平清单，便于筛选与评审。
- `raw/` 子目录：本轮三个分域审计子代理因本地工具通道未就绪零产出，台账由 Organizer 本通道直接编制，未并入分域草稿，目录保留为空。


