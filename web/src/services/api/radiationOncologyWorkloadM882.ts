/**
 * 健澜科技 jlmedaios - 放疗科管理（M882 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RadiationOncologyWorkloadM882 {
  id: string;
  date: string;
  patients: number;
  linac: number;
  gammaKnife: number;
  afterloader: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  intentBreakdown: { name: string; count: number }[];
  equipment: string;
  planVerification: string;
}

const DEMO: RadiationOncologyWorkloadM882[] = [
  {
    id: 'RO-882',
    date: '2026-10-22',
    patients: 45,
    linac: 80,
    gammaKnife: 4,
    afterloader: 2,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '肺癌', count: 12 },
      { name: '乳腺癌', count: 10 },
      { name: '鼻咽癌', count: 6 },
      { name: '食管癌', count: 8 },
      { name: '直肠癌', count: 9 },
    ],
    intentBreakdown: [
      { name: '根治性放疗', count: 18 },
      { name: '姑息性放疗', count: 15 },
      { name: '术前新辅助', count: 6 },
      { name: '术后辅助', count: 6 },
    ],
    equipment: '设备使用：瓦里安 Clinac iX 2 台（工作日 80 人次治疗）；医科达 Synergy 1 台（调强 IMRT）；头部伽马刀 1 台；后装近距离治疗机 1 台。',
    planVerification: '放疗计划验证记录：今日新验 4 例（点剂量偏差 ≤3%、Gamma 通过率 ≥95%）；治疗前摆位影像配准 100%。',
  },
];

export interface RadiationOncologyWorkloadM882Result {
  items: RadiationOncologyWorkloadM882[];
  demo: boolean;
}

export async function fetchRadiationOncologyWorkloadM882(): Promise<RadiationOncologyWorkloadM882Result> {
  try {
    const res = await get<{ items: RadiationOncologyWorkloadM882[] }>('/radiation-oncology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
