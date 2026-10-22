/**
 * 健澜科技 jlmedaios - 眼科管理 API（M822）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OphthalmologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  surgeries: number;
  cataract: number;
  glaucoma: number;
  status: string;
  surgeryBreakdown: { name: string; count: number }[];
  vision: string;
  intraocularPressure: string;
  fundus: string;
  followup: string;
}

const DEMO: OphthalmologyWorkload[] = [
  {
    id: 'OP-001',
    date: '2026-10-22',
    outpatient: 160,
    surgeries: 8,
    cataract: 5,
    glaucoma: 2,
    status: '正常运行',
    surgeryBreakdown: [
      { name: '白内障超声乳化 + 人工晶体植入', count: 5 },
      { name: '青光眼小梁切除', count: 2 },
      { name: '翼状胬肉切除', count: 1 },
    ],
    vision: '门诊视力检查 120 人次；术后裸眼视力 ≥0.5 占 80%。',
    intraocularPressure: '眼压测量 80 人次；术后眼压 12-18 mmHg 正常。',
    fundus: '眼底照相 30 人次；糖尿病视网膜病变筛查 12 例。',
    followup: '术后 1 天/1 周/1 月/3 月门诊复查视力与眼压。',
  },
];

export interface OphthalmologyWorkloadListResult {
  items: OphthalmologyWorkload[];
  demo: boolean;
}

export async function fetchOphthalmologyWorkload(): Promise<OphthalmologyWorkloadListResult> {
  try {
    const res = await get<{ items: OphthalmologyWorkload[] }>('/ophthalmology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
