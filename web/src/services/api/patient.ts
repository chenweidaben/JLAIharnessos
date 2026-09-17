/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 患者相关 API
 */
import { get } from '../request';
import { mockPatients, mockVitalSigns, mockAlerts } from '@/mock/patients';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import type { Patient, Patient360 } from '@/types/patient';
import type { Alert } from '@/types/medical';

export async function fetchPatients(): Promise<Patient[]> {
  if (env.mockEnabled) {
    await delay(200, 400);
    return mockPatients;
  }
  return get<Patient[]>('/patients');
}

export async function fetchPatient360(patientId: string): Promise<Patient360> {
  if (env.mockEnabled) {
    await delay(250, 500);
    const patient = mockPatients.find((p) => p.id === patientId) ?? mockPatients[0];
    return {
      patient,
      encounters: [],
      vitalSigns: mockVitalSigns(patient.id),
      alertCount: mockAlerts.filter((a) => a.patientId === patient.id && !a.acknowledged).length,
    };
  }
  return get<Patient360>(`/patients/${patientId}/360`);
}

export async function fetchAlerts(): Promise<Alert[]> {
  if (env.mockEnabled) {
    await delay(150, 300);
    return mockAlerts;
  }
  return get<Alert[]>('/alerts');
}
