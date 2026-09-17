/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗工具 API：对应 36 个医疗工具，统一入口 POST /medical/:toolName
 */
import { post } from '../request';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import { medicalToolResults, fallbackToolResult, type ToolResult } from '@/mock/medical';

/** 调用任一医疗工具 */
export async function callTool<T = unknown>(
  toolName: string,
  params: Record<string, unknown> = {},
): Promise<ToolResult<T>> {
  if (env.mockEnabled) {
    await delay(150, 350);
    return (medicalToolResults[toolName] ?? fallbackToolResult(toolName)) as ToolResult<T>;
  }
  return post<ToolResult<T>>(`/medical/${toolName}`, params);
}

/** 36 个工具的便捷封装 */
export const medicalApi = {
  queryPatient: (p: Record<string, unknown>) => callTool('query_patient', p),
  getPatientDetail: (patientId: string) => callTool('get_patient_detail', { patientId }),
  getPatientHistory: (patientId: string) => callTool('get_patient_history', { patientId }),
  getMedicalRecord: (recordId: string) => callTool('get_medical_record', { recordId }),
  generateMedicalRecord: (p: Record<string, unknown>) => callTool('generate_medical_record', p),
  medicalRecordQA: (p: Record<string, unknown>) => callTool('medical_record_qa', p),
  getMedicalTemplate: (type: string) => callTool('get_medical_template', { type }),
  getOrderList: (p: Record<string, unknown>) => callTool('get_order_list', p),
  createOrder: (p: Record<string, unknown>) => callTool('create_order', p),
  cancelOrder: (p: Record<string, unknown>) => callTool('cancel_order', p),
  orderAudit: (p: Record<string, unknown>) => callTool('order_audit', p),
  getLabResult: (p: Record<string, unknown>) => callTool('get_lab_result', p),
  orderLabTest: (p: Record<string, unknown>) => callTool('order_lab_test', p),
  getImageReport: (p: Record<string, unknown>) => callTool('get_image_report', p),
  orderImagingExam: (p: Record<string, unknown>) => callTool('order_imaging_exam', p),
  viewDicom: (studyUid: string) => callTool('view_dicom', { studyUid }),
  createPrescription: (p: Record<string, unknown>) => callTool('create_prescription', p),
  prescriptionAudit: (p: Record<string, unknown>) => callTool('prescription_audit', p),
  getPrescriptionList: (p: Record<string, unknown>) => callTool('get_prescription_list', p),
  getDrugInfo: (drugName: string) => callTool('get_drug_info', { drugName }),
  diagnosisSuggestion: (p: Record<string, unknown>) => callTool('diagnosis_suggestion', p),
  treatmentPlanSuggestion: (p: Record<string, unknown>) => callTool('treatment_plan_suggestion', p),
  criticalValueAlert: (p: Record<string, unknown>) => callTool('critical_value_alert', p),
  drugInteractionCheck: (p: Record<string, unknown>) => callTool('drug_interaction_check', p),
  medicalRecordQualityCheck: (p: Record<string, unknown>) =>
    callTool('medical_record_quality_check', p),
  medicalRecordFrontPageCheck: (p: Record<string, unknown>) =>
    callTool('medical_record_front_page_check', p),
  coreSystemCheck: (p: Record<string, unknown>) => callTool('core_system_check', p),
  appointmentRegistration: (p: Record<string, unknown>) => callTool('appointment_registration', p),
  visitReminder: (p: Record<string, unknown>) => callTool('visit_reminder', p),
  followUpManagement: (p: Record<string, unknown>) => callTool('follow_up_management', p),
  departmentOperationAnalysis: (p: Record<string, unknown>) =>
    callTool('department_operation_analysis', p),
  medicalQualityIndicators: (p: Record<string, unknown>) =>
    callTool('medical_quality_indicators', p),
  drgDipAnalysis: (p: Record<string, unknown>) => callTool('drg_dip_analysis', p),
  syncToHIS: (p: Record<string, unknown>) => callTool('sync_to_his', p),
  fetchFromEMR: (p: Record<string, unknown>) => callTool('fetch_from_emr', p),
  hl7MessageSend: (p: Record<string, unknown>) => callTool('hl7_message_send', p),
};
