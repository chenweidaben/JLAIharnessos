/**
 * 健澜科技数智医院智能体 - integration/adapters/lis/LISAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - LIS适配器接口
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 定义LIS（检验信息系统）统一适配器接口，支持检验申请、
 * 结果查询、危急值订阅和检验项目目录。
 *
 * @module integration/adapters/lis/LISAdapter
 */

import type { Unsubscribe } from '../../types';
import type { BaseAdapter } from '../BaseAdapter';

/** 检验申请状态 */
export type LabOrderStatus =
  'pending' | 'collected' | 'testing' | 'reported' | 'reviewed' | 'cancelled';

/** 异常标识 */
export type AbnormalFlag = 'normal' | 'low' | 'high' | 'critical' | 'positive' | 'negative';

/** 检验项目结果项 */
export interface LabResultItem {
  itemCode: string;
  itemName: string;
  itemLoincCode?: string;
  resultValue: string;
  numericValue?: number;
  unit: string;
  referenceRange: string;
  referenceLow?: number;
  referenceHigh?: number;
  abnormalFlag: AbnormalFlag;
  deltaFlag?: 'increased' | 'decreased' | 'unchanged';
  previousValue?: string;
  method?: string;
  specimenType?: string;
  collectedAt?: string;
  testedAt?: string;
  remarks?: string;
}

/** 检验报告 */
export interface LabReport {
  reportId: string;
  patientId: string;
  encounterId: string;
  orderId: string;
  lisOrderId?: string;
  reportType: string;
  reportStatus: 'preliminary' | 'final' | 'amended';
  reportedAt: string;
  reportedBy: string;
  reviewedBy: string;
  instrument?: string;
  results: LabResultItem[];
  remarks?: string;
  rawData?: string;
}

/** 检验申请请求 */
export interface LabOrderRequest {
  patientId: string;
  encounterId?: string;
  testItems: {
    itemCode: string;
    itemName: string;
  }[];
  specimenType?: string;
  clinicalDiagnosis?: string;
  urgency: 'routine' | 'urgent' | 'stat';
  orderedBy: string;
  orderedById: string;
  notes?: string;
}

/** 检验申请结果 */
export interface LabOrderResult {
  orderId: string;
  lisOrderId?: string;
  status: LabOrderStatus;
  orderedAt: string;
  message?: string;
}

/** 检验项目目录项 */
export interface LabTestCatalogItem {
  itemCode: string;
  itemName: string;
  itemShortName?: string;
  loincCode?: string;
  specimenType: string;
  department: string;
  referenceRange: string;
  unit: string;
  price?: number;
  turnaroundTime?: number; // 分钟
  isAvailable: boolean;
  category: string;
}

/** 危急值事件 */
export interface CriticalValueEvent {
  eventId: string;
  patientId: string;
  /** 患者姓名（展示/通知用，可选） */
  patientName?: string;
  encounterId?: string;
  orderId: string;
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
}

/**
 * LIS适配器接口
 *
 * 所有LIS系统适配器必须实现此接口。
 */
export interface LISAdapter extends BaseAdapter {
  // === 检验申请 ===
  orderLabTest(request: LabOrderRequest): Promise<LabOrderResult>;
  cancelLabTest(orderId: string, reason: string): Promise<boolean>;

  // === 检验结果查询 ===
  getLabResult(reportId: string): Promise<LabReport>;
  getLabResultList(patientId: string, encounterId?: string, limit?: number): Promise<LabReport[]>;

  // === 危急值订阅 ===
  subscribeCriticalValues(callback: (event: CriticalValueEvent) => void): Unsubscribe;
  unsubscribeCriticalValues(subscriptionId: string): void;

  // === 检验项目目录 ===
  getTestCatalog(category?: string, keyword?: string): Promise<LabTestCatalogItem[]>;

  // === HL7 ORM/ORU 消息 ===
  /** 构建 HL7 ORM^O01 检验申请消息 */
  buildOrderHL7Message(request: LabOrderRequest): Promise<string>;
  /** 解析 HL7 ORU^R01 检验结果消息 */
  parseResultHL7Message(message: string): Promise<LabReport>;
}
