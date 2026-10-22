/**
 * 健澜科技 jlmedaios - 新生儿科管理 API（M821）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NeonatologyWorkload {
  id: string;
  date: string;
  admissions: number;
  preterm: number;
  lowBirthWeight: number;
  nicu: number;
  status: string;
  reasonBreakdown: { name: string; count: number }[];
  incubator: string;
  phototherapy: string;
  umbilicalLine: string;
  followup: string;
}

const DEMO: NeonatologyWorkload[] = [
  {
    id: 'NE-001',
    date: '2026-10-22',
    admissions: 10,
    preterm: 5,
    lowBirthWeight: 4,
    nicu: 3,
    status: '正常运行',
    reasonBreakdown: [
      { name: '早产儿（<37w）', count: 5 },
      { name: '新生儿黄疸', count: 3 },
      { name: '新生儿肺炎', count: 1 },
      { name: '新生儿窒息复苏后', count: 1 },
    ],
    incubator: '暖箱在治 6 例；温度 32-34℃；体重监测 q4h。',
    phototherapy: '蓝光治疗 4 例；光疗时长平均 36h；胆红素监测 q12h。',
    umbilicalLine: '脐静脉插管 2 例；置管深度 7cm；X 线确认位置。',
    followup: '出院后 1 月/3 月/6 月/12 月随访神经运动发育。',
  },
];

export interface NeonatologyWorkloadListResult {
  items: NeonatologyWorkload[];
  demo: boolean;
}

export async function fetchNeonatologyWorkload(): Promise<NeonatologyWorkloadListResult> {
  try {
    const res = await get<{ items: NeonatologyWorkload[] }>('/neonatology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
