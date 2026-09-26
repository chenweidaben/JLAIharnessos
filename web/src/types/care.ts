/**
 * 健澜科技 jlmedaios - 住院在院诊疗日常类型（M1-B2）
 *
 * 与真实 BFF（src/bff/routes/inpatientCare.ts）和聚合器 DTO 一一对应。
 * 真实模式下全部读写 PostgreSQL；本文件不包含任何 mock 视图模型。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

// ============================== 医生查房 ==============================

export type WardRoundType = 'routine' | 'superior' | 'attending' | 'chief' | 'director';
export type WardRoundStatus = 'draft' | 'signed' | 'countersigned' | 'returned';

export interface WardRoundDto {
  id: string;
  visitId: string;
  patientId: string;
  roundNo: string;
  roundType: WardRoundType;
  isSuperior: boolean;
  roundAt: string;
  symptomChange: string | null;
  physicalExam: Record<string, unknown>;
  assessment: string;
  diagnosis: string | null;
  planAdjustment: string | null;
  aiAssisted: boolean;
  aiSuggestion: Record<string, unknown>;
  status: WardRoundStatus;
  authorId: string | null;
  signedBy: string | null;
  signedAt: string | null;
  countersignedBy: string | null;
  countersignedAt: string | null;
  returnReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WardRoundCreatePayload {
  visitId: string;
  roundType?: WardRoundType;
  isSuperior?: boolean;
  roundAt?: string | null;
  symptomChange?: string | null;
  physicalExam?: Record<string, unknown>;
  assessment: string;
  diagnosis?: string | null;
  planAdjustment?: string | null;
  aiAssisted?: boolean;
  aiSuggestion?: Record<string, unknown>;
}

// ============================== 护士护理 ==============================

export type NursingLevel = 'special' | 'level1' | 'level2' | 'level3';
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type NursingShift = 'day' | 'night';
export type NursingTaskType =
  | 'vitals'
  | 'medication'
  | 'turning'
  | 'wound_care'
  | 'education'
  | 'observation'
  | 'other';
export type NursingTaskStatus = 'pending' | 'executing' | 'done' | 'cancelled';

export interface NursingRecordDto {
  id: string;
  visitId: string;
  patientId: string;
  recordNo: string;
  recordedAt: string;
  shift: NursingShift;
  nursingLevel: NursingLevel;
  vitals: Record<string, unknown>;
  intake: Record<string, unknown>;
  output: Record<string, unknown>;
  measures: string | null;
  pressureSoreRisk: RiskLevel;
  fallRisk: RiskLevel;
  riskAssessment: Record<string, unknown>;
  aiAssisted: boolean;
  status: 'draft' | 'signed';
  nurseId: string | null;
  signedBy: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NursingRecordCreatePayload {
  visitId: string;
  recordedAt?: string | null;
  shift?: NursingShift;
  nursingLevel: NursingLevel;
  vitals?: Record<string, unknown>;
  intake?: Record<string, unknown>;
  output?: Record<string, unknown>;
  measures?: string | null;
  pressureSoreRisk?: RiskLevel;
  fallRisk?: RiskLevel;
  riskAssessment?: Record<string, unknown>;
  aiAssisted?: boolean;
}

export interface NursingTaskDto {
  id: string;
  visitId: string;
  patientId: string;
  taskNo: string;
  taskType: NursingTaskType;
  content: string;
  scheduledAt: string;
  status: NursingTaskStatus;
  idempotencyKey: string;
  result: string | null;
  executedBy: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NursingTaskCreatePayload {
  visitId: string;
  taskType?: NursingTaskType;
  content: string;
  scheduledAt?: string | null;
  idempotencyKey: string;
}

export interface TaskExecutionResult {
  task: NursingTaskDto;
  /** 并发重复执行时为 true，不产生第二条任务执行结果 */
  deduplicated: boolean;
}

// ============================== 在院医嘱 ==============================

export type OrderType =
  | 'drug'
  | 'lab'
  | 'imaging'
  | 'treatment'
  | 'nursing'
  | 'diet'
  | 'other';
export type OrderStatus =
  | 'pending_review'
  | 'active'
  | 'executed'
  | 'stopped'
  | 'cancelled'
  | 'rejected'
  | 'audited';
export type OrderPriority = 'routine' | 'urgent' | 'stat';
export type OrderCategory = 'long_term' | 'short_term';
export type AdministrationStatus = 'administered' | 'held' | 'refused';

export interface OrderDto {
  id: string;
  visitId: string;
  orderNo: string;
  orderType: OrderType;
  content: string;
  detail: Record<string, unknown>;
  priority: OrderPriority;
  status: OrderStatus;
  category: OrderCategory;
  doctorId: string | null;
  reviewerId: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  requiresDoubleCheck: boolean;
  startAt: string | null;
  stopAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdministrationDto {
  id: string;
  orderId: string;
  visitId: string;
  patientId: string;
  adminNo: string;
  slot: string;
  idempotencyKey: string;
  status: AdministrationStatus;
  dose: string | null;
  administeredBy: string;
  checkedBy: string | null;
  administeredAt: string;
  note: string | null;
  createdAt: string;
}

export interface OrderWithAdministrationsDto extends OrderDto {
  administrations: AdministrationDto[];
}

export interface InpatientOrderView {
  visitId: string;
  longTerm: OrderWithAdministrationsDto[];
  shortTerm: OrderWithAdministrationsDto[];
}

export interface InpatientOrderCreatePayload {
  visitId: string;
  orderType: OrderType;
  content: string;
  detail?: Record<string, unknown>;
  priority?: OrderPriority;
  category?: OrderCategory;
  requiresDoubleCheck?: boolean;
}

export interface OrderAdministerPayload {
  slot?: string;
  dose?: string;
  checkedBy?: string | null;
  note?: string;
  status?: AdministrationStatus;
}

export interface OrderAdministrationResult {
  order: OrderDto;
  administration: AdministrationDto;
  deduplicated: boolean;
}

// ============================== 健康探针 ==============================

export interface CareHealth {
  status: string;
  version?: string;
  demoMode: boolean;
  db: 'up' | 'down' | 'skipped';
  checks?: unknown[];
}
