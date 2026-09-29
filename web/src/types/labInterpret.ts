/**
 * 健澜科技 jlmedaios - 检验 AI 辅助解读前端类型（M3-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type LabInterpStatus = 'pending_review' | 'signed' | 'rejected';

export interface LabAbnormalItem {
  item: string;
  code: string | null;
  value: string | null;
  unit: string | null;
  refLow: string | null;
  refHigh: string | null;
  flag: string;
}

export interface LabInterpretation {
  id: string;
  visitId: string;
  patientId: string;
  department: string;
  itemCount: number;
  abnormalCount: number;
  criticalCount: number;
  summary: string;
  abnormalItems: LabAbnormalItem[];
  criticalItems: LabAbnormalItem[];
  engineVersion: string;
  status: LabInterpStatus;
  generatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
}

export interface LabInterpQueueItem {
  id: string;
  visitId: string;
  visitNo: string;
  patientName: string;
  department: string;
  abnormalCount: number;
  criticalCount: number;
  status: LabInterpStatus;
  updatedAt: string;
}
