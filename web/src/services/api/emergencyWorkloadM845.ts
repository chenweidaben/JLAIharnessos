/**
 * 健澜科技 jlmedaios - 急诊科管理（M845 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EmergencyWorkloadM845 {
  id: string;
  date: string;
  visits: number;
  rescue: number;
  observation: number;
  infusion: number;
  status: string;
  triageBreakdown: { level: string; count: number; color: string }[];
  rescueRecords: string;
  greenChannel: { type: string; count: number }[];
  criticalValues: { time: string; patient: string; item: string }[];
}

const DEMO: EmergencyWorkloadM845[] = [
  {
    id: 'EM-845',
    date: '2026-10-22',
    visits: 320,
    rescue: 18,
    observation: 42,
    infusion: 180,
    status: '正常运行',
    triageBreakdown: [
      { level: 'I 级（红）', count: 6, color: 'red' },
      { level: 'II 级（橙）', count: 28, color: 'orange' },
      { level: 'III 级（黄）', count: 210, color: 'gold' },
      { level: 'IV 级（绿）', count: 76, color: 'green' },
    ],
    rescueRecords: '抢救成功 15 / 无效 3；平均停留时间 4.2 小时。',
    greenChannel: [
      { type: '卒中绿色通道', count: 6 },
      { type: '胸痛绿色通道', count: 8 },
      { type: '创伤绿色通道', count: 4 },
    ],
    criticalValues: [
      { time: '08:50', patient: '苗患者', item: 'K 6.9 mmol/L' },
    ],
  },
];

export interface EmergencyWorkloadM845Result {
  items: EmergencyWorkloadM845[];
  demo: boolean;
}

export async function fetchEmergencyWorkloadM845(): Promise<EmergencyWorkloadM845Result> {
  try {
    const res = await get<{ items: EmergencyWorkloadM845[] }>('/emergency/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
