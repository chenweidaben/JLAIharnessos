# 电子病历（EMR）国际/国家卫生信息标准落点研究与主流开源 EMR/HIS 实践剖析基准报告

> 产品：**健澜AI原生医院操作系统OS**（Jianlan AI-Native Hospital OS，根 `package.json` name：`jlmedaios`）
> 编制单位：杭州健澜科技有限公司（健澜科技）
> 文档日期：2026-10-25　　文档性质：研究基准报告（仅调研与文档产出，不涉及产品源码修改、不启动服务、不执行代码发布动作）
> 适用范围：本报告面向本系统电子病历（EMR）模块的标准建模、交换接口与开源对标，供架构、产品、临床信息与合规团队参考。

## 阅读约定

**标准支持度图例**（逐项标注，不做整体夸大）：

- **原生支持**：仓库代码/官方文档直接实现该标准；
- **插件/模块**：核心仓库不含，由官方模块、附属仓库或生态组件提供；
- **部分**：仅覆盖标准子集（如仅导出 CCD、仅解析库级支持、仅框架机制不含内容）；
- **无**：本轮核实范围内未见支持；
- **未核实**：检索材料不足以判定，不作肯定结论。

**证据级别图例**：

- **[已核实]**：结论来自本轮 `web.fetch` 直接读取的仓库主页、LICENSE/协议原文、官方 README/官方指南/官方规范原文；
- **[推断]**：基于已核实材料的工程推演或行业通行做法，未经代码实测验证。

> 本轮未在本机部署运行任何开源系统，所有"临床功能完整度"判断均基于仓库文档、官方指南与公开资料（详见附录第四节）。

---

# 一、病历系统标准落点

## 1.1 FHIR R4：病历系统核心资源与本地实体对应

### 1.1.1 版本选型：首期落地 FHIR R4，预留 R5 适配层

**已核实**：HL7 FHIR 当前主流版本为 R4（4.0.1）、R4B 与 R5；本轮核实的主流开源实现中，OpenEMR 内置 FHIR R4 服务器，OpenMRS `fhir2` 模块目标为 R4，Medplum 平台数据模型为 FHIR R4，HAPI FHIR 同时提供 DSTU2/DSTU3/R4/R4B/R5 结构与跨版本转换器。R4 与 R5 的结构性差异如下（依据 HL7 官方 `diff.html` 版本变更说明）：

| 差异主题 | FHIR R4 | FHIR R5（变化要点） | 对病历建模的影响与本系统建议 |
| --- | --- | --- | --- |
| 引用编码混合类型 | `CodeableConcept` 表达编码；引用独立 `reference` | 新增 `CodeableReference`（编码 + 资源引用同体） | 首期按 R4 将"编码"与"引用"分列字段；预留扩展位，便于 R5 切换 |
| 就诊状态与结构 | `Encounter.status`：arrived / triaged / in-progress / on-leave / finished / cancelled / entered-in-error；`hospitalization` 字段；`reasonCode`；`diagnosis.condition` 为引用 | 状态码调整为 on-hold / discharged / completed / discontinued 等；`hospitalization` 改为 `admission`；新增 `EncounterHistory` 替代状态/类别历史；`reasonCode` 演进为 `reason` BackboneElement；`diagnosis.condition` 改用 `CodeableReference` | 本地就诊实体建议抽象出"就诊事件"中性模型，映射时按目标版本适配状态码与字段名，避免把 R4 结构写死进内核 |
| 审计事件 | `AuditEvent.type` / `subtype` / `purposeOfEvent` | 重组为 `category` / `code` / `authorization` | 审计模型按"事件类别 + 事件类型 + 授权目的"三要素抽象，版本间可映射 |
| 文档引用 | `DocumentReference` 基础字段 | 新增 `version`、`basedOn`、`docStatus`、`modality` 等 | 病历附件模型提前预留版本号、业务状态、检查模态等字段 |
| 新增资源 | — | `Permission`、`FormularyItem`、`InventoryItem`、`NutritionIntake`、`SubstanceDefinition`、`RequestOrchestration`、`SubscriptionTopic`、`SubscriptionStatus` 等 | 首期不实现 R5 新资源；权限、药品目录、医嘱编排等模块设计时参照 R5 语义预留扩展方向 |

**建议首期采用 R4 的理由** **[已核实 + 推断]**：

1. **生态成熟度**：R4 是当前区域平台、接口引擎与开源实现落地最多的版本；R5 仍处于过渡期，国内互联互通测评与区域卫生信息平台所引用的 FHIR Profile 以 R4 为主 **[推断：国内测评 Profile 版本以主管部门最新文件为准]**。
2. **对标成本**：本轮核实的四个 FHIR 相关开源项目（OpenEMR、OpenMRS fhir2、Medplum、HAPI）均以 R4 为可工作版本，R4 落地资料与参考实现最充分。
3. **渐进演进**：内部资源模型保持中性抽象，对外交换网关按 R4 实现；后续可通过适配器层引入 R5 资源与新类型，避免首期承担 R5 变动风险。

### 1.1.2 FHIR R4 核心资源 ↔ 本系统本地病历实体映射表

下表逐项说明资源承载的数据、与本地病历实体的对应关系及建模落点建议。资源定义以 HL7 FHIR R4 官方规范为准（`https://www.hl7.org/fhir/R4/<resource>.html`）。

| FHIR R4 资源 | 病历系统承载数据 | 与本地病历实体对应 | 系统落点建议（数据模型 / 接口方向） |
| --- | --- | --- | --- |
| `Patient` | 患者人口学信息、多标识符、联系方式、性别、出生日期、死亡状态、地址、联系人 | 患者主索引（EMPI）档案、就诊卡号/病案号映射 | 患者主表 + 标识符类型表（身份证、医保号、病案号、就诊卡号）；FHIR Patient 作为对外交换模型；姓名、性别、民族等编码对齐国标代码集 |
| `Encounter` | 就诊事件类型、起止时间、参与人员、地点、就诊状态、入院/出院信息、关联诊断 | 门诊就诊记录、住院就诊记录、体检/会诊事件 | 就诊事件主表，区分门诊/住院/急诊/体检；关联科室、医生、床位、入出院时间；状态机对齐 R4 状态码并保留本地扩展 |
| `Condition` | 诊断、问题列表、既往史、健康关注点；`code` 编码、`severity`、`onsetDateTime`、`abatement`、`clinicalStatus`、`verificationStatus`、`encounter` 引用 | 门诊诊断、住院诊断、问题列表、既往疾病史、过敏相关之外的疾病条目 | 诊断实体表（本地诊断名 + 标准编码 + 状态 + 来源就诊）；区分"确诊/疑似/既往/已解决"；关联 ICD-10/ICD-11 映射；挂接到对应 `Encounter` |
| `MedicationRequest` | 医嘱处方：药品、剂量、频次、途径、起止时间、用药者、医嘱状态、`reasonReference` | 门诊处方、住院医嘱、长期医嘱、出院带药 | 医嘱主表 + 药品/剂量/频次/途径结构化字段；状态机（draft/active/completed/cancelled/stopped）；与 `Condition`、`Encounter` 关联；药品编码映射医保目录与标准药品编码 |
| `MedicationAdministration` | 实际给药记录：给药时间、剂量、执行者、执行结果 | 护士执行给药记录、用药执行台账 | 给药执行表关联 `MedicationRequest`；记录执行时间、执行者、剂量、途径、作废/拒绝原因；供药学与护理质控审计 |
| `AllergyIntolerance` | 过敏史：过敏原、反应类型、严重程度、反应表现、类别、状态 | 患者过敏史、药物/食物/其他过敏条目 | 过敏史独立实体表（不并入诊断表）；过敏原编码映射药品/物质编码；反应描述结构化 + 自由文本；就诊与处方环节强制校验提示 |
| `Composition` | 病历文档集：文档类型编码、标题、编制时间、保密级别、作者、签署者、托管机构、章节树、章节条目引用 | 病历文档（门诊病历、入院记录、出院小结、手术记录、病案首页、知情同意书等） | 病历文档主表 + 章节子表；`Composition.section` 对应病历章节；`entry` 引用 `Observation`/`Condition`/`DocumentReference` 等资源；文档版本链与签署信息挂接主表 |
| `DocumentReference` | 病历附件：文档类型、创建时间、作者、状态、`content.attachment`（内容/引用/大小/格式/哈希）、关联事件与患者 | 扫描件、影像报告、PDF 附件、签名图、上传资料 | 附件元数据表 + 附件存储对象；记录 MIME 类型、大小、哈希、作者、来源业务环节；与 `Composition.section.entry` 关联；权限与审计跟随文档 |
| `Procedure` | 手术操作、处置操作：操作编码、时间、操作者、地点、结果、`reasonReference` | 手术记录、操作记录、治疗性处置、诊疗操作台账 | 操作实体表关联 `Encounter`；编码映射 ICD-9-CM-3；术前/术中/术后文本挂 `DocumentReference`；麻醉与术者信息作为参与方扩展 |
| `Observation` | 观测指标：检验结果、生命体征、检查数值、问卷评分；`code`（LOINC 等）、`value[x]`、`unit`、`referenceRange`、`interpretation`、`effectiveDateTime` | 检验结果、体征、体温单记录、检查所见数值、评分类项目 | 观测实体表（项目编码 + 值 + 单位 + 参考范围 + 异常标记 + 时间）；数值型/文本型/编码型/附件型分支；项目字典映射 LOINC；与 `DiagnosticReport` 关联 |
| `DiagnosticReport` | 检验/检查报告：报告编码、状态、出具时间、观察者、`result` 引用清单、`presentedForm` 报告附件 | 检验报告单、影像报告、病理报告、内镜报告等 | 报告主表（类型、状态、时间、科室/医师）；结果项引用 `Observation`；报告全文/附件挂 `DocumentReference`；危急值状态与报告审核状态独立建模 |
| `Coverage` | 保险/支付方信息：支付方、受益方、保单号、从属序列 | 医保参保信息、商保信息、就诊收费关联 | 参保/保险信息表关联 `Patient` 与 `Encounter`；医保类型编码对齐国家医保代码集；为结算与统计提供标准交换模型 |
| `Practitioner` | 医务人员身份信息、资质、联系方式 | 医师/护士/药师/医技人员主档 | 人员主档表；执业类别、执业范围、职称、科室作为扩展；对外接口输出标准 `Practitioner` 模型 |
| `PractitionerRole` | 人员与机构、科室、角色、服务时段的关联 | 科室归属、岗位角色、出诊排班 | 人员—科室—角色关联表；支持一人多岗、多院区出诊；与 `Encounter` 参与方引用对接 |
| `Location` | 机构、科室、病房、床位、设备位置 | 机构档案、科室字典、床位台账 | 位置层级表（机构 → 院区 → 科室 → 病区 → 床位）；住院 `Encounter.hospitalization.locationHistory` 由此映射 |
| `Consent` | 知情同意：状态、适用范围（隐私/就诊/科研/预嘱）、类别、政策依据、授权人、细粒度允许/拒绝条款 | 就诊知情同意书、隐私告知、科研使用同意、特殊治疗同意 | 同意书实体表（状态、范围、类别、政策文档引用、签署人、条款集）；与 `QuestionnaireResponse`/`Signature`/`DocumentReference` 联动；状态变更留痕 |
| `Provenance` | 资源留痕：目标资源、活动时间、执行者/关联方、参与实体、签名、政策依据、原因 | 病历创建/修改/导入/导出留痕记录 | 对每份病历文档、关键条目与附件生成 `Provenance` 记录；记录操作者、时间、来源系统、变更依据；作为审计与医疗举证的结构化底座 |
| `Signature` | 电子签名：签名类型、签名时间、签名人、签名数据/证书引用、签名目的 | 医师签名、护士签名、患者/家属签名、法律签名 | 签名对象独立建模，绑定到 `Composition`/`Consent`/`DocumentReference`；记录签名人、时间、签名含义、打印姓名、签名影像或证书指纹；签名数据防篡改归档 |

**补充说明**：`Organization`（医疗机构/科室组织实体）、`RelatedPerson`（患者联系人/家属）、`ServiceRequest`（检查/检验/转诊医嘱申请）、`Questionnaire` 与 `QuestionnaireResponse`（结构化表单与答卷）、`Task`（随访/转诊任务）、`Bundle`/`DocumentManifest`（整包交换）在 EMR 模块中同样需要建模，作为上述资源的配套支撑。

## 1.2 CDA R2 与 WS/T 500—2016《电子病历共享文档规范》落点

### 1.2.1 结构模型：文档头—文档体—章节—条目四层

**已核实**：HL7 CDA R2（Clinical Document Architecture, Release 2）以 `ClinicalDocument` 为根元素，分为**文档头**与**文档体**：

- **文档头**：`realmCode`、`typeId`（`POCD_MT000040`）、`templateId`、文档 `id`、文档类型 `code`、`title`、`effectiveTime`、保密级别 `confidentialityCode`、语言 `languageCode`、`recordTarget`/`patientRole`（患者信息）、`author`（创作者）、`custodian`（文档管理者/医疗机构）、`documentationOf`（关联就诊活动）、`participant`、`authenticator`/`legalAuthenticator`（签名人/法律签名人）、`relatedDocument`（版本替代等关联文档）。
- **文档体**：`structuredBody` → `component` → `section` → `entry` → `observation` / `organizer` / `act` / `substanceAdministration` / `procedure` 等条目节点；章节 `text` 提供人读叙述，`entry` 提供结构化编码数据。

**已核实**：WS/T 500—2016《电子病历共享文档规范》系列各部分均沿用 HL7 CDA R2 文档头—文档体—章节—条目结构，按国内业务场景定义文档模板（`templateId`）、章节编码、条目数据元与值域。本轮已直接核实 `WS/T 500.1—2016 病历概要`、`WS/T 500.32—2016 住院病案首页` 原文结构；`WS/T 500.4 西药处方`、`WS/T 500.34` 等为系列代表性部分。

> **口径说明**：任务书中"国标 32 部分"的表述未能在官方文本中核实。WS/T 500 系列按文档类型分部分发布：`500.1` 前言列示 50 个部分，`500.32` 前言列示 53 个部分；具体以国家卫生健康委现行有效文本为准。本报告不采用"32 部分"这一数字。

### 1.2.2 HL7 CDA R2 构件 ↔ WS/T 500 落点映射表

| CDA R2 构件 | WS/T 500 落点 | 已核实示例（OID / LOINC / 数据元标识） |
| --- | --- | --- |
| `ClinicalDocument` 根 | 共享文档根：文档类型、模板号、文档唯一标识、编制时间、保密级别、语言 | `typeId`：`POCD_MT000040`；`500.1` 模板 OID：`2.16.156.10011.2.1.1.21`（病历概要）；文档类型编码体系 OID：`2.16.156.10011.2.4`（卫生信息共享文档编码体系） |
| `recordTarget`/`patientRole` | 文档头患者信息：姓名、性别、出生日期、身份证件号、住址、联系电话、就诊卡号 | 性别代码依据 GB/T 2261.1；民族代码依据 GB/T 3304；数据元取自卫生信息数据元目录体系 |
| `author` | 文档创作者：姓名、所属医疗机构、科室、创建时间 | 人员与机构引用本系统 `Practitioner`/`Organization` 模型 |
| `custodian` | 文档管理者（医疗机构）档案与联系信息 | 对应 `Organization` 档案 |
| `authenticator`/`legalAuthenticator` | 文档签名人 / 法律签名人（医师签名、审核签名） | 签名时间、签名人、签名方式挂接 `Signature`/`Provenance` 模型 |
| `documentationOf` | 文档关联活动：就诊/住院事件时间、事件类别 | 关联 `Encounter` 模型 |
| `relatedDocument` | 版本替代、前版文档、合并记录 | 病历文档版本链；`typeCode=REPL` 表示替代前版 |
| `structuredBody`/`section` | 病历章节：实验室检查、既往史、输血史、过敏史、预防接种史、个人史、月经史、家族史、卫生事件、出院诊断、费用等 | 章节 `code` 使用 LOINC：`30954-2` Studies Summary；`11348-0` History of Past Illness；`48765-2` Allergies, adverse reactions, alerts；`11535-2` HOSPITAL DISCHARGE DX（出院诊断章节，见 500.32）；`codeSystem=2.16.840.1.113883.6.1`（LOINC） |
| `entry`/`observation`/`organizer`/`act`/`substanceAdministration`/`procedure` | 结构化条目：诊断名称与编码、手术操作、药品剂量、检验结果、费用条目等 | 条目数据元 OID 体系 `2.16.156.10011.2.2.1`（卫生信息数据元目录）；诊断编码体系 OID `2.16.156.10011.2.3.3.11.3`（ICD-10）；病案首页数据集 OID `2.16.156.10011.2.2.4`（住院病案首页基本数据集） |

### 1.2.3 结构化与可读性要求（落地约束）

**已核实于 500.1、500.32 原文**：

1. **章节人读文本不可空**：每个 `section` 必须包含 `text` 人读叙述段，保证文档脱离系统也可读；结构化 `entry` 与 `text` 叙述并存，二者语义一致。
2. **条目基数与约束**：模板对每个章节条目标注基数（如 `1..1 R` 必填、`1..* R` 重复必填、`0..* R2` 可选重复），生成与解析服务须按模板校验。
3. **编码一致性**：诊断、手术、药品、项目、费用等条目必须同时给出标准编码与本地名称；编码体系 OID、版本号与值域在文档内一致引用。
4. **文档头完整性**：患者标识、创作者、管理者、签名人、关联就诊、文档时间与保密级别为交换合规的必填要素。
5. **模板化生成方向**：本系统对内以 `Composition` 章节模型承载病历内容；对外交换时由"文档生成服务"按 WS/T 500 各部分模板渲染 CDA R2 XML（头—体—章节—条目），并预留反向解析（导入共享文档）能力。

## 1.3 术语集落点：诊断、手术、观测、临床术语与药品编码

### 1.3.1 标准/术语 × 病历场景 × 系统落点建议

| 标准 / 术语 | 病历场景 | 系统落点建议（数据模型 / 接口 / 映射表） |
| --- | --- | --- |
| **ICD-10**（含国标版本、医保版本） | 门诊诊断、住院出院诊断、问题列表、既往疾病史、病案首页主要/其他诊断、转诊理由 | `Condition.code` 主编码；诊断字典本地表 + `diagnosis_std_map` 映射表（本地诊断名、ICD-10 编码、版本、映射状态、审核人/时间）；录入端提供编码检索、名称回填、编码—名称双向对照；医保结算字段单独保留医保版编码，不与国标编码混用 |
| **ICD-11**（中文版） | 疾病分类统计、绩效考核、区域平台上报；新国标疾病分类口径 | **已核实**：国卫医发〔2018〕52 号《关于印发国际疾病分类第十一次修订本（ICD-11）中文版的通知》要求自 2019 年 3 月 1 日起各级各类医疗机构使用 ICD-11 中文版进行疾病分类与编码，并做好与原有疾病分类代码衔接。系统建模上：诊断实体支持双编码并存（ICD-10 + ICD-11），以 `ConceptMap` 风格映射表维护两套编码对照；预留编码版本字段；迁移路线为"映射核对 → 双码并存 → 按主管部门节奏切换主编码"。**[推断：各医院实际并行过渡期长短以属地医保与病案管理要求为准]** |
| **ICD-9-CM-3** | 手术操作记录、病案首页手术/操作条目、手术与处置统计 | `Procedure.code` 主编码；手术操作字典 + `procedure_std_map` 映射表；与 ICD-10 诊断条目在病案首页中分别建模；麻醉方式、切口等级、术者等作为操作附属属性 |
| **LOINC** | 检验项目编码、检查观测指标、生命体征条目、报告章节编码、问卷/评分项 | `Observation.code`、`DiagnosticReport.code`、`Composition.section.code` 使用 LOINC；`lab_item_map`/`observation_item_map` 维护本地项目 ↔ LOINC 编码、属性类型、标准单位、参考范围版本；单位与参考范围随项目字典绑定；导入共享文档时按 LOINC 章节码归位 |
| **SNOMED CT** | 临床术语（症状、体征、诊断、操作表达）的规范化表达；可选编码体系 | `Condition.code`、`Observation.code` 可作为补充编码；`clinical_term_map` 维护本地术语 ↔ SNOMED 概念映射。**注意**：SNOMED CT 使用受成员国/发行授权条件约束，中国大陆医疗机构落地前须核实授权合规性；首期以 ICD 与 LOINC 为强制标准，SNOMED 作为可选增强 **[推断：授权状态以 SNOMED International 与主管部门最新规定为准]** |
| **RxNorm / 药品标准编码** | 药品名称标准化、药品成分/剂型/规格对照（国际交换场景）；国内场景对应国家医保药品目录编码、药品本位码 | `MedicationRequest.medicationCodeableConcept`；`drug_std_map` 字段：本地药品编码、药品名、规格、剂型、医保编码、国家药品本位码、RxNorm（对外交换备用）；药品字典以本地目录为主标准映射为辅；对外 FHIR 交换时按目标市场选择编码体系 |
| **本院术语字典（本地主数据）** | 所有病历录入的默认工作语言：本地诊断、本地手术、本地检验项目、本地药品、本地体征项目、科室/人员/机构 | 本地字典为录入与存储中心，标准编码仅作为映射与对外交换；字典管理模块提供新增、停用、合并、排序、适用科室；术语服务对外提供 `lookup`（按编码取显示名）、`expand`（按值集取候选）、`translate`（本地码 ↔ 标准码）三类接口；映射表统一记录版本、置信度、审核状态与审核痕迹 |

### 1.3.2 术语映射表通用设计建议 **[推断：基于 OpenMRS 概念映射、Medplum ConceptMap 机制的对标推演]**

1. **一对多与多对多**：一个本地码可映射多个标准系统编码（如本地诊断同时映射 ICD-10 与 ICD-11）；一个标准码可被多个本地码映射，禁止假设一对一。
2. **版本与状态**：映射表携带术语集版本、映射状态（待审核 / 已确认 / 待修订 / 作废）、映射类型（等价 / 上位 / 近似 / 无对应）、置信度。
3. **审核留痕**：映射新增、修改、作废均记录操作人、时间与依据材料；关键医学映射须具备审核闭环。
4. **术语服务化**：编码加载、版本发布、值集维护通过独立术语服务对外提供，病历模块不直接读写术语集原始文件。
5. **双码过渡**：ICD-10 与 ICD-11 过渡期内，诊断实体同时保留两套编码与各自版本；对外上报按目标系统口径选择主编码。

---

# 二、开源项目剖析矩阵

## 2.0 总览

| # | 项目 | 仓库 URL（已核实可访问） | License（已核实原文） | 技术栈要点 | FHIR 支持度 | 借鉴价值 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | OpenEMR | https://github.com/openemr/openemr | GPL-3.0-or-later（根 LICENSE 为 GNU GPL v3 全文） | PHP ≥ 8.3、Laminas/Symfony/Doctrine、MySQL/MariaDB、Node/webpack 构建 | 原生支持 R4（US Core 8.0、SMART 2.2、Bulk Data） | 中 |
| 2 | OpenMRS Core | https://github.com/openmrs/openmrs-core | MPL-2.0 w/ Healthcare Disclaimer | Java 8+、Spring/Hibernate、MySQL/MariaDB、Liquibase、模块化 WAR | 插件（`openmrs-module-fhir2`，R4） | 中 |
| 3 | Bahmni（发行版） | 核心：https://github.com/Bahmni/bahmni-core ；前端：https://github.com/Bahmni/bahmni-apps-frontend ；遗留前端：https://github.com/Bahmni/openmrs-module-bahmniapps ；FHIR 扩展：https://github.com/Bahmni/openmrs-module-fhir2Extension 、https://github.com/Bahmni/bahmni-module-fhir2-addl-extension | bahmni-core：MPL-2.0 w/ Healthcare Disclaimer；组合发行内含 OpenMRS、OpenELIS、Odoo、Mirth Connect、dcm4chee 等第三方组件，协议须单独审查 | Java/Hibernate/Spring REST、React 19、AngularJS 遗留前端、Docker/K8s/Helm | 插件（fhir2 之上扩展模块，R4） | 中低 |
| 4 | Medplum | https://github.com/medplum/medplum | Apache-2.0（LICENSE.txt 原文） | 全栈 TypeScript、Node.js/Express、PostgreSQL、Redis、React、Bots、Agent | 原生支持 R4（全量资源模型、托管术语、$ccda-export） | 高 |
| 5 | HAPI FHIR | https://github.com/hapifhir/hapi-fhir | Apache-2.0（LICENSE.txt 原文） | Java、JPA/Hibernate、Spring Boot Starter、多版本 FHIR 结构、CDS Hooks/IPS/MDM/订阅/转换模块 | 原生支持（框架级，DSTU2/DSTU3/R4/R4B/R5） | 高 |
| 6 | openhis（天天开源 OpenHIS 通用版） | https://github.com/tntlinking-opensource/openhis （旧地址 https://github.com/newtouch-cloud/openhis 重定向至此；Gitee 组织：https://gitee.com/organizations/tntlinking-opensource/projects ） | GPL-3.0（LICENSE 原文：Copyright © 2022-2024 武汉新致数字科技有限公司） | .NET Framework / C#、SQL Server、WebAPI、HangFire、医保插件 | 无（README 未见 FHIR 接口说明） | 中低 |
| 7 | ZainZhao/HIS | https://github.com/ZainZhao/HIS | Apache-2.0（根 LICENSE 原文；README 版权 2018-2019 ZainZhao） | Java Spring Boot 2.0.3、Spring Cloud Netflix Finchley、MyBatis、Vue 2.6/Element-UI、uni-app、Redis/RabbitMQ/MyCat/ELK/JWT | 无（未见标准接口证据） | 低 |

---

## 2.1 OpenEMR

**仓库**：https://github.com/openemr/openemr  **[已核实：仓库主页、README、`composer.json`、根 LICENSE、`FHIR_README.md`、官方 Wiki Code Types 页面]**

### 六要素

1. **License**：GPL-3.0-or-later。`composer.json` license 字段为 `GPL-3.0-or-later`，根目录 `LICENSE` 为 GNU General Public License v3 全文；GitHub 仓库徽标标注 GPL-3.0。**[已核实原文]**
2. **技术栈**：PHP ≥ 8.3；后端使用 Laminas MVC、Symfony 组件、Doctrine ORM/DBAL/Migrations、AdoDB；数据库 MySQL/MariaDB（`ext-mysqli`/`pdo_mysql`）；前端 Bootstrap/Angular 组件、Twig/Smarty 模板；Node.js 24 + webpack 构建；Redis；内置 OAuth2 服务端；`phpseclib`、`sodium` 等加密依赖。**[已核实 `composer.json` 与 README]**
3. **病历核心模块**：患者人口学档案、就诊记录、问题列表/诊断、处方与医嘱、用药记录、过敏史、检验检查结果、病历文档（布局式表单 + 富文本）、计费与保险理赔、患者门户、临床质量度量（CQM）规则、CCR/CCD 文档导入导出、文档加密存储与 CouchDB 文档模块（历史模块）。
4. **标准支持度**：

| 标准 | 支持程度 | 证据与说明 |
| --- | --- | --- |
| FHIR | **原生支持** | `FHIR_README.md` 已核实：FHIR R4（4.0.1）服务器，遵循 US Core 8.0.0、SMART v2.2.0、Bulk Data v1.0、USCDI v1；已列资源含 AllergyIntolerance、Appointment、Binary、CarePlan、CareTeam、Condition、Coverage、Device、DiagnosticReport、DocumentReference、Encounter、Goal、Immunization、Location、Medication、MedicationRequest、MedicationDispense、Observation、Organization、Patient、Person、Practitioner、PractitionerRole、Procedure、Provenance、RelatedPerson、ServiceRequest、Specimen；`$docref` 操作可生成 CCD 文档 |
| CDA | **部分** | 支持 CCD/CCR 文档导入导出（仓库 `ccr/` 目录、`$docref` CCD 生成；社区文档确认 CCD/CCR 支持）；未见覆盖完整 CDA R2 模板体系与中国 WS/T 500 模板 |
| ICD | **原生支持（表结构 + 数据导入）** | 官方 Wiki Code Types 已核实：内置 ICD9、ICD10、ICD10-PCS、CPT4、HCPCS、CVX、ICPC、DSMIV 等代码类型，通过外部数据加载导入代码表；默认美国体系（ICD9/CPT4/HCPCS） |
| LOINC | **部分（代码类型已注册）** | Wiki 已核实：`LOINC` 为官方代码类型（`ct_id=110`）；观测/检验条目使用；LOINC 字典需另行加载 |
| SNOMED CT | **部分（可导入字典）** | Wiki 已核实：SNOMED / SNOMED-CT 代码类型存在，经 External Data Loads 导入 RF1/RF2 字典；系统不捆绑词表内容 |
| HL7 v2 | **部分（库级 + 外部引擎集成）** | `composer.json` 已核实依赖 `aranyasen/hl7`（HL7 v2 PHP 解析库）；ADT/ORM/ORU 收发在社区实践中经 Mirth Connect 等外部接口引擎以 MLLP 对接；核心未内置完整 v2 消息引擎 **[已核实依赖项；集成形态为社区实践，部分推断]** |

5. **可借鉴点**：
   - 布局式就诊表单（layout/visit forms）实现"结构化字段 + 自由文本段落"混合录入，模板可配置；
   - 代码类型（Code Types）可配置体系：诊断/计费/临床术语/药品/免疫等类别与外部数据表的绑定关系可后台配置；
   - FHIR 资源覆盖面广，`Provenance`、`DocumentReference`、`Coverage` 等模型可直接对照设计；
   - 患者门户、OAuth2 授权、文档导入导出与 CQM 规则解析的功能分层参考价值高。
6. **局限与风险**：
   - GPLv3 强传染：二次开发并分发的衍生代码须按 GPL 条款开源，对商业闭源产品不具备直接复用许可空间；
   - 业务模型面向美国基层诊所与计费场景（CPT4/HCPCS/X12 837p），与国内住院病历、病案首页、医保结算、质控体系不匹配；
   - PHP + 传统 MVC 技术栈与云原生微服务路线差异较大；
   - 无 WS/T 500 CDA 模板、无国内术语集与医保编码体系；中文本地化需自行补齐；
   - HL7 v2 依赖外部引擎，核心侧能力有限。

**对本系统借鉴价值：中**（病历表单组织、代码类型配置与 FHIR 资源覆盖可借鉴；协议、业务模型与技术栈不适合直接复用）。

---

## 2.2 OpenMRS Core

**仓库**：https://github.com/openmrs/openmrs-core  **[已核实：仓库主页、README、根 LICENSE、官方指南 Concepts 页面、fhir2 模块仓库]**

### 六要素

1. **License**：MPL-2.0 w/ Healthcare Disclaimer（SPDX `MPL-2.0` 附医疗免责声明 HD）。根 `LICENSE` 原文已核实：Mozilla Public License 2.0 + Health Disclaimer，声明不保证合规与临床适用性，责任由医护人员自行承担。**[已核实原文]**
2. **技术栈**：Java 8+，Maven 构建，WAR 包部署于 Tomcat/Jetty；Spring + Hibernate；数据库 MySQL/MariaDB（O3 生产部署要求 MariaDB 10.11+ / MySQL 8.0+；官方指南确认历史上以 MySQL 为推荐库，H2 仅限 SDK/部分模块）；Liquibase 管理数据库变更；Elasticsearch 可选；模块化插件架构（模块独立打包、运行时挂接）；REST Web Services 由官方模块提供。**[已核实 README 与官方指南]**
3. **病历核心模块**：患者登记与多标识符体系（病历号、国家 ID、身份证等多类型 + 校验位）、就诊（Encounter）、观测值（Observation）、概念字典（Concept Dictionary）、HTML Form Entry 表单模块、医嘱（Orders）、过敏史、患者队列（Cohort）与元数据共享模块；临床文书、住院病历、病案首页、质控等专用能力薄弱。
4. **标准支持度**：

| 标准 | 支持程度 | 证据与说明 |
| --- | --- | --- |
| FHIR | **插件/模块** | `openmrs-module-fhir2`（https://github.com/openmrs/openmrs-module-fhir2 ，MPL-2.0 w/ HD，基于 HAPI 构建，目标 FHIR R4）；核心仓库本身不含 FHIR 服务器 **[已核实模块仓库]** |
| CDA | **无** | 核心与本轮核实的官方模块中未见 CDA R2 文档模板支持；生态第三方模块未逐一排查 **[未核实项见附录]** |
| ICD | **部分（映射机制，字典自导入）** | 官方指南已核实：概念映射（Concept Mapping）机制可将本地概念映射到 ICD 等外部词表；系统仅内置少量基础概念，词表需自行导入 |
| LOINC | **部分** | fhir2 Observation 结构定义已核实绑定 LOINC Valueset（`observation-codes` / LOINC Codes）；概念映射机制支持 LOINC 对照；字典内容需自导入 |
| SNOMED CT | **部分** | 官方指南已核实：概念映射机制明确列举 SNOMED 为可映射的标准词表；字典内容需自导入 |
| HL7 v2 | **无（核心）；外部集成实践** | 核心不内置 HL7 v2 消息引擎；社区与部署实践经 Mirth Connect 等外部接口引擎收发消息 **[已核实社区讨论；核心无支持为已核实，集成形态为外部实践]** |

5. **可借鉴点**：
   - 概念字典 + 概念映射模型：本地概念为中心、标准术语为映射、多对多关联，是本系统术语服务的重要参照；
   - 模块化架构：核心平台稳定，表单、医嘱、集成、报表等以模块挂接，降低核心耦合；
   - 患者多标识符模型与校验位设计（如 Luhn 校验），适合门诊号/病案号/身份证等多标识共存场景；
   - 元数据共享模块用于跨部署复用字典、表单与配置。
6. **局限与风险**：
   - 产品定位偏向基层诊所与公共卫生随访，住院病历、病程记录、手术记录、病案首页、病历质控、医嘱闭环等能力薄弱；
   - MPL 弱传染但附医疗免责声明；商业使用仍需做合规审查；
   - FHIR 能力依赖 fhir2 模块，资源覆盖与成熟度需结合模块版本评估；
   - 无国内医保、病案首页、WS/T 500 文档与本土术语集；
   - 表单、报表与集成能力分散在生态模块，整体成品化程度低。

**对本系统借鉴价值：中**（术语字典、概念映射、模块化与标识符机制借鉴价值高；临床病历模型借鉴价值低）。

---

## 2.3 Bahmni

**仓库与组件**（官方 Wiki 组件清单已核实）：

- 核心后端：https://github.com/Bahmni/bahmni-core
- 新前端（React 19）：https://github.com/Bahmni/bahmni-apps-frontend
- 遗留前端（AngularJS）：https://github.com/Bahmni/openmrs-module-bahmniapps
- FHIR 扩展模块：https://github.com/Bahmni/openmrs-module-fhir2Extension 、https://github.com/Bahmni/bahmni-module-fhir2-addl-extension
- 发行与部署：`bahmni-docker`；另有 audit-log、appointments、episodes、bacteriology、offline-connect、atom-feed、pacs-integration、bahmni-mart、Helm/K8s 等仓库（清单见官方 Wiki）

### 六要素

1. **License**：`bahmni-core` 根 LICENSE 原文已核实为 **MPL-2.0 w/ Healthcare Disclaimer**（Copyright OpenMRS Inc. 2026）。Bahmni 为**组合发行版**：在 OpenMRS（MPL-2.0 w/ HD）之上集成 OpenELIS Global（实验室信息系统）、Odoo（库存/计费，Odoo Community 为 LGPLv3 等各自协议）、Mirth Connect（接口引擎）、dcm4chee（PACS）等第三方组件；二次发行前必须对各组件 License 单独审查。**[核心协议已核实；组合组件协议为事实性说明，未逐一读取各组件 LICENSE 原文]**
2. **技术栈**：Java/Hibernate/Spring REST（bahmni-core）；React 19 新前端，AngularJS 遗留前端；底层为 OpenMRS 平台；OpenELIS（Java LIS）；Odoo（Python ERP）；Docker / Kubernetes / Helm 部署；独立 audit-log 服务；Appointments（预约）、Episodes（就诊集）、Offline Connect（离线同步）、Atom Feed（数据变更推送）、PACS Integration、Bahmni Mart（分析数据集市）等配套模块。**[已核实官方 Wiki 仓库清单与 README]**
3. **病历核心模块**：患者登记、门诊问诊（consultation）表单、处方、检验（经 OpenELIS 集成）、放射与影像报告、就诊集（Episode）管理、预约、过敏史、用药记录、患者 360° 档案视图、离线诊所同步、审计日志、分析 Mart。
4. **标准支持度**：

| 标准 | 支持程度 | 证据与说明 |
| --- | --- | --- |
| FHIR | **插件/模块** | 在 OpenMRS fhir2（R4）之上由两个扩展模块补充资源与字段；核心平台本体不内置 FHIR **[已核实仓库清单；模块资源覆盖度未实测]** |
| CDA | **无** | 本轮材料未见 CDA R2 模板或 WS/T 500 支持证据 |
| ICD / LOINC / SNOMED CT | **部分（继承 OpenMRS 机制）** | 概念字典与映射机制继承自 OpenMRS；词表内容需自行导入；本仓库未捆绑标准术语集 **[机制继承为已核实；各词表落地情况部分推断]** |
| HL7 v2 | **部分（外部引擎集成）** | 部署实践中经 Mirth Connect 与 LIS/PACS 交换 ADT/ORU/ORM 等消息；非核心内置 **[社区部署实践，部分推断]** |

5. **可借鉴点**：
   - "临床平台 + 独立 LIS + 独立计费库存 + 独立接口引擎 + PACS"的组合交付形态，适合对照医共体/多系统集成架构；
   - 患者 360° 视图的信息组织方式（诊断、用药、过敏、检验、影像、就诊时间线）；
   - 门诊问诊表单控件库与登记表单配置思路；
   - 审计日志独立服务、离线诊所同步、分析 Mart 分层（业务库 → 分析库）的设计参考。
6. **局限与风险**：
   - 技术栈碎片化：Java 后端 + AngularJS 遗留前端 + React 新前端 + Python Odoo + Java LIS，维护与人员成本高；AngularJS 前端存在技术淘汰风险；
   - 面向非洲与基层诊所场景，住院病历、病案首页、CDSS、质控与国内医保体系缺失；
   - 组合发行的多 License 合规边界复杂，商业闭源使用须逐项清理；
   - FHIR 与标准交换依赖模块与外部引擎，自身病历标准沉淀薄弱。

**对本系统借鉴价值：中低**（产品形态、集成架构与 360° 视图可参考；代码直接复用价值低）。

---

## 2.4 Medplum

**仓库**：https://github.com/medplum/medplum  **[已核实：仓库主页、根 LICENSE.txt、官方产品页、Consent 文档、`$ccda-export` 操作文档、HL7 包 README]**

### 六要素

1. **License**：Apache-2.0。根 `LICENSE.txt` 原文已核实为 Apache License Version 2.0；仓库徽标与 `packages/hl7/README.md` 均标注 Apache 2.0。**[已核实原文]**
2. **技术栈**：全栈 TypeScript；后端 Node.js + Express；数据库 PostgreSQL；缓存/消息 Redis；前端 React（`@medplum/react` 临床组件库）；TypeScript/JS SDK；Bots（TypeScript 自动化函数，资源变更/定时/HTTP 触发）；订阅（rest-hook Webhook + WebSocket）；Medplum Agent（本地侧隧道连接云平台）；多租户按 Projects 隔离；支持托管与自托管部署。**[已核实 README 架构树与产品文档]**
3. **病历核心模块**：患者档案、就诊与进度笔记（SOAP 组件：Subjective/Objective/Assessment/Plan）、医嘱与检验申请（ServiceRequest）、检验检查报告、用药与给药、过敏史、CarePlan/任务/转诊、医患消息通信、计费与理赔、问卷表单体系（Questionnaire/QuestionnaireResponse）；`Medplum Provider` 为开源示例 EHR 外壳（charting、orders、messaging、schedule），可作为产品参照而非成品病历。
4. **标准支持度**：

| 标准 | 支持程度 | 证据与说明 |
| --- | --- | --- |
| FHIR | **原生支持（R4）** | 产品文档已核实：FHIR Datastore 将"every FHIR R4 resource、search parameter、reference"开箱建模；REST + GraphQL；路径示例 `/fhir/R4/Patient`；内置 CodeSystem/ConceptMap/ValueSet 与 `$import`/`$lookup`/`$subsumes`/`$expand` 等术语操作；`Patient/$everything`、`Patient/$summary`（IPS）、`$ccda-export` 等操作齐备 |
| CDA | **部分（单向导出 C-CDA）** | 文档已核实：`Patient/$ccda-export` 先生成 IPS 风格 Composition Bundle，再经 `@medplum/ccda` 转换为 C-CDA XML（`application/cda+xml`）；默认 CCD（LOINC `34133-9` Summarization of Episode Note），可选 Referral Note（LOINC `57133-1`）；方向为 FHIR → C-CDA 单向导出，未见完整 CDA 模板解析体系 |
| ICD | **原生机制 + 托管 ICD-10 术语** | 产品页已核实托管术语集覆盖 SNOMED · ICD-10 · LOINC；ICD-11 未单列，可通过 CodeSystem 自行加载 **[推断]** |
| LOINC | **原生机制 + 托管 LOINC** | 产品页托管术语含 LOINC；Consent 类别示例使用 LOINC `59284-0`（Privacy Consent Document）；Observation/Report 编码绑定 LOINC 值集 |
| SNOMED CT | **原生机制 + 托管 SNOMED** | 产品页术语服务含 SNOMED；`ValueSet/$expand` 示例返回 SNOMED 糖尿病系列编码（如 `73211009`、`44054006`） |
| HL7 v2 | **部分（Agent 隧道 + Bots 变换）** | 产品页已核实：Medplum Agent 在本地防火墙内运行，经加密 WebSocket 隧道转发 HL7v2 与 DICOM；Bots 可处理 HL7 变换、资格校验与通知；仓库 `packages/hl7` 提供 HL7 服务端/客户端封装；非内置完整 v2 消息引擎与消息路由规则 **[已核实 Agent 与包存在；消息覆盖度部分推断]** |

5. **可借鉴点**：
   - FHIR 原生数据模型贯穿前后端：资源即数据模型，避免"本地表 + 转换层"长期双模型漂移；
   - 版本化资源历史：每次写入保留版本与作者，支撑病历修订留痕与篡改追溯；
   - 知情同意与签名结构化建模：`Consent`（status/scope/category/policy/performer/provision）+ `Signature`（who/when/type/data），并显式映射 21 CFR Part 11 四要素（签名人、时间、签名含义、打印姓名）；
   - 审计统一为 FHIR `AuditEvent`：读、写、登录均留痕，可查询、可归档；
   - `AccessPolicy` 按资源、 compartment、字段级控制读写权限；Projects 多租户隔离；
   - C-CDA / IPS 以 FHIR 之上的操作层实现，是"对内 FHIR、对外文档"分层思路的直接参照；
   - OAuth2 / OIDC / SMART on FHIR / MFA 身份体系，Bots 与 Subscriptions 支撑自动化与事件联动。
6. **局限与风险**：
   - 平台型框架而非成品 EHR：临床文书模板、病案首页、病历质控、医保结算、院内流程编排均需自建；
   - 标准体系以美国合规语境（HIPAA、ONC、SOC 2、HITRUST、21 CFR Part 11、EPCS）为主；WS/T 500 模板、国内医保编码、互联互通 Profile 需自建；
   - 技术栈 TypeScript/Node/PostgreSQL，若本系统后端采用其他栈，数据模型与机制可借鉴、代码不可直接复用；
   - HL7 v2 与 CDA 解析能力相对薄弱，院内老系统对接仍需配套适配器。

**对本系统借鉴价值：高**（数据模型、版本留痕、同意签名、审计权限、多租户与交换分层直接对标设计）。

---

## 2.5 HAPI FHIR Server（HAPI FHIR 参考实现）

**仓库**：https://github.com/hapifhir/hapi-fhir  **[已核实：仓库主页、根 LICENSE.txt、仓库模块目录、官方文档 Modules 页面、官网版本说明]**

### 六要素

1. **License**：Apache-2.0。根 `LICENSE.txt` 原文已核实为 Apache License Version 2.0。**[已核实原文]**
2. **技术栈**：Java；JPA/Hibernate 持久化；Spring Boot Starter；模块体系包括 `hapi-fhir-base`、各版本结构库（`structures-dstu2`/`dstu3`/`r4`/`r4b`/`r5`）、`jpa-server`、`server-cds-hooks`、MDM、IPS、Subscriptions、跨版本 `converter`、Validation、Terminology、Test 等；以服务器框架与工具库形态交付。**[已核实仓库文件清单与官方模块文档]**
3. **病历核心模块**：**无临床病历功能**。HAPI FHIR 是 FHIR 规范的 Java 参考实现与服务器框架，提供资源解析/校验、JPA 持久化、搜索参数、分页、Bundle 处理、术语服务、订阅推送、CDS Hooks 服务端、IPS 摘要、患者主索引匹配（MDM）与跨版本转换；不包含表单、病历文档、计费、门户等业务模块。
4. **标准支持度**：

| 标准 | 支持程度 | 证据与说明 |
| --- | --- | --- |
| FHIR | **原生支持（框架级，多版本）** | 仓库目录已核实 DSTU2、DSTU3、R4、R4B、R5 结构模块齐全；`converter` 模块支持跨版本转换；CDS Hooks 服务器模块、IPS 模块、MDM 模块、订阅模块均在仓库内 |
| CDA | **无** | 本仓库不含 CDA 解析/渲染；CDA 不在 HAPI FHIR 项目范围内 |
| ICD / LOINC / SNOMED CT | **机制级（框架服务，不含词表内容）** | 内置术语服务（CodeSystem/ValueSet/ConceptMap/术语扩展操作）；标准词表内容需由部署方加载 |
| HL7 v2 | **无（本仓库）；姊妹项目独立提供** | 官网已核实：HL7 v2 支持在姊妹项目 `hapi-hl7v2`（https://github.com/hapifhir/hapi-hl7v2 ）中维护，本仓库不包含 v2 消息引擎 |

5. **可借鉴点**：
   - FHIR 服务器工程化范式：JPA 持久化映射、搜索参数定义、版本控制、参数校验、分页与 Bundle、批处理事务；
   - 框架级术语服务（编码查找、值集展开、术语从属判定）与本系统术语服务接口设计对标；
   - CDS Hooks 服务端模块架构，可作为 CDSS 卡片接入通道的参照；
   - IPS 摘要生成、MDM 患者匹配、订阅推送（Webhook/轮询）等横切能力设计参考；
   - 跨版本转换器思路：内部模型与对外版本解耦，便于后续 R4→R5 演进。
6. **局限与风险**：
   - 仅为框架，不交付任何病历业务、文书模板、审计合规落地或国内标准模板；
   - 术语集、Profile、代码系统映射均需自行建设；
   - Java 技术栈；若本系统后端选型不同，仅可借鉴其设计与接口语义；
   - 仓库偏重服务器与工具链，前端与临床交互范式不在其覆盖范围。

**对本系统借鉴价值：高**（若后端采用 Java/Spring 路线可作为 FHIR 网关与参考实现直接对标；其他栈下借鉴其服务器设计、术语服务与 CDS Hooks 架构）。

---

## 2.6 openhis（天天开源 OpenHIS 通用版，国内开源 HIS/EMR）

**仓库**：https://github.com/tntlinking-opensource/openhis （旧地址 `https://github.com/newtouch-cloud/openhis` 重定向至此；Gitee 组织页：https://gitee.com/organizations/tntlinking-opensource/projects ）**[已核实：仓库主页 README、根 LICENSE]**

### 六要素

1. **License**：GPL-3.0。根 `LICENSE` 原文已核实：Copyright © 2022-2024 武汉新致数字科技有限公司，GNU General Public License v3；仓库同时附社区版许可说明文档，商业授权与功能裁剪边界须向版权方核实。**[已核实 LICENSE 原文；社区版附加条款未逐字纳入合规判断]**
2. **技术栈**：.NET Framework / C#；Visual Studio 解决方案；SQL Server；WebAPI.Manage 接口工程；HangFire 定时调度；SSO 单点登录；医保对接插件；第三方电子病历对接接口。**[已核实 README 工程目录结构]**
3. **病历核心模块**（按 README 目录与说明核实）：Base（基础数据）、CIS（临床信息）、EMR（电子病历）、MRMS（病案管理）、MRQC（病案质控）、OR（手术）、PDS（药房）、Sett（结算）、Herp（体检）、HangFire（调度）、Lib（公共库）、SSO（单点登录）、WebAPI.Manage（接口）、医保插件；面向公立二级以下医院、乡镇卫生院、社区卫生服务中心。
4. **标准支持度**：

| 标准 | 支持程度 | 证据与说明 |
| --- | --- | --- |
| FHIR | **无** | README 未见 FHIR 接口、资源模型或 Profile 说明 |
| CDA | **无（未核实到模板证据）** | README 提及支持第三方电子病历对接，但未说明 CDA R2 / WS/T 500 模板；本轮材料未见相关证据 |
| ICD | **未核实** | 未见标准编码集加载与映射说明；推断使用本地诊断/手术字典 **[推断，不作为结论]** |
| LOINC | **无证据** | README 未见检验项目标准编码体系说明 |
| SNOMED CT | **无证据** | README 未见临床术语集说明 |
| HL7 v2 | **未核实** | README 未列 HL7 v2 消息接口；医保/卫健对接以插件形式提供，协议细节未公开核实 |

5. **可借鉴点**：
   - 国内基层医院 HIS/EMR 的模块划分参考：CIS、EMR、MRMS、MRQC、OR、PDS、Sett、Herp 的业务边界与系统间关系；
   - 医保插件化、SSO、调度模块、接口工程的分层组织；
   - 病案管理（MRMS）与病案质控（MRQC）作为独立模块的划分思路，可对照本系统住院病历与质控模块规划。
6. **局限与风险**：
   - GPL-3.0 强传染，商业闭源产品不可直接复用代码；社区版与商用版功能/授权边界需合同确认；
   - .NET Framework + SQL Server 技术栈与云原生、多租户、微服务路线差异较大；
   - 标准接口证据缺失：未见 FHIR、CDA、LOINC、SNOMED、HL7 v2 的实现说明，不能作为标准合规基线；
   - 仓库历史版本中遗留有敏感密钥类文件，二次开发前须做敏感信息清理与安全审计（本报告不引用任何具体文件名、内容、口令或连接串）；
   - 面向基层机构，住院深度病历、CDSS、患者门户与开放生态能力有限。

**对本系统借鉴价值：中低**（模块划分与国内业务场景可参考；标准合规与代码复用价值低）。

---

## 2.7 ZainZhao/HIS（国内教学演示型 HIS）

**仓库**：https://github.com/ZainZhao/HIS  **[已核实：仓库主页 README、根 LICENSE]**

### 六要素

1. **License**：Apache-2.0。根 `LICENSE` 原文已核实为 Apache License 2.0；README 标注 Copyright (c) 2018-2019 ZainZhao。**[已核实原文]**
2. **技术栈**：Java Spring Boot 2.0.3、Spring Cloud Netflix Finchley、Spring Security、MyBatis；Vue 2.6 + Element-UI；uni-app 移动端；Redis、RabbitMQ、MyCat 分库、ELK 日志、JWT；数据库为 MySQL（MyBatis 持久层，README 未显式列名，属推断）。**[框架与中间件已核实 README；数据库品牌部分推断]**
3. **病历核心模块**：门诊挂号、门诊/住院医生工作站、药房管理、收费结算、病历模板、检验检查、管理员后台；README 自述为演示/教学项目，业务流程不完整。
4. **标准支持度**：

| 标准 | 支持程度 | 证据与说明 |
| --- | --- | --- |
| FHIR | **无** | 未见 FHIR 服务器、资源模型或接口说明 |
| CDA | **无** | 未见 CDA 文档模板或交换说明 |
| ICD / LOINC / SNOMED CT / RxNorm | **无证据** | README 未见标准编码集、术语映射或知识库说明 |
| HL7 v2 | **无证据** | 未见 HL7 消息接口与适配器说明 |

5. **可借鉴点**：
   - 国内 HIS 微服务拆分示例：授权、门诊、住院、药房、收费、病历等服务边界划分；
   - Vue + Element-UI 后台框架、JWT 鉴权、RabbitMQ 异步、Redis 缓存、ELK 日志的集成方式可作为脚手架参考。
6. **局限与风险**：
   - 代码年代为 2018—2019 年，Spring Cloud Netflix（Eureka/Zuul 等）已停止维护，存在依赖安全与兼容性风险；
   - 教学演示级实现，无合规审计、电子签名、术语标准、病历质控与生产级权限模型；
   - 不可作为生产系统基线，仅用于国内 HIS 模块划分与技术选型对照。

**对本系统借鉴价值：低**（仅国内 HIS 模块划分与脚手架参考）。

---

# 三、开源做法—借鉴—落地建议矩阵

> 下表按八个维度归纳主流开源做法（注明来源项目），给出对本系统的借鉴点与落地建议；落地建议仅到模块、数据模型与接口方向，不含具体代码实现。

| 维度 | 主流开源做法（来源项目） | 对本系统借鉴点 | 落地建议（模块 / 数据模型 / 接口方向） |
| --- | --- | --- | --- |
| **结构化病历录入** | OpenEMR：布局式就诊表单，结构化字段与自由文本段落混合，问题列表与病史模板化；OpenMRS：HTML Form Entry 模块，概念字典驱动控件，结果落 Observation；Bahmni：React 表单控件库支撑登记与问诊；Medplum：Questionnaire（linkId、控件类型、校验、签名扩展）+ 资源表单组件 + SOAP 进度笔记组件 | 双轨模型：结构化观测/编码字段承载可计算数据，叙述性文本段落承载病历完整性；表单元数据驱动，模板可按科室/病种配置；控件与术语字典联动回填 | 建设病历模板引擎：模板头（文档类型、适用科室/病种、版本、状态）+ 章节树 + 条目定义（字段类型、控件、编码体系、必填与基数、单位、值域）；录入控件库覆盖单选/多选/数值/日期/文本/多行文本/签名板/附件/列表选择；章节级结构化与整段富文本回退并存；表单版本与病历版本联动管理 |
| **版本留痕与修订历史** | Medplum：资源每次写入保留版本历史（meta.versionId + 历史读取），变更作者与时间可追溯；OpenEMR：文档修订记录并映射 Provenance；CDA R2：`relatedDocument`（`typeCode=REPL`）指代被替代前版文档 | 病历正文与结构化条目均需版本化；修订不改写历史；前版可追溯、可比对 | 病历文档版本链：当前版引用前版（Composition `relatesTo` 风格）；条目级修订历史表（创建/修改/作废时间、人员、原因、前后值快照）；文档状态机：草稿 → 已提交 → 已审核 → 作废；附件与签名随版本归档；版本差异比对视图供质控与审计使用 |
| **审计日志与电子签名** | Medplum：读/写/登录统一记为 FHIR AuditEvent；Signature 绑定 Consent/QuestionnaireResponse，记录 who/when/type/data，并对照 21 CFR Part 11 记录打印姓名；OpenEMR：ACL 权限 + 操作日志 + 文档电子签名；Bahmni：独立 audit-log 服务 | 审计与业务解耦；签名要素四件套（签名人、时间、签名含义、打印姓名/手写图）；签名与病历正文强绑定；日志防篡改、可集中归档 | 审计模块以 AuditEvent 模型记录登录、查看、导出、修改、打印、分享、作废等动作，包含操作人、时间、对象、结果、来源；Provenance 记录创建者、参与者、时间、来源系统与变更依据；Signature 模型承载签名类型、时间戳、签名人、签名含义、打印姓名、签名影像/证书引用；日志追加写、哈希链防篡改与集中归档；签名留存与病历归档绑定，满足医疗举证要求 |
| **术语映射与编码** | OpenEMR：Code Types 可配置 + 外部数据导入表，ICD/SNOMED/RxNorm/LOINC 代码类型注册；OpenMRS：Concept Dictionary + Concept Mapping，本地概念与 ICD/LOINC/SNOMED 多对多映射；Medplum：CodeSystem/ValueSet/ConceptMap + `$import`/`$lookup`/`$expand`，托管 SNOMED/ICD-10/LOINC；HAPI：框架级术语服务 | 本地字典为中心、标准编码为映射；映射表带版本、状态与审核；术语能力服务化对外提供 | 本地主数据字典（诊断/手术/项目/药品/体征/科室人员机构）+ 标准映射表（本地码、标准体系、标准码、版本、映射类型、置信度、状态、审核人/时间）；术语服务对外提供 lookup、expand、translate 接口；编码集加载、版本发布与值集维护独立成模块；录入端编码提示、名称回填与双码回填；ICD-10/ICD-11 双编码并存与映射核对流程 |
| **标准交换（FHIR / CDA / HL7 v2）** | Medplum：FHIR R4 原生 REST + 批量导出；`$ccda-export` 由 Composition Bundle 转 C-CDA；Agent 隧道转发 HL7v2/DICOM；OpenEMR：FHIR R4 + US Core + SMART；CCD/CCR 导入导出；HL7 v2 经外部引擎；OpenMRS/Bahmni：fhir2 R4 模块；v2 经 Mirth；HAPI：多版本 FHIR 服务器 + 跨版本转换 + CDS Hooks + IPS | 对内统一 FHIR 资源模型；对外按目标系统分层适配：FHIR API、CDA 文档、HL7 v2 消息；格式转换与术语映射集中在交换层完成 | 对内以 FHIR R4 资源模型建设病历数据底座；对外交换层包含：FHIR REST API + 批量数据导出；CDA R2 / WS/T 500 文档生成与解析服务（先覆盖病历概要、西药处方、住院病案首页等高频模板）；HL7 v2 适配器（ADT/ORM/ORU/MDM）对接 LIS、PACS、收费与基层平台；网关侧完成格式转换、术语映射与权限校验；预留 R5 适配层与新 Profile 扩展位 |
| **患者门户与知情同意** | Medplum：Consent 结构化（status/scope/category/policy/performer/provision）+ Questionnaire 签名板；患者门户为基于平台身份与数据组件自建的应用；OpenEMR：患者门户 + OAuth2 授权 | 同意书结构化建模并附件留档；门户账号与院内身份体系打通；门户访问边界与审计清晰；签名要素与业务同意条款绑定 | Consent 实体表覆盖隐私/就诊/科研/预嘱等 scope，政策文档以 URI 引用，provision 表达细粒度允许/拒绝条款；知情同意文书模板 + 手写签名 + 版本留痕；门户账户与患者身份标识绑定；门户访问授权（只读/有限编辑）独立配置；同意状态变更回写病历并触发审计；门户消息、报告下载与隐私授权纳入 AuditEvent |
| **CDSS / 知识库** | OpenEMR：CQM 度量规则与临床规则提醒；HAPI：CDS Hooks 服务端模块；Medplum：Bots 订阅资源变更触发自动化；外部 CDS 服务经通道接入 | 建议通道标准化；规则模型可解释、可留痕；建议采纳/忽略均记录；知识库版本化管理 | 建设 CDS Hooks 风格接入通道（卡片提示、警告、拒绝覆盖）；知识库规则模型包含触发条件、适用人群、建议动作、证据等级、依据条款与版本；药品相互作用、配伍禁忌、剂量校验、过敏史拦截、危急值提醒与处方/医嘱/病历章节联动；每条建议记录触发时间、规则版本、建议内容、医师采纳或忽略及理由；知识库灰度发布、审核留痕与回滚机制 |
| **多租户与部署形态** | Medplum：Projects 多租户，资源按租户隔离；托管/自托管双形态；Agent 本地侧连接；OpenEMR：多站点部署；OpenMRS/Bahmni：单租户模块化部署，Bahmni 提供 Docker/K8s/Helm；HAPI：Spring Boot 单实例服务器框架 | 租户模型贯穿资源层；私有化与云原生双形态兼容；院内系统经本地网关对接；配置与术语按租户加载 | 一院多区/医共体多院区租户模型：租户标识贯穿患者、就诊、文档、审计与术语映射；数据隔离策略（行级隔离或分区隔离）明确；支持私有化部署与云原生部署两套形态；本地 Agent/边缘网关对接院内 LIS/PACS/收费等 legacy 系统；配置、术语集、文档模板按租户加载；审计与日志按租户隔离归档 |

---

# 四、附录：未覆盖范围与限制

## 4.1 未收录候选及原因（本轮实际检索记录）

| 候选名称 | 检索动作与结果 | 未收录原因 |
| --- | --- | --- |
| NHN Cloud Healthcare | 以 "NHN Cloud Healthcare"、"nhncloud healthcare EMR FHIR repository" 等关键词检索 GitHub 与公开资料 | 未检索到以 NHN Cloud Healthcare 名义发布的开源 EMR/HIS/FHIR 仓库；NHN Cloud 为韩国云服务提供商，其医疗相关公开产品（痴呆/健康管理类服务）未见配套开源代码，故不收录，避免臆造项目 |
| DHCare | GitHub 仓库检索 `DHCare` | 命中结果均为无关项目（浏览器历史工具等），未发现对应医疗信息系统仓库，不收录 |
| HisTool | GitHub 仓库检索 `HisTool` | 命中结果为组织学图像工具等无关项目，未发现对应 HIS/EMR 仓库，不收录 |
| SparkEDR | GitHub 仓库检索 `SparkEDR` | 未发现对应医疗信息系统仓库（检索结果为 bash 历史清理等无关项目），不收录 |
| huaxi/DZBL（Gitee：基于 SpringBoot 的电子病历系统） | Gitee 页面 `https://gitee.com/huaxi/DZBL` 抓取失败（链接不可达） | 无法核实仓库内容、License 与模块证据，按"查不到真实可访问仓库即不写"的规则不收录正文矩阵 |
| cgb-lowcode/JEHC-MEDICAL（Gitee） | 页面可访问：SpringBoot HIS 影像学 + 电子病历 + 检验 + 处方；README 标注 GPL-2.0；最近提交约 3 年前，0 Star、26 Fork，为 fork 仓库；Gitee raw LICENSE 受 robots 协议限制无法逐字读取 | 证据级别仅为页面标注、协议原文未能核实；维护停滞、社区活跃度低；列入候选备查，不纳入正文六要素矩阵。原始上游仓库（小诗科技 JEHC-MEDICAL）同样未完成协议与模块核实 |
| gitee.com/jelly_fly/hisystem | 页面可访问：SpringBoot + Bootstrap 教学型 HIS（挂号收费、门诊、药房、体检等） | 仓库未声明开源许可证（无 LICENSE 文件），作者自述"练手项目、流程不完善"；按合规要求不作为正式对标项目收录；页面内出现的演示账号口令未在本报告任何位置引用或复述 |
| jehc-cloud-medical（Gitee） | 检索到相关链接，页面抓取失败 | 未能核实 License、模块清单与标准支持证据，列入未核实项备查 |

## 4.2 未深入项目与未核实项

1. **OpenELIS Global、Odoo、Mirth Connect、dcm4chee**：作为 Bahmni 组合发行中的外部组件，本轮仅确认其角色与存在，未单独剖析仓库、License 与标准支持度；若后续需要参考 LIS、接口引擎或 PACS 集成方案，应另行立项核实。
2. **OpenMRS 生态模块**：除 fhir2 外，HTML Form Entry、Orders、Metadata Sharing、报告等模块的仓库地址、License 与版本成熟度本轮未逐一读取原文；本报告对 OpenMRS 的判断以核心仓库与官方指南为边界。
3. **OpenEMR CDA/HL7 v2 深度能力**：CCD/CCR 导入导出与外部引擎集成形态基于 README、Wiki 与社区讨论核实；未在代码层逐条验证消息覆盖的消息类型与版本。
4. **Medplum 临床功能完整度**：Medplum Provider 示例 EHR 的病历模板、医嘱闭环与中文适配未做实测；本报告对其病历能力的描述以产品文档与组件目录为边界。
5. **国内标准现状细节**：ICD-11 在各省市医院的实际并行切换节奏、SNOMED CT 在中国大陆的授权适用条件、互联互通测评现行 FHIR Profile 版本等，须以主管部门最新文件与属地要求为准；报告中相关推断已逐处标注。
6. **商业许可边界**：openhis 社区版附加许可说明、OpenEMR GPLv3 商业场景、Bahmni 组合组件协议清单，均须在产品立项或对外分发前由法务/合规团队专项审查。

## 4.3 环境与方法限制

1. 本轮**未在本机部署运行任何开源系统**，未启动服务、未执行数据库初始化与界面实测；所有模块完整度、流程闭环与性能判断均基于仓库 README、官方指南、官方 Wiki、LICENSE 原文与公开文档。
2. 本轮环境为 Windows PowerShell（pwsh 7）；仅执行只读检索、网页抓取与文档写入操作；未修改产品源码、未执行 git 提交/推送/打 tag、未创建定时任务。
3. 仓库 License 判断以抓取到的 LICENSE/协议原文或 `composer.json` license 字段为准；个别 Gitee 仓库受 robots 协议限制无法读取 raw 协议文本，已在对应条目与 4.1 节如实标注。
4. 报告不含任何账号口令、访问令牌、数据库连接串或真实密钥信息；开源仓库中历史遗留的敏感文件仅作风险提示，不引用其文件名与内容。

## 4.4 证据级别汇总

### 4.4.1 已联网核实（仓库文档 / 协议原文 / 官方规范原文）

- 七个正文项目的仓库 URL 可访问性与 License：OpenEMR GPL-3.0-or-later；OpenMRS MPL-2.0 w/ HD；Bahmni Core MPL-2.0 w/ HD；Medplum Apache-2.0；HAPI FHIR Apache-2.0；openhis GPL-3.0；ZainZhao/HIS Apache-2.0。
- OpenEMR 技术栈依赖、FHIR R4 + US Core 8.0 + SMART 2.2 + Bulk Data 资源清单、代码类型（ICD10/ICD10-PCS/SNOMED/RXCUI/LOINC 等）注册情况。
- OpenMRS 技术栈、数据库要求、概念字典与概念映射机制、fhir2 模块 R4 定位；核心不内置 HL7 v2、CDA。
- Bahmni 官方组件仓库清单、bahmni-core 协议原文、组合发行形态。
- Medplum FHIR R4 资源模型、托管术语集（SNOMED/ICD-10/LOINC）、Consent/Signature 建模、`$ccda-export` C-CDA 导出（LOINC 34133-9 / 57133-1）、AuditEvent、AccessPolicy、Projects 多租户、Agent HL7v2/DICOM 隧道、Bots/Subscriptions。
- HAPI FHIR 多版本结构模块（DSTU2/DSTU3/R4/R4B/R5）、CDS Hooks/IPS/MDM/订阅/转换模块；HL7 v2 归属姊妹项目 hapi-hl7v2；本仓库不含 CDA。
- WS/T 500.1 病历概要与 WS/T 500.32 住院病案首页的文档头/章节/条目结构、LOINC 章节码、卫生信息 OID 体系、ICD-10 编码 OID。
- ICD-11 中文版政策依据：国卫医发〔2018〕52 号，自 2019 年 3 月 1 日起使用 ICD-11 中文版并与原有疾病分类代码衔接。
- FHIR R4 与 R5 结构性差异（CodeableReference、Encounter 重组、AuditEvent 重组、DocumentReference 新增字段、R5 新资源清单），依据 HL7 官方版本变更说明。

### 4.4.2 推断（工程推演 / 行业通行做法，未经代码或现场实测）

- 本系统各资源、章节、映射表与服务接口的落点设计建议，属于对标推演后的架构方向，非既成事实。
- ICD-10/ICD-11 并行过渡期长度、SNOMED CT 授权适用性、国内互联互通 Profile 版本选择等政策细节。
- openhis 诊断/手术字典编码体系、ZainZhao/HIS 数据库品牌等 README 未显式声明事项。
- Medplum HL7 v2 消息类型覆盖度、OpenMRS 生态第三方模块清单、各项目临床流程的生产级完整度。

---

*杭州健澜科技有限公司 · 健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS，`jlmedaios`）· 电子病历标准与开源基准研究 · 2026-10-25 · 本文档仅供内部产品规划与架构参考。*
