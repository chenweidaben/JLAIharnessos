/**
 * 健澜科技 jlmedaios - 检验科管理（M868 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface LaboratoryWorkloadM868 {
  id: string;
  date: string;
  routine: number;
  biochemistry: number;
  immunology: number;
  microbiology: number;
  status: string;
  categoryBreakdown: { name: string; count: number }[];
  statReportTime: string;
  internalQc: string;
  externalQa: string;
}

const DEMO: LaboratoryWorkloadM868[] = [
  {
    id: 'LB-868',
    date: '2026-10-22',
    routine: 1200,
    biochemistry: 980,
    immunology: 520,
    microbiology: 86,
    status: '正常运行',
    categoryBreakdown: [
      { name: '临检（血/尿/便）', count: 1200 },
      { name: '生化', count: 980 },
      { name: '免疫', count: 520 },
      { name: '微生物', count: 86 },
      { name: '分子诊断（PCR）', count: 42 },
    ],
    statReportTime: '急诊检验报告时间：急诊 30min 及时率 99.2%；常规 2h 及时率 98.5%；急诊生化平均 22min。',
    internalQc: '室内质控（Levey-Jennings）：生化 24/24 批在控；免疫 18/18 在控；Westgard 多规则告警 2 次（已纠正）。',
    externalQa: '室间质评成绩：本年度生化 PT 100%；免疫 PT 98%；微生物符合率 96%；分子室间质评 100%。',
  },
];

export interface LaboratoryWorkloadM868Result {
  items: LaboratoryWorkloadM868[];
  demo: boolean;
}

export async function fetchLaboratoryWorkloadM868(): Promise<LaboratoryWorkloadM868Result> {
  try {
    const res = await get<{ items: LaboratoryWorkloadM868[] }>('/laboratory/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
