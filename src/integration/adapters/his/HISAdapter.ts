/**
 * 健澜科技数智医院智能体 - integration/adapters/his/HISAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - HIS适配器接口
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 定义HIS（医院信息系统）统一适配器接口，所有HIS厂商适配器
 * （卫宁、东华、创业慧康、联众、智业等）均需实现此接口。
 *
 * 覆盖 8 大集成场景：
 * 1. 患者信息（查询/搜索/同步）
 * 2. 就诊信息
 * 3. 医嘱管理（下达/取消/查询）
 * 4. 费用查询
 * 5. 医保结算
 * 6. 排班与号源
 * 7. 事件订阅
 * 8. 批量与异步操作
 *
 * @module integration/adapters/his/HISAdapter
 */

import type {
  BillingDetail,
  BillingInfo,
  DateRange,
  Encounter,
  InsuranceInfo,
  Order,
  OrderCreateRequest,
  OrderResult,
  OrderStatus,
  Patient,
  PatientSearchCriteria,
  Schedule,
  Slot,
  Unsubscribe,
} from '../../types';
import type { BaseAdapter } from '../BaseAdapter';

/** 患者事件类型 */
export type PatientEventType =
  'admitted' | 'discharged' | 'transferred' | 'updated' | 'registered' | 'merged';

/** 患者事件 */
export interface PatientEvent {
  eventType: PatientEventType;
  patientId: string;
  encounterId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/** 医嘱事件类型 */
export type OrderEventType = 'created' | 'updated' | 'completed' | 'cancelled' | 'held';

/** 医嘱事件 */
export interface OrderEvent {
  eventType: OrderEventType;
  orderId: string;
  hisOrderId?: string;
  patientId: string;
  encounterId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/** 异步任务状态 */
export type AsyncTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 异步任务 */
export interface AsyncTask {
  taskId: string;
  taskType: 'order' | 'sync' | 'billing' | 'insurance';
  status: AsyncTaskStatus;
  submittedAt: string;
  finishedAt?: string;
  result?: unknown;
  errorMessage?: string;
}

/** 批量医嘱结果 */
export interface BatchOrderResult {
  total: number;
  succeeded: OrderResult[];
  failed: { request: OrderCreateRequest; error: string }[];
}

/** 患者同步结果 */
export interface PatientSyncResult {
  patientId: string;
  action: 'created' | 'updated' | 'unchanged';
  synchronizedAt: string;
  message?: string;
}

/**
 * HIS适配器接口
 *
 * 所有HIS厂商适配器必须实现此接口，提供患者信息、就诊信息、
 * 医嘱管理、费用查询、医保结算、排班号源、事件订阅、批量与异步能力。
 */
export interface HISAdapter extends BaseAdapter {
  // ============================================================
  // 1. 患者信息
  // ============================================================

  /**
   * 按患者ID查询患者信息
   *
   * @param patientId - 患者唯一ID
   * @returns 患者信息
   * @throws {AdapterError} 患者不存在或查询失败
   */
  getPatientInfo(patientId: string): Promise<Patient>;

  /**
   * 搜索患者
   *
   * @param criteria - 搜索条件
   * @returns 匹配的患者列表
   */
  searchPatients(criteria: PatientSearchCriteria): Promise<{ patients: Patient[]; total: number }>;

  /**
   * 患者同步（将健澜侧患者信息同步到HIS，或反向拉取）
   *
   * @param patient - 患者信息
   * @returns 同步结果
   */
  syncPatient(patient: Patient): Promise<PatientSyncResult>;

  // ============================================================
  // 2. 就诊信息
  // ============================================================

  /**
   * 查询单次就诊信息
   *
   * @param encounterId - 就诊ID
   * @returns 就诊信息
   */
  getEncounter(encounterId: string): Promise<Encounter>;

  /**
   * 查询患者就诊列表
   *
   * @param patientId - 患者ID
   * @param limit - 返回数量限制
   * @returns 就诊列表
   */
  getEncounterList(patientId: string, limit?: number): Promise<Encounter[]>;

  // ============================================================
  // 3. 医嘱管理
  // ============================================================

  /**
   * 创建/下达医嘱
   *
   * @param request - 医嘱创建请求
   * @returns 医嘱创建结果
   * @throws {AdapterError} 医嘱创建失败
   */
  createOrder(request: OrderCreateRequest): Promise<OrderResult>;

  /**
   * 异步下达医嘱（立即返回任务ID，后台处理）
   *
   * @param request - 医嘱创建请求
   * @returns 异步任务ID
   */
  placeOrderAsync(request: OrderCreateRequest): Promise<{ taskId: string }>;

  /**
   * 取消医嘱
   *
   * @param orderId - 健澜医嘱ID
   * @param reason - 取消原因
   * @returns 是否取消成功
   */
  cancelOrder(orderId: string, reason: string): Promise<boolean>;

  /**
   * 查询医嘱列表
   *
   * @param patientId - 患者ID
   * @param encounterId - 就诊ID（可选）
   * @returns 医嘱列表
   */
  getOrderList(patientId: string, encounterId?: string): Promise<Order[]>;

  /**
   * 查询医嘱状态
   *
   * @param orderId - 医嘱ID
   * @returns 医嘱状态
   */
  getOrderStatus(orderId: string): Promise<OrderStatus>;

  // ============================================================
  // 4. 费用查询
  // ============================================================

  /**
   * 查询患者费用信息
   *
   * @param patientId - 患者ID
   * @param encounterId - 就诊ID（可选）
   * @returns 费用信息
   */
  getPatientCost(patientId: string, encounterId?: string): Promise<BillingInfo>;

  /**
   * 查询费用明细
   *
   * @param patientId - 患者ID
   * @param encounterId - 就诊ID
   * @returns 费用明细列表
   */
  getCostDetails(patientId: string, encounterId: string): Promise<BillingDetail[]>;

  // ============================================================
  // 5. 医保结算
  // ============================================================

  /**
   * 查询医保信息
   *
   * @param patientId - 患者ID
   * @returns 医保信息
   */
  getInsuranceInfo(patientId: string): Promise<InsuranceInfo>;

  /**
   * 医保结算
   *
   * @param patientId - 患者ID
   * @param encounterId - 就诊ID
   * @returns 结算结果
   */
  settleInsurance(
    patientId: string,
    encounterId: string,
  ): Promise<{ settled: boolean; settlementNo?: string; selfPayAmount: number }>;

  // ============================================================
  // 6. 排班与号源
  // ============================================================

  /**
   * 查询医生排班
   *
   * @param doctorId - 医生ID
   * @param dateRange - 日期范围
   * @returns 排班列表
   */
  getDoctorSchedule(doctorId: string, dateRange: DateRange): Promise<Schedule[]>;

  /**
   * 查询可用号源
   *
   * @param departmentId - 科室ID
   * @param date - 查询日期
   * @returns 可用号源列表
   */
  getAvailableSlots(departmentId: string, date: string): Promise<Slot[]>;

  // ============================================================
  // 7. 事件订阅
  // ============================================================

  /**
   * 订阅患者事件
   *
   * @param callback - 事件回调
   * @returns 取消订阅函数
   */
  onPatientEvent(callback: (event: PatientEvent) => void): Unsubscribe;

  /**
   * 订阅医嘱事件
   *
   * @param callback - 事件回调
   * @returns 取消订阅函数
   */
  onOrderEvent(callback: (event: OrderEvent) => void): Unsubscribe;

  // ============================================================
  // 8. 批量与异步操作
  // ============================================================

  /**
   * 批量查询患者
   *
   * @param patientIds - 患者ID列表
   * @returns 患者列表与未找到的ID
   */
  batchGetPatients(patientIds: string[]): Promise<{ patients: Patient[]; notFound: string[] }>;

  /**
   * 批量下达医嘱
   *
   * @param requests - 医嘱请求列表
   * @returns 批量结果（成功/失败）
   */
  batchCreateOrders(requests: OrderCreateRequest[]): Promise<BatchOrderResult>;

  /**
   * 查询异步任务状态
   *
   * @param taskId - 任务ID
   * @returns 异步任务
   */
  getAsyncTaskStatus(taskId: string): Promise<AsyncTask>;
}
