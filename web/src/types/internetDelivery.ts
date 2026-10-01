/**
 * 健澜科技 jlmedaios - 互联网配送/报告类型（M3-N）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type DeliveryChannel = 'self_pick' | 'express';
export type DeliveryStatus =
  | 'created' | 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled';

export interface PrescriptionDeliveryView {
  id: string;
  deliveryNo: string;
  rxId: string;
  patientId: string;
  accountId: string | null;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  courierCompany: string | null;
  trackingNo: string | null;
  addressSnapshot: string | null;
  pickupCode: string | null;
  createdBy: string | null;
  fulfilledBy: string | null;
  confirmedBy: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
  fulfilledAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  /** 状态中文文案（后端下发，避免前端硬编码漂移） */
  statusLabel?: string;
}

export interface LabResultView {
  id: string;
  reportNo: string | null;
  panelName: string | null;
  itemName: string;
  itemCode: string | null;
  specimen: string | null;
  value: string | null;
  unit: string | null;
  refLow: string | null;
  refHigh: string | null;
  abnormalFlag: string | null;
  isCritical: boolean;
  resultTime: string | null;
  visitId: string;
}

export interface ImagingReportView {
  id: string;
  studyUid: string | null;
  modality: string | null;
  examName: string;
  bodyPart: string | null;
  findings: string | null;
  impression: string | null;
  aiFindings: unknown;
  isCritical: boolean;
  reportTime: string | null;
  visitId: string;
}

export interface LabInterpretationView {
  id: string;
  visitId: string;
  department: string;
  itemCount: number;
  abnormalCount: number;
  criticalCount: number;
  summary: string;
  abnormalItems: unknown;
  criticalItems: unknown;
  engineVersion: string;
  status: string;
  generatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface PatientReportsView {
  labs: LabResultView[];
  imaging: ImagingReportView[];
  interpretations: LabInterpretationView[];
}
