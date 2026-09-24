# 医疗工具 Mock → PostgreSQL 改造对照清单

> 健澜科技数智医院智能体（jlmedaios）
> 新增统一数据访问层：`src/data/clinicalData.ts`
> 运行模式：`process.env.DEMO_MODE=1`（或 `true`）走内存 Mock；缺省走真实 PostgreSQL Repository。

## 一、改造原则

1. **数据源门面化**：所有工具不再直接 `import { MOCK_* } from '../mockData.js'`，改从 `src/data/clinicalData.ts` 的 `clinicalData` 门面取数。
2. **对外契约不变**：DB 行在门面层映射成与 Mock 完全一致的 DTO（中文字段名/枚举值），工具层的过滤、排序、输出字段保持原样。
3. **写操作闭环**：开医嘱/处方/病历在真实模式落到 Repository（事务内），演示模式追加到门面内存存储，保证「写入→查询」两种模式都通。
4. **不静默造假**：真实模式下 DB 连接/查询失败直接抛错；DB 未建模的字段（身份证/手机/地址明文、生命体征）留空，不编造。
5. **来源标注**：P0/P1 真实/演示返回统一带 `_source: 'database' | 'demo'`；P2 运营/质控/患者服务类带 `_demoMode: true`。
6. **未改动 `src/db/` 下任何既有文件**，直接复用已建好的 Repository。

## 二、P0（已全部改为真实库读写，闭环）

| 工具 | 数据源改造 | 落库 |
|---|---|---|
| patient/queryPatient | `clinicalData.searchPatients` → patientRepo.queryPatients | 只读 |
| patient/getPatientDetail | `clinicalData.getPatient` → patientRepo + visits + 在用药品 | 只读 |
| patient/getPatientHistory | `clinicalData.getVisitsByPatient` → visitRepo | 只读 |
| order/createOrder | 患者校验 `clinicalData.getPatient`；写 `clinicalData.createOrder` | orderRepo.createOrder |
| order/getOrderList | `clinicalData.getOrders` → orderRepo.getOrdersByVisit/ByPatient | 只读 |
| order/cancelOrder | `clinicalData.findOrderDto` + `clinicalData.cancelOrder` | orderRepo.cancelOrder |
| order/orderAudit | `clinicalData.findOrderDto` + `clinicalData.updateOrderStatus`；CDS 规则走门面出口 | orderRepo.updateOrderStatus |
| pharmacy/createPrescription | `clinicalData.getPatient` + `clinicalData.createPrescription` | prescriptionRepo.createPrescription |
| pharmacy/getPrescriptionList | `clinicalData.getPrescriptions` → prescriptionRepo.getPrescriptionsByVisit | 只读 |
| pharmacy/prescriptionAudit | 演示改内存流转 / 真实 `clinicalData.auditPrescription` | prescriptionRepo.auditPrescription |
| pharmacy/getDrugInfo | 本地说明书库 + 真实模式 `clinicalData.searchDrugs` 核对本院目录 | 只读 |
| emr/generateMedicalRecord | 患者取数 + `clinicalData.createMedicalRecord`（草稿态） | medicalRecordRepo.createMedicalRecord |
| emr/getMedicalRecord | `clinicalData.getMedicalRecords` → medicalRecordRepo.getByVisit | 只读 |
| lab/getLabResult | `clinicalData.getLabReports` → labResultRepo（按 panel 聚合） | 只读 |
| lab/orderLabTest | 患者校验 + `clinicalData.createOrder(orderType='lab')` | orderRepo.createOrder |

## 三、P1（已改造，基于真实处方/药品/检验数据）

| 工具 | 改造说明 |
|---|---|
| lab/getImageReport | 演示走 MOCK_IMAGE_REPORTS；真实模式按 imaging 医嘱生成报告壳（不编造诊断，标注"待 PACS 回传"） |
| lab/orderImagingExam | 患者取 `clinicalData.getPatient`；肾功能经 `clinicalData.getLabReports` 取肌酐；落 `orderRepo`（orderType='imaging'） |
| cds/drugInteractionCheck | 相互作用规则经 `clinicalData.getDrugInteractionRules`；患者因素走 `clinicalData.getPatient` |
| cds/criticalValueAlert | 基于调用方传入的真实检验结果跑 CDS 规则引擎（未直接读 Mock） |
| cds/getDrugInformation | 说明书知识库 + 真实模式 `clinicalData.searchDrugs` 核对本院目录 |

## 四、P2（保留 Mock，已标注 `_demoMode: true`）

| 工具/目录 | 说明 |
|---|---|
| patient-service/appointmentRegistration | 号源/排班内存，标注 `_demoMode` |
| patient-service/followUpManagement | 随访计划内存，标注 `_demoMode` |
| patient-service/visitReminder | 预约/随访提醒内存，标注 `_demoMode` |
| integration/fetchFromEMR | EMR 适配器优先 + Mock 回退，自带 source 字段 + `_demoMode` |
| integration/syncToHIS | HIS 适配器优先 + Mock 回退，自带 source 字段 + `_demoMode` |
| emr/getMedicalTemplate | 病历模板库，标注 `_demoMode` |
| operations/*（运营分析、DRG/DIP、质量指标） | 运营/质控看板，内置演示数据，后续对接数仓/BI |
| quality/*（病历质检、首页校验、核心系统检查） | 质控规则演示数据，后续接质检引擎 |
| cds/diagnosisSuggestion、treatmentPlanSuggestion、searchMedicalKnowledge | CDS 知识库推理，非记录型数据 |
| lab/viewDicom | DICOM 影像元数据演示，后续接 PACS |

## 五、关键映射（门面层）

- DB 英文枚举 ↔ 工具中文：`drug→药品 / lab→检验 / imaging→检查`，`active→执行中 / executed→已完成 / cancelled→已取消`，`routine/urgent/stat→普通/急/即刻`。
- 患者标识：工具传入的 `patientId` 兼容 DB 主键（UUID）与病历号（mrn），门面 `resolvePatientId` 先按主键、再按 mrn 解析。
- 写操作返回的对外 ID 即真实行主键（医嘱/处方/病历），保证后续按 ID 查询/取消/审核一致。

## 六、验收

- `bunx tsc --noEmit`：**0 错误**。
- P0 工具 grep 确认不再直接 `import { MOCK_* } from '../mockData.js'`（剩余直接 import 均为上表 P2 文件）。
- 闭环：createOrder→getOrderList 可见；createPrescription→prescriptionAudit 状态流转；generateMedicalRecord→getMedicalRecord 可见。
- `DEMO_MODE=1` 全量走 Mock 后备，系统可运行。
