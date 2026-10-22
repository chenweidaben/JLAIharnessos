/**
 * 健澜科技 jlmedaios - 疼痛科管理 API（M817）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PainWorkload {
  id: string;
  date: string;
  outpatient: number;
  treatment: number;
  nerveBlock: number;
  radiofrequency: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  vas: string;
  records: string;
  outcome: string;
  followup: string;
}

const DEMO: PainWorkload[] = [
  {
    id: 'PA-001',
    date: '2026-10-22',
    outpatient: 68,
    treatment: 24,
    nerveBlock: 16,
    radiofrequency: 4,
    status: '正常运行',
    typeBreakdown: [
      { name: '腰背痛', count: 30 },
      { name: '神经痛（带状疱疹后）', count: 12 },
      { name: '癌性疼痛', count: 10 },
      { name: '其它', count: 16 },
    ],
    vas: '治疗前 VAS 平均 7.2；治疗后 2h VAS 平均 3.1。',
    records: '硬膜外阻滞 8 例、椎旁阻滞 6 例、三叉神经半月节射频热凝 4 例。',
    outcome: 'VAS 下降 ≥50% 占 70%；≥30% 占 20%；无效 10%。',
    followup: '术后 1 周电话随访；3 月门诊复查疼痛评分。',
  },
];

export interface PainWorkloadListResult {
  items: PainWorkload[];
  demo: boolean;
}

export async function fetchPainWorkload(): Promise<PainWorkloadListResult> {
  try {
    const res = await get<{ items: PainWorkload[] }>('/pain/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
