/**
 * 健澜科技 jlmedaios - 新生儿科管理（M851 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NeonatologyWorkloadM851 {
  id: string;
  date: string;
  admitted: number;
  premature: number;
  asphyxia: number;
  jaundice: number;
  status: string;
  gestationalBreakdown: { name: string; count: number }[];
  apgar: string;
  phototherapy: string;
  nicuMonitoring: string;
  followUp: string;
}

const DEMO: NeonatologyWorkloadM851[] = [
  {
    id: 'NN-851',
    date: '2026-10-22',
    admitted: 10,
    premature: 4,
    asphyxia: 1,
    jaundice: 5,
    status: '正常运行',
    gestationalBreakdown: [
      { name: '足月（≥37 周）', count: 6 },
      { name: '晚期早产（34-36 周）', count: 2 },
      { name: '早期早产（<34 周）', count: 2 },
    ],
    apgar: '1 分钟 Apgar 8-10 分 9 例；4-7 分 1 例（轻度窒息，已复苏）。',
    phototherapy: '蓝光治疗 5 例；治疗时长平均 24h；胆红素峰值平均 18.5 mg/dl。',
    nicuMonitoring: 'NICU 监护：CPAP 2 例；鼻导管吸氧 3 例；胃肠外营养 2 例；脐静脉置管 1 例。',
    followUp: '出院随访：生长发育 1 月/3 月/6 月门诊评估；神经行为测定（NBNA）合格率 100%。',
  },
];

export interface NeonatologyWorkloadM851Result {
  items: NeonatologyWorkloadM851[];
  demo: boolean;
}

export async function fetchNeonatologyWorkloadM851(): Promise<NeonatologyWorkloadM851Result> {
  try {
    const res = await get<{ items: NeonatologyWorkloadM851[] }>('/neonatology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
