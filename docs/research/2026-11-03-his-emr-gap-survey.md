# 健澜AI原生医院操作系统OS — HIS / EMR 一体化业务闭环缺口勘查

- 勘查日期：2026-11-03
- 勘查范围：`src/bff/routes/`（BFF 路由文件）+ `web/src/pages/`（前端页面目录）
- 勘查方式：只读 Glob/Grep/Read，未改动任何源码、未 commit、未推送
- 对标对象：行业头部上市医疗 IT 厂商 HIS-EMR 一体化产品（脱敏代称，下文统称"传统 HIS 龙头厂商"）
- 勘查基线：当前分支 `consult-agent-m86`，BFF 8080 / Vite 5173 运行中，DEMO_MODE=1

---

## 一、总体结论

当前代码库在 EMR 质控、三级检诊、病历归档、AI 辅助病历、DRG/DIP、患者体验、运营管理等"管理与智能"侧已经非常厚（`emrQc*V14`、`emrAi*V14`、`m194–m600Routes` 累计 600+ 路由文件），但在 **HIS 临床核心交易闭环**（门急诊挂号→收费→发药、住院入院→押金→医嘱→执行→出院结算、医嘱全生命周期状态机）上仍以 **列表展示 + 单点 GET 为主**，缺少"开立→审核→执行→核对→停止/撤销"的动作型 POST 端点，以及与之配套的独立前端作业页。

核心矛盾：**"看板/报表/AI 推荐"很多，"护士站、医生站、药房窗口、收费窗口"的真实作业流很薄。**

---

## 二、业务闭环盘点表

> 状态图例：✅ 已有（BFF+前端均覆盖闭环关键节点）｜🟡 部分（仅有列表/展示，缺动作端点或缺作业页）｜❌ 缺失（双侧均无）

### 1. 门急诊闭环

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| 挂号 Registration | `outpatientRegister.ts`（slots/registrations/cancellations/calling/notes）+ `m586Routes.ts`（appointments GET/POST/cancel/checkin） | `outpatient/appointment-board-m503`、`outpatient/visits`、`outpatient/visits-detail` | 🟡 | 有号源与挂号列表，但**无收费窗口的"挂号收费 + 票据打印"作业页**；无当日挂号退号退费联动 | P1 补 `outpatient/checkin` 作业页 + POST `/api/v1/outpatient/registrations/:id/refund` |
| 分诊 Triage | `queueTriage.ts`、`triageMgmtV13.ts`、`smartTriage.ts`、`emergencyTriageV13.ts` | `outpatient/triage`、`erTriage`、`er` | ✅ | 候诊/呼叫/过号/爽约/房间指引端点齐全 | — |
| 收费 Billing | `billing.ts`、`bill.ts`、`patientBilling.ts`、`inpatientBill.ts`、`m200/m225/m272/m335/m436Routes` | `billing`、`patientBilling`、`settlement` | 🟡 | 大量 GET 列表/发票/日结，**缺 POST 收费、POST 退费、POST 医保结算动作端点** | P0 补收费窗口作业页 + `/api/v1/billing/charges` POST、`/refund` POST |
| 结算 Settlement | `settlementAnalytics.ts`、`settlementDrilldown.ts`、`settlementReport.ts`、`inpatientBillingMgmtV13.ts` | `settlement`、`settlementAnalytics`、`settlementDrilldown` | 🟡 | 仅有统计看板，无"住院出院结算 + 医保对账 + 发票重打"作业流 | P1 |
| 叫号 Queue/Call | `queueTriage.ts`（calling/missed/no-show/room-guide） | `outpatient/queue`、`outpatient/queue-detail` | ✅ | 闭环完整 | — |
| 门诊药房 Outpatient Pharmacy | `outpatientPharmacyV13.ts`、`pharmacyDispense.ts`、`m260Routes`（prescriptions） | `outpatient-pharmacy`、`pharmacy-drug-delivery` | 🟡 | 有处方列表，**缺发药确认 POST、退药 POST、药袋核对双人签名端点** | P0 补 `/api/v1/pharmacy/dispense` POST、`/return` POST |

### 2. 住院闭环

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| 入院登记 Admission | `m574Routes.ts`（admission-records GET/POST/submit）+ `admissionNote.ts` | `inpatient/admissions`、`inpatient/admissions-detail` | 🟡 | 有登记/提交，**缺"床位分配确认 + 腕带打印 + 入院宣教"作业端点** | P1 |
| 押金 Deposit | `inpatientBill.ts`（`/api/v1/deposit/prepay`、`/deposit/refund`） | 无独立押金页面 | 🟡 | BFF 已有两个动作端点，**前端无押金收费/退费窗口页** | P0 补 `inpatient/deposit` 作业页 |
| 出院结算 Discharge Settlement | `dischargeSummary*.ts`、`dischargePlan.ts`、`m292/m293/m436Routes` | `inpatient/discharges`、`inpatient/discharges-detail`、`discharge` | 🟡 | 有出院小结/计划，**缺"出院当日费用结算 + 押金多退少补 + 医保结算"作业页** | P0 |
| 床位 Bed Management | `bedManagementV13.ts`、`bedMap.ts`、`wardTransfer.ts`、`bedOccupancyV13.ts` | `inpatient/wards`、`bed-management`、`bed-map` | ✅ | 床图、分配、状态、预留端点齐全 | — |
| 转科 Transfer | `wardTransfer.ts`、`inpatientTransferMgmtV13.ts`、`transferDetailV13.ts`、`transferSummaryCompletenessV13.ts` | `inpatient/transfers`、`inpatient/transfers-detail`、`transfer-detail` | ✅ | 转科申请/接收/交接单齐全 | — |

### 3. 电子病历闭环

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| 结构化病历书写 | `emrNotes.ts`、`frontPage.ts`、`progressNote.ts`、`medicalRecord*.ts`、`emrStructuredInputV14.ts`、`emrTemplate*.ts` | `emr/list`、`emr/detail`、`emr/templates`、`frontPage`、`medicalRecord` | ✅ | 首页/病程/模板/结构化输入齐全 | — |
| 三级检诊 | `threeLevelWardRoundV13.ts`、`m336Routes`（nursing/rounds） | `three-level-ward-round`、`nursing` | 🟡 | 有列表，**缺住院医/主治/主任三级签名与退回作业端点** | P1 |
| 病历质控 | `emrQc*V14`（300+ 文件）、`medicalQc.ts`、`terminalQc.ts` | `emr/quality-*` 系列 30+ 目录 | ✅ | 业界最厚，超出对标 | — |
| 病历归档 | `emrArchive*V14`、`archiveMgmtV13.ts`、`medicalRecordArchiveMgmtV13.ts` | `emr/archives`、`emr/archive-*`、`archive-board-m491` | ✅ | 归档/借阅/销毁/入库检查齐全 | — |
| 体温单 Vitals | `nursingMetrics.ts`（`/api/v1/nursing/temperature-chart/:patientId`） | **无独立体温单页面** | ❌ | BFF 仅有一个 GET 接口，**前端无体温单绘制页（含脉搏/呼吸/血压/体重/入出量/手术月经标记）** | P0 补 `nursing/vitals-chart` 页面 + 体温录入 POST |
| 医嘱单 Orders | `order.ts`、`m339Routes`、`m382Routes`、`m570Routes` | `order/`、`orders/`、`orders/active\|cancelled\|completed\|detail\|templates` | 🟡 | 详见下方"医嘱闭环"专项 | P0 |

### 4. 医嘱闭环专项（最大缺口）

当前 `order.ts` 仅 5 个端点：
- `GET /api/v1/orders`（列表）
- `POST /api/v1/orders`（开立）
- `POST /api/v1/orders/:id/cancel`（取消）
- `POST /api/v1/orders/:id/execute`（执行）
- `GET /api/v1/orders/:id/executions`（执行记录）
- 补充：`m570Routes` 加了 `POST /api/v1/orders/:id/review`（审核）

**对照"开立→审核→执行→核对→停止/撤销"六节点状态机：**

| 节点 | 端点 | 状态 |
|---|---|---|
| 开立 create | `POST /api/v1/orders` | ✅ |
| 审核 review | `POST /api/v1/orders/:id/review` | ✅（仅 m570 一处） |
| 执行 execute | `POST /api/v1/orders/:id/execute` | ✅ |
| 双人核对 verify | **缺失** | ❌ |
| 停止 stop/discontinue | **缺失**（只有 cancel 撤销，无"执行中停止"） | ❌ |
| 拒绝 reject | **缺失** | ❌ |
| 完成 complete | **缺失** | ❌ |

**建议 P0：** 在 `order.ts` 新增 `POST /api/v1/orders/:id/verify`、`/stop`、`/reject`、`/complete` 四个动作端点，并补 `web/src/pages/order/verification` 双人核对页。

### 5. 护理闭环

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| 护理记录 Nursing Document | `nursingRecord.ts`、`nursingDocumentV13.ts`、`nursingIo.ts`、`m571Routes`（nursing-records） | `nursing-document`、`nursing-document-stats`、`nursingRecordQuality` | 🟡 | 有记录列表，**缺护理记录签名/退回作业端点** | P1 |
| 护理评估 Assessment | `barthel.ts`、`cga.ts`、`painAssessment.ts`、`pressureUlserMgmtV13.ts`、`fallMgmtV13.ts`、`nursingRisk.ts` | `nursingRisk`、`barthel`、`cgaAssessment`、`painAssessment`、`pressure-ulcer` | ✅ | 评估量表齐全 | — |
| 护理计划 Plan | `aiNursingPlan.ts`、`nursingIo.ts`、`m336Routes`（nursing/plans） | `emr-ai-nursing-plan-reco`、`nursing` | 🟡 | 有 AI 推荐，**缺护理计划制定/执行/评评改作业流** | P1 |
| 执行单 Medication Admin | `medAdmin.ts`、`pdaNursing.ts`、`m438Routes`（nursing/med-admin） | `medAdmin`、`pdaNursing`（无独立目录） | 🟡 | 有 GET，**缺 PDA 扫码执行 POST 端点** | P1 |

### 6. 药剂闭环

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| 药房 Pharmacy | `pharmacy.ts`、`pharmacyDispense.ts`、`pharmacyMgmt.ts`、`m227/m260/m279/m304/m334/m367/m419/m435/m598Routes` | `pharmacy`、`pharmacy-mgmt-detail`、`pharmacy-service` | 🟡 | 列表/库存/采购/盘点齐全，**缺发药 POST、退药 POST** | P0 |
| 药库 Drug Inventory | `drugInventory.ts`、`drugInventoryMgmtV13.ts`、`drugStorageV13.ts`、`m598Routes`（receive/issue/low-stock/expiring） | `drug-inventory`、`drug-inventory-mgmt`、`pharmacy-inventory` | ✅ | 入库/出库/低库存/近效期齐全 | — |
| 摆药 Prepack | **缺失** | **缺失** | ❌ | 无住院摆药单、单剂量摆药、口服药摆药车端点 | P2 |
| 发药 Dispense | `pharmacyDispense.ts`、`m279Routes`（GET） | `pharmacy-drug-delivery` | 🟡 | 仅 GET 列表，**无发药确认 POST** | P0 |
| 退药 Drug Return | **缺失** | **缺失** | ❌ | 无退药申请、退药审核、退药入库端点 | P0 |
| 处方点评 Prescription Review | `prescriptionReview.ts`、`prescriptionReviewV7.ts`、`pharmacyPrescriptionReviewV13.ts`、`m453Routes` | `pharmacy-prescription-review`、`prescription-review-quality`、`prescription-review-stats` | ✅ | 点评/合理用药/抗菌药物分级/不良反应齐全 | — |

### 7. 检验检查闭环

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| 检验 LIS | `lis.ts`（requests→specimens collect/receive/reject→reports submit/approve/return/publish） | `lis`、`lab`、`lab-imaging`、`laboratory` | ✅ | 申请→标本→报告全闭环，最完整 | — |
| 检查 RIS/PACS | `ris.ts`、`imaging.ts`、`pacsDetail.ts`、`m196/m204/m260/m278/m337/m380/m403/m438pacsRoutes` | `ris`、`pacs`、`imaging`、`radiology`、`interpret` | ✅ | 登记/序列/阳性率/质控/危急发现齐全 | — |
| 危急值 Critical Value | `criticalValue*.ts`、`criticalValueClosure.ts`、`criticalValueDetailV13.ts`、`m550Routes`（GET/POST/ack） | `critical-value-detail`、`critical-value-mgmt` | ✅ | 上报→接收→确认→闭环齐全 | — |

### 8. 手术麻醉闭环

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| 手术申请/排班 Surgery | `surgery.ts`、`surgerySchedule.ts`、`surgeryProcessV13.ts`、`m210/m223/m230/m336/m402/m560Routes`（GET/POST/cancel） | `surgery`、`surgery-process`、`surgery-volume` | ✅ | 申请/排班/取消/排班详情齐全 | — |
| 麻醉记录 Anesthesia | `anesthesia.ts`、`anesthesiaDeep.ts`、`anesthesiaRecordMgmtV13.ts`、`m293/m380/m402/m565Routes`（GET/POST/recover） | `anesthesia`、`anesthesia-record-mgmt`、`anesthesia-detail` | ✅ | 术前评估/术中记录/术后恢复齐全 | — |
| 手术室 Operating Room | `operatingRoomV13.ts`、`operationRoomMgmtV13.ts`、`operatingRoomQualityMgmtV13.ts`、`otSchedulingConflictV13.ts` | `operating-room`、`operation` | ✅ | 房间/排班/冲突检测齐全 | — |
| PACU 复苏 | `pacuRecord.ts`、`m454Routes`（surgery/pacu）、`m565Routes`（anesthesia-records/:id/recover） | `pacu`、`pacuRecord` | ✅ | 复苏记录/评分齐全 | — |

### 9. ICU 闭环

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| ICU 监护 | `icuCareMgmtV13.ts`、`icuMgmtV13.ts`、`icuStatsMgmtV13.ts`、`m212/m230/m288/m293/m414/m581Routes`（GET/POST） | `icu`、`icu-mgmt`、`icu-care-mgmt`、`icu-occupancy`、`icu-stats-mgmt` | ✅ | 入科/监护/出科/呼吸机/镇静齐全 | — |
| 镇静镇痛 | `icuSedation.ts`、`m531Routes`（icu-sedations GET/POST） | `icuSedation` | ✅ | — | — |

### 10. 输血 / 感染控制 / 合理用药

| 子功能 | BFF 路由文件 | 前端页面目录 | 状态 | 缺口描述 | 建议 |
|---|---|---|---|---|---|
| 输血 Blood Bank | `bloodTransfusion.ts`、`bloodTransfusionMgmtV13.ts`、`transfusionManagement.ts`、`transfusionReaction.ts`、`m207/m212/m260/m279/m519/m555Routes` | `blood-bank`、`blood-transfusion`、`transfusion`、`blood` | ✅ | 申请/交叉配血/发血/反应/追溯齐全 | — |
| 感染控制 | `infectionControl.ts`、`infectionControlV13.ts`、`hospitalInfectionSurveillanceV13.ts`、`nosocomialInfectionV13.ts`、`isolationMgmtV13.ts` | `infection`、`infection-control`、`infection-surveillance` | ✅ | 监测/暴发/隔离/手卫生齐全 | — |
| 合理用药 Rational Med | `rationalDrugUse.ts`、`rationalDrugUseStatsV13.ts`、`clinicalPharmacyV13.ts`、`m453Routes`（prescription-review/rational-monitor/abx-grading） | `clinical-pharmacy`、`essential-drug`、`high-alert-med-mgmt` | ✅ | 监控/抗菌分级/高危药品齐全 | — |

---

## 三、P0 必补清单（共 12 项，按优先级）

> 每项给出建议新增的 BFF 路由文件路径 + 前端页面目录路径。所有新增须 DEMO_MODE=1 内存演示数据，不依赖 PostgreSQL/Redis/LLM。

| # | 业务切片 | BFF 路由文件（建议路径） | 前端页面目录（建议路径） | 关键动作端点 |
|---|---|---|---|---|
| 1 | 医嘱闭环状态机补全 | `src/bff/routes/orderVerify.ts`（或扩展 `order.ts`） | `web/src/pages/order/verification` | `POST /api/v1/orders/:id/verify`、`/stop`、`/reject`、`/complete` |
| 2 | 门诊收费窗口作业 | `src/bff/routes/billingCharge.ts` | `web/src/pages/billing/window` | `POST /api/v1/billing/charges`、`/refund`、`/receipt` |
| 3 | 门诊药房发药/退药 | `src/bff/routes/pharmacyDispense.ts`（扩展） | `web/src/pages/outpatient-pharmacy/dispense` | `POST /api/v1/pharmacy/dispense/confirm`、`/return` |
| 4 | 住院押金窗口 | 复用 `inpatientBill.ts` 端点 | `web/src/pages/inpatient/deposit` | 押金收取/退费/台账查询作业页 |
| 5 | 出院结算窗口 | `src/bff/routes/dischargeSettle.ts` | `web/src/pages/inpatient/discharge-settle` | `POST /api/v1/discharge/settle`、`/refund`、`/reprint` |
| 6 | 体温单录入与绘制 | `src/bff/routes/vitalsChart.ts` | `web/src/pages/nursing/vitals-chart` | `GET /api/v1/vitals/:patientId`、`POST /api/v1/vitals` |
| 7 | 住院摆药单 | `src/bff/routes/pharmacyPrepack.ts` | `web/src/pages/pharmacy/prepack` | `GET /api/v1/pharmacy/prepack/tasks`、`POST /:id/done` |
| 8 | 退药入库 | `src/bff/routes/pharmacyReturn.ts` | `web/src/pages/pharmacy/return` | `POST /api/v1/pharmacy/return`、`/audit`、`/stock-in` |
| 9 | 入院登记作业（床位分配+腕带） | `src/bff/routes/admissionCheckin.ts` | `web/src/pages/inpatient/checkin` | `POST /api/v1/admissions/:id/assign-bed`、`/wristband` |
| 10 | 三级检诊签名 | `src/bff/routes/wardRoundSign.ts` | `web/src/pages/three-level-ward-round/sign` | `POST /api/v1/ward-rounds/:id/sign`、`/return` |
| 11 | PDA 服药执行 | `src/bff/routes/pdaMedAdmin.ts` | `web/src/pages/medAdmin/scan` | `POST /api/v1/med-admin/scan`、`/:id/confirm` |
| 12 | 挂号退号退费联动 | `src/bff/routes/registerRefund.ts` | `web/src/pages/outpatient/register-refund` | `POST /api/v1/outpatient/registrations/:id/refund` |

---

## 四、自验

- 本次勘查未修改任何源码，未执行 `git add` / `commit` / `push`。
- 报告内对所有对标厂商相关敏感词均采用脱敏代称（行业头部上市医疗 IT 厂商 / 传统 HIS 龙头厂商），品牌硬违规词全部 0 命中。
- 产品名统一为"健澜AI原生医院操作系统OS"，未使用任何历史错误别名。
- 所有路径均为仓库内真实存在或建议新增路径，未虚构。
