/**
 * 健澜科技 jlmedaios - 急诊科管理 API（M815）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EmergencyWorkload {
  id: string;
  date: string;
  visits: number;
  resuscitation: number;
  observation: number;
  admission: number;
  status: string;
  visitBreakdown: { name: string; count: number }[];
  triageLevels: { level: string; count: number }[];
  resusRecords: { time: string; patient: string; chief: string; outcome: string }[];
  greenChannel: string;
  los: string;
}

const DEMO: EmergencyWorkload[] = [
  {
    id: 'EM-001',
    date: '2026-10-22',
    visits: 320,
    resuscitation: 8,
    observation: 46,
    admission: 28,
    status: '正常运行',
    visitBreakdown: [
      { name: '内科急诊', count: 150 },
      { name: '外科急诊', count: 120 },
      { name: '儿科急诊', count: 50 },
    ],
    triageLevels: [
      { level: 'I 级（濒危）', count: 2 },
      { level: 'II 级（危重）', count: 12 },
      { level: 'III 级（急症）', count: 148 },
      { level: 'IV 级（亚急症）', count: 138 },
      { level: 'V 级（非急症）', count: 20 },
    ],
    resusRecords: [
      { time: '08:15', patient: '崔患者', chief: '急性胸痛', outcome: '启动 STEMI 绿色通道，35min 内 D-to-B' },
    ],
    greenChannel: '卒中绿色通道 2 例；DNT 平均 28min；创伤绿色通道 1 例。',
    los: '急诊平均停留时间 3.2h；滞留 >24h 2 例。',
  },
];

export interface EmergencyWorkloadListResult {
  items: EmergencyWorkload[];
  demo: boolean;
}

export async function fetchEmergencyWorkload(): Promise<EmergencyWorkloadListResult> {
  try {
    const res = await get<{ items: EmergencyWorkload[] }>('/emergency/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
