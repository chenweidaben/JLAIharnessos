/**
 * 健澜科技数智医院智能体 - 医疗工具注册
 *
 * 提供医疗工具注册函数，将第一批12个医疗工具注册到MedicalToolRegistry。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { criticalValueAlertTool } from './cds/criticalValueAlert.js';
import { diagnosisSuggestionTool } from './cds/diagnosisSuggestion.js';
// 临床决策支持工具
import { drugInteractionCheckTool } from './cds/drugInteractionCheck.js';
import { getDrugInformationTool } from './cds/getDrugInformation.js';
import { searchMedicalKnowledgeTool } from './cds/searchMedicalKnowledge.js';
import { treatmentPlanSuggestionTool } from './cds/treatmentPlanSuggestion.js';
import { generateMedicalRecordTool } from './emr/generateMedicalRecord.js';
// 电子病历工具
import { getMedicalRecordTool } from './emr/getMedicalRecord.js';
import { getMedicalTemplateTool } from './emr/getMedicalTemplate.js';
import { medicalRecordQaTool } from './emr/medicalRecordQA.js';
import { DefaultMedicalToolRegistry } from './framework.js';
import { fetchFromEmrTool } from './integration/fetchFromEMR.js';
import { hl7MessageSendTool } from './integration/hl7MessageSend.js';
// 系统集成工具
import { syncToHisTool } from './integration/syncToHIS.js';
import { getImageReportTool } from './lab/getImageReport.js';
// 检验检查工具
import { getLabResultTool } from './lab/getLabResult.js';
import { orderImagingExamTool } from './lab/orderImagingExam.js';
import { orderLabTestTool } from './lab/orderLabTest.js';
import { viewDicomTool } from './lab/viewDicom.js';
// 运营管理类工具
import { departmentOperationAnalysisTool } from './operations/departmentOperationAnalysis.js';
import { drgDipAnalysisTool } from './operations/drgDipAnalysis.js';
import { medicalQualityIndicatorsTool } from './operations/medicalQualityIndicators.js';
import { cancelOrderTool } from './order/cancelOrder.js';
import { createOrderTool } from './order/createOrder.js';
// 医嘱管理工具
import { getOrderListTool } from './order/getOrderList.js';
import { orderAuditTool } from './order/orderAudit.js';
import { getPatientDetailTool } from './patient/getPatientDetail.js';
import { getPatientHistoryTool } from './patient/getPatientHistory.js';
// 患者管理工具
import { queryPatientTool } from './patient/queryPatient.js';
// 患者服务类工具
import { appointmentRegistrationTool } from './patient-service/appointmentRegistration.js';
import { followUpManagementTool } from './patient-service/followUpManagement.js';
import { visitReminderTool } from './patient-service/visitReminder.js';
// 处方药品类工具
import { createPrescriptionTool } from './pharmacy/createPrescription.js';
import { getDrugInfoTool } from './pharmacy/getDrugInfo.js';
import { getPrescriptionListTool } from './pharmacy/getPrescriptionList.js';
import { prescriptionAuditTool } from './pharmacy/prescriptionAudit.js';
import { coreSystemCheckTool } from './quality/coreSystemCheck.js';
import { medicalRecordFrontPageCheckTool } from './quality/medicalRecordFrontPageCheck.js';
// 质控与管理工具
import { medicalRecordQualityCheckTool } from './quality/medicalRecordQualityCheck.js';
import type { MedicalToolDefinition, MedicalToolRegistry } from './types.js';

// ============================================================================
// 第一批工具列表
// ============================================================================

/** 第一批12个医疗工具 */
export const FIRST_BATCH_TOOLS: MedicalToolDefinition[] = [
  // 患者管理（3个）
  queryPatientTool,
  getPatientDetailTool,
  getPatientHistoryTool,

  // 电子病历（4个）
  getMedicalRecordTool,
  generateMedicalRecordTool,
  medicalRecordQaTool,
  getMedicalTemplateTool,

  // 医嘱管理（2个）
  getOrderListTool,
  createOrderTool,

  // 检验检查（2个）
  getLabResultTool,
  getImageReportTool,

  // 临床决策支持（6个）
  drugInteractionCheckTool,
  diagnosisSuggestionTool,
  treatmentPlanSuggestionTool,
  criticalValueAlertTool,
  searchMedicalKnowledgeTool,
  getDrugInformationTool,

  // 质控与管理（3个）
  medicalRecordQualityCheckTool,
  medicalRecordFrontPageCheckTool,
  coreSystemCheckTool,

  // 处方药品类（4个）
  createPrescriptionTool,
  prescriptionAuditTool,
  getPrescriptionListTool,
  getDrugInfoTool,

  // 患者服务类（3个）
  appointmentRegistrationTool,
  visitReminderTool,
  followUpManagementTool,

  // 运营管理类（3个）
  departmentOperationAnalysisTool,
  medicalQualityIndicatorsTool,
  drgDipAnalysisTool,

  // 医嘱管理新增（2个）
  cancelOrderTool,
  orderAuditTool,

  // 检验检查新增（3个）
  orderLabTestTool,
  orderImagingExamTool,
  viewDicomTool,

  // 系统集成（3个）
  syncToHisTool,
  fetchFromEmrTool,
  hl7MessageSendTool,
];

// ============================================================================
// 注册函数
// ============================================================================

/**
 * 注册第一批医疗工具到指定的注册表
 *
 * @param registry - 医疗工具注册表实例
 * @returns 注册后的注册表（支持链式调用）
 *
 * @example
 * ```typescript
 * const registry = new DefaultMedicalToolRegistry();
 * registerFirstBatchTools(registry);
 * console.log(`已注册 ${registry.size} 个工具`);
 * ```
 */
export function registerFirstBatchTools(registry: MedicalToolRegistry): MedicalToolRegistry {
  for (const tool of FIRST_BATCH_TOOLS) {
    registry.register(tool);
  }
  return registry;
}

/**
 * 创建并注册第一批医疗工具，返回新的注册表实例
 *
 * @returns 已注册第一批工具的注册表
 *
 * @example
 * ```typescript
 * const registry = createRegistryWithFirstBatch();
 * const tool = registry.get('query_patient');
 * ```
 */
export function createRegistryWithFirstBatch(): MedicalToolRegistry {
  const registry = new DefaultMedicalToolRegistry();
  return registerFirstBatchTools(registry);
}
