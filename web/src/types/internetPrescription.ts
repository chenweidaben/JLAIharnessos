/**
 * 健澜科技 jlmedaios - 互联网电子处方 前端类型（M3-L）
 *
 * 与 BFF internetPrescriptionAggregator 视图结构对齐。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type EPrescriptionStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'cancelled'
  | 'paid';

export interface EPrescriptionItemView {
  id: string;
  drugCode?: string | null;
  drugName: string;
  specification?: string | null;
  dosage?: number | null;
  dosageUnit?: string | null;
  frequency?: string | null;
  route?: string | null;
  daysSupply?: number | null;
  quantity?: number | null;
  quantityUnit?: string | null;
  skinTest?: boolean | null;
  remark?: string | null;
  unitPrice?: number | null;
  amount?: number | null;
}

export interface EPrescriptionView {
  id: string;
  rxNo: string;
  sessionId: string;
  patientId: string;
  patientName?: string | null;
  prescriberId: string;
  prescriberName?: string | null;
  department?: string | null;
  status: EPrescriptionStatus;
  riskLevel?: string | null;
  counsel?: string | null;
  totalFee?: number | null;
  idempotencyKey: string;
  createdAt: string;
  items: EPrescriptionItemView[];
  reviewerId?: string | null;
  reviewerName?: string | null;
  auditComment?: string | null;
  auditedAt?: string | null;
  returnReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
}

export interface EPrescriptionItemInput {
  drugCode?: string;
  drugName: string;
  specification?: string;
  dosage?: number;
  dosageUnit?: string;
  frequency?: string;
  route?: string;
  daysSupply?: number;
  quantity?: number;
  quantityUnit?: string;
  skinTest?: boolean;
  remark?: string;
}

export interface PrescribeInput {
  sessionId: string;
  items: EPrescriptionItemInput[];
  counsel?: string;
  idempotencyKey: string;
}
