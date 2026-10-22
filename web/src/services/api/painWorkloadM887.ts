/**
 * 健澜科技 jlmedaios - 疼痛科管理（M887 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PainWorkloadM887 {
  id: string;
  date: string;
  clinicPatients: number;
  nerveBlock: number;
  rf: number;
  intrathecalPump: number;
  cancerFollowup: number;
  status: string;
  categoryBreakdown: { name: string; count: number }[];
  modalityBreakdown: { name: string; count: number }[];
  nrsComparison: string;
  gpm: string;
}

const DEMO: PainWorkloadM887[] = [
  {
    id: 'PN-887',
    date: '2026-10-22',
    clinicPatients: 42,
    nerveBlock: 14,
    rf: 4,
    intrathecalPump: 1,
    cancerFollowup: 6,
    status: '正常运行',
    categoryBreakdown: [
      { name: '神经病理性疼痛', count: 12 },
      { name: '脊柱疼痛（腰腿痛/颈肩痛）', count: 18 },
      { name: '癌痛', count: 6 },
      { name: '术后慢性疼痛', count: 6 },
    ],
    modalityBreakdown: [
      { name: '神经阻滞', count: 14 },
      { name: '射频热凝/脉冲射频', count: 4 },
      { name: '鞘内药物输注泵', count: 1 },
      { name: '脊髓电刺激（SCS）', count: 0 },
    ],
    nrsComparison: 'NRS 评分：治疗前平均 7.2；治疗后平均 3.1；下降幅度 4.1 分（显著缓解）。',
    gpm: '癌痛规范化治疗（GPM）：随访 6 例；NRS 控制 ≤3 分 5 例；爆发痛日均 ≤2 次 5 例；GPM 示范病房达标率 95%。',
  },
];

export interface PainWorkloadM887Result {
  items: PainWorkloadM887[];
  demo: boolean;
}

export async function fetchPainWorkloadM887(): Promise<PainWorkloadM887Result> {
  try {
    const res = await get<{ items: PainWorkloadM887[] }>('/pain/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
