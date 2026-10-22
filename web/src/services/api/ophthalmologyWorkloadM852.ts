/**
 * 健澜科技 jlmedaios - 眼科管理（M852 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OphthalmologyWorkloadM852 {
  id: string;
  date: string;
  outpatient: number;
  cataract: number;
  glaucoma: number;
  refractive: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  surgeries: string;
  vision: string;
  fundus: string;
  optometry: string;
}

const DEMO: OphthalmologyWorkloadM852[] = [
  {
    id: 'OP-852',
    date: '2026-10-22',
    outpatient: 140,
    cataract: 8,
    glaucoma: 2,
    refractive: 6,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '白内障', count: 32 },
      { name: '青光眼', count: 18 },
      { name: '屈光不正（近视/远视/散光）', count: 58 },
      { name: '眼底病（AMD/糖尿病视网膜病变）', count: 22 },
      { name: '其他（结膜炎/干眼症等）', count: 10 },
    ],
    surgeries: '手术记录：白内障超声乳化 + IOL 8 例；青光眼小梁切除 2 例；全飞秒/半飞秒 6 例。',
    vision: '视力检查记录：裸眼视力 ≥0.8 占 62%；矫正视力 ≥0.8 占 92%。',
    fundus: '眼底照相：糖尿病视网膜病变 6 例（III 期 2 / IV 期 3 / V 期 1）；AMD 4 例。',
    optometry: '验光配镜：医学验光 48 例；角膜塑形镜（OK 镜）验配 6 例。',
  },
];

export interface OphthalmologyWorkloadM852Result {
  items: OphthalmologyWorkloadM852[];
  demo: boolean;
}

export async function fetchOphthalmologyWorkloadM852(): Promise<OphthalmologyWorkloadM852Result> {
  try {
    const res = await get<{ items: OphthalmologyWorkloadM852[] }>('/ophthalmology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
