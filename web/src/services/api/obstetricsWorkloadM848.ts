/**
 * 健澜科技 jlmedaios - 产科管理（M848 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ObstetricsWorkloadM848 {
  id: string;
  date: string;
  deliveries: number;
  cesarean: number;
  vaginal: number;
  highRisk: number;
  status: string;
  deliveryBreakdown: { name: string; count: number }[];
  apgar: string;
  postpartumHemorrhage: string;
  preEclampsia: string;
  followUp: string;
}

const DEMO: ObstetricsWorkloadM848[] = [
  {
    id: 'OB-848',
    date: '2026-10-22',
    deliveries: 16,
    cesarean: 6,
    vaginal: 10,
    highRisk: 5,
    status: '正常运行',
    deliveryBreakdown: [
      { name: '顺产（含会阴侧切 2）', count: 10 },
      { name: '剖宫产', count: 6 },
      { name: '助产（产钳/胎吸）', count: 1 },
    ],
    apgar: '1 分钟 Apgar≥8 分 14 例；4-7 分 2 例；≤3 分 0 例。',
    postpartumHemorrhage: '产后出血 >500ml 2 例（已用缩宫素/卡前列素；1 例宫腔填塞）。',
    preEclampsia: '妊高征管理 5 例；重度子痫前期 1 例（硫酸镁解痉）。',
    followUp: '产后访视 16 例（出院后 3-7 天上门）；恶露/母乳喂养/子宫复旧评估完成率 100%。',
  },
];

export interface ObstetricsWorkloadM848Result {
  items: ObstetricsWorkloadM848[];
  demo: boolean;
}

export async function fetchObstetricsWorkloadM848(): Promise<ObstetricsWorkloadM848Result> {
  try {
    const res = await get<{ items: ObstetricsWorkloadM848[] }>('/obstetrics/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
