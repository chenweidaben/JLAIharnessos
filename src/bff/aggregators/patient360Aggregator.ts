/**
 * 健澜科技数智医院智能体 - BFF 患者360数据聚合器
 *
 * 从 HIS（基本信息/就诊）、EMR（病历）、LIS（检验）、PACS（影像）四个适配器
 * 并行拉取，统一组装为前端患者360视图，并在出口做脱敏。
 *
 * 说明：此处以内存种子数据演示聚合契约；生产环境注入真实 AdapterRegistry。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { desensitizePatient } from '../adapters/desensitize';

interface Seed {
  patient: Record<string, unknown>;
  encounters: unknown[];
  vitalSigns: unknown[];
  labResults: unknown[];
  imagingReports: unknown[];
  orders: unknown[];
  prescriptions: unknown[];
  medicalRecords: unknown[];
  billing: Record<string, unknown>;
}

/** 生产环境：替换为对 HIS/EMR/LIS/PACS AdapterRegistry 的并行调用 */
const seeds = new Map<string, Seed>();
seeds.set('P100001', {
  // 字段对齐前端 web/src/types/patient.ts 的 Patient 视图模型
  patient: {
    id: 'P100001',
    patientNo: 'ZY2026090001',
    name: '张*',
    gender: 'male',
    age: 63,
    birthDate: '1963-04-12',
    idCardMasked: '3****************4',
    phoneMasked: '138****2201',
    bedNo: '12-03',
    deptName: '心内科',
    diagnosis: '急性心肌梗死',
    careLevel: 'special',
    allergies: ['阿司匹林'],
  },
  encounters: [],
  vitalSigns: [],
  labResults: [],
  imagingReports: [],
  orders: [],
  prescriptions: [],
  medicalRecords: [],
  billing: { totalCost: 28600, insuranceReimbursed: 21000, outOfPocket: 7600, items: [] },
});

/** 聚合患者 360 */
export function aggregatePatient360(patientId: string): Record<string, unknown> | null {
  const seed = seeds.get(patientId);
  if (!seed) return null;
  return {
    patient: desensitizePatient(seed.patient),
    encounters: seed.encounters,
    vitalSigns: seed.vitalSigns,
    labResults: seed.labResults,
    imagingReports: seed.imagingReports,
    orders: seed.orders,
    prescriptions: seed.prescriptions,
    medicalRecords: seed.medicalRecords,
    billing: seed.billing,
  };
}

/** 聚合患者列表（摘要，已脱敏） */
export function aggregatePatientList(): Record<string, unknown>[] {
  return Array.from(seeds.values()).map((s) => desensitizePatient(s.patient));
}
