/**
 * 健澜科技 jlmedaios - 危重患者护理记录 API（M697）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type CareLevel = 'special' | 'level1';

export interface CriticalCareVitals {
  time: string;
  heartRate: number;
  sbp: number;
  dbp: number;
  spo2: number;
}

export interface CriticalCareRecord {
  id: string;
  bedNo: string;
  patientId: string;
  diagnosis: string;
  recordedAt: string;
  careLevel: CareLevel;
  vitals: CriticalCareVitals[];
  lines: string[];
  skinCondition: string;
  nursingMeasures: string[];
}

export const CARE_LEVEL_META: Record<CareLevel, { label: string; color: string }> = {
  special: { label: '特级护理', color: 'red' },
  level1: { label: '一级护理', color: 'orange' },
};

const DEMO: CriticalCareRecord[] = [
  {
    id: 'CC-001',
    bedNo: 'ICU-01',
    patientId: 'P10011',
    diagnosis: '重症肺炎合并 ARDS',
    recordedAt: '2026-10-22T10:00:00+08:00',
    careLevel: 'special',
    vitals: [
      { time: '08:00', heartRate: 110, sbp: 95, dbp: 60, spo2: 92 },
      { time: '09:00', heartRate: 105, sbp: 100, dbp: 65, spo2: 95 },
      { time: '10:00', heartRate: 100, sbp: 105, dbp: 70, spo2: 96 },
    ],
    lines: ['气管插管（PCV）', '中心静脉导管（右颈内）', '尿管', '胃管'],
    skinCondition: '骶尾部皮肤完整，压疮分期 I；双侧足跟减压贴。',
    nursingMeasures: ['q1h 监测生命体征', '气道湿化每 2h', '口腔护理 q4h', '翻身 q2h'],
  },
];

export interface RecordListResult {
  items: CriticalCareRecord[];
  demo: boolean;
}

export async function fetchCriticalCareRecords(): Promise<RecordListResult> {
  try {
    const res = await get<{ items: CriticalCareRecord[] }>('/nurse/critical-care-records');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
