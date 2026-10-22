/**
 * 健澜科技 jlmedaios - 病理科管理（M871 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PathologyWorkloadM871 {
  id: string;
  date: string;
  routine: number;
  frozen: number;
  cytology: number;
  ihc: number;
  molecular: number;
  status: string;
  categoryBreakdown: { name: string; count: number }[];
  frozenTime: string;
  concordance: string;
  qualityMetrics: string;
}

const DEMO: PathologyWorkloadM871[] = [
  {
    id: 'PA-871',
    date: '2026-10-22',
    routine: 90,
    frozen: 12,
    cytology: 14,
    ihc: 28,
    molecular: 6,
    status: '正常运行',
    categoryBreakdown: [
      { name: '常规 HE 病理', count: 90 },
      { name: '冰冻病理', count: 12 },
      { name: '细胞学', count: 14 },
      { name: '免疫组化', count: 28 },
      { name: '分子病理（FISH/PCR）', count: 6 },
    ],
    frozenTime: '冰冻病理报告时间：平均 22min（目标 ≤30min）；及时率 100%。',
    concordance: '术中冰冻与术后常规符合率：12/12 = 100%；延迟报告 0 例。',
    qualityMetrics: '质控指标：制片优良率 98%；诊断符合率 99.2%；报告及时率（常规 3 工作日）97.5%。',
  },
];

export interface PathologyWorkloadM871Result {
  items: PathologyWorkloadM871[];
  demo: boolean;
}

export async function fetchPathologyWorkloadM871(): Promise<PathologyWorkloadM871Result> {
  try {
    const res = await get<{ items: PathologyWorkloadM871[] }>('/pathology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
