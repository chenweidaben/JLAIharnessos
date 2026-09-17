/**
 * 健澜科技数智医院智能体 - integration/types.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 系统集成类型定义
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * @module integration/types
 */

// ============================================================
// 通用领域模型（最小类型集，供集成模块使用）
// ============================================================

/** 性别 */
export type Gender = 'male' | 'female' | 'unknown';

/** 患者基本信息 */
export interface Patient {
  patientId: string;
  name: string;
  gender: Gender;
  birthDate?: string;
  age?: number;
  idCard?: string;
  phone?: string;
  address?: string;
  allergies?: string[];
  maritalStatus?: string;
  ethnicity?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 患者搜索条件 */
export interface PatientSearchCriteria {
  patientId?: string;
  name?: string;
  idCard?: string;
  phone?: string;
  gender?: Gender;
  page?: number;
  pageSize?: number;
}

/** 就诊类型 */
export type EncounterType = 'outpatient' | 'inpatient' | 'emergency' | 'observation';

/** 就诊状态 */
export type EncounterStatus = 'active' | 'finished' | 'cancelled' | 'planned';

/** 就诊信息 */
export interface Encounter {
  encounterId: string;
  patientId: string;
  encounterType: EncounterType;
  status: EncounterStatus;
  department?: string;
  departmentCode?: string;
  ward?: string;
  bedNo?: string;
  attendingDoctor?: string;
  attendingDoctorId?: string;
  chiefComplaint?: string;
  primaryDiagnosis?: string;
  primaryDiagnosisCode?: string;
  admittedAt?: string;
  dischargedAt?: string;
  createdAt?: string;
}

/** 医嘱类型 */
export type OrderType = 'drug' | 'examination' | 'lab' | 'treatment' | 'nursing' | 'diet' | 'other';

/** 医嘱状态 */
export type OrderStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'held';

/** 医嘱创建请求 */
export interface OrderCreateRequest {
  patientId: string;
  encounterId?: string;
  orderType: OrderType;
  orderName: string;
  orderCode?: string;
  /** 药品医嘱专用 */
  drugCode?: string;
  drugName?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  /** 检验/检查专用 */
  itemCode?: string;
  itemName?: string;
  specimenType?: string;
  clinicalDiagnosis?: string;
  urgency?: 'routine' | 'urgent' | 'stat';
  notes?: string;
  orderedBy: string;
  orderedById: string;
}

/** 医嘱结果 */
export interface OrderResult {
  orderId: string;
  hisOrderId?: string;
  status: OrderStatus;
  orderedAt: string;
  message?: string;
}

/** 医嘱信息 */
export interface Order {
  orderId: string;
  hisOrderId?: string;
  patientId: string;
  encounterId?: string;
  orderType: OrderType;
  orderName: string;
  status: OrderStatus;
  dosage?: string;
  frequency?: string;
  route?: string;
  orderedBy?: string;
  orderedAt?: string;
  startAt?: string;
  stopAt?: string;
  notes?: string;
}

/** 费用信息 */
export interface BillingInfo {
  patientId: string;
  encounterId?: string;
  totalAmount: number;
  insuranceAmount: number;
  selfPayAmount: number;
  depositBalance?: number;
  currency: string;
  details?: BillingDetail[];
}

/** 费用明细 */
export interface BillingDetail {
  itemId: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  insuranceCoverage: number;
  selfPay: number;
  chargedAt?: string;
}

/** 医保信息 */
export interface InsuranceInfo {
  patientId: string;
  insuranceType: string;
  insuranceNo?: string;
  coverageStatus: 'active' | 'inactive' | 'expired';
  deductibleRemaining?: number;
  reimbursementRate?: number;
  accountBalance?: number;
}

/** 排班信息 */
export interface Schedule {
  scheduleId: string;
  doctorId: string;
  doctorName: string;
  department: string;
  departmentCode: string;
  date: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'whole';
  clinicType: 'general' | 'specialist' | 'expert' | 'vip';
  totalSlots: number;
  bookedSlots: number;
  remainingSlots: number;
  status: 'available' | 'full' | 'cancelled';
}

/** 可用号源 */
export interface Slot {
  slotId: string;
  scheduleId: string;
  date: string;
  startTime: string;
  endTime: string;
  sequenceNo?: number;
  status: 'available' | 'booked' | 'blocked';
}

/** 日期范围 */
export interface DateRange {
  start: string;
  end: string;
}

// ============================================================
// 适配器通用类型
// ============================================================

/** 适配器类型 */
export type AdapterType = 'his' | 'emr' | 'lis' | 'pacs' | 'insurance' | 'ca' | 'generic';

/** 适配器状态 */
export type AdapterStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected';

/** 适配器健康状态 */
export interface AdapterHealth {
  adapterId: string;
  adapterType: AdapterType;
  vendor: string;
  status: AdapterStatus;
  healthy: boolean;
  lastCheckAt?: string;
  responseTimeMs?: number;
  errorMessage?: string;
  metrics?: {
    totalRequests: number;
    successCount: number;
    failureCount: number;
    averageResponseTimeMs: number;
  };
}

/** 适配器元信息 */
export interface AdapterMetadata {
  id: string;
  type: AdapterType;
  vendor: string;
  version: string;
  name: string;
  description?: string;
  supportedProtocols: string[];
}

/** 执行上下文 */
export interface AdapterExecutionContext {
  requestId?: string;
  traceId?: string;
  userId?: string;
  patientId?: string;
  encounterId?: string;
  timeout?: number;
  retries?: number;
  metadata?: Record<string, unknown>;
}

/** 取消订阅函数 */
export type Unsubscribe = () => void;

// ============================================================
// 事件类型
// ============================================================

/** 集成事件优先级 */
export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

/** 集成事件基础接口 */
export interface IntegrationEvent<T = unknown> {
  eventId: string;
  eventType: string;
  source: string;
  timestamp: string;
  priority: EventPriority;
  payload: T;
  correlationId?: string;
  auditInfo?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
  };
}
