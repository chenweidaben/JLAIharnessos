/**
 * 健澜科技 jlmedaios - 药房调剂发药类型（M2-A）
 *
 * 与真实 BFF（src/bff/routes/pharmacy.ts）和聚合器 DTO 一一对应。
 * 真实模式下全部读写 PostgreSQL；本文件不包含任何 mock 视图模型。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

// ============================== 处方 ==============================

export type PrescriptionStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'dispensed'
  | 'cancelled';

export interface PrescriptionItemDto {
  id: string;
  drugCode: string | null;
  drugName: string;
  specification: string | null;
  dosage: number | null;
  dosageUnit: string | null;
  frequency: string | null;
  route: string | null;
  daysSupply: number | null;
  quantity: number | null;
  quantityUnit: string | null;
  skinTest: boolean;
  remark: string | null;
}

export interface PrescriptionDto {
  id: string;
  visitId: string;
  rxNo: string;
  prescriberId: string | null;
  status: PrescriptionStatus;
  reviewerId: string | null;
  reviewLevel: string | null;
  riskLevel: string | null;
  auditResult: Record<string, unknown>;
  counsel: string | null;
  totalFee: number | null;
  items: PrescriptionItemDto[];
  createdAt: string;
  updatedAt: string;
}

/** 队列项：处方 + 患者脱敏名 + 科室。 */
export interface PharmacyQueueItem {
  prescription: PrescriptionDto;
  patientName: string | null;
  department: string | null;
}

// ============================== 库存 / 流水 ==============================

export interface InventoryDto {
  id: string;
  drugId: string;
  drugCode: string | null;
  genericName: string | null;
  warehouse: string;
  batchNo: string | null;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovementDto {
  id: string;
  drugId: string | null;
  warehouse: string;
  batchNo: string | null;
  changeQty: number;
  balanceAfter: number | null;
  reason: string;
  refType: string | null;
  refId: string | null;
  actorId: string | null;
  createdAt: string;
}

// ============================== 发药记录 ==============================

export interface DispensingDto {
  id: string;
  prescriptionId: string;
  itemId: string | null;
  drugId: string | null;
  drugCode: string | null;
  drugName: string;
  warehouse: string;
  batchNo: string | null;
  quantity: number;
  unit: string | null;
  dispensedBy: string;
  dispensedAt: string;
  idempotencyKey: string;
  overrideReason: string | null;
  overrideBy: string | null;
  cdsHits: Array<Record<string, unknown>>;
  createdAt: string;
}

// ============================== CDS ==============================

export type CdsLevel = 'info' | 'warning' | 'critical';
export type CdsActionType = 'alert' | 'warning' | 'block' | 'suggest' | 'log';

export interface CdsHitDto {
  ruleId: string;
  title: string;
  message: string;
  level: CdsLevel;
  actionType: CdsActionType;
  requireOverride: boolean;
  suggestions: readonly string[];
}

export interface CdsPreview {
  passed: boolean;
  maxLevel: CdsLevel | null;
  blocks: CdsHitDto[];
  hits: CdsHitDto[];
}

/** 发药请求行：可指定批次/数量（FEFO 缺省自动选批次）。 */
export interface DispenseLinePayload {
  itemId: string;
  batchNo?: string | null;
  quantity?: number;
}

export interface DispensePayload {
  warehouse?: string;
  lines?: DispenseLinePayload[];
  overrideReason?: string;
  overrideAuthorId?: string | null;
}

export interface DispenseResult {
  prescription: PrescriptionDto;
  dispensings: DispensingDto[];
  cds: {
    passed: boolean;
    maxLevel: CdsLevel | null;
    hits: CdsHitDto[];
  };
  deduplicated: boolean;
}

// ============================== 健康探针 ==============================

export interface PharmacyHealth {
  status: string;
  version?: string;
  demoMode: boolean;
  db: 'up' | 'down' | 'skipped';
  checks?: unknown[];
}
