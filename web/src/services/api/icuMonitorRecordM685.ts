/**
 * 健澜科技 jlmedaios - ICU 监护记录 API（M685）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type IcuStatus = 'stable' | 'watching' | 'critical' | 'discharging';

export interface IcuMonitorRecord {
  id: string;
  bedNo: string;
  patientId: string;
  diagnosis: string;
  apacheScore: number;
  status: IcuStatus;
  ventMode: string;
  ventParams: string;
  vasoactive: string;
  fluidBalanceMl: number;
}

export const ICU_STATUS_META: Record<IcuStatus, { label: string; color: string }> = {
  stable: { label: '稳定', color: 'green' },
  watching: { label: '观察中', color: 'blue' },
  critical: { label: '危急', color: 'red' },
  discharging: { label: '拟转出', color: 'orange' },
};

const DEMO: IcuMonitorRecord[] = [
  {
    id: 'ICU-001',
    bedNo: 'ICU-01',
    patientId: 'P10011',
    diagnosis: '重症肺炎合并 ARDS',
    apacheScore: 24,
    status: 'critical',
    ventMode: 'PCV',
    ventParams: 'PC 20 / PEEP 10 / FiO₂ 60% / RR 16',
    vasoactive: '去甲肾上腺素 0.3 μg/kg/min',
    fluidBalanceMl: -800,
  },
  {
    id: 'ICU-002',
    bedNo: 'ICU-03',
    patientId: 'P10015',
    diagnosis: '心梗术后',
    apacheScore: 12,
    status: 'watching',
    ventMode: 'PSV',
    ventParams: 'PS 12 / PEEP 5 / FiO₂ 40%',
    vasoactive: '—',
    fluidBalanceMl: 300,
  },
  {
    id: 'ICU-003',
    bedNo: 'ICU-05',
    patientId: 'P10018',
    diagnosis: '术后苏醒',
    apacheScore: 5,
    status: 'discharging',
    ventMode: '自主呼吸',
    ventParams: '—',
    vasoactive: '—',
    fluidBalanceMl: 100,
  },
];

export interface RecordListResult {
  items: IcuMonitorRecord[];
  demo: boolean;
}

export async function fetchIcuMonitorRecords(): Promise<RecordListResult> {
  try {
    const res = await get<{ items: IcuMonitorRecord[] }>('/icu/monitor-records');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
