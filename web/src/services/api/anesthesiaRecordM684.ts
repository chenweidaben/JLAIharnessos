/**
 * 健澜科技 jlmedaios - 麻醉记录单 API（M684）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AnesthesiaType = 'general' | 'epidural' | 'spinal' | 'nerve_block' | 'local';

export interface VitalsPoint {
  time: string;
  heartRate: number;
  sbp: number;
  dbp: number;
  spo2: number;
  respRate: number;
}

export interface AnesthesiaRecord {
  id: string;
  patientId: string;
  surgeryName: string;
  anesthesiaType: AnesthesiaType;
  anesthetist: string;
  asaClass: string;
  startedAt: string;
  endedAt: string;
  meds: string[];
  intakeMl: number;
  outputMl: number;
  vitals: VitalsPoint[];
}

export const ANESTHESIA_TYPE_META: Record<AnesthesiaType, { label: string; color: string }> = {
  general: { label: '全麻', color: 'purple' },
  epidural: { label: '硬膜外', color: 'blue' },
  spinal: { label: '腰麻', color: 'cyan' },
  nerve_block: { label: '神经阻滞', color: 'orange' },
  local: { label: '局麻', color: 'green' },
};

const DEMO: AnesthesiaRecord[] = [
  {
    id: 'AN-001',
    patientId: 'P10002',
    surgeryName: '腹腔镜胆囊切除术',
    anesthesiaType: 'general',
    anesthetist: '李麻醉',
    asaClass: 'ASA II',
    startedAt: '2026-10-22T09:00:00+08:00',
    endedAt: '2026-10-22T10:45:00+08:00',
    meds: ['丙泊酚 TCI 3.0 μg/ml', '瑞芬太尼 0.15 μg/kg/min', '罗库溴铵 50mg'],
    intakeMl: 1200,
    outputMl: 400,
    vitals: [
      { time: '09:00', heartRate: 78, sbp: 128, dbp: 76, spo2: 99, respRate: 14 },
      { time: '09:30', heartRate: 72, sbp: 118, dbp: 68, spo2: 99, respRate: 14 },
      { time: '10:00', heartRate: 70, sbp: 115, dbp: 65, spo2: 99, respRate: 13 },
      { time: '10:30', heartRate: 74, sbp: 122, dbp: 70, spo2: 99, respRate: 14 },
    ],
  },
];

export interface RecordListResult {
  items: AnesthesiaRecord[];
  demo: boolean;
}

export async function fetchAnesthesiaRecords(): Promise<RecordListResult> {
  try {
    const res = await get<{ items: AnesthesiaRecord[] }>('/anesthesia/records');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
