/**
 * 健澜科技 jlmedaios - ICU 监护记录 v2 API（M654，配套 M581）
 *
 * 对接 BFF：GET /api/v1/icu/monitor-records
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface IcuMonitorRecord {
  id: string;
  patientId: string;
  recordedAt: string;
  heartRate: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
  spo2: number;
  respRate: number;
  ventilatorMode: string;
  peep: number;
  fiO2: number;
}

const DEMO_RECORDS: IcuMonitorRecord[] = [
  { id: 'IC-001', patientId: 'P10011', recordedAt: '2026-10-22T06:00:00+08:00', heartRate: 98, bloodPressureSys: 110, bloodPressureDia: 65, spo2: 95, respRate: 18, ventilatorMode: 'SIMV', peep: 8, fiO2: 50 },
  { id: 'IC-002', patientId: 'P10011', recordedAt: '2026-10-22T10:00:00+08:00', heartRate: 88, bloodPressureSys: 122, bloodPressureDia: 72, spo2: 98, respRate: 16, ventilatorMode: 'SIMV', peep: 6, fiO2: 40 },
  { id: 'IC-003', patientId: 'P10011', recordedAt: '2026-10-22T14:00:00+08:00', heartRate: 82, bloodPressureSys: 128, bloodPressureDia: 76, spo2: 99, respRate: 14, ventilatorMode: 'PSV', peep: 5, fiO2: 30 },
];

export interface IcuListResult {
  items: IcuMonitorRecord[];
  totalCount: number;
  demo: boolean;
}

export async function fetchIcuMonitorRecords(patientId: string): Promise<IcuListResult> {
  try {
    const res = await get<{ items: IcuMonitorRecord[]; totalCount: number }>('/icu/monitor-records', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_RECORDS.filter((r) => r.patientId === patientId), totalCount: 0, demo: true };
  }
}
