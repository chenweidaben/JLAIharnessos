/**
 * 健澜科技 jlmedaios - 儿科管理 API（M820）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PediatricsWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  feverUnknown: number;
  pneumonia: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  tempCurve: string;
  fluids: string;
  nebulization: string;
  parentCommunication: string;
}

const DEMO: PediatricsWorkload[] = [
  {
    id: 'PE-001',
    date: '2026-10-22',
    outpatient: 240,
    inpatient: 18,
    feverUnknown: 8,
    pneumonia: 10,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '急性上呼吸道感染', count: 120 },
      { name: '急性支气管炎/肺炎', count: 60 },
      { name: '腹泻病', count: 30 },
      { name: '发热待查', count: 30 },
    ],
    tempCurve: '在治发热患儿 12 例；热峰 >39℃ 4 例；热退 3 例。',
    fluids: '静脉补液 8 例；口服补液 14 例。',
    nebulization: '雾化治疗 22 人次（布地奈德 + 异丙托溴铵）。',
    parentCommunication: '家长沟通记录 18 例；满意度 4.5/5。',
  },
];

export interface PediatricsWorkloadListResult {
  items: PediatricsWorkload[];
  demo: boolean;
}

export async function fetchPediatricsWorkload(): Promise<PediatricsWorkloadListResult> {
  try {
    const res = await get<{ items: PediatricsWorkload[] }>('/pediatrics/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
