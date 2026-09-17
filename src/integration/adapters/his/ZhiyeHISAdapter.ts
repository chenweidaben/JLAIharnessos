/**
 * 健澜科技数智医院智能体 - integration/adapters/his/ZhiyeHISAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 智业软件HIS适配器（骨架）
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 智业软件（Zhiye）HIS系统适配器骨架。
 * 智业软件在华南地区市场占有率较高，核心产品"智业数字化医院"，
 * 集成以 REST API + HL7 为主。
 *
 * 本文件为骨架实现，包含认证流程、字段映射配置与全部接口方法骨架。
 *
 * @module integration/adapters/his/ZhiyeHISAdapter
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

/** 智业HIS适配器配置 */
export interface ZhiyeHISConfig extends Partial<AdapterConfig> {
  appId?: string;
  appSecret?: string;
  orgCode?: string;
}

/**
 * 智业软件HIS适配器（骨架）
 *
 * TODO: 完成实际对接。
 */
export class ZhiyeHISAdapter extends BaseAdapter implements HISAdapter {
  private patientEventListeners = new Set<(event: PatientEvent) => void>();
  private orderEventListeners = new Set<(event: OrderEvent) => void>();

  constructor(config: ZhiyeHISConfig = {}) {
    const adapterConfig = createDefaultAdapterConfig({
      id: config.id ?? 'his-zhiye',
      type: 'his',
      vendor: '智业软件',
      version: config.version ?? 'ZY 7.0',
      name: config.name ?? '智业HIS适配器',
      description: '对接智业软件HIS系统',
      endpoint: config.endpoint ?? 'https://his-api.hospital.com/zhiye',
      timeout: config.timeout ?? 30000,
      protocol: 'rest',
      auth: {
        type: 'oauth2',
        clientId: config.appId,
        clientSecret: config.appSecret,
        tokenUrl: `${config.endpoint ?? 'https://his-api.hospital.com/zhiye'}/oauth2/token`,
        ...config.auth,
      },
      fieldMapping: {
        patient: [
          { sourceField: 'patientCode', targetField: 'patientId' },
          { sourceField: 'custName', targetField: 'name' },
          { sourceField: 'gender', targetField: 'gender', valueMap: { M: 'male', F: 'female' } },
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
      vendor: '智业软件',
      version: this.config.version,
      name: '智业HIS适配器',
      description: '对接智业软件HIS系统',
      supportedProtocols: ['rest', 'hl7'],
    };
  }

  /** 未实现方法统一抛出 */
  private notImpl(method: string, detail = ''): Promise<never> {
    return Promise.reject(
      new AdapterError(
        AdapterErrorType.BUSINESS,
        AdapterErrorCode.UNKNOWN_ERROR,
        `[ZhiyeHISAdapter] ${method} 尚未实现${detail ? `（${detail}）` : ''}`,
        { adapterId: this.id, retryable: false },
      ),
    );
  }

  getPatientInfo(patientId: string): Promise<Patient> {
    return this.notImpl('getPatientInfo', `患者ID: ${patientId}`);
  }
  searchPatients(criteria: PatientSearchCriteria): Promise<{ patients: Patient[]; total: number }> {
    return this.notImpl('searchPatients');
  }
  syncPatient(patient: Patient): Promise<PatientSyncResult> {
    return this.notImpl('syncPatient', `患者ID: ${patient.patientId}`);
  }
  getEncounter(encounterId: string): Promise<Encounter> {
    return this.notImpl('getEncounter', `就诊ID: ${encounterId}`);
  }
  getEncounterList(patientId: string): Promise<Encounter[]> {
    return this.notImpl('getEncounterList', `患者ID: ${patientId}`);
  }
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
  getPatientCost(patientId: string): Promise<BillingInfo> {
    return this.notImpl('getPatientCost', `患者ID: ${patientId}`);
  }
  getCostDetails(patientId: string, encounterId: string): Promise<BillingDetail[]> {
    return this.notImpl('getCostDetails', `就诊ID: ${encounterId}`);
  }
  getInsuranceInfo(patientId: string): Promise<InsuranceInfo> {
    return this.notImpl('getInsuranceInfo', `患者ID: ${patientId}`);
  }
  settleInsurance(
    patientId: string,
    encounterId: string,
  ): Promise<{ settled: boolean; settlementNo?: string; selfPayAmount: number }> {
    return this.notImpl('settleInsurance', `就诊ID: ${encounterId}`);
  }
  getDoctorSchedule(doctorId: string, dateRange: DateRange): Promise<Schedule[]> {
    return this.notImpl('getDoctorSchedule', `医生ID: ${doctorId}`);
  }
  getAvailableSlots(departmentId: string, date: string): Promise<Slot[]> {
    return this.notImpl('getAvailableSlots', `科室ID: ${departmentId}`);
  }
  onPatientEvent(callback: (event: PatientEvent) => void): Unsubscribe {
    this.patientEventListeners.add(callback);
    return () => this.patientEventListeners.delete(callback);
  }
  onOrderEvent(callback: (event: OrderEvent) => void): Unsubscribe {
    this.orderEventListeners.add(callback);
    return () => this.orderEventListeners.delete(callback);
  }
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
