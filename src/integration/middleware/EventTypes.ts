/**
 * 健澜科技数智医院智能体 - integration/middleware/EventTypes.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 集成事件类型定义
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 定义系统集成中使用的事件类型及其payload结构。
 * 事件通过集成消息总线（IntegrationBus）进行发布/订阅。
 *
 * @module integration/middleware/EventTypes
 */

import type { EventPriority } from '../types';

// ============================================================
// 事件类型常量
// ============================================================

/** 集成事件类型 */
export const IntegrationEventType = {
  // 患者事件
  PATIENT_ADMITTED: 'patient.admitted',
  PATIENT_DISCHARGED: 'patient.discharged',
  PATIENT_TRANSFERRED: 'patient.transferred',
  PATIENT_REGISTERED: 'patient.registered',
  PATIENT_UPDATED: 'patient.updated',

  // 医嘱事件
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',

  // 检验事件
  LAB_RESULT_READY: 'lab.result.ready',
  LAB_CRITICAL_VALUE: 'lab.critical_value',
  LAB_ORDER_CREATED: 'lab.order.created',

  // 影像事件
  IMAGING_REPORT_READY: 'imaging.report.ready',
  IMAGING_EXAM_COMPLETED: 'imaging.exam.completed',
  IMAGING_AI_RESULT_READY: 'imaging.ai.result_ready',

  // 病历事件
  EMR_RECORD_CREATED: 'emr.record.created',
  EMR_RECORD_UPDATED: 'emr.record.updated',
  EMR_RECORD_SIGNED: 'emr.record.signed',
  EMR_RECORD_ARCHIVED: 'emr.record.archived',

  // 费用事件
  BILLING_CHARGED: 'billing.charged',
  BILLING_SETTLED: 'billing.settled',
  INSURANCE_SETTLED: 'insurance.settled',

  // 处方/手术事件
  PRESCRIPTION_REVIEWED: 'prescription.reviewed',
  SURGERY_SCHEDULED: 'surgery.scheduled',

  // 质控事件
  QC_ALERT: 'qc.alert',

  // 系统事件
  SYSTEM_ERROR: 'system.error',
  ADAPTER_STATUS_CHANGED: 'adapter.status_changed',
} as const;

export type IntegrationEventTypeValue =
  (typeof IntegrationEventType)[keyof typeof IntegrationEventType];

// ============================================================
// 事件Payload定义
// ============================================================

/** 患者入院事件Payload */
export interface PatientAdmittedPayload {
  patientId: string;
  patientName: string;
  encounterId: string;
  department: string;
  departmentCode?: string;
  ward?: string;
  bedNo?: string;
  attendingDoctor?: string;
  admittingDiagnosis?: string;
  admittedAt: string;
  encounterType: 'inpatient' | 'emergency' | 'observation';
}

/** 患者出院事件Payload */
export interface PatientDischargedPayload {
  patientId: string;
  patientName: string;
  encounterId: string;
  department: string;
  dischargeDiagnosis?: string;
  dischargeDisposition?: string;
  dischargedAt: string;
  attendingDoctor?: string;
}

/** 患者转科事件Payload */
export interface PatientTransferredPayload {
  patientId: string;
  patientName: string;
  encounterId: string;
  fromDepartment: string;
  toDepartment: string;
  fromBedNo?: string;
  toBedNo?: string;
  transferredAt: string;
  reason?: string;
}

/** 患者挂号事件Payload */
export interface PatientRegisteredPayload {
  patientId: string;
  patientName: string;
  encounterId: string;
  department: string;
  doctorName?: string;
  visitType: 'outpatient' | 'emergency';
  registeredAt: string;
  queueNo?: string;
}

/** 医嘱创建事件Payload */
export interface OrderCreatedPayload {
  orderId: string;
  hisOrderId?: string;
  patientId: string;
  encounterId?: string;
  orderType: 'drug' | 'examination' | 'lab' | 'treatment' | 'nursing' | 'other';
  orderName: string;
  orderedBy: string;
  orderedAt: string;
  urgency?: 'routine' | 'urgent' | 'stat';
}

/** 医嘱完成事件Payload */
export interface OrderCompletedPayload {
  orderId: string;
  hisOrderId?: string;
  patientId: string;
  encounterId?: string;
  orderType: string;
  orderName: string;
  completedAt: string;
  completedBy?: string;
  resultSummary?: string;
}

/** 医嘱取消事件Payload */
export interface OrderCancelledPayload {
  orderId: string;
  hisOrderId?: string;
  patientId: string;
  encounterId?: string;
  cancelledAt: string;
  cancelledBy?: string;
  reason: string;
}

/** 检验结果就绪事件Payload */
export interface LabResultReadyPayload {
  reportId: string;
  patientId: string;
  encounterId?: string;
  orderId?: string;
  reportType: string;
  reportStatus: 'preliminary' | 'final' | 'amended';
  reportedAt: string;
  reportedBy: string;
  abnormalCount: number;
  criticalCount: number;
  resultSummary?: string;
}

/** 检验危急值事件Payload */
export interface LabCriticalValuePayload {
  eventId: string;
  patientId: string;
  patientName: string;
  encounterId?: string;
  orderId?: string;
  reportId: string;
  testItemCode: string;
  testItemName: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  criticalLow?: string;
  criticalHigh?: string;
  reportedAt: string;
  reportedBy: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  clinicalSuggestion?: string;
}

/** 影像报告就绪事件Payload */
export interface ImagingReportReadyPayload {
  reportId: string;
  examId: string;
  patientId: string;
  encounterId?: string;
  modality: string;
  bodyPart: string;
  examName: string;
  reportStatus: 'preliminary' | 'final' | 'amended';
  reportedAt: string;
  radiologist: string;
  impression?: string;
  keyFindings?: string;
}

/** 病历创建事件Payload */
export interface EmrRecordCreatedPayload {
  recordId: string;
  patientId: string;
  encounterId: string;
  recordType: string;
  recordTypeName: string;
  title: string;
  createdBy: string;
  createdAt: string;
  aiGenerated?: boolean;
}

/** 病历签名事件Payload */
export interface EmrRecordSignedPayload {
  recordId: string;
  patientId: string;
  encounterId: string;
  recordType: string;
  signedBy: string;
  signedAt: string;
  caSignature?: string;
}

/** 质控告警事件Payload */
export interface QcAlertPayload {
  alertId: string;
  alertType: 'missing_field' | 'timeliness' | 'consistency' | 'compliance' | 'clinical_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  patientId?: string;
  encounterId?: string;
  recordId?: string;
  orderId?: string;
  description: string;
  suggestion?: string;
  detectedAt: string;
  detectedBy: string;
  ruleCode?: string;
  ruleName?: string;
}

/** 适配器状态变更事件Payload */
export interface AdapterStatusChangedPayload {
  adapterId: string;
  adapterType: string;
  vendor: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  errorMessage?: string;
}

/** 系统错误事件Payload */
export interface SystemErrorPayload {
  errorId: string;
  errorType: string;
  errorCode: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  source: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}

/** 处方审核事件Payload */
export interface PrescriptionReviewedPayload {
  prescriptionId: string;
  patientId: string;
  encounterId?: string;
  doctorId: string;
  doctorName: string;
  reviewerId: string;
  reviewerName: string;
  reviewResult: 'approved' | 'rejected' | 'modified';
  drugCount: number;
  reviewedAt: string;
  rejectReason?: string;
  modifications?: string[];
}

/** 手术安排事件Payload */
export interface SurgeryScheduledPayload {
  surgeryId: string;
  patientId: string;
  encounterId: string;
  surgeryName: string;
  surgeon: string;
  assistantSurgeons?: string[];
  scheduledAt: string;
  estimatedDurationMin?: number;
  operatingRoom?: string;
  anesthesiaType?: string;
  scheduledBy: string;
}

/** 费用结算事件Payload */
export interface BillingSettledPayload {
  settlementNo: string;
  patientId: string;
  encounterId: string;
  totalAmount: number;
  insuranceAmount: number;
  selfPayAmount: number;
  settledAt: string;
  settledBy?: string;
}

// ============================================================
// 事件类型与Payload映射
// ============================================================

/** 事件Payload类型映射 */
export interface EventPayloadMap {
  [IntegrationEventType.PATIENT_ADMITTED]: PatientAdmittedPayload;
  [IntegrationEventType.PATIENT_DISCHARGED]: PatientDischargedPayload;
  [IntegrationEventType.PATIENT_TRANSFERRED]: PatientTransferredPayload;
  [IntegrationEventType.PATIENT_REGISTERED]: PatientRegisteredPayload;
  [IntegrationEventType.PATIENT_UPDATED]: Record<string, unknown>;
  [IntegrationEventType.ORDER_CREATED]: OrderCreatedPayload;
  [IntegrationEventType.ORDER_UPDATED]: Record<string, unknown>;
  [IntegrationEventType.ORDER_COMPLETED]: OrderCompletedPayload;
  [IntegrationEventType.ORDER_CANCELLED]: OrderCancelledPayload;
  [IntegrationEventType.LAB_RESULT_READY]: LabResultReadyPayload;
  [IntegrationEventType.LAB_CRITICAL_VALUE]: LabCriticalValuePayload;
  [IntegrationEventType.LAB_ORDER_CREATED]: Record<string, unknown>;
  [IntegrationEventType.IMAGING_REPORT_READY]: ImagingReportReadyPayload;
  [IntegrationEventType.IMAGING_EXAM_COMPLETED]: Record<string, unknown>;
  [IntegrationEventType.IMAGING_AI_RESULT_READY]: Record<string, unknown>;
  [IntegrationEventType.EMR_RECORD_CREATED]: EmrRecordCreatedPayload;
  [IntegrationEventType.EMR_RECORD_UPDATED]: Record<string, unknown>;
  [IntegrationEventType.EMR_RECORD_SIGNED]: EmrRecordSignedPayload;
  [IntegrationEventType.EMR_RECORD_ARCHIVED]: Record<string, unknown>;
  [IntegrationEventType.BILLING_CHARGED]: Record<string, unknown>;
  [IntegrationEventType.BILLING_SETTLED]: BillingSettledPayload;
  [IntegrationEventType.INSURANCE_SETTLED]: Record<string, unknown>;
  [IntegrationEventType.PRESCRIPTION_REVIEWED]: PrescriptionReviewedPayload;
  [IntegrationEventType.SURGERY_SCHEDULED]: SurgeryScheduledPayload;
  [IntegrationEventType.QC_ALERT]: QcAlertPayload;
  [IntegrationEventType.SYSTEM_ERROR]: SystemErrorPayload;
  [IntegrationEventType.ADAPTER_STATUS_CHANGED]: AdapterStatusChangedPayload;
}

/** 事件优先级映射（默认优先级） */
export const EVENT_DEFAULT_PRIORITY: Record<string, EventPriority> = {
  [IntegrationEventType.LAB_CRITICAL_VALUE]: 'critical',
  [IntegrationEventType.SYSTEM_ERROR]: 'high',
  [IntegrationEventType.QC_ALERT]: 'high',
  [IntegrationEventType.PATIENT_ADMITTED]: 'high',
  [IntegrationEventType.ORDER_CREATED]: 'medium',
  [IntegrationEventType.LAB_RESULT_READY]: 'medium',
  [IntegrationEventType.IMAGING_REPORT_READY]: 'medium',
  [IntegrationEventType.EMR_RECORD_SIGNED]: 'medium',
  [IntegrationEventType.PATIENT_DISCHARGED]: 'medium',
  [IntegrationEventType.ORDER_COMPLETED]: 'low',
  [IntegrationEventType.EMR_RECORD_CREATED]: 'low',
  [IntegrationEventType.ADAPTER_STATUS_CHANGED]: 'low',
  [IntegrationEventType.PRESCRIPTION_REVIEWED]: 'high',
  [IntegrationEventType.SURGERY_SCHEDULED]: 'high',
  [IntegrationEventType.BILLING_SETTLED]: 'medium',
};
