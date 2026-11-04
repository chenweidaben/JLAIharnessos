# 健澜AI原生医院操作系统OS · HIS-EMR 一体化对标行业头部上市医疗IT厂商研究报告

> **产品正式名**：健澜AI原生医院操作系统OS（根 `package.json` name=`jlmedaios`，署名「杭州健澜科技有限公司」）
> **文档日期**：2026-11-03
> **文档性质**：行业对标研究（仅调研与文档产出，不改源码、不启动服务、不执行发布动作）
> **对标对象**：国内连续多年医院核心管理系统（HIS）市场份额第一、服务 6000+ 医疗机构（其中三级医院 400+）、新一代云原生中台架构已在 450+ 医疗机构上线的**行业头部上市医疗IT厂商**（统一脱敏代称，下文不再出现其商号/产品英文名）。
> **配套阅读**：`emr-gap-matrix-2026-10-25.md`（EMR 合规差距矩阵）、`emr-oss-benchmark-2026-10-25.md`（开源 EMR/HIS 对标）、`2026-10-25-电子病历国标规范与开源实践对标研究报告.md`（国标与 FHIR 落点）。本报告聚焦其**商业 HIS-EMR 一体化产品矩阵与顶层设计**，与上述三份互为补充。

---

## 阅读约定与脱敏声明

1. **脱敏硬约束**：全文统一以「行业头部上市医疗IT厂商」「传统HIS龙头厂商」「某上市医疗IT企业」「国内头部HIS厂商」「行业标杆HIS-EMR一体化产品」代称对标对象；不出现任何商号、产品英文代号、创始人姓名、股票代码。
2. **能力分级图例**：
   - **成熟商用**：对标厂商在三甲医院规模化落地，产品化交付；
   - **试点/标杆**：仅在少数三甲样板间落地，未规模化；
   - **路线图**：厂商公开披露但尚未规模化交付。
3. **健澜现状图例**：
   - **已落地（交易型）**：BFF 路由 → 聚合器 → 仓储 → 事务，写操作带权限码与审计；
   - **已落地（只读/DEMO）**：路由存在但为内存 DEMO 数据、或仅 GET 看板；
   - **部分/桩**：路由文件存在但 <3KB、无写操作、无聚合器；
   - **缺口**：本报告扫描范围内未发现对应实现。
4. **证据来源**：国家卫健委公开规范（《电子病历系统功能规范（试行）》《医疗机构临床决策支持系统应用管理规范（试行）》国卫办医政函〔2023〕268号、《电子病历系统功能应用水平分级评价方法及标准》）、行业公开市场分析、某三甲医院 HIS-EMR 升级市场调研公告、对标厂商官网公开方案介绍、健澜仓库静态取证（`src/bff/routes/`、`web/src/pages/`）。

---

## 一、对标产品矩阵概览（脱敏）

### 1.1 厂商定位与市场地位

行业头部上市医疗IT厂商成立于 1994 年，2011 年深交所上市，总部位于上海，全国 11 个研发基地、30 余个分支机构，服务 6000+ 医疗卫生机构（三级医院 400+），IDC 中国医院核心管理系统市场份额连续六年第一（2020–2025），2026 上半年营收 9.94 亿元、同比 +18.5%。其新一代云原生架构已在 450+ 医疗机构落地，覆盖大型单体医院、医疗集团一体化、紧密型医共体一体化三类标杆。

### 1.2 产品矩阵演进（三代）

| 代际 | 架构特征 | 交付周期 | 典型产品形态 |
|---|---|---|---|
| **第一代 传统产品族**（2000s–2019） | C/S + 单体 + Oracle 项目制定制 | 18 个月+ | HIS / EMR / PACS / LIS / 集成平台（ESB） |
| **第二代 云原生中台**（2020–2024） | 微服务 + 容器化 + 三中台（业务/数据/技术）+ 「1+X」战略 | 3–7 个月「出厂即可用」 | 新一代医院核心平台 + 互联网医院 + 药品健险联动 |
| **第三代 AI 原生**（2025– ） | 三中台之上扩展**认知层**（统一医疗知识/业务领域）+ **流程智能化**（人在回路持续评估）+ **自然语言交互** + **Agent 化改造**（号源/床位/检查/检验 Agent） | 与第二代同 | AI 原生医院系统 + 医疗垂直大模型 + Copilot 医生助手 + AgentFramework 智能体框架（模型可插拔，不绑定基座） |

### 1.3 三中台顶层设计（第二代 → 第三代演进）

```
┌─────────────────────────────────────────────────────────────┐
│  场景层：互联网医院 / 医共体 / 区域卫生 / 患者服务 / 科研教学  │
├─────────────────────────────────────────────────────────────┤
│  智能体层（第三代新增）：                                     │
│    · AgentFramework：号源 Agent / 床位 Agent / 检查 Agent /    │
│      检验 Agent / 病历 Agent / 质控 Agent / 重症 Agent        │
│    · Copilot：医生站五大场景（病历生成/医嘱推荐/质控/影像报告/ │
│      患者服务）+ 护理端（交接班/护理计划/风险预警）+ 管理端    │
│    · 模型矩阵：支持多基座插拔（不绑定单一 LLM）                │
├─────────────────────────────────────────────────────────────┤
│  业务中台：门急诊 / 住院 / 电子病历 / 医嘱 / 护理 / 药剂 /      │
│           检验检查 / 手术麻醉 / ICU / 输血 / 院感 / 合理用药   │
├─────────────────────────────────────────────────────────────┤
│  数据中台：CDR 临床数据中心 + ODR 运营数据中心 + EMPI 患者主   │
│           索引 + MDM 主数据（人员/科室/药品/耗材/设备）+       │
│           数据治理 + 数据资产 + BI/院长驾驶舱                  │
├─────────────────────────────────────────────────────────────┤
│  技术中台：微服务 / 容器化(K8s) / DevOps / API 网关 / 消息总线 /│
│           FHIR R4 网关 / HL7 / DICOM / IHE / 统一认证 / 审计   │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 第三代 AI 原生升级要点（与健澜 OS 直接对标）

1. **认知层**：在三中台之上扩展统一医疗知识与业务领域，为大模型提供循证医学依据；
2. **流程智能化**：支持人在回路（Human-in-the-loop）的持续评估与决策，系统越用越聪明；
3. **自然语言交互**：医生在病历/医嘱输入框输入 `//` 触发 AI，一键生成符合规范的病历；
4. **Agent 化改造**：把医院号源、床位等核心资源、数据和知识 Agent 化；
5. **AgentFramework**：核心资产（领域知识、运营经验、业务数据）沉淀在框架内，基座模型可插拔切换；
6. **AI 重症专科**：AI 流/工作流/数据流三流融合，任务由 AI 触发而非人工触发，围绕 ICU 目标设定阈值，AI 驱动任务执行、关键环节人工决策，具备持续进化能力（运行中表现正向的工具/成果沉淀复用）；
7. **医案智图（MedMap）**：相比传统 360 数据视图，结合查房/交班/科研/教学等不同场景、不同专科需求，向医生推送更精准的聚焦数据；
8. **CDSS 规则库**：6000+ 类医嘱审核知识，覆盖用药、检查、检验、手术、输血、护理项目、治疗项目 7 大医疗行为领域。

> **健澜对位**：健澜 AI 原生医院操作系统OS 的「系统越用越聪明」最高开发宪法、Consult-Agent 多智能体框架、MedMuse/DoctorMuse 个人健康智能体、健康画像平台，与第三代 AI 原生方向**高度同频**；差距主要在**传统 HIS 交易层的完整度**与**CDSS/闭环深度**，而非 AI 方向本身。

---

## 二、11 大业务域功能清单（对标 + 健澜现状）

### 2.1 门急诊（挂号 / 分诊 / 收费 / 结算 / 叫号 / 门诊药房）

**对标厂商核心功能点**：
- 全渠道号源：小程序/公众号/APP/自助机/窗口/互联网医院统一号池，号源预热、分时预约、爽约预警、信用积分；
- 智能分诊：按主诉/症状预分诊，AI 推荐科室，地图导航到诊室；
- 挂号：初复诊识别、医保身份实时核验、挂号费结算、退号审批；
- 诊间支付：医生开单后患者手机实时推送待缴费，诊室扫码 2 秒结算，分账结算、退费追溯；
- 叫号：诊室叫号、过号重呼、等候时间预测、候补队列；
- 门诊药房：划价、调配、发药、退药、处方点评、门诊输液/皮试登记；
- 医保直连：医保电子凭证、异地就医、实时结算、医保控费预警。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| 号源查询 | `src/bff/routes/outpatientRegister.ts` `GET /api/v1/outpatient/slots` | 只读 DEMO 桩（5 条内存数据，auth:false） |
| 挂号记录 | `GET /api/v1/outpatient/registrations` | 只读 DEMO 桩 |
| 退号 | `GET /api/v1/outpatient/cancellations` | 只读 DEMO 桩 |
| 叫号 | `GET /api/v1/outpatient/calling` | 只读 DEMO 桩 |
| 门诊病历 | `GET /api/v1/outpatient/notes` | 只读 DEMO 桩 |
| 预约管理 | `appointmentMgmtV13.ts` / `appointmentV13.ts` / `appt.ts` / `quotaAppt.ts` / `scheduleSlot.ts` | 已有 V13 统计/管理路由 |
| 智能分诊 | `smartTriage.ts`（5.6KB）/ `triageMgmtV13.ts` / `emergencyTriageV13.ts` | 已有智能分诊与急诊分诊 |
| 门诊收费 | `outpatientBillingMgmtV13.ts` / `billing.ts` / `bill.ts` / `priceMgmtV13.ts` / `priceManagementV13.ts` | V13 管理/统计型 |
| 门诊药房 | `outpatientPharmacyV13.ts` / `pharmacy.ts` / `pharmacyDispense.ts` | 药房主文件 6.3KB，发药 2.3KB 偏薄 |
| 医保结算 | `insuranceSettlementV13.ts` / `insuranceSettlementDetailV13.ts` / `onlinePaymentV13.ts` | V13 统计型 |
| 门诊医生站 | `opdWorkstation.ts`（1KB 桩）/ `outpatient.ts` / `outpatientServiceV13.ts` | 医生站偏薄 |

**结论**：门急诊是**最大短板**——挂号/退号/叫号/门诊病历 5 个核心交易端点全部是 M439 DEMO 桩，无 POST 写操作、无状态机、无聚合器、无权限码；V13 系列路由多为统计/管理看板，不是医生/收费员日常操作的交易型工作流。

---

### 2.2 住院（入院登记 / 押金 / 出院结算 / 床位 / 转科转床）

**对标厂商核心功能点**：
- 入院登记：门诊医生站发起住院通知 → 入院处登记 → 预交金缴纳 → 自动/指定分配床位 → 入科交接；
- 院前住院管家：患者手机端完成住院登记、术前检查预约、床位等待、到院入科全流程状态跟踪；
- 押金管理：预交金缴纳、自动催款、押金不足预警、中期结算；
- 床位管理：床位图（医嘱/隔离/维修/空床/占用）、自动分配、手动换床、转科、返院；
- 出院结算：出院通知 → 费用结算 → 医保联网结算 → 病案首页归档 → 床位释放；
- 一日清单：患者每日费用推送、床旁查询、费用透明。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| 床位图 | `GET /api/v1/inpatient/bed-map` | **交易型已落地**（inpatient.ts:99，权限码 + DataScope + 聚合器） |
| 在院患者列表 | `GET /api/v1/inpatient/patients` | **交易型已落地** |
| 患者详情（含移动史） | `GET /api/v1/inpatient/patients/:visitId` | **交易型已落地** |
| 入院登记 | `POST /api/v1/inpatient/admissions` | **交易型已落地**（权限码 ADMIT，聚合器 admit） |
| 换床 | `POST /api/v1/inpatient/patients/:visitId/bed-change` | **交易型已落地** |
| 转科 | `POST /api/v1/inpatient/patients/:visitId/transfer` | **交易型已落地** |
| 出院 | `POST /api/v1/inpatient/patients/:visitId/discharge` | **交易型已落地** |
| 床位状态维护 | `POST /api/v1/inpatient/beds/:bedId/status` | **交易型已落地** |
| 预交金/押金 | `inpatientBillingMgmtV13.ts` / `patientBilling.ts` / `billingReconciliationV13.ts` | V13 统计型，**缺押金交易路由** |
| 一日清单/费用 | `inpatientBill.ts` / `settlementAnalytics.ts` / `settlementDrilldown.ts` | 部分 |
| 转科历史/移动史 | `wardTransfer.ts` / `transferDetailV13.ts` / `inpatientTransferMgmtV13.ts` | 已有 |
| 院前住院管家 | 无 | **缺口**（对标浙江某院"院前住院管家"获评 2026 公立医院高质量发展典型案例） |

**结论**：住院 ADT（入院/换床/转科/出院/床位）是健澜**最扎实的交易型模块**，已对标行业标杆。短板在：①预交金/押金/催款无交易路由；②一日清单/床旁费用推送未落地；③院前住院管家（患者侧小程序）缺口。

---

### 2.3 电子病历（结构化书写 / 三级检诊 / 质控 / 归档 / 体温单 / 医嘱单）

**对标厂商核心功能点**：
- 结构化病历编辑器：支持单选项/多选项/必填项/填空/不可修改文本、宏替换、模板版本、科室/个人/全院三级模板权限；
- 三级检诊：住院医师书写 → 主治医师审核 → 主任医师/副主任医师审签，时间戳与电子签名留痕；
- 病历质控：事前提醒（时限规则）、事中拦截（必填项/逻辑错误）、事后质控（终末评分）、AI 内涵质控（缺陷分类、根因分析、PDCA 闭环）；
- 病历归档：自动归档、归档校验、归档审批、借阅/归还/复印审批、销毁审批；
- 体温单：自动采集体温/脉搏/呼吸/血压/血氧/出入量，绘制体温曲线；
- 医嘱单：长期/临时/备用医嘱自动生成打印，续打/补打/重打；
- 可靠电子签名 + 第三方可信时间戳 + 病历分块访问控制 + 访问日志；
- AI 病历生成：输入 `//` 触发，病历书写效率提升 50%+，病历负担降低 70%+。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| 病历模板 | `emrTemplate.ts` / `emrTemplateEditorV14.ts` / `emrTemplate*.ts`（20+ 文件） | **已落地**（V14 模板管理/版本/审批/科室/个人） |
| 病历书写 | `emrNotes.ts` / `emrStructuredInputV14.ts` / `emrQuickPhraseV14.ts` | **已落地** |
| 三级检诊 | `emrExpertReviewV14.ts` / `emrReviewWorkflowV14.ts` / `threeLevelWardRoundV13.ts` | **已落地**（三级查房路由） |
| 病历质控 | `emrQc*.ts`（100+ 文件）/ `emrIntrinsicQcV14.ts` / `emrTerminalQcV14.ts` / `emrRunningQcV14.ts` | **极丰富**（事前/事中/事后 + AI 缺陷分类 + PDCA + 看板） |
| AI 病历生成 | `emrAiGenerationAssistV14.ts` / `emrAiRecordCompletenessCheckV14.ts` / `emrAiWritingSuggestV14.ts` / `emrAiOutpatientRecordGenV14.ts` | **已落地** |
| 病历归档 | `emrArchiveV14.ts` / `emrArchiveAutoCheckV14.ts` / `emrArchiveSearchV14.ts` / `archiveMgmtV13.ts` | **已落地** |
| 借阅/复印/销毁 | `emrBorrowV14.ts` / `emrCopyRequestV14.ts` / `emrDestroyApplyV14.ts` | **已落地** |
| 电子签名/水印 | `emrSignatureV14.ts` / `emrSealUnsealV14.ts` / `emrWatermarkTraceV14.ts` / `eSign.ts` / `eSignature.ts` | **已落地** |
| 病历访问审计 | `emrAccessAuditLogV14.ts` / `emrAccessAuditV14.ts` / `emrAccessRequestV14.ts` | **已落地** |
| 体温单 | `vitalsTrend.ts` / `nursingRecord.ts` | **部分**（趋势图有，体温单专门模块未独立） |
| 医嘱单打印 | `emrPrintLayoutV14.ts` / `emrPrintSpecV14.ts` | **部分** |
| 患者 360 | `emrPatient360V14.ts` / `patient360.ts` / `patientTimeline360.ts` / `patientTimeline.ts` | **已落地** |

**结论**：电子病历是健澜**绝对强项**，路由数量与 AI 化深度远超行业标杆（emr*V14 路由数百个）。短板：①体温单作为独立护理文书模块未独立；②医嘱单专门打印/续打逻辑薄；③电子签名目前为 mock 预留（见 `emr-gap-matrix` P0 项），未接国密 SM2/TSA 第三方时间戳。

---

### 2.4 医嘱闭环（CPOE：开立 / 审核 / 执行 / 核对 / 停止 / 撤销）

**对标厂商核心功能点**（国家卫健委《基于平台的应用与业务协同》明确要求）：
- 医嘱分类：长期（>24h）、临时（<24h）、备用（长期/临时）；按类别分药品/护理/饮食/治疗/处置/检验/检查/手术/输血；
- 状态机：新开 → 提交 → 护士审核 → 执行 → 完成；异常路径：停止/撤销/重整；
- 成套医嘱：入院常规、术前常规、术后常规、诊断匹配治疗方案；
- 医嘱权限：处方权（普通/抗菌药物/精神/毒性/麻醉/贵重药）分级；
- 执行闭环：腕带/条码/RFID 机读识别 → PDA 床边执行 → 实时记录执行时间/执行者/剂量 → 高风险医嘱执行前强制核对；
- 临床图表：以医嘱为主线，X 轴时间、Y 轴分类，生命体征曲线叠加，可下钻皮试/检验/检查结果；
- 医嘱联动：医嘱自动同步药房（摆药）、收费（计费）、营养（膳食）、检验（标本）、放射（预约）。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| 医嘱主路由 | `order.ts`（3.2KB 桩）/ `orderCds.ts` / `orderSetComplianceV13.ts` | **桩** |
| 医嘱推荐/审核 | `emrAiOrderRecoV14.ts` / `emrAiOrderSmartReviewV14.ts` / `emrAiOrderExecTrackV14.ts` | AI 侧已落地 |
| 成套医嘱 | `clinicalPathway.ts` / `clinicalPathwayV13.ts` / `clinicalPathwayMgmtV13.ts` | 临床路径已落地 |
| 医嘱执行 | `medAdmin.ts` / `nursingRecord.ts` / `mobileNursing.ts`（6.4KB） | 部分 |
| 医嘱 CDS | `orderCds.ts` / `cds.ts`（5KB）/ `cdsRuleEngineV7.ts` | CDS 已有 |
| 临床图表 | `emrTimelineGenerateV14.ts` / `emrEventTimelineV14.ts` / `vitalsTrend.ts` | 时间线已有 |

**结论**：医嘱 CPOE 是**第二大短板**——`order.ts` 仅 3.2KB，缺真实的医嘱开立 POST、护士审核、执行确认、停止/撤销状态机、成套医嘱管理、医嘱权限分级。AI 推荐侧（emrAiOrder*）已超前，但**人类医生真实操作的医嘱交易层**未闭环。

---

### 2.5 护理（护理记录 / 评估 / 计划 / 执行单）

**对标厂商核心功能点**：
- 入院护理评估：Barthel 指数、Braden 压疮、Morse 跌倒、疼痛评估、营养风险筛查 NRS2002、ADL；
- 护理计划：按诊断自动生成护理计划，护理措施定时提醒；
- 护理记录：一般护理记录、危重护理记录、手术护理记录、交接记录（SBAR）；
- 执行单：口服药卡、注射卡、输液卡、治疗单，PDA 床边扫码执行；
- 移动护理：PDA/平板床旁操作，患者身份扫码核对（腕带），生命体征自动采集录入；
- 护理质控：护理不良事件、压疮/跌倒/坠床上报、护理敏感质量指标。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| 护士站工作台 | `nurseStation.ts`（只读 GET，3 条路由） | **只读**（缺医嘱执行写操作） |
| 移动护理 | `mobileNursing.ts`（6.4KB）/ `pdaNursing.ts` | 部分 |
| 护理评估 | `barthel.ts` / `cga.ts` / `nursingRisk.ts` / `emrAiFallRiskAssessV14.ts` / `emrAiNursingRiskAssessV14.ts` / `emrAiNutritionRiskScreenV14.ts` / `painAssessment.ts` / `pressureUlcerDetailV13.ts` | **已落地**（评估量表齐全） |
| 护理记录 | `nursingRecord.ts` / `nursingDocumentV13.ts` / `nursingRecordQualityV13.ts` | 部分 |
| 护理计划 | `aiNursingPlan.ts` / `emrAiNursingPlanRecoV14.ts` | AI 推荐已有 |
| 交接班 | `nurseHandoff.ts` / `handoverV13.ts` / `handoverDetailV13.ts` / `sbar.ts` / `emrAiShiftReportGenV14.ts` | **已落地** |
| 护理质控 | `nursingQualityMgmtV13.ts` / `nursingSafetyV13.ts` / `nursingSensitiveIndexV13.ts` / `nursingIo.ts` | **已落地** |
| 护理不良事件 | `fallPreventionV13.ts` / `pressureUlcerMgmtV13.ts` / `tubeDislodgementV13.ts` | 已落地 |

**结论**：护理**评估与 AI 推荐很强**，但护士站作为**交易工作台**偏薄——只有 3 条 GET 路由，缺：①医嘱审核 POST；②医嘱执行 POST（PDA 扫码确认）；③执行单生成；④护理记录书写 POST。

---

### 2.6 药剂（药房 / 药库 / 摆药 / 发药 / 退药 / 处方点评）

**对标厂商核心功能点**：
- 药库：入库、出库、盘点、报损、调拨、临界库存报警、药品效期管理、药品台账；
- 药房：门诊发药、住院摆药（单剂量摆药）、退药、领药、基数药管理；
- 处方点评：月度/专项点评、抗菌药物点评、点评结果反馈临床、超常预警；
- 合理用药：过敏史审查、相互作用、剂量（按体重/年龄）、禁忌、重复用药、特殊人群（老人/儿童/孕妇）、分级警示；
- 抗菌药物：分级管理（非限制/限制/特殊使用）、处方权限、使用强度监测（DDD）、耐药菌预警；
- 特殊药品：麻醉/精神/毒性药品专册登记、双人双锁、空安瓿回收。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| 药房主路由 | `pharmacy.ts`（6.3KB）/ `pharmacyMgmt.ts` / `pharmacyMgmtDetailV13.ts` | 部分 |
| 发药 | `pharmacyDispense.ts`（2.3KB 桩）/ `pharmacyDrugDeliveryV13.ts` | **桩** |
| 药库/库存 | `drugInventory.ts` / `drugInventoryMgmtV13.ts` / `drugInventoryStatsV13.ts` / `drugExpiryMgmtV13.ts` / `drugShortageV13.ts` / `drugStorageV13.ts` | **已落地** |
| 药品目录 | `pharmacyDrugCatalogV13.ts` / `emrTerminologyV14.ts` | 已落地 |
| 处方点评 | `prescriptionReviewV7.ts` / `prescriptionReviewQualityV13.ts` / `prescriptionReviewStatsV13.ts` / `pharmacyPrescriptionReviewV13.ts` / `prescriptionAuditV13.ts` | **已落地** |
| 合理用药 | `rationalDrugUse.ts` / `rationalDrugUseStatsV13.ts` / `drugInteractionV13.ts` / `emrAiDrugInteractionV14.ts` / `emrAiMedicationErrorAlertV14.ts` / `emrAiRationalMedicationAuditV14.ts` | **已落地** |
| 抗菌药物 | `antibioticMgmtV13.ts` / `antibioticUseV13.ts` / `antibioticUsageMgmtV13.ts` / `antibioticRxV13.ts` / `antibioticDeep.ts` | **已落地** |
| 特殊药品 | `specialDrugMgmtV13.ts` / `highAlertMedMgmtV13.ts` | 已落地 |
| 药品不良反应 | `adverseDrugEventV13.ts` / `drugAdverseReactionV13.ts` / `medicationErrorReportV13.ts` | 已落地 |
| 用药重整 | `medicationReconciliationV13.ts` | 已落地 |

**结论**：药剂**管理/统计/AI 审核侧非常强**，但**药房交易动作**（摆药、发药、退药）路由偏薄——`pharmacyDispense.ts` 仅 2.3KB，缺发药确认 POST、摆药批次、单剂量核对、退药审批等交易闭环。

---

### 2.7 检验检查（申请单 / 标本 / 报告 / 危急值）

**对标厂商核心功能点**：
- LIS：检验申请单 → 标本采集（条码）→ 标本送检 → 上机检测 → 结果自动采集 → 审核 → 发布；
- PACS/RIS：检查预约 → 登记 → 图像采集 → 传输 → 诊断报告 → 审核 → 发布；
- 危急值：结果命中阈值 → 自动触发危急值通知 → 电话通知医护 → 医护确认接收 → 处置记录 → 闭环归档；
- 结果互认：跨院结果互认、外院结果调阅、AI 辅助判读。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| LIS | `lis.ts` / `labServiceV13.ts` / `labTurnaroundV13.ts` / `labQualityControlV13.ts` / `labInterpret.ts` / `labErrorV13.ts` | 部分 |
| PACS | `imaging.ts` / `imagingAi.ts` / `imagingQualityControlV13.ts` / `imagingTurnaroundV13.ts` / `pacsDetail.ts` / `ris.ts` | 部分 |
| 病理 | `pathologyMgmtV13.ts` / `pathologyQualityControlV13.ts` / `pathologyTurnaroundV13.ts` | 已落地 |
| 危急值 | `criticalValueClosure.ts`（3KB）/ `criticalValueMgmtV13.ts` / `criticalValueV13.ts` / `criticalValueDetailV13.ts` / `emrLabAlertV14.ts` | **已落地**（闭环路由存在） |
| 标本 | `specimenRejectV13.ts` | 部分 |
| AI 辅助 | `emrAiLabApplyAuditV14.ts` / `emrAiLabCriticalAlertV14.ts` / `emrAiLabInterpretV14.ts` / `emrAiExamReportSummaryV14.ts` | **已落地** |

**结论**：检验检查**框架完整**，危急值闭环已有；短板在 LIS/PACS 作为**独立交易系统**的深度（标本流转、上机、报告审核等院内子系统对接），健澜 OS 作为平台层更多是集成视图，而非重建 LIS/PACS。这与对标厂商"买 LIS/PACS 子模块"的做法一致，健澜可通过 FHIR/HL7 网关对接第三方。

---

### 2.8 手术麻醉（申请 / 排班 / 麻醉记录 / 术后复苏 PACU）

**对标厂商核心功能点**：
- 手术申请：医生站提交手术申请 → 术前讨论 → 麻醉评估 → 手术预约；
- 手术排班：手术间资源排班、冲突检测、加急手术插队；
- 术前：术前核查（三方核查表）、术前备血、术前用药、禁食水提醒；
- 术中：麻醉记录（生命体征、麻醉用药、输液量、出血量）、术中冰冻病理、电刀/内镜记录；
- 术后：PACU 复苏记录、Aldrete 评分、术后镇痛、术后随访；
- 手术安全核查：麻醉前/切皮前/患者离开手术室三次核查。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| 手术申请/排班 | `surgerySchedule.ts`（1.6KB 桩）/ `surgery.ts` / `operationMgmtV13.ts` / `schedulingMgmtV13.ts` / `otSchedulingConflictV13.ts` | **桩** |
| 麻醉记录 | `anesthesia.ts`（0.9KB 桩）/ `anesthesiaDeep.ts` / `anesthesiaRecordMgmtV13.ts` / `anesthesiaDetailV13.ts` | **桩** |
| 手术安全核查 | `surgicalChecklist.ts` / `surgeryChecklist.ts` / `emrAiPreopAssessmentV14.ts` | 已有 |
| PACU | `pacuRecord.ts`（2KB 桩）/ `emrAiPostopProgressTrackV14.ts` | **桩** |
| 手术质量 | `surgeryQualityV13.ts` / `surgeryVolumeV13.ts` / `surgeryAnesthesiaMgmtV13.ts` / `ssiRateV13.ts` / `surgicalInfectionV13.ts` | 统计型 |
| 术前评估 AI | `emrAiPreopAssessRecoV14.ts` / `emrAiPreopRiskAssessV14.ts` / `emrAiAnesthesiaDepthSuggestV14.ts` | AI 已落地 |
| 围术期 | `perioperativeMgmtV13.ts` / `daySurgeryMgmtV13.ts` | 已有 |

**结论**：手术麻醉是**第三大短板**——`surgerySchedule.ts`/`anesthesia.ts`/`pacuRecord.ts` 三个核心交易文件全部 <2KB，AI 侧已超前（术前评估/术后跟踪 AI 都有），但人类医生/麻醉师日常操作的**手术排班、麻醉记录、PACU 复苏**交易路由薄。

---

### 2.9 ICU（监护记录 / 呼吸机 / 输液泵）

**对标厂商核心功能点**：
- 重症监护记录：Q1H/Q2H/Q4H 生命体征记录、意识（GCS）、瞳孔、引流管；
- 设备接入：多参数监护仪、呼吸机、输液泵、微量泵数据自动采集；
- AI 重症：AI 流/工作流/数据流三流融合，AI 发现异常主动提醒，阈值驱动任务执行；
- 镇静评分：RASS/RAMSAY 评分每日记录；
- 出入量管理：24h 出入量精确统计；
- 谵妄筛查：CAM-ICU。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| ICU 主路由 | `icuMgmtV13.ts` / `icuCareMgmtV13.ts` / `icuOccupancyV13.ts` / `icuStatsMgmtV13.ts` / `icuTransfersDetail.ts` | 管理统计型 |
| 重症监护 | `criticalCare.ts` / `criticalCareCenterV5Report.ts` / `critical.ts` | 部分 |
| 镇静 | `icuSedation.ts` | 已有 |
| AI 重症 | `emrAiHaiRiskAlertV14.ts` / `emrAiVteLinkV14.ts`（VTE） | 部分 |
| 设备接入 | `iotPlatform.ts` / `iotReport.ts` | IoT 平台已有 |

**结论**：ICU **统计/管理型路由有**，但**监护记录文书**与**设备数据自动采集**交易路由薄；对标厂商的"AI 重症"专科产品是第三代 AI 原生标杆，健澜可在 AI 侧发力，但基础监护文书需补齐。

---

### 2.10 输血 / 院感 / 合理用药

**对标厂商核心功能点**：
- 输血：申请 → 血型鉴定 → 交叉配血 → 发血 → 双人核对 → 输血记录 → 不良反应上报；
- 院感：手卫生依从性监测、器械消毒灭菌、环境监测、多重耐药菌监测、暴发预警、职业暴露上报；
- 合理用药：已在 2.6 药剂域详述。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| 输血 | `bloodTransfusion.ts`（0.9KB 桩）/ `bloodTransfusionMgmtV13.ts` / `bloodTransfusionDetailV13.ts` / `bloodTransfusionQualityMgmtV13.ts` / `bloodInventoryV13.ts` / `bloodMgmtV13.ts` / `transfusion.ts` / `transfusionManagement.ts` / `transfusionReaction.ts` | **部分**（主路由桩，管理统计齐全） |
| 院感 | `infectionControl.ts` / `infectionControlV13.ts` / `infectionSurveillanceV13.ts` / `handHygieneV13.ts` / `handHygieneComplianceV13.ts` / `isolationMgmtV13.ts` / `nosocomialInfectionV13.ts` / `hospitalInfectionSurveillanceV13.ts` / `envDisinfectionV13.ts` | **已落地** |
| 消毒供应 | `cssdV13.ts` / `sterilizationMgmtV13.ts` / `wasteCssd.ts` | 已落地 |
| VTE 防治 | `vte.ts` / `vteAnticoag.ts` / `vtePreventionMgmtV13.ts` / `vtePreventionDetailV13.ts` | **已落地** |

**结论**：院感/VTE/手卫生**非常完整**；输血主路由 `bloodTransfusion.ts` 仅 0.9KB 是桩，需补输血申请/交叉配血/发血/输血记录交易闭环。

---

### 2.11 顶层设计（业务中台 / 数据中台 / AI 中台 / FHIR / CDR / EMPI）

**对标厂商核心能力**：
- 微服务 + 容器化（K8s）+ DevOps，支持应用快速迭代与弹性伸缩；
- FHIR R4 网关 + HL7 V3 + DICOM + IHE 标准接口；
- CDR 临床数据中心：以 EMPI 为核心整合 EMR/HIS/LIS/PACS/手术麻醉/重症/移动护理数据；
- ODR 运营数据中心：HRP/OA/财务/后勤/人财物；
- MDM 主数据：患者/医护人员/科室/药品/耗材/设备主索引全院唯一；
- ESB 集成平台：20+ 异构系统无缝集成；
- API 网关：统一入口、认证授权、限流熔断、监控日志；
- 院长驾驶舱 / BI 报表 / 三级公立医院绩效考核 / HQMS 上报。

**健澜现状**：
| 功能点 | 健澜落点 | 状态 |
|---|---|---|
| FHIR 网关 | `fhir.ts`（5.5KB）/ `fhirGatewayDetail.ts` / `fhirGatewayV5.ts` / `fhirResources.ts` / `fhirOperationsRoutes.ts` | **部分**（V14 仅 4 类资源，见 `emr-gap-matrix` P0 项） |
| HL7 集成 | `hl7IntegrationV5.ts` / `integrationHl7.ts` | 已有 |
| EMPI | `empi.ts`（3.9KB） | 已有 |
| CDR | `dataWarehouse.ts` / `dataMart.ts` / `dataMartDeep.ts` / `bigDataPlatform.ts` / `dataGovernance.ts` | 已有 |
| 数据治理 | `dataGovernanceV13.ts` / `dataQuality.ts` / `dataQualityMgmtV13.ts` / `dataAssetV4Report.ts` | **已落地** |
| 微服务 | `microservices.ts` / `microserviceReportV2.ts` | 已有 |
| 云原生 | `cloudNative.ts` / `cloudNativeReportV2.ts` / `cloudNativeSREV5Report.ts` | 已有 |
| DevOps | `devops.ts` / `devOpsReportV2.ts` | 已有 |
| 院长驾驶舱 | `ceoDashboard.ts` / `ceoBoard.ts` / `execDashboardV5.ts` / `deanCommandCenterV13.ts` / `deptCockpit.ts` / `hospitalKpi.ts` | **已落地** |
| 三级公立医院绩效 | `statisticsMgmtV13.ts` / `hqmsV5.ts` / `drgDipMgmtV13.ts` | 已落地 |
| FHIR R4 深度 | 仅 4 类资源，生产接 HAPI FHIR Server 未落地 | **缺口**（见 `emr-gap-matrix` P0） |

**结论**：顶层设计**框架完整**，与对标厂商三中台方向对齐；短板：①FHIR R4 资源覆盖度（仅 4 类 vs 对标全院 20+ 异构系统交换）；②CDR 与业务系统的实时同步深度；③多智能体 AgentFramework 的资源 Agent 化（号源/床位/检查/检验 Agent）尚未产品化。

---

## 三、顶层设计与合规对标

### 3.1 电子病历应用水平分级（国卫办医函〔2018〕1079号）

| 等级 | 核心要求 | 对标厂商落地 | 健澜现状 |
|---|---|---|---|
| 3 级 | 部门间数据交换、初级 CDSS、1 项自动规则检查 | 已规模化 | 已落地（CDSS/规则引擎有） |
| 4 级 | 全院信息共享、中级 CDSS、药品配伍/相互作用自动审核 | 已规模化 | 已落地（合理用药/药物相互作用有） |
| 5 级 | 统一数据管理、智能化病历书写、临床路径与医嘱紧密结合、科研数据挖掘 | 已规模化 | **接近**（智能模板/临床路径/科研平台有） |
| **6 级** | **全流程数据闭环、高级 CDSS、机读身份识别（条码/腕带）、全流程实时在线核查、跨部门知识库、基本无纸化** | 已在 400+ 三级医院中部分达标 | **部分缺口**：医嘱执行机读核对、全流程实时核查、跨部门知识库联动、无纸化电子签名（国密 SM2/TSA 未接） |
| 7 级 | 区域医疗信息共享、外院病历调阅 | 标杆试点 | 规划中（`emrLevel5.ts`/`emrGrade5.ts`/`emr5LevelV13.ts` 已有等级路由） |

### 3.2 医院信息互联互通标准化成熟度

| 等级 | 核心要求 | 健澜现状 |
|---|---|---|
| 四甲 | 平台化架构、标准化数据、全院信息共享、初级 CDSS | **已接近**（`intercon4LevelV13.ts`/`interopV5Report.ts`） |
| 五乙 | 全流程闭环、中级 CDSS、区域协同 | 规划中 |
| 五甲 | 高级 CDSS、区域信息共享 | 路线图 |

### 3.3 智慧服务三级（患者侧）

- 对标：诊前预约/分诊/导航、诊中移动支付/报告查询/智能导诊、诊后随访/慢病管理/健康宣教全流程线上化；
- 健澜：`patientPortal.ts`/`patientH5.ts`/`patientMobileHome.ts`/`internetHospital.ts`/`internetHospitalV3.ts`/`patientServiceV13.ts` 已有，但**院前住院管家**（小程序端住院登记/检查预约/床位等待）缺口。

### 3.4 网络安全等级保护

- 等保三级：对标厂商已通过；
- 健澜：`securityBaseline.ts`/`securityCompliance.ts`/`securityV3Report.ts`/`cybersecurityV13.ts`/`zeroTrustV5.ts` 已有框架；**国密 SM2/SM3/SM4 为 mock 预留**（见 `emr-gap-matrix` P0 项）。

### 3.5 CDSS 应用管理规范（国卫办医政函〔2023〕268号）

| 要求 | 健澜现状 |
|---|---|
| 临床知识来源权威（药品说明书/临床指南/诊疗规范） | 已有（`emrQcGuidelineLibraryV14.ts`/`emrQcStandardLibraryV14.ts`） |
| 知识库更新周期 ≤ 半年 | 需补知识库版本管理（`emrRuleVersionV14.ts` 已有） |
| CDSS 使用留存审计日志 | 已有（`emrQcAuditLogV14.ts`） |
| 系统整合、互联互通、数据共享 | 已落地 |
| CDSS 风险告知、运维审计、应急监测 | 部分 |
| 不良事件反馈机制 | 已有（`adverseEventReportingV13.ts`） |

---

## 四、对健澜AI原生医院操作系统OS 的差距清单（P0/P1/P2）

### 4.1 P0（必须优先补齐——交易闭环不完整，影响三甲医院可用性）

| # | 差距域 | 具体缺口 | 健澜现状证据 |
|---|---|---|---|
| P0-1 | **门诊挂号交易闭环** | 挂号 POST、退号审批、叫号状态机、号池预占/释放、与医生站叫号联动 | `outpatientRegister.ts` 5 个 GET 全是 M439 DEMO 桩，auth:false |
| P0-2 | **医嘱 CPOE 闭环** | 医嘱开立 POST、护士审核、执行确认、停止/撤销、成套医嘱、医嘱权限分级、执行单生成 | **已落地**（commit `569fe35d` + E2E `8901f415`）：`orderCpoeAggregator.ts` 严格状态机 + `orderCpoe.ts` 6 路由 + `order.ts` 改造。覆盖审核 pending_review→approved/rejected（重复审核 409）、成套医嘱原子开立（任一非法零落库）、执行单 SLIP-CO-N 幂等重打、开立/审核/执行三级权限分级（越权 403 带 code）、内存 seed 三态+驳回 |
| P0-3 | **护士站交易工作台** | 医嘱审核 POST、PDA 床边执行 POST、执行单、体征录入、护理记录书写 POST | **已落地补全**（commit `2b15c1be`）：在 nurseStationTrade 6 路由（审核/PDA 单医嘱执行/执行单生成）之上新增 `nurseStationWardAggregator.ts` + 4 条新路由——PDA 按执行单批量执行（扫错患者 409+拒绝留痕）、体征录入（体温/心率/收缩压/舒张压生理区间硬校验越界 400 指明项）、护理记录书写（recordType 白名单/content 必填）、护理执行单汇总 GET；权限复用 P0-2 `assertCan(execute)` 越权 403(code=40300)。**未覆盖**：体征曲线绘制、护理记录续写/签名、I-O 单平衡 |
| P0-4 | **药房发药/摆药交易** | 发药确认 POST、摆药批次、单剂量核对、退药审批、与医嘱执行联动 | **已落地+深化**（commit `9a5f27ac` + 深化 `40d65abd`）：摆药批次/双人核对发药/退药审批已做；本轮补处方审核链——医生开方→药师审核(approve/reject 留痕 reviewer/reviewedAt)→发药，新增 `POST prescriptions`、`prescriptions/:rxNo/review`、`prescriptions/:rxNo/dispense`、`/stop`、`GET prescriptions`；状态机：未审核先发药 409、重复发药 409、已停止发药 409、重复审核 409；真实 JWT 角色权限（复用 assertCan：write=doctor/admin 开方、review=pharmacist/admin 审核、execute=nurse/pharmacist/admin 发药，越权 403/code=40300）；visitId-patient 行级绑定；execute 域扩展含 pharmacist。**未覆盖**：毒麻精药品双人双锁、库存扣减联动 |
| P0-5 | **住院押金/结算交易** | 预交金缴纳 POST、押金不足预警、中途结算、出院结算 POST、一日清单推送 | **已落地+深化**（commit `9a0a4d43`/`4928effb` + 深化 `9f069288`）：预交金缴纳/押金预警/出院结算已做；本轮补中途结算 `POST mid-settlements`（type=mid 扣减余额、idempotencyKey 幂等、已出院再结 409）与一日清单推送 `POST daily-statements/push`（费用项汇总+押金余额+累计费用，同日幂等同号）；cashier/finance/admin 可结算推送、doctor/nurse 403(code=40300)；visitId-patient 行级绑定。**未覆盖**：医保实时结算对接、一日清单 PDF 导出/患者端推送 |
| P0-6 | **电子签名国密化** | 病历/医嘱/护理记录可靠电子签名接 SM2/TSA 第三方时间戳 | **已落地**（commit `2e6149c3`）：新建 `clinicalSignatureAggregator`——SM2 真签名（sm-crypto sm2.doSignature/doVerifySignature，公钥130/私钥64hex）+ SM3 摘要（sm3('abc')=66c7f0f4…ba8e0 国密测试向量命中）+ mock TSA（tsaToken/tsaTime/tsaCertId=MOCK-TSA-SM2-CERT-0001）+ prevHash 防篡改链；三对象端点 POST/GET `/api/v1/e-sign/clinical/objects*`；doctor 签 emr/order、nurse 签 nursing-record（越权 403 code=40300）；同 objectId 幂等、篡改验签 valid=false。**未覆盖**：真实第三方 TSA 对接、手写笔迹图、批量签名、签名落库到 PG |
| P0-7 | **生产 RBAC 关闭 DEMO 短路** | 真实口令哈希核验、就诊/患者归属行级校验、admin 角色不绕过 | **已落地+收尾深化**（commit `5b226315`/`730575c4`/`96981524` + 收尾 `fea2ef86`）：`requireAuth` 删除 DEMO_MODE 短路注入，无有效 Bearer JWT 一律 401；运维白名单无 token 开放；`POST /api/v1/auth/demo-login` 四角色签 JWT；visitId↔patientId 行级绑定越权 403。**收尾深化**：DEMO 模式 `/api/v1/auth/login` 改用 scrypt 哈希核验内置 4 账号（demo-doctor/nurse/pharmacist/admin），错误/未知口令统一 401 code=40101（防枚举）；`assertCan` 去掉 admin 角色硬绕过，改凭 `permissions=['*']` 通配放行（admin permissions=[] 不再越权）。**未覆盖**：生产口令接 iam 真实表、刷新令牌轮换落库、MFA 强制开启 |

#### 4.1.1 P0 落地状态（截至 2026-11-04 16:23 轮）

| 切片 | 完成事实 | commit | 代码路径证据 |
|---|---|---|---|
| P0-1 门诊挂号交易 | 号源预占/挂号/退号/叫号状态机内存闭环 | `b34c2f58` | `outpatientRegisterTradeAggregator.ts` / `outpatientRegisterTrade.ts` |
| P0-3 护士站交易 | 医嘱审核/PDA 床边执行/执行单生成工作台；本轮补全 PDA 按执行单执行/体征录入/护理记录/执行单汇总 4 写端 | `e111b286` + 补全 `2b15c1be` | `nurseStationTradeAggregator.ts` / `nurseStationTrade.ts`；补全 `nurseStationWardAggregator.ts` / `nurseStationWard.ts`（POST pda/execute、vitals、nursing-records；GET ward-execution-sheet） |
| P0-4 药房发药 | 摆药批次/双人核对发药/退药审批；深化处方审核→发药链（开方/审核/发药/停方）+ JWT 角色权限 + 行级绑定 | `9a5f27ac` + 深化 `40d65abd` | `pharmacyDispenseTradeAggregator.ts` / `pharmacyDispenseTrade.ts`（prescriptions 5 路由）；`tests/unit/pharmacyRxChain.test.ts` / `tests/integration/pharmacyRxChain-e2e.test.ts` |
| P0-5 押金结算 | 预交金缴纳/押金预警/出院结算一日清单；seed 滚动；深化中途结算+一日清单推送（cashier/finance 角色、行级绑定、幂等） | `9a0a4d43` + seed `4928effb` + 深化 `9f069288` | `inpatientDepositSettleAggregator.ts` / `inpatientDepositSettleTrade.ts`（mid-settlements、daily-statements/push）；`tests/unit/inpatientMidSettle.test.ts` / `tests/integration/inpatientMidSettle-e2e.test.ts` |
| P0 四切片 E2E | 真实 HTTP 打 8080，状态自适应 probe-then-branch 可重跑 | `f3f77cb4` + 自适应 `076ddd1b` | `tests/integration/p0-trade-e2e.test.ts` |
| CI BFF 基座 | 集成测试 job 自起 BFF，修复 E2E 在 CI 必红且被 continue-on-error 掩盖 | `d3164775` | CI 集成测试 job |
| P0-2 CPOE | 审核状态机/成套原子/执行单幂等/三级权限/内存 seed + 自签 4 角色 JWT 的 E2E | `569fe35d` + E2E `8901f415` | `orderCpoeAggregator.ts` / `orderCpoe.ts` / `order.ts` / `tests/integration/orderCpoe-e2e.test.ts` |
| P0-7 生产 RBAC | 删除 `requireAuth` DEMO 短路（无 token→401/40100）；运维白名单 /health /ready /metrics /api/v1/health /api/v1/system/health 无 token 开放；新增 `POST /api/v1/auth/demo-login` 四角色(doctor/nurse/pharmacist/admin)签 HS256 JWT；`assertVisitPatientBinding` 行级归属 visitId↔patientId 越权 403(40300)；`p0-trade-e2e` 迁移自签 JWT；新增 `p0-rbac-e2e`；收尾深化：DEMO login scrypt 口令核验(40101)、assertCan 去 admin 硬改 `permissions=['*']` | `5b226315` + 收尾 `fea2ef86` | `middleware/auth.ts` / `routes/auth.ts`(demo-login + scrypt verifyDemoPassword + demo-* 账号) / `aggregators/orderCpoeAggregator.ts`(行级绑定 + assertCan `*` 通配) / `tests/integration/p0-rbac-e2e.test.ts` / `tests/unit/p07TailLogin.test.ts` / `tests/integration/p07TailLogin-e2e.test.ts` |
| P0-6 电子签名国密 | SM2 真签名 + SM3 摘要 + mock TSA 时间戳 + prevHash 防篡改链；emr/order/nursing-record 三对象签名/验签/列表端点；doctor/nurse 角色权限 | `2e6149c3` | `clinicalSignatureAggregator.ts` / `clinicalSignature.ts`（POST/GET `/api/v1/e-sign/clinical/objects*`）；`src/types/sm-crypto.d.ts`；`tests/unit/clinicalSignature.test.ts` / `tests/integration/clinicalSignature-e2e.test.ts` |

> **防误判注记**：`order.ts` 虽早已注册 5 条路由，但护士审核、成套医嘱、医嘱权限分级、执行单生成、演示态真实 seed 长期缺失（GET 列表在 DEMO 下直接 `return ok([])` 空桩），曾据此被误判为「P0-2 已完成」。本轮按台账原判重做落地。另：`POST /api/v1/orders/:id/review` 与 `/:id/stop` 此前由 `m570Routes.ts` 与 `orderVerify.ts` 各注册一份 stub，现由 `orderCpoe.ts` 在 allRoutes 中**前置注册**接管（路由首匹配胜出），两个旧 stub 成为不可达死路由；前端与既有测试均走 `/api/v1/inpatient/orders/...`，无调用方受损，后续可清理。

### 4.2 P1（业务深度——三甲医院评级与学科建设所需）

| # | 差距域 | 具体缺口 |
|---|---|---|
| P1-1 | 三级检诊工作流 | 住院医/主治/主任三级查房签审时间线、越级签审记录、签审意见留痕 | **已落地**（commit `17dd063d`）：新建内存三级工作流 `wardRoundSignoffAggregator`——状态机 draft(resident写)─attending approve→chief_sign─chief终签→archived；reject/return 回 draft；archived 不可改（409）；越级留痕（主治未审主任直签标 escalated=true/bypassedLevel=attending）；签审意见 trail {reviewerId/role/action/comment/signedAt}；resident/attending/chief 三级角色越权 403(code=40300)；visitId-patientId 行级绑定。端点 `/api/v1/inpatient/ward-round-signoff/notes*`（5 条）。**未覆盖**：病程版本对比、与既有 PG 二级 rounds 合并、电子签名(P0-6)挂接终签 |
| P1-2 | 体温单/医嘱单 | 体温单作为独立护理文书模块（自动采集 + 绘制曲线）、医嘱单续打/补打/重打 | **已落地**（commit `a92fb36d`）：①新建内存 `vitalsSheetAggregator`——护士录入体温/脉搏/呼吸/血压/SpO2/体重/大便，硬校验（体温 35~42℃、脉搏 40~160、呼吸 8~40、SBP 60~220、DBP 30~130），越界 400 指明字段；`GET /curve` 按 4h 槽位（0/4/8/12/16/20，±2h 取最近）输出 temperatureCurve/pulseCurve/respirationCurve/bpSeries/spo2Series 各 6 点（缺失 null）+ weight + bowelMovements。②新建 `orderSheetPrintAggregator`——continuation 续打（nextPage 递增）/reissue 补打（range 留痕 reissuedPages）/reprint 重打（作废前次），同 visitId+printMode 重复 printCount+1（200 留痕非 409）。nurse 录入+查看、doctor 仅查看；doctor/nurse 可打印；行级 visitId-patientId 绑定。端点 `/api/v1/nursing/vitals-sheet/{entries,curve}`、`/api/v1/clinical/order-sheet/{print,prints}`。**未覆盖**：体温单绘制前端（体温曲线图形/网格）、医嘱单 PDF 排版与长期/临时分单、与 P0-3 PDA 体征联动 |
| P1-3 | 手术麻醉闭环 | 手术申请 POST、手术排班（手术间资源）、麻醉记录单、术中监护、PACU 复苏记录 | **已落地**（commit `e75ba66e`）：新建内存 `surgeryWorkflowAggregator`——状态机 draft(surgeon申请)→scheduled(admin排班)→in_or→in_progress→in_pacu→recovered→ward_returned，仅逐级前进（越级 409、同状态幂等 200）；**手术间互斥**（同 orRoom 时段重叠 409）；anesthetist 术中麻醉记录（vitals/麻醉方式/drugs/出入量）；nurse PACU 复苏（Aldrete 0~10、意识、疼痛 0~10，越界 400）。角色：surgeon 建申请+推进状态、admin 排班、anesthetist 麻醉、nurse PACU，跨角色 403(code=40300)；visitId-patientId 行级绑定。端点 `/api/v1/surgery-workflow/requests*`（6 条）。**未覆盖**：术中监护多时间点持续采集曲线、术前讨论/麻醉评估单、手术文书 PDF、术前核查单(surgical safety checklist)联动 |
| P1-4 | 输血闭环 | 输血申请、血型鉴定、交叉配血、发血、双人核对、输血记录、不良反应 | **已落地**（commit `83f1b3cb`）：新建内存 `transfusionWorkflowAggregator`——七态状态机 application(doctor申请)→typed(血型鉴定)→crossmatched(交叉配血)→issued(发血)→bedside_checked(床边双人核对)→transfusing→completed，非法跃迁 409；**配血不合 409(code=40900)**；**同血袋重复发血 409**；**双人核对 nurseId+witnessNurseId 双工号必填且不能相同**（相同 400），matched=false 拒输 409；不良反应 severity 1~4（越界 400）。角色：doctor 申请、blood_bank_tech 鉴定/配血/发血、nurse 双人核对/输注/不良反应，跨角色 403(code=40300)；visitId-patientId 行级绑定。9 端点 `/api/v1/transfusion-workflow/requests*`。**既有覆盖**：`/api/v1/transfusions`（transfusion.ts 写端桩）、m207/m519 列表/统计、blood-quality 规则引擎；**本轮补**：完整七态交易 + 双人核对留痕 + 配血/发血硬约束。**未覆盖**：血袋库存扣减联动、不良反应上报院感、输血同意书电子签 |
| P1-5 | ICU 监护文书 | Q1H/Q2H 监护记录、RASS 镇静评分、CAM-ICU 谵妄、24h 出入量、呼吸机/输液泵数据接入 | **已落地**（commit `b8940124`）：新建内存 `icuNotesAggregator`——①转入转出 admitted→discharged（重复转入/未转入即转出/重复转出均 409，acuityLevel 1~4）；②多时间点体征序列（icu_nurse 录，HR 20~250/SBP 40~300/DBP 20~200/SpO2 70~100/体温 30~42/GCS 3~15/尿量 0~2000 硬校验，同 visitId 同 recordedAt 重复 409，GET 按时间升序）；③评分引擎纯函数 APACHE II(0~71，测试向量：全正常=0、age78/temp39.5/map55/hr130/resp35/gcs8/chronic5=28)、SOFA(6 系统 0~24，全 1=6、全 4=24)、RASS(-5~+4)、Ramsay(1~6)，同时间点重复 409。角色 icu_doctor 转入转出/评分、icu_nurse 录体征，跨角色 403(code=40300)；行级绑定。6 端点 `/api/v1/icu/notes/*`。**未覆盖**：CAM-ICU 谵妄评分、24h 出入量汇总、呼吸机/输液泵设备数据接入、Q1H/Q2H 定时提醒 |
| P1-6 | 院前住院管家 | 患者小程序：住院登记、术前检查预约、床位等待、到院入科状态跟踪 | **已落地**（commit `6764595a`）：新建内存 `inpatientConciergeAggregator`——①预入院+到院报到（patient 本人发起、nurse 报到；重复报到 409、过期>7 天 400、patient 自报 403）；②住院准备清单默认 10 条（身份证/医保卡/押金/生活用品/既往病历/停药告知/禁食禁水/陪护人/出院证件照/核酸报告，pending→done|skipped 幂等）；③入院宣教推送（nurse 推 sms/wechat/app，家属须 education scope）；④检查检验预约联动（mock 排班当日 8 点起 8 整点槽，examType 限 ct/mri/xray/ultrasound/lab，非法时段 400、同 patient+exam+slot 409）；⑤家属代办授权链（`patientId|familyMemberId`→scope[]，无授权 403 code=40300，非本人授权 403）。统一 `assertAccess` 分流 admin/nurse/patient/family。9 端点 `/api/v1/inpatient-concierge/*`。**未覆盖**：真实短信/微信网关接入、检查排班与真实 HIS 检查系统联动、住院准备清单模板自定义、床位等待队列与状态推送 |
| P1-7 | 医嘱执行机读核对 | 腕带/条码/PDA 床边扫码，6 级评级硬性要求 | **已落地**（commit `e25f4734`）：新建内存 `medicationVerificationAggregator`——①6 级评级矩阵纯函数 L1 routine/L2 caution/L3 high-alert/L4 look-alike-sound-alike/L5 emergency-stat/L6 investigational（L3+ 强制双工号核对、L5+ 停药需 approverId 主任审批）；②状态机 created→wristband_scanned→barcode_scanned→executed，任意节点可 reject（终态）/pause（暂停）→resume 回到暂停前节点/discontinue（终态，L5+ 需 approverId）；③扫腕带 patientIdScanned≠order.patientId → 403 code=40300；L3+ 缺 witnessNurseId 或 witness==nurse → 400；④扫药品条码 drugCodeScanned≠order.drugCode → **422 code=42200**（业务语义）；⑤未扫腕带/未扫条码/重复执行 → 409。角色 doctor 创建、nurse 执行核对，跨角色 403。9 端点 `/api/v1/medication-verification/*`。**未覆盖**：真实 PDA/腕带/RFID 硬件对接、电子签名（国密 SM2/TSA）、CDSS 高警实时拦截、听似看似药库匹配 |
| P1-8 | FHIR R4 资源扩展 | 从 4 类扩展到 20+ 类（Patient/Encounter/Condition/MedicationRequest/MedicationAdministration/Observation/Procedure/DocumentReference/AuditEvent 等） | **已落地**（commit `ad5eecb4`）：新建内存 `fhirR4ResourcesAggregator` + 统一 CRUD 网关 `/fhir/r4/{resourceType}/{id?}`，白名单 **24 类**（Patient/Encounter/Observation/MedicationRequest/Condition/Procedure/DocumentReference/Coverage/ExplanationOfBenefit/AllergyIntolerance/AdverseEvent/CarePlan/EpisodeOfCare/Flag/List/RelatedPerson/Practitioner/PractitionerRole/Location/Organization/DiagnosticReport/ServiceRequest/MedicationDispense/MedicationAdministration）。GET 列表（Bundle searchset）/GET 单条/POST 创建（id 冲突 409、缺 resourceType 400、body 与路径不一致 400）/PUT 幂等更新（不存在 404）；不支持 resourceType → 404 OperationOutcome；每个资源自动 stamp `meta.lastUpdated`；患者作用域资源（subject/patient/beneficiary 引用 Patient/{pid}）与 JWT 患者不匹配 → 403 code=40300，patient 列表自动过滤只回本人；管理类资源（Practitioner/PractitionerRole/Location/Organization）不强制患者绑定。与既有只读 `/api/fhir/*` 桩（4 类 GET）不同前缀不冲突，本切片新增 20 类写端能力。**未覆盖**：FHIR 搜索参数（date/code/chain）、Bundle transaction 批处理、历史版本 vread、Profile/Shape 校验、AuditEvent（本次未纳入） |
| P2-EMR | 病历版本管理（电子病历 5 级合规先行） | 病历每次保存生成不可变新版本、字段级 diff、终稿锁定、终稿后修改需审批留痕 | **已落地**（commit `d1c762e6`）：新建内存 `emrVersionsAggregator`——①每 noteId 下 versions[] 不可变历史（v1/v2/v3 存 content/authorId/authorRole/savedAt/diffFromPrev/status）；②content 结构化字段 {chiefComplaint, presentIllness, physicalExam, assessment, plan}，diff 按字段级 before/after 只列变化项；③状态机 draft→revise（curVersion++）→finalized（attending/chief 锁定）→unlock-for-edit（reason 必填、留痕 unlockReason/unlockApproverId）→revise→re-lock；④finalized 状态 revise → 409 code=40900；unlock 无 reason → 400；resident finalize/unlock → 403 code=40300；nurse 不可写病历 → 403；noteType 白名单（progress/admission/transfer/discharge/consult/op-note）。9 端点 `/api/v1/emr-versions/*`。**未覆盖**：国密 SM2 电子签名/TSA 时间戳、全文语义 diff、版本对比 UI、与 M542 `/medical-records/:id/versions`（GET 桩）合并 |
| P2-CDS | CDS 深度规则引擎（合理用药/相互作用/危急值） | 剂量/途径/疗程/特殊人群/相互作用/配伍/重复/诊断禁忌 + 危急值联动闭环 | **已落地**（commit `60ea8e42`）：新建纯函数 `evaluateMedication`——①剂量超量 5 条（paracetamol>4g/warfarin>10mg/insulin>1U·kg/digoxin>0.25mg/metformin>2550mg）；②给药途径禁忌 3 条（metoprolol 不可 IV 推、amoxicillin 不可鞘内、atenolol 无 IV 剂型）；③疗程超限 3 条（NSAID>14d/抗生素>14d/PPI>8w）；④特殊人群 8 条（孕妇禁他汀/ACEI/华法林/异维A酸/利巴韦林；肾功不全地高辛/庆大/二甲双胍减量；肝功不全 paracetamol/metformin 慎用）；⑤药物相互作用 20 对（warfarin+NSAID/ACEI+保钾利尿/SSRI+MAOI 等）；⑥静脉 Y-site 配伍禁忌 10 对（cefepime+acyclovir/phenytoin+furosemide 等）；⑦重复用药（NSAID/ACEI/β-blocker 大类）；⑧诊断-禁忌 3 条（哮喘+β阻滞剂/G6PD+伯氨喹/痛风+利尿剂）。hard-stop → 409 code=40900；warning 需 force+overrideReason 强制提交并写 OverrideLog 留痕。危急值 6 项阈值（K<3 或 >6、血糖<2.8 或 >22、Hgb<60、Cr>500、INR>4.5、PLT<50）超阈值自动建 alert，医生 acknowledge 闭环。4 端点 `/api/v1/cds/checks/*`（与 M543 `/cds/checks` 精确路径不冲突）。**未覆盖**：规则库与真实药品库（RxNorm/ATC）对齐、证据等级/参考文献、CDSS 监控看板、患者教育材料联动 |
| P2-Timeline | 患者时间线（单患者全维度事件聚合） | 门诊/住院/检验/检查/用药/手术/护理/输血/CDS 告警统一倒序时间轴 + type/from/to/分页过滤 + byType 计数 | **已落地**（commit `2fd8c504`）：新建内存 `patientTimelineAggregator`——①事件注册中心 `recordEvent({patientId, visitId, type, time, summary, detailRef})`，类型白名单 7 类 lab/imaging/medication/surgery/nursing/cds/encounter；②listEvents 按 time 倒序、支持 type/from/to ISO 过滤、limit 默认 50 最大 200/offset 默认 0，非法 type/非 ISO 时间/limit>200/负分页 → 400；③summarize 返 `{totalEvents, byType{...}, timeRange{earliest,latest}}`；④patient 角色 JWT sub≠patientId → 403 code=40300；⑤`POST /_seed` 仅 DEMO_MODE=1 可用灌样本。3 端点 `/api/v1/patient-timeline/{:patientId/events,:patientId/summary,_seed}`，与既有静态 GET `/all/visits/medications/lab-results/imaging/notes`（M428）不冲突。**未覆盖**：跨模块埋点（CDS acknowledge 等真实事件尚未接入 recordEvent，当前靠 _seed）、事件类型 UI 分组卡片、真实 PG 持久化、患者端推送 |
| P2-NQI | 护理敏感质量指标（跌倒/压疮/管路/约束/护患比） | Morse/Braden 分级 + 千住院日发生率 + 床护比护患比看板 | **已落地**（commit `7edebf6c`）：新建内存 `nqiAggregator`——①跌倒 severity 四级 no-harm/mild/moderate/severe + Morse 0~125 + 危险因素；②压疮 source 院外带入/院内发生 + stage I~IV/unstageable + Braden 6~23；③管路滑脱 catheterType 胃管/尿管/CVC/引流管 + reason 意外/自行拔管/脱出/其他 + reinserted；④约束 physical/chemical + appliedAt/removedAt + 每日评估 {at, rationale, alternativesTried} 留痕，已解除再 assess → 409、重复解除 → 409；⑤staffing 录入科室日 beds/nurses/inpatients；⑥dashboard 按月/科室聚合 totalInpatientDays + 各类事件数 + 每千住院日发生率（fallRate/pressureUlcerRate/tubeRate）+ 床护比 bedNurse/护患比 patientNurse。枚举越界、Morse/Braden 越界 → 400；doctor 上报 → 403 code=40300。9 端点 `/api/v1/nqi/{events/*,dashboard,staffing}`，与既有 M429/M471/M545 `/nqi/{pressure-ulcer,falls,incidence,indicators/*}` 静态 GET 桩不冲突。**未覆盖**：跌倒/压疮风险动态评分自动预警、根因分析 RCA 表、与护理不良事件上报系统对接、真实 PG 持久化 |
| P3-1 | 患者互联网+服务门户（智慧服务三级） | 在线报告/图文咨询/满意度/就诊提醒/医保缴费一站式 | **已落地**（commit `df4cbecc`）：新建内存 `patientPortalV2Aggregator`——①Report 4 类 lab/imaging/prescription/bill-summary，listReports 支持 type/from/to 过滤，markReportRead 幂等；②ConsultBooking 创建自动生成 in-app reminder，scheduledAt 必须未来，重复取消 → 409；③Satisfaction score 1~5，同 visitId 重复提交 → 409，score≤3 自动写 AdminNotification（低分告警）；④Reminder channel in-app/sms/wechat，markReminderRead；⑤PaymentRecord amountTotal/insuranceCovered/patientPaid 拆分 + method wechat/alipay/cash/insurance；⑥patient JWT sub≠patientId → 403 code=40300；⑦`POST /_seed` 仅 DEMO_MODE=1 灌样本。10 端点 `/api/v1/patient-portal/{reports/*,consult-bookings/*,satisfaction,reminders/*,payments,_seed}`，与既有 `/api/v1/portal/*`（M454）、`/api/v1/patient/portal`、`/api/v1/patient-portal-usage`（M316-D）不冲突。**未覆盖**：图文咨询真实 IM 会话、微信/短信网关对接、医保实时结算、报告 PDF 下载、家属代办授权复用 P1-6 链（当前未接） |
| P3-2 | 智能预问诊 + 智慧导诊（智慧服务三级核心） | 患者填主诉/现病史/既往史/过敏史/用药史生成结构化摘要；多症状标签规则引擎推荐科室/急诊 | **已落地**（commit `fe099c74`）：新建内存 `smartTriageV2Aggregator`——①PreVisitQuestionnaire 7 字段（chiefComplaint≤500/presentIllness/pastHistory/allergyHistory/currentMeds/symptomTags/durationDays/severity mild|moderate|severe），draft→submitted（自动生成 aiSummary 模板拼接：主诉+现病史+病程+严重度+既往史+过敏史+用药+症状标签）→reviewed-by-doctor；重复 submit → 409、review 未 submit → 409；②SymptomRule 内置 16 条（胸痛/呼吸困难/意识障碍/大出血 4 条 emergency 红旗 + 发热/咳嗽/头痛/腹痛/腹泻/头晕/皮疹/关节痛/腰痛/水肿/心悸/视物模糊）；③runTriage 按症状聚合科室 score 排序 top3，任一 emergency=true 同时把急诊科 unshift 到首位（score=999），无匹配兜底全科医学科；④doctor 创建问卷 → 403；patient 行级绑定 sub≠patientId → 403；⑤GET /symptoms 返回字典供前端多选。7 端点 `/api/v1/smart-triage/{questionnaires/*,triage,symptoms}`，与 M164-C `/api/v1/patient/smart-triage`、M540 `/api/v1/smart-triages`（复数）不冲突。**未覆盖**：规则表接真实 LLM/知识库、结构化抽取 NLP 解析自由文本、医生端智能辅助写病历、科室号源实时联动、症状严重度自评问卷 UI |
| P3-3 | 号源池 + 患者自助预约挂号（智慧服务三级核心） | 科室/医生/日期/时段实时占用；满号 409；取消释放；检查号 CT/MRI/US/ECG | **已落地**（commit `8a2f7c87`）：新建内存 `selfSchedulingAggregator`——①Slot 模型 {departmentId/doctorId?/date/timeSlot/slotType outpatient|checkup/examType? CT|MRI|US|ECG/capacity/booked/status open|closed}；②TIME_SLOTS 内置 10 个时段（上午 6 个 + 下午 4 个半小时槽）；③createBooking 预约成功 slot.booked++，booked==capacity 自动 closed；④cancelBooking 释放 slot.booked--（不低于 0），若 slot 曾 closed 自动 re-open；⑤slot 不存在 → 404、满号/已 closed → 409 code=40900、同 patient 同 slot 重复预约 → 409、重复取消 → 409；⑥doctor 代患者预约 → 403；patient 行级绑定 sub≠patientId → 403；⑦`POST /slots/_seed` 仅 DEMO_MODE=1 灌号源；⑧GET /departments 返回 9 个内置科室（心血管/呼吸/神经/消化/感染/皮肤/骨科/眼科/检查中心）。6 端点 `/api/v1/self-scheduling/{slots/*,bookings/*,departments}`，与 P0-1 `/outpatient-register-trade/*`（窗口/医生站挂号）不冲突、与 P1-6 `/inpatient-concierge/*`（护士站代约）不冲突。**未覆盖**：号源放号规则（每天 0 点放新号）、退号手续费、爽约黑名单、检查号扩到 PET/胃肠镜、与真实 HIS 号源同步 |
| P3-4 | 报告推送 + 满意度闭环工单（智慧服务三级收口） | 报告 issued→published→pushed→read 状态机；异常加推 sms；满意度低分自动建工单 open→investigating→resolved→closed + 评论 | **已落地**（commit `c76c8a71`）：新建内存 `engagementAggregator`——①EngagementReport 4 态（issued/published/pushed/read）发布即 pushed，pushChannels 按 isAbnormal 决定 `['in-app']` 或 `['in-app','sms']`；markReportRead 幂等（已 read 再 read 不重复写 readAt）；②SupportTicket 4 态 VALID_TRANSITIONS={open:[investigating],investigating:[resolved],resolved:[closed],closed:[]}，非法跃迁（如 open→closed）→ 409 code=40900；③关单必须 comment 否则 400；closed 工单再 comment → 409；④source 白名单 low-satisfaction|complaint|inquiry；subject 必填 ≤200；⑤autoCreateLowSatisfactionTicket 从满意度低分（score≤3）自动创建 source=low-satisfaction 工单；⑥患者改工单状态 → 403 code=40300，只有 admin 能 /status；⑦行级 patientId 绑定 sub≠patientId → 403；⑧`POST /_seed` 仅 DEMO_MODE=1 灌 reports/lowSatisfaction 样本。8 端点 `/api/v1/engagement/{reports/*,tickets/*,_seed}`，与 P3-1 `/patient-portal/*`（Report/Survey 数据模型独立、不冲突）、P2-2 `/cds/checks/alerts/*`（危急值告警，本切片是其下游闭环）不冲突。**未覆盖**：真实 SMS 网关接入、推送到达回执、工单 SLA 计时/超期升级、工单分配到科室坐席、患者满意度趋势看板 |
| P4-1 | 全链路审计日志（等保三级合规底座） | 所有敏感操作不可篡改（prevHash 哈希链）；按 actor/module/action/time/result 过滤；admin 导出 CSV；verify-chain 校验完整性 | **已落地**（commit `__AU_SHA__`）：新建内存 `auditEventAggregator`——①AuditEvent 14 字段（eventId UUID/seq 递增/occurredAt/actorId/actorRole doctor|nurse|pharmacist|admin|patient|system/action 10 枚举 login|logout|create|update|delete|approve|reject|export|forbidden|view/module/resourceType/resourceId/patientId?/result success|failure|forbidden/errorCode?/ip/userAgent/prevHash/hash）；②**哈希链算法**：`hash = SHA256(prevHash + '|' + canonical(payload))`，canonical 为固定字段顺序的 JSON 序列化（不含 hash 自身），创世 event prevHash='GENESIS'；③verify-chain 遍历重算每条 hash，任一不一致返回 `{valid:false, brokenAt:seq}`（单测 __tamper 验证篡改 result/prevHash 均能定位）；④权限：admin 查全部/导出 CSV/verify-chain；doctor/nurse/pharmacist 强制 actorId=JWT sub，查别人 → 403 code=40300；patient 查审计 → 403；⑤queryEvents 支持 actorId/module/action/result/patientId/from/to 过滤 + limit 默认 50 最大 500 + offset 分页，按 occurredAt 倒序；⑥exportCsv 输出 14 列 CSV（RFC4180 引号转义）；⑦`POST /_seed` 仅 DEMO_MODE=1 且 admin。4 端点 `/api/v1/audit/events{/export,/verify-chain,/_seed}`。**未覆盖**：既有模块埋点（login/logout/开方/发药/终稿/审批/导出的 middleware 钩子留下一轮）、审计日志持久化到独立冷存储/WORM、日志集中 SIEM 对接、操作回放与取证 |

### 4.3 P2（顶层设计与 AI 原生——与第三代 AI 原生厂商对齐）

| # | 差距域 | 具体缺口 |
|---|---|---|
| P2-1 | **AgentFramework 资源 Agent 化** | 号源 Agent、床位 Agent、检查 Agent、检验 Agent、病历 Agent、质控 Agent——把医院核心资源/数据/知识 Agent 化，模型可插拔 |
| P2-2 | 医案智图（MedMap） | 从 360 数据视图升级为按查房/交班/科研/教学场景、按专科推送聚焦数据 |
| P2-3 | AI 重症专科 | AI 流/工作流/数据流三流融合，阈值驱动任务执行，运行中工具/成果沉淀复用 |
| P2-4 | 认知层统一医疗知识 | 在三中台之上扩展统一医疗知识与业务领域，为大模型提供循证依据 |
| P2-5 | 多智能体协同运营 | 现有 Consult-Agent/MedMuse/DoctorMuse 向医院运营 Agent 扩展（号源/床位/检查预约 Agent） |
| P2-6 | 互联互通五乙/五甲 | 区域协同、外院病历调阅、跨院检查结果互认 |
| P2-7 | 等保三级 + 密评 | 国密全栈、第三方测评 |

---

## 五、切片落地建议（BFF 路由 + 前端页面路径）

> 以下切片按 P0 → P1 → P2 优先级排序，每片独立 commit，遵循 DEMO_MODE=1 内存演示基线。

### 切片 A（P0）：门诊挂号/分诊/叫号交易闭环

- **BFF 新增**：`src/bff/routes/opdRegisterWorkflow.ts`
  - `POST /api/v1/outpatient/registrations`（挂号，权限码 `opd:register`）
  - `POST /api/v1/outpatient/registrations/:id/cancel`（退号审批）
  - `POST /api/v1/outpatient/calling/:id/call`（叫号）
  - `POST /api/v1/outpatient/calling/:id/skip`（过号）
  - `GET /api/v1/outpatient/queue?dept=`（候诊队列）
- **聚合器**：`src/bff/aggregators/opdRegisterAggregator.ts`（DEMO 内存 Map）
- **前端页面**：`web/src/pages/opd/register/`（挂号窗口）、`web/src/pages/opd/triage/`（分诊台）、`web/src/pages/opd/calling/`（叫号屏）
- **权限码**：`opd:register` / `opd:cancel` / `opd:call`

### 切片 B（P0）：医嘱 CPOE 闭环

- **BFF 新增**：`src/bff/routes/orderWorkflow.ts`
  - `POST /api/v1/orders`（开立，权限码 `order:create`，带处方权分级）
  - `POST /api/v1/orders/:id/review`（护士审核）
  - `POST /api/v1/orders/:id/execute`（执行确认）
  - `POST /api/v1/orders/:id/stop`（停止）
  - `POST /api/v1/orders/:id/discontinue`（撤销）
  - `GET /api/v1/orders?visitId=&status=`（医嘱列表，含长期/临时/备用）
  - `GET /api/v1/orders/sets`（成套医嘱）
- **聚合器**：`src/bff/aggregators/orderWorkflowAggregator.ts`
- **前端页面**：`web/src/pages/doctor/order-entry/`（医嘱录入）、`web/src/pages/nurse/order-review/`（医嘱审核）、`web/src/pages/orders/sheet/`（医嘱单打印）
- **复用**：现有 `emrAiOrderRecoV14`/`emrAiOrderSmartReviewV14` AI 端点挂接

### 切片 C（P0）：护士站交易工作台

- **BFF 扩展**：`src/bff/routes/nurseStation.ts`（在现有 3 条 GET 上追加 POST）
  - `POST /api/v1/nurse-station/orders/:id/review`
  - `POST /api/v1/nurse-station/orders/:id/execute`（PDA 扫码，带 patientId+orderId 机读核对）
  - `POST /api/v1/nurse-station/visits/:id/vitals`（体征录入）
  - `POST /api/v1/nurse-station/visits/:id/nursing-note`（护理记录书写）
- **前端页面**：`web/src/pages/nurse/station/`（护士站四合一屏）、`web/src/pages/nurse/pda/`（移动护理 PDA）

### 切片 D（P0）：药房发药/摆药

- **BFF 新增**：`src/bff/routes/pharmacyDispenseWorkflow.ts`
  - `GET /api/v1/pharmacy/dispense-queue?pharmacy=`（待发药队列）
  - `POST /api/v1/pharmacy/dispense/:id/confirm`（发药确认，扫药品条码 + 患者腕带）
  - `POST /api/v1/pharmacy/dispense/:id/return`（退药）
  - `GET /api/v1/pharmacy/prep-list`（住院摆药单）
- **前端页面**：`web/src/pages/pharmacy/dispense/`（发药窗口）、`web/src/pages/pharmacy/prep/`（摆药台）

### 切片 E（P0）：住院押金/结算

- **BFF 新增**：`src/bff/routes/inpatientBilling.ts`
  - `POST /api/v1/inpatient/visits/:id/deposit`（预交金缴纳）
  - `GET /api/v1/inpatient/visits/:id/deposit-balance`（押金余额）
  - `POST /api/v1/inpatient/visits/:id/interim-settlement`（中途结算）
  - `POST /api/v1/inpatient/visits/:id/final-settlement`（出院结算）
  - `GET /api/v1/inpatient/visits/:id/daily-bill`（一日清单）
- **前端页面**：`web/src/pages/finance/deposit/`（住院收费处）、`web/src/pages/patient/bill/`（床旁一日清单）

### 切片 F（P1）：体温单/医嘱单文书

- **BFF 新增**：`src/bff/routes/nursingSheets.ts`
  - `GET /api/v1/nursing/visits/:id/temperature-sheet?from=&to=`（体温单）
  - `GET /api/v1/nursing/visits/:id/order-sheet/long`（长期医嘱单）
  - `GET /api/v1/nursing/visits/:id/order-sheet/temp`（临时医嘱单）
- **前端页面**：`web/src/pages/nursing/temperature-sheet/`、`web/src/pages/nursing/order-sheet/`

### 切片 G（P1）：手术麻醉闭环

- **BFF 新增**：`src/bff/routes/surgeryWorkflow.ts`
  - `POST /api/v1/surgery/appointments`（手术申请）
  - `POST /api/v1/surgery/schedule`（手术间排班，冲突检测）
  - `POST /api/v1/surgery/cases/:id/anesthesia-record`（麻醉记录）
  - `POST /api/v1/surgery/cases/:id/pacu`（PACU 复苏记录）
- **前端页面**：`web/src/pages/surgery/schedule/`（手术排班室）、`web/src/pages/anesthesia/record/`（麻醉记录单）、`web/src/pages/pacu/`（复苏室）

### 切片 H（P1）：输血闭环

- **BFF 新增**：`src/bff/routes/transfusionWorkflow.ts`
  - `POST /api/v1/transfusion/requests`（输血申请）
  - `POST /api/v1/transfusion/crossmatch`（交叉配血）
  - `POST /api/v1/transfusion/units/:unitId/issue`（发血）
  - `POST /api/v1/transfusion/units/:unitId/administer`（输血记录）
- **前端页面**：`web/src/pages/blood/transfusion/`

### 切片 I（P2）：AgentFramework 资源 Agent 化

- **BFF 新增**：`src/bff/routes/agents/resourceAgents.ts`
  - `GET /api/v1/agents/slots/recommend?dept=&date=`（号源 Agent 推荐）
  - `GET /api/v1/agents/beds/recommend?dept=&condition=`（床位 Agent 推荐）
  - `GET /api/v1/agents/exams/recommend?patient=&symptoms=`（检查 Agent）
  - `GET /api/v1/agents/labs/recommend?patient=&diagnosis=`（检验 Agent）
- **前端页面**：`web/src/pages/agents/resource/`（资源 Agent 运营看板）
- **复用**：现有 Consult-Agent 框架、`agentRuntime.ts`、`agentRuleV9.ts`

### 切片 J（P2）：FHIR R4 资源扩展

- **BFF 扩展**：`src/bff/routes/fhirResources.ts`（从 4 类扩到 20+ 类）
- 优先资源：Patient、Encounter、Condition、MedicationRequest、MedicationAdministration、Observation、Procedure、DocumentReference、AuditEvent、AllergyIntolerance、ServiceRequest、DiagnosticReport
- **参考**：`emr-oss-benchmark-2026-10-25.md` 第 1.1 节映射表

---

## 六、与既有研究报告的关系

| 既有报告 | 覆盖范围 | 本报告增量 |
|---|---|---|
| `emr-gap-matrix-2026-10-25.md` | EMR 合规差距矩阵（P0 生产化六项缺口） | 本报告聚焦 HIS-EMR **业务流程**对标，不重复合规六项 |
| `emr-oss-benchmark-2026-10-25.md` | 开源 EMR/HIS（OpenEMR/OpenMRS/Medplum/HAPI）与 FHIR 映射 | 本报告聚焦**商业头部厂商**产品矩阵与顶层设计 |
| `2026-10-25-电子病历国标规范与开源实践对标研究报告.md` | 国标规范与 FHIR 落点 | 本报告聚焦**业务功能清单与切片落地** |
| `emr-regulation-index-2026-10-25.md` | 法规条款索引 | 本报告引用法规条款均在第三节列出 |

---

## 七、自验清单

- [x] 全文已完成对标厂商商号/产品英文名/股票代号脱敏（统一以「行业头部上市医疗IT厂商」等代称出现）
- [x] 全文未出现公司产品旧称/错别字/非授权英文代号（品牌硬违规 7 项 0 命中）
- [x] 产品正式名统一为「健澜AI原生医院操作系统OS」
- [x] 对标对象统一使用脱敏代称
- [x] 差距清单按 P0/P1/P2 分级
- [x] 切片建议包含 BFF 路由路径 + 前端页面路径
- [x] 不写代码、仅产出研究报告
- [x] 引用国家法规时标注文号（国卫办医政函〔2023〕268号、国卫办医函〔2018〕1079号）

---

**报告完**。下一步建议：由片2（代码现状勘查）→ 片3（BFF 后端补齐）→ 片4（前端页面）→ 片5（路由注册）→ 片6（双 tsc 门禁 + 品牌/脱敏扫描 + 双仓推送）执行。
