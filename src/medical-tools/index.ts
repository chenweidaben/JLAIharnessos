/**
 * 健澜科技数智医院智能体 - 医疗工具统一导出
 *
 * 第一批12个医疗专用工具的统一入口。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 类型与框架导出
// ============================================================================

export {
  buildMedicalTool,
  DefaultMedicalToolRegistry,
  executeToolWithSafety,
  maskAddress,
  maskIdCard,
  maskName,
  maskPhone,
  MedicalAgentError,
} from './framework.js';
export * from './types.js';

// ============================================================================
// 注册与导出
// ============================================================================

export {
  createRegistryWithFirstBatch,
  FIRST_BATCH_TOOLS,
  registerFirstBatchTools,
} from './registry.js';

// ============================================================================
// 患者管理工具（3个）
// ============================================================================

export type {
  GetPatientDetailInputType,
  GetPatientDetailOutputType,
} from './patient/getPatientDetail.js';
export { getPatientDetailTool } from './patient/getPatientDetail.js';
export type {
  GetPatientHistoryInputType,
  GetPatientHistoryOutputType,
} from './patient/getPatientHistory.js';
export { getPatientHistoryTool } from './patient/getPatientHistory.js';
export type { QueryPatientInputType, QueryPatientOutputType } from './patient/queryPatient.js';
export { queryPatientTool } from './patient/queryPatient.js';

// ============================================================================
// 电子病历工具（4个）
// ============================================================================

export type {
  GenerateMedicalRecordInputType,
  GenerateMedicalRecordOutputType,
} from './emr/generateMedicalRecord.js';
export { generateMedicalRecordTool } from './emr/generateMedicalRecord.js';
export type {
  GetMedicalRecordInputType,
  GetMedicalRecordOutputType,
} from './emr/getMedicalRecord.js';
export { getMedicalRecordTool } from './emr/getMedicalRecord.js';
export type {
  GetMedicalTemplateInputType,
  GetMedicalTemplateOutputType,
} from './emr/getMedicalTemplate.js';
export { getMedicalTemplateTool } from './emr/getMedicalTemplate.js';
export type { MedicalRecordQaInputType, MedicalRecordQaOutputType } from './emr/medicalRecordQA.js';
export { medicalRecordQaTool } from './emr/medicalRecordQA.js';

// ============================================================================
// 医嘱管理工具（2个）
// ============================================================================

export type { CreateOrderInputType, CreateOrderOutputType } from './order/createOrder.js';
export { createOrderTool } from './order/createOrder.js';
export type { GetOrderListInputType, GetOrderListOutputType } from './order/getOrderList.js';
export { getOrderListTool } from './order/getOrderList.js';

// ============================================================================
// 检验检查工具（2个）
// ============================================================================

export type { GetImageReportInputType, GetImageReportOutputType } from './lab/getImageReport.js';
export { getImageReportTool } from './lab/getImageReport.js';
export type { GetLabResultInputType, GetLabResultOutputType } from './lab/getLabResult.js';
export { getLabResultTool } from './lab/getLabResult.js';

// ============================================================================
// 临床决策支持工具（1个）
// ============================================================================

export type {
  DrugInteractionCheckInputType,
  DrugInteractionCheckOutputType,
} from './cds/drugInteractionCheck.js';
export { drugInteractionCheckTool } from './cds/drugInteractionCheck.js';

// ============================================================================
// 临床决策支持工具（新增 3 个）
// ============================================================================

export type {
  CriticalValueAlertInputType,
  CriticalValueAlertOutputType,
} from './cds/criticalValueAlert.js';
export { criticalValueAlertTool } from './cds/criticalValueAlert.js';
export type {
  DiagnosisSuggestionInputType,
  DiagnosisSuggestionOutputType,
} from './cds/diagnosisSuggestion.js';
export { diagnosisSuggestionTool } from './cds/diagnosisSuggestion.js';
export type {
  TreatmentPlanSuggestionInputType,
  TreatmentPlanSuggestionOutputType,
} from './cds/treatmentPlanSuggestion.js';
export { treatmentPlanSuggestionTool } from './cds/treatmentPlanSuggestion.js';

// ============================================================================
// 质控与管理工具（3 个）
// ============================================================================

export type {
  CoreSystemCheckInputType,
  CoreSystemCheckOutputType,
} from './quality/coreSystemCheck.js';
export {
  coreSystemCheckTool,
  medicalRecordFrontPageCheckTool,
  medicalRecordQualityCheckTool,
} from './quality/index.js';
export type {
  MedicalRecordFrontPageCheckInputType,
  MedicalRecordFrontPageCheckOutputType,
} from './quality/medicalRecordFrontPageCheck.js';
export type {
  MedicalRecordQualityCheckInputType,
  MedicalRecordQualityCheckOutputType,
} from './quality/medicalRecordQualityCheck.js';

// ============================================================================
// 医嘱管理新增工具（2 个）
// ============================================================================

export type { CancelOrderInputType, CancelOrderOutputType } from './order/cancelOrder.js';
export { cancelOrderTool } from './order/cancelOrder.js';
export type { OrderAuditInputType, OrderAuditOutputType } from './order/orderAudit.js';
export { orderAuditTool } from './order/orderAudit.js';

// ============================================================================
// 检验检查新增工具（3 个）
// ============================================================================

export type {
  OrderImagingExamInputType,
  OrderImagingExamOutputType,
} from './lab/orderImagingExam.js';
export { orderImagingExamTool } from './lab/orderImagingExam.js';
export type { OrderLabTestInputType, OrderLabTestOutputType } from './lab/orderLabTest.js';
export { orderLabTestTool } from './lab/orderLabTest.js';
export type { ViewDicomInputType, ViewDicomOutputType } from './lab/viewDicom.js';
export { viewDicomTool } from './lab/viewDicom.js';

// ============================================================================
// 系统集成工具（3 个）
// ============================================================================

export type { FetchFromEMRInputType, FetchFromEMROutputType } from './integration/fetchFromEMR.js';
export { fetchFromEmrTool } from './integration/fetchFromEMR.js';
export type {
  Hl7MessageSendInputType,
  Hl7MessageSendOutputType,
} from './integration/hl7MessageSend.js';
export { hl7MessageSendTool } from './integration/hl7MessageSend.js';
export type { SyncToHISInputType, SyncToHISOutputType } from './integration/syncToHIS.js';
export { syncToHisTool } from './integration/syncToHIS.js';

// ============================================================================
// 处方药品类工具（4个）
// ============================================================================

export type {
  CreatePrescriptionInputType,
  CreatePrescriptionOutputType,
} from './pharmacy/createPrescription.js';
export { createPrescriptionTool } from './pharmacy/createPrescription.js';
export type { GetDrugInfoInputType, GetDrugInfoOutputType } from './pharmacy/getDrugInfo.js';
export { getDrugInfoTool } from './pharmacy/getDrugInfo.js';
export type {
  GetPrescriptionListInputType,
  GetPrescriptionListOutputType,
} from './pharmacy/getPrescriptionList.js';
export { getPrescriptionListTool } from './pharmacy/getPrescriptionList.js';
export type {
  PrescriptionAuditInputType,
  PrescriptionAuditOutputType,
} from './pharmacy/prescriptionAudit.js';
export { prescriptionAuditTool } from './pharmacy/prescriptionAudit.js';

// ============================================================================
// 患者服务类工具（3个）
// ============================================================================

export type {
  AppointmentRegistrationInputType,
  AppointmentRegistrationOutputType,
} from './patient-service/appointmentRegistration.js';
export { appointmentRegistrationTool } from './patient-service/appointmentRegistration.js';
export type {
  FollowUpManagementInputType,
  FollowUpManagementOutputType,
} from './patient-service/followUpManagement.js';
export { followUpManagementTool } from './patient-service/followUpManagement.js';
export type {
  VisitReminderInputType,
  VisitReminderOutputType,
} from './patient-service/visitReminder.js';
export { visitReminderTool } from './patient-service/visitReminder.js';

// ============================================================================
// 运营管理类工具（3个）
// ============================================================================

export type {
  DepartmentOperationAnalysisInputType,
  DepartmentOperationAnalysisOutputType,
} from './operations/departmentOperationAnalysis.js';
export { departmentOperationAnalysisTool } from './operations/departmentOperationAnalysis.js';
export type {
  DrgDipAnalysisInputType,
  DrgDipAnalysisOutputType,
} from './operations/drgDipAnalysis.js';
export { drgDipAnalysisTool } from './operations/drgDipAnalysis.js';
export type {
  MedicalQualityIndicatorsInputType,
  MedicalQualityIndicatorsOutputType,
} from './operations/medicalQualityIndicators.js';
export { medicalQualityIndicatorsTool } from './operations/medicalQualityIndicators.js';
