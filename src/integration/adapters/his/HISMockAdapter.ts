/**
 * 健澜科技数智医院智能体 - integration/adapters/his/HISMockAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - HIS Mock适配器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 实现HISAdapter接口，返回真实可信的模拟医疗数据。
 * 用于开发环境、测试环境和演示场景，无需对接真实HIS系统。
 *
 * 内置：20+ 模拟患者、就诊/医嘱/费用/医保/排班数据、
 * 患者入院/医嘱变更/危急值事件模拟、网络延迟模拟。
 *
 * @module integration/adapters/his/HISMockAdapter
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
import { createDefaultAdapterConfig } from '../AdapterConfig';
import { AdapterError, AdapterErrorCode } from '../AdapterError';
import { BaseAdapter } from '../BaseAdapter';
import type {
  AsyncTask,
  BatchOrderResult,
  HISAdapter,
  OrderEvent,
  PatientEvent,
  PatientSyncResult,
} from './HISAdapter';

/** Mock数据配置 */
export interface HISMockConfig {
  /** 患者数据量 */
  patientCount?: number;
  /** 是否随机延迟（模拟网络延迟） */
  simulateLatency?: boolean;
  /** 延迟范围（毫秒） */
  latencyRange?: [number, number];
}

/** 危急值事件（HIS侧模拟推送） */
export interface CriticalValuePush {
  eventId: string;
  patientId: string;
  testItemName: string;
  resultValue: string;
  unit: string;
  reportedAt: string;
}

/**
 * HIS Mock适配器
 *
 * 内置模拟的患者、就诊、医嘱、费用、排班数据，
 * 支持事件订阅（可手动触发事件）。
 */
export class HISMockAdapter extends BaseAdapter implements HISAdapter {
  private readonly mockConfig: Required<HISMockConfig>;
  private patients = new Map<string, Patient>();
  private encounters = new Map<string, Encounter>();
  private orders = new Map<string, Order>();
  private patientEventListeners = new Set<(event: PatientEvent) => void>();
  private orderEventListeners = new Set<(event: OrderEvent) => void>();
  private criticalValueListeners = new Set<(event: CriticalValuePush) => void>();
  private asyncTasks = new Map<string, AsyncTask>();
  private orderCounter = 0;
  private taskCounter = 0;

  constructor(mockConfig: HISMockConfig = {}) {
    const config = createDefaultAdapterConfig({
      id: 'his-mock',
      type: 'his',
      vendor: 'mock',
      version: '1.0.0',
      name: 'HIS Mock适配器',
      description: '用于开发和测试的HIS模拟适配器',
      endpoint: 'mock://his',
      timeout: 5000,
    });
    super(config);

    this.mockConfig = {
      patientCount: mockConfig.patientCount ?? 50,
      simulateLatency: mockConfig.simulateLatency ?? false,
      latencyRange: mockConfig.latencyRange ?? [10, 100],
    };
  }

  getMetadata(): AdapterMetadata {
    return {
      id: this.config.id,
      type: 'his',
      vendor: 'mock',
      version: '1.0.0',
      name: 'HIS Mock适配器',
      description: '模拟HIS系统，返回真实可信的医疗数据',
      supportedProtocols: ['mock'],
    };
  }

  protected override async onInit(): Promise<void> {
    this.seedMockData();
  }

  protected override async onConnect(): Promise<void> {
    // Mock适配器无需真实连接
  }

  // ============================================================
  // Mock数据生成
  // ============================================================

  /** 生成模拟数据 */
  private seedMockData(): void {
    const surnames = [
      '张',
      '王',
      '李',
      '赵',
      '刘',
      '陈',
      '杨',
      '黄',
      '周',
      '吴',
      '徐',
      '孙',
      '马',
      '朱',
      '胡',
      '郭',
      '何',
      '林',
      '罗',
      '郑',
    ];
    const givenNames = [
      '伟',
      '芳',
      '娜',
      '敏',
      '静',
      '强',
      '磊',
      '军',
      '洋',
      '勇',
      '艳',
      '杰',
      '娟',
      '涛',
      '明',
      '超',
      '秀英',
      '霞',
      '平',
      '刚',
    ];
    const departments = [
      '心内科',
      '呼吸内科',
      '消化内科',
      '神经内科',
      '内分泌科',
      '骨科',
      '普外科',
      '神经外科',
      '妇产科',
      '儿科',
      '急诊科',
      'ICU',
    ];
    const diagnoses = [
      '高血压病',
      '2型糖尿病',
      '冠心病',
      '脑梗死',
      '慢性阻塞性肺疾病',
      '急性阑尾炎',
      '肺炎',
      '慢性胃炎',
      '腰椎间盘突出',
      '甲状腺结节',
    ];
    const allergies = ['青霉素', '头孢类', '磺胺类', '阿司匹林', '无'];

    for (let i = 1; i <= this.mockConfig.patientCount; i++) {
      const patientId = `P${String(20240000 + i).padStart(8, '0')}`;
      const surname = surnames[Math.floor(Math.random() * surnames.length)];
      const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const birthYear = 1950 + Math.floor(Math.random() * 60);
      const birthMonth = 1 + Math.floor(Math.random() * 12);
      const birthDay = 1 + Math.floor(Math.random() * 28);
      const allergy = allergies[Math.floor(Math.random() * allergies.length)];

      const patient: Patient = {
        patientId,
        name: surname + givenName,
        gender,
        birthDate: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
        age: 2026 - birthYear,
        idCard: `3301${String(10000000000000 + Math.floor(Math.random() * 89999999999999))}`,
        phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        address: '浙江省杭州市余杭区',
        allergies: allergy === '无' ? [] : [allergy],
        maritalStatus: Math.random() > 0.3 ? '已婚' : '未婚',
        ethnicity: '汉族',
        createdAt: '2024-01-15T08:30:00Z',
      };
      this.patients.set(patientId, patient);

      // 为部分患者生成就诊记录
      if (Math.random() > 0.3) {
        const encounterCount = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < encounterCount; j++) {
          const encounterId = `E${patientId.slice(1)}${j + 1}`;
          const dept = departments[Math.floor(Math.random() * departments.length)];
          const diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];
          const encounterType = Math.random() > 0.6 ? 'inpatient' : 'outpatient';

          const encounter: Encounter = {
            encounterId,
            patientId,
            encounterType,
            status: encounterType === 'inpatient' && Math.random() > 0.5 ? 'active' : 'finished',
            department: dept,
            departmentCode: `DEPT${String(departments.indexOf(dept) + 1).padStart(3, '0')}`,
            ward: encounterType === 'inpatient' ? `${dept}病房` : undefined,
            bedNo:
              encounterType === 'inpatient'
                ? `${12 + Math.floor(Math.random() * 5)}0${1 + Math.floor(Math.random() * 8)}`
                : undefined,
            attendingDoctor: '王医生',
            attendingDoctorId: 'DOC001',
            chiefComplaint: diagnosis === '高血压病' ? '发现血压升高5年，头晕1周' : '体检发现异常',
            primaryDiagnosis: diagnosis,
            primaryDiagnosisCode: `ICD10-${Math.floor(Math.random() * 900 + 100)}`,
            admittedAt: `2024-${String(1 + Math.floor(Math.random() * 9)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}T09:00:00Z`,
            dischargedAt:
              encounterType === 'inpatient'
                ? `2024-${String(2 + Math.floor(Math.random() * 9)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}T10:00:00Z`
                : undefined,
            createdAt: '2024-01-15T09:00:00Z',
          };
          this.encounters.set(encounterId, encounter);
        }
      }

      // 为部分患者生成医嘱
      if (Math.random() > 0.4) {
        const drugNames = [
          '硝苯地平缓释片',
          '二甲双胍片',
          '阿司匹林肠溶片',
          '阿托伐他汀钙片',
          '美托洛尔片',
          '奥美拉唑胶囊',
          '左氧氟沙星片',
        ];
        const orderCount = 1 + Math.floor(Math.random() * 4);
        for (let j = 0; j < orderCount; j++) {
          const orderId = `ORD${patientId.slice(1)}${j + 1}`;
          const drug = drugNames[Math.floor(Math.random() * drugNames.length)];
          const order: Order = {
            orderId,
            hisOrderId: `HIS${orderId}`,
            patientId,
            orderType: 'drug',
            orderName: drug,
            status: Math.random() > 0.3 ? 'completed' : 'active',
            dosage: ['10mg', '20mg', '50mg', '100mg'][Math.floor(Math.random() * 4)],
            frequency: ['QD', 'BID', 'TID', 'QID'][Math.floor(Math.random() * 4)],
            route: '口服',
            orderedBy: '王医生',
            orderedAt: '2024-06-15T09:30:00Z',
            startAt: '2024-06-15T09:30:00Z',
          };
          this.orders.set(orderId, order);
        }
      }
    }
  }

  /** 模拟延迟 */
  private async simulateLatency(): Promise<void> {
    if (!this.mockConfig.simulateLatency) return;
    const [min, max] = this.mockConfig.latencyRange;
    const delay = min + Math.random() * (max - min);
    await this.sleep(delay);
  }

  // ============================================================
  // 1. 患者信息
  // ============================================================

  async getPatientInfo(patientId: string): Promise<Patient> {
    return this.execute(async () => {
      await this.simulateLatency();
      const patient = this.patients.get(patientId);
      if (!patient) {
        throw AdapterError.business(
          `患者 [${patientId}] 不存在`,
          AdapterErrorCode.PATIENT_NOT_FOUND,
          { adapterId: this.id },
        );
      }
      return patient;
    });
  }

  async searchPatients(
    criteria: PatientSearchCriteria,
  ): Promise<{ patients: Patient[]; total: number }> {
    return this.execute(async () => {
      await this.simulateLatency();
      let results = Array.from(this.patients.values());

      if (criteria.patientId) {
        results = results.filter((p) => p.patientId === criteria.patientId);
      }
      if (criteria.name) {
        results = results.filter((p) => p.name.includes(criteria.name!));
      }
      if (criteria.gender) {
        results = results.filter((p) => p.gender === criteria.gender);
      }
      if (criteria.idCard) {
        results = results.filter((p) => p.idCard === criteria.idCard);
      }
      if (criteria.phone) {
        results = results.filter((p) => p.phone === criteria.phone);
      }

      const total = results.length;
      const page = criteria.page ?? 1;
      const pageSize = criteria.pageSize ?? 20;
      const start = (page - 1) * pageSize;
      const paged = results.slice(start, start + pageSize);

      return { patients: paged, total };
    });
  }

  async syncPatient(patient: Patient): Promise<PatientSyncResult> {
    return this.execute(async () => {
      await this.simulateLatency();
      const existing = this.patients.get(patient.patientId);
      if (existing) {
        this.patients.set(patient.patientId, {
          ...existing,
          ...patient,
          updatedAt: new Date().toISOString(),
        });
        return {
          patientId: patient.patientId,
          action: 'updated',
          synchronizedAt: new Date().toISOString(),
          message: '患者信息已更新',
        };
      }
      this.patients.set(patient.patientId, { ...patient, createdAt: new Date().toISOString() });
      return {
        patientId: patient.patientId,
        action: 'created',
        synchronizedAt: new Date().toISOString(),
        message: '患者已建档',
      };
    });
  }

  // ============================================================
  // 2. 就诊信息
  // ============================================================

  async getEncounter(encounterId: string): Promise<Encounter> {
    return this.execute(async () => {
      await this.simulateLatency();
      const encounter = this.encounters.get(encounterId);
      if (!encounter) {
        throw AdapterError.business(
          `就诊 [${encounterId}] 不存在`,
          AdapterErrorCode.ENCOUNTER_NOT_FOUND,
          { adapterId: this.id },
        );
      }
      return encounter;
    });
  }

  async getEncounterList(patientId: string, limit = 20): Promise<Encounter[]> {
    return this.execute(async () => {
      await this.simulateLatency();
      const list = Array.from(this.encounters.values())
        .filter((e) => e.patientId === patientId)
        .sort((a, b) => (b.admittedAt ?? '').localeCompare(a.admittedAt ?? ''))
        .slice(0, limit);
      return list;
    });
  }

  // ============================================================
  // 3. 医嘱管理
  // ============================================================

  async createOrder(request: OrderCreateRequest): Promise<OrderResult> {
    return this.execute(async () => {
      await this.simulateLatency();
      this.orderCounter++;
      const orderId = `ORD${Date.now()}${this.orderCounter}`;
      const order: Order = {
        orderId,
        hisOrderId: `HIS${orderId}`,
        patientId: request.patientId,
        encounterId: request.encounterId,
        orderType: request.orderType,
        orderName: request.orderName,
        status: 'active',
        dosage: request.dosage,
        frequency: request.frequency,
        route: request.route,
        orderedBy: request.orderedBy,
        orderedAt: new Date().toISOString(),
        startAt: new Date().toISOString(),
        notes: request.notes,
      };
      this.orders.set(orderId, order);

      // 触发医嘱创建事件
      this.emitOrderEvent({
        eventType: 'created',
        orderId,
        hisOrderId: order.hisOrderId,
        patientId: request.patientId,
        encounterId: request.encounterId,
        timestamp: new Date().toISOString(),
        data: { orderName: request.orderName, orderType: request.orderType },
      });

      return {
        orderId,
        hisOrderId: order.hisOrderId,
        status: 'active',
        orderedAt: new Date().toISOString(),
        message: '医嘱下达成功',
      };
    });
  }

  async placeOrderAsync(request: OrderCreateRequest): Promise<{ taskId: string }> {
    return this.execute(async () => {
      this.taskCounter++;
      const taskId = `TASK${String(this.taskCounter).padStart(6, '0')}`;
      this.asyncTasks.set(taskId, {
        taskId,
        taskType: 'order',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      });
      // 后台异步处理
      void this.processAsyncOrder(taskId, request);
      return { taskId };
    });
  }

  /** 后台异步处理医嘱 */
  private async processAsyncOrder(taskId: string, request: OrderCreateRequest): Promise<void> {
    const task = this.asyncTasks.get(taskId);
    if (task) task.status = 'processing';
    await this.sleep(50); // 模拟处理耗时
    const result = await this.createOrder(request);
    const updated = this.asyncTasks.get(taskId);
    if (updated) {
      updated.status = 'completed';
      updated.finishedAt = new Date().toISOString();
      updated.result = result;
    }
  }

  async cancelOrder(orderId: string, reason: string): Promise<boolean> {
    return this.execute(async () => {
      await this.simulateLatency();
      const order = this.orders.get(orderId);
      if (!order) {
        throw AdapterError.business(`医嘱 [${orderId}] 不存在`, AdapterErrorCode.ORDER_NOT_FOUND, {
          adapterId: this.id,
        });
      }
      order.status = 'cancelled';
      order.stopAt = new Date().toISOString();
      order.notes = reason;

      this.emitOrderEvent({
        eventType: 'cancelled',
        orderId,
        hisOrderId: order.hisOrderId,
        patientId: order.patientId,
        encounterId: order.encounterId,
        timestamp: new Date().toISOString(),
        data: { reason },
      });

      return true;
    });
  }

  async getOrderList(patientId: string, encounterId?: string): Promise<Order[]> {
    return this.execute(async () => {
      await this.simulateLatency();
      let list = Array.from(this.orders.values()).filter((o) => o.patientId === patientId);
      if (encounterId) {
        list = list.filter((o) => o.encounterId === encounterId);
      }
      return list.sort((a, b) => (b.orderedAt ?? '').localeCompare(a.orderedAt ?? ''));
    });
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    return this.execute(async () => {
      await this.simulateLatency();
      const order = this.orders.get(orderId);
      if (!order) {
        throw AdapterError.business(`医嘱 [${orderId}] 不存在`, AdapterErrorCode.ORDER_NOT_FOUND, {
          adapterId: this.id,
        });
      }
      return order.status;
    });
  }

  // ============================================================
  // 4. 费用查询
  // ============================================================

  async getPatientCost(patientId: string, encounterId?: string): Promise<BillingInfo> {
    return this.execute(async () => {
      await this.simulateLatency();
      const totalAmount = 5000 + Math.floor(Math.random() * 20000);
      const insuranceAmount = Math.floor(totalAmount * 0.65);
      const selfPayAmount = totalAmount - insuranceAmount;

      return {
        patientId,
        encounterId,
        totalAmount,
        insuranceAmount,
        selfPayAmount,
        depositBalance: 2000 + Math.floor(Math.random() * 8000),
        currency: 'CNY',
      };
    });
  }

  async getCostDetails(patientId: string, encounterId: string): Promise<BillingDetail[]> {
    return this.execute(async () => {
      await this.simulateLatency();
      const items = [
        { name: '床位费', type: '床位', price: 80 },
        { name: '护理费', type: '护理', price: 50 },
        { name: '药品费', type: '药品', price: 320 },
        { name: '检查费', type: '检查', price: 280 },
        { name: '化验费', type: '检验', price: 150 },
        { name: '治疗费', type: '治疗', price: 200 },
      ];
      return items.map((item, idx) => ({
        itemId: `BILL${idx + 1}`,
        itemName: item.name,
        itemType: item.type,
        quantity: 1 + Math.floor(Math.random() * 5),
        unitPrice: item.price,
        totalPrice: item.price * (1 + Math.floor(Math.random() * 5)),
        insuranceCoverage: Math.floor(item.price * 0.6),
        selfPay: Math.floor(item.price * 0.4),
        chargedAt: '2024-06-15T10:00:00Z',
      }));
    });
  }

  // ============================================================
  // 5. 医保结算
  // ============================================================

  async getInsuranceInfo(patientId: string): Promise<InsuranceInfo> {
    return this.execute(async () => {
      await this.simulateLatency();
      return {
        patientId,
        insuranceType: '城镇职工基本医疗保险',
        insuranceNo: `YB${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}`,
        coverageStatus: 'active',
        deductibleRemaining: 500 + Math.floor(Math.random() * 1500),
        reimbursementRate: 0.85,
        accountBalance: 1200 + Math.floor(Math.random() * 5000),
      };
    });
  }

  async settleInsurance(
    patientId: string,
    encounterId: string,
  ): Promise<{ settled: boolean; settlementNo?: string; selfPayAmount: number }> {
    return this.execute(async () => {
      await this.simulateLatency();
      const cost = await this.getPatientCost(patientId, encounterId);
      return {
        settled: true,
        settlementNo: `SETT${Date.now()}`,
        selfPayAmount: cost.selfPayAmount,
      };
    });
  }

  // ============================================================
  // 6. 排班与号源
  // ============================================================

  async getDoctorSchedule(doctorId: string, dateRange: DateRange): Promise<Schedule[]> {
    return this.execute(async () => {
      await this.simulateLatency();
      const schedules: Schedule[] = [];
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const clinicTypes = ['general', 'specialist', 'expert'] as const;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (Math.random() > 0.3) {
          const totalSlots = 20 + Math.floor(Math.random() * 30);
          const bookedSlots = Math.floor(totalSlots * (0.3 + Math.random() * 0.6));
          schedules.push({
            scheduleId: `SCH${doctorId}${d.toISOString().slice(0, 10).replace(/-/g, '')}`,
            doctorId,
            doctorName: '王医生',
            department: '心内科',
            departmentCode: 'DEPT001',
            date: d.toISOString().slice(0, 10),
            timeSlot: Math.random() > 0.5 ? 'morning' : 'afternoon',
            clinicType: clinicTypes[Math.floor(Math.random() * clinicTypes.length)],
            totalSlots,
            bookedSlots,
            remainingSlots: totalSlots - bookedSlots,
            status: totalSlots - bookedSlots > 0 ? 'available' : 'full',
          });
        }
      }
      return schedules;
    });
  }

  async getAvailableSlots(departmentId: string, date: string): Promise<Slot[]> {
    return this.execute(async () => {
      await this.simulateLatency();
      const slots: Slot[] = [];
      const times = [
        '08:00',
        '08:30',
        '09:00',
        '09:30',
        '10:00',
        '10:30',
        '11:00',
        '14:00',
        '14:30',
        '15:00',
        '15:30',
        '16:00',
      ];
      times.forEach((time, idx) => {
        const status = Math.random() > 0.4 ? 'available' : 'booked';
        slots.push({
          slotId: `SLOT${departmentId}${date.replace(/-/g, '')}${idx + 1}`,
          scheduleId: `SCH${departmentId}${date.replace(/-/g, '')}`,
          date,
          startTime: time,
          endTime: `${time.slice(0, 2)}:${String(Number(time.slice(3)) + 30).padStart(2, '0')}`,
          sequenceNo: idx + 1,
          status: status,
        });
      });
      return slots;
    });
  }

  // ============================================================
  // 7. 事件订阅
  // ============================================================

  onPatientEvent(callback: (event: PatientEvent) => void): Unsubscribe {
    this.patientEventListeners.add(callback);
    return () => {
      this.patientEventListeners.delete(callback);
    };
  }

  onOrderEvent(callback: (event: OrderEvent) => void): Unsubscribe {
    this.orderEventListeners.add(callback);
    return () => {
      this.orderEventListeners.delete(callback);
    };
  }

  /** 订阅危急值推送（HIS 侧） */
  onCriticalValue(callback: (event: CriticalValuePush) => void): Unsubscribe {
    this.criticalValueListeners.add(callback);
    return () => {
      this.criticalValueListeners.delete(callback);
    };
  }

  /** 触发患者事件（测试用） */
  emitPatientEvent(event: PatientEvent): void {
    this.patientEventListeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        // 忽略监听器错误
      }
    });
  }

  /** 触发危急值事件（测试用） */
  emitCriticalValue(event: CriticalValuePush): void {
    this.criticalValueListeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        // 忽略监听器错误
      }
    });
  }

  /** 触发医嘱事件 */
  private emitOrderEvent(event: OrderEvent): void {
    this.orderEventListeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        // 忽略监听器错误
      }
    });
  }

  // ============================================================
  // 8. 批量与异步操作
  // ============================================================

  async batchGetPatients(
    patientIds: string[],
  ): Promise<{ patients: Patient[]; notFound: string[] }> {
    return this.execute(async () => {
      await this.simulateLatency();
      const patients: Patient[] = [];
      const notFound: string[] = [];
      for (const id of patientIds) {
        const p = this.patients.get(id);
        if (p) patients.push(p);
        else notFound.push(id);
      }
      return { patients, notFound };
    });
  }

  async batchCreateOrders(requests: OrderCreateRequest[]): Promise<BatchOrderResult> {
    return this.execute(async () => {
      const succeeded: OrderResult[] = [];
      const failed: { request: OrderCreateRequest; error: string }[] = [];
      for (const req of requests) {
        try {
          const result = await this.createOrder(req);
          succeeded.push(result);
        } catch (error) {
          failed.push({
            request: req,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return { total: requests.length, succeeded, failed };
    });
  }

  async getAsyncTaskStatus(taskId: string): Promise<AsyncTask> {
    return this.execute(async () => {
      const task = this.asyncTasks.get(taskId);
      if (!task) {
        throw AdapterError.business(`异步任务 [${taskId}] 不存在`, AdapterErrorCode.UNKNOWN_ERROR, {
          adapterId: this.id,
        });
      }
      return task;
    });
  }
}
