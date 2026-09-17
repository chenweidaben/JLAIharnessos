/**
 * 健澜科技数智医院智能体 - integration/adapters/his/DonghuaHISAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 东华HIS适配器（骨架）
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 东华医为（DHC）HIS系统适配器骨架。
 * 东华医为是国内头部HIS厂商，核心产品"东华数字化医院"，
 * 传统集成以 WebService（SOAP）为主，新一代提供 REST 开放平台。
 *
 * 本文件为骨架实现，包含：
 * - 认证流程（OAuth2 / WebService Token）
 * - 字段映射配置（东华字段 → 健澜内部模型）
 * - 全部接口方法骨架（抛出未实现错误）
 *
 * @module integration/adapters/his/DonghuaHISAdapter
 */

import type {
  AdapterMetadata,
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
import { type AdapterConfig, createDefaultAdapterConfig } from '../AdapterConfig';
import { AdapterError, AdapterErrorCode, AdapterErrorType } from '../AdapterError';
import { BaseAdapter } from '../BaseAdapter';
import type {
  AsyncTask,
  BatchOrderResult,
  HISAdapter,
  OrderEvent,
  PatientEvent,
  PatientSyncResult,
} from './HISAdapter';

/** 东华HIS适配器配置 */
export interface DonghuaHISConfig extends Partial<AdapterConfig> {
  /** 东华应用ID */
  appId?: string;
  /** 东华应用密钥 */
  appSecret?: string;
  /** 机构代码 */
  orgCode?: string;
}

/**
 * 东华HIS适配器（骨架）
 *
 * TODO: 完成实际对接：
 * 1. 东华 WebService/REST 认证
 * 2. 患者、医嘱、费用 API 调用
 * 3. HL7 ADT 事件接收
 */
export class DonghuaHISAdapter extends BaseAdapter implements HISAdapter {
  private patientEventListeners = new Set<(event: PatientEvent) => void>();
  private orderEventListeners = new Set<(event: OrderEvent) => void>();

  constructor(config: DonghuaHISConfig = {}) {
    const adapterConfig = createDefaultAdapterConfig({
      id: config.id ?? 'his-donghua',
      type: 'his',
      vendor: '东华医为',
      version: config.version ?? 'DHC 8.0',
      name: config.name ?? '东华HIS适配器',
      description: '对接东华医为HIS系统',
      endpoint: config.endpoint ?? 'https://his-api.hospital.com/dhc',
      timeout: config.timeout ?? 30000,
      protocol: 'rest',
      auth: {
        type: 'oauth2',
        clientId: config.appId,
        clientSecret: config.appSecret,
        tokenUrl: `${config.endpoint ?? 'https://his-api.hospital.com/dhc'}/oauth2/token`,
        ...config.auth,
      },
      fieldMapping: {
        patient: [
          { sourceField: 'brid', targetField: 'patientId' },
          { sourceField: 'xm', targetField: 'name' },
          {
            sourceField: 'xb',
            targetField: 'gender',
            valueMap: { '1': 'male', '2': 'female', '9': 'unknown' },
          },
          { sourceField: 'csrq', targetField: 'birthDate', dataType: 'date' },
          { sourceField: 'sfzh', targetField: 'idCard' },
        ],
        order: [
          { sourceField: 'yzid', targetField: 'orderId' },
          {
            sourceField: 'yzlx',
            targetField: 'orderType',
            valueMap: { YP: 'drug', JC: 'examination', JY: 'lab' },
          },
          { sourceField: 'yztmc', targetField: 'orderName' },
        ],
      },
      ...config,
    });
    super(adapterConfig);
  }

  getMetadata(): AdapterMetadata {
    return {
      id: this.config.id,
      type: 'his',
      vendor: '东华医为',
      version: this.config.version,
      name: '东华HIS适配器',
      description: '对接东华医为HIS系统',
      supportedProtocols: ['rest', 'soap', 'hl7'],
    };
  }

  /** 未实现方法统一抛出 */
  private notImpl(method: string, detail = ''): Promise<never> {
    return Promise.reject(
      new AdapterError(
        AdapterErrorType.BUSINESS,
        AdapterErrorCode.UNKNOWN_ERROR,
        `[DonghuaHISAdapter] ${method} 尚未实现${detail ? `（${detail}）` : ''}`,
        { adapterId: this.id, retryable: false },
      ),
    );
  }

  // === 患者 ===
  getPatientInfo(patientId: string): Promise<Patient> {
    return this.notImpl('getPatientInfo', `患者ID: ${patientId}`);
  }
  searchPatients(criteria: PatientSearchCriteria): Promise<{ patients: Patient[]; total: number }> {
    return this.notImpl('searchPatients');
  }
  syncPatient(patient: Patient): Promise<PatientSyncResult> {
    return this.notImpl('syncPatient', `患者ID: ${patient.patientId}`);
  }

  // === 就诊 ===
  getEncounter(encounterId: string): Promise<Encounter> {
    return this.notImpl('getEncounter', `就诊ID: ${encounterId}`);
  }
  getEncounterList(patientId: string): Promise<Encounter[]> {
    return this.notImpl('getEncounterList', `患者ID: ${patientId}`);
  }

  // === 医嘱 ===
  createOrder(request: OrderCreateRequest): Promise<OrderResult> {
    return this.notImpl('createOrder', `医嘱: ${request.orderName}`);
  }
  placeOrderAsync(request: OrderCreateRequest): Promise<{ taskId: string }> {
    return this.notImpl('placeOrderAsync', `医嘱: ${request.orderName}`);
  }
  cancelOrder(orderId: string): Promise<boolean> {
    return this.notImpl('cancelOrder', `医嘱ID: ${orderId}`);
  }
  getOrderList(patientId: string): Promise<Order[]> {
    return this.notImpl('getOrderList', `患者ID: ${patientId}`);
  }
  getOrderStatus(orderId: string): Promise<OrderStatus> {
    return this.notImpl('getOrderStatus', `医嘱ID: ${orderId}`);
  }

  // === 费用 ===
  getPatientCost(patientId: string): Promise<BillingInfo> {
    return this.notImpl('getPatientCost', `患者ID: ${patientId}`);
  }
  getCostDetails(patientId: string, encounterId: string): Promise<BillingDetail[]> {
    return this.notImpl('getCostDetails', `就诊ID: ${encounterId}`);
  }

  // === 医保 ===
  getInsuranceInfo(patientId: string): Promise<InsuranceInfo> {
    return this.notImpl('getInsuranceInfo', `患者ID: ${patientId}`);
  }
  settleInsurance(
    patientId: string,
    encounterId: string,
  ): Promise<{ settled: boolean; settlementNo?: string; selfPayAmount: number }> {
    return this.notImpl('settleInsurance', `就诊ID: ${encounterId}`);
  }

  // === 排班 ===
  getDoctorSchedule(doctorId: string, dateRange: DateRange): Promise<Schedule[]> {
    return this.notImpl('getDoctorSchedule', `医生ID: ${doctorId}`);
  }
  getAvailableSlots(departmentId: string, date: string): Promise<Slot[]> {
    return this.notImpl('getAvailableSlots', `科室ID: ${departmentId}`);
  }

  // === 事件订阅 ===
  onPatientEvent(callback: (event: PatientEvent) => void): Unsubscribe {
    this.patientEventListeners.add(callback);
    return () => this.patientEventListeners.delete(callback);
  }
  onOrderEvent(callback: (event: OrderEvent) => void): Unsubscribe {
    this.orderEventListeners.add(callback);
    return () => this.orderEventListeners.delete(callback);
  }

  // === 批量与异步 ===
  batchGetPatients(patientIds: string[]): Promise<{ patients: Patient[]; notFound: string[] }> {
    return this.notImpl('batchGetPatients', `数量: ${patientIds.length}`);
  }
  batchCreateOrders(requests: OrderCreateRequest[]): Promise<BatchOrderResult> {
    return this.notImpl('batchCreateOrders', `数量: ${requests.length}`);
  }
  getAsyncTaskStatus(taskId: string): Promise<AsyncTask> {
    return this.notImpl('getAsyncTaskStatus', `任务ID: ${taskId}`);
  }
}
