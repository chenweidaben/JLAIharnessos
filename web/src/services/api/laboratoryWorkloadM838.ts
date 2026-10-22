/**
 * 健澜科技 jlmedaios - 检验科管理 API（M838）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface LaboratoryWorkload {
  id: string;
  date: string;
  biochemistry: number;
  immunology: number;
  microbiology: number;
  molecular: number;
  status: string;
  sectionBreakdown: { name: string; count: number }[];
  criticalValues: { time: string; patient: string; item: string; action: string }[];
  internalQc: string;
  externalQa: string;
  tat: string;
}

const DEMO: LaboratoryWorkload[] = [
  {
    id: 'LB-838',
    date: '2026-10-22',
    biochemistry: 980,
    immunology: 520,
    microbiology: 86,
    molecular: 42,
    status: '正常运行',
    sectionBreakdown: [
      { name: '临检', count: 1200 },
      { name: '生化', count: 980 },
      { name: '免疫', count: 520 },
      { name: '微生物', count: 86 },
      { name: '分子诊断', count: 42 },
    ],
    criticalValues: [
      { time: '09:40', patient: '葛患者', item: 'K 6.8 mmol/L', action: '立即电话通知临床并回传记录' },
    ],
    internalQc: '室内质控：生化 24/24 批在控；免疫 18/18 在控；2 个项目 Westgard 1-3s 已复扫并纠正。',
    externalQa: '室间质评：本年度生化 PT 100%、免疫 PT 98%、微生物符合率 96%。',
    tat: '常规标本 TAT：生化 95min（目标 ≤120min）；免疫 180min；微生物培养 48h。',
  },
];

export interface LaboratoryWorkloadListResult {
  items: LaboratoryWorkload[];
  demo: boolean;
}

export async function fetchLaboratoryWorkload(): Promise<LaboratoryWorkloadListResult> {
  try {
    const res = await get<{ items: LaboratoryWorkload[] }>('/laboratory/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
