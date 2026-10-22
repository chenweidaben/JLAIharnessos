/**
 * 健澜科技 jlmedaios - 耳鼻喉科管理（M853 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EntWorkloadM853 {
  id: string;
  date: string;
  outpatient: number;
  nasoEndoscopy: number;
  laryngoscopy: number;
  hearing: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  surgeries: string;
  hearingTests: string;
  vertigo: string;
}

const DEMO: EntWorkloadM853[] = [
  {
    id: 'ENT-853',
    date: '2026-10-22',
    outpatient: 160,
    nasoEndoscopy: 24,
    laryngoscopy: 18,
    hearing: 36,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '鼻炎/鼻窦炎', count: 58 },
      { name: '咽炎/扁桃体炎', count: 32 },
      { name: '中耳炎', count: 28 },
      { name: '声带息肉/喉炎', count: 16 },
      { name: '其他', count: 26 },
    ],
    surgeries: '手术记录：鼻息肉摘除 2 例；扁桃体切除 2 例；鼓膜修补 1 例；声带息肉摘除 1 例。',
    hearingTests: '听力检查：纯音测听 30 例（传导性聋 8 / 感音神经性聋 14 / 混合性 8）；声导抗 24 例。',
    vertigo: '眩晕门诊：BPPV 12 例（Epley 复位 10 例有效）；梅尼埃病 2 例。',
  },
];

export interface EntWorkloadM853Result {
  items: EntWorkloadM853[];
  demo: boolean;
}

export async function fetchEntWorkloadM853(): Promise<EntWorkloadM853Result> {
  try {
    const res = await get<{ items: EntWorkloadM853[] }>('/ent/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
