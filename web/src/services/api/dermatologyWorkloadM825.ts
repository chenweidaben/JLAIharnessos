/**
 * 健澜科技 jlmedaios - 皮肤科管理 API（M825）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DermatologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  eczema: number;
  psoriasis: number;
  acne: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  dermoscopy: string;
  patchTest: string;
  laser: string;
  followup: string;
}

const DEMO: DermatologyWorkload[] = [
  {
    id: 'DE-001',
    date: '2026-10-22',
    outpatient: 110,
    eczema: 32,
    psoriasis: 8,
    acne: 24,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '湿疹/特应性皮炎', count: 32 },
      { name: '银屑病', count: 8 },
      { name: '痤疮', count: 24 },
      { name: '真菌性皮肤病', count: 18 },
      { name: '荨麻疹', count: 12 },
    ],
    dermoscopy: '皮肤镜检查 16 人次；色素痣随访 10 例。',
    patchTest: '斑贴试验 6 例（接触性皮炎）。',
    laser: '激光治疗 10 人次（光子嫩肤 6 / 脱毛 4）。',
    followup: '慢性皮肤病 2 周/4 周复诊评估疗效。',
  },
];

export interface DermatologyWorkloadListResult {
  items: DermatologyWorkload[];
  demo: boolean;
}

export async function fetchDermatologyWorkload(): Promise<DermatologyWorkloadListResult> {
  try {
    const res = await get<{ items: DermatologyWorkload[] }>('/dermatology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
