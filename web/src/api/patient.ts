/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者相关 API：列表 / 详情 / 就诊历史（患者360 聚合）。
 *  - 真实模式：GET /api/v1/patients、/patients/:id、/patients/:id/360
 *  - 演示模式：短路到 web/src/mock（mock/patients.ts + mock/patient360.ts）
 */
import { get } from './client';
import { isDemoMode } from '@/config';
import { delay } from '@/mock/utils';
import { mockPatients, mockVitalSigns, mockAlerts } from '@/mock/patients';
import {
  buildEncounters,
  buildLabReports,
  buildOrders,
  buildDocuments,
  buildImagings,
} from '@/mock/patient360';
import type { Patient, Patient360 } from '@/types/patient';

/** 患者列表（在院） */
export async function listPatients(): Promise<Patient[]> {
  if (isDemoMode) {
    await delay(180, 360);
    return mockPatients.map((p) => ({ ...p }));
  }
  return get<Patient[]>('/patients');
}

/** 患者基本信息详情 */
export async function getPatientDetail(patientId: string): Promise<Patient> {
  if (isDemoMode) {
    await delay(120, 240);
    const found = mockPatients.find((p) => p.id === patientId) ?? mockPatients[0];
    return { ...found };
  }
  return get<Patient>(`/patients/${patientId}`);
}

/** 患者360：基本信息 + 就诊历史 + 检验 + 医嘱 + 病历 + 影像 */
export async function getPatientHistory(patientId: string): Promise<Patient360> {
  if (isDemoMode) {
    await delay(220, 420);
    const patient = mockPatients.find((p) => p.id === patientId) ?? mockPatients[0];
    return {
      patient,
      encounters: buildEncounters(patient),
      vitalSigns: mockVitalSigns(patient.id),
      alertCount: mockAlerts.filter((a) => a.patientId === patient.id && !a.acknowledged).length,
      labReports: buildLabReports(patient),
      orders: buildOrders(patient),
      documents: buildDocuments(patient),
      imagings: buildImagings(patient),
    };
  }
  return get<Patient360>(`/patients/${patientId}/360`);
}
