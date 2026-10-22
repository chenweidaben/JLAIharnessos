/**
 * 健澜科技 jlmedaios - 普外科管理 API（M863）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface GeneralSurgeryWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  surgeries: number;
  minimallyInvasive: number;
  emergencySurgeries: number;
  status: string;
  surgeryBreakdown: { name: string; count: number }[];
  laparoscopicRecords: string;
  emergencyRecords: string;
  complications: string;
}

const DEMO: GeneralSurgeryWorkload[] = [
  {
    id: 'GS-863',
    date: '2026-10-22',
    outpatient: 260,
    inpatient: 48,
    surgeries: 24,
    minimallyInvasive: 16,
    emergencySurgeries: 6,
    status: '正常运行',
    surgeryBreakdown: [
      { name: '阑尾切除', count: 4 },
      { name: '胆囊切除', count: 6 },
      { name: '疝修补', count: 4 },
      { name: '胃肠手术（胃/结直肠）', count: 4 },
      { name: '乳腺手术', count: 4 },
      { name: '甲状腺手术', count: 2 },
    ],
    laparoscopicRecords: '腹腔镜手术：LC 6 例；腹腔镜阑尾 4 例；腹腔镜胃肠 4 例；腔镜甲状腺 2 例。',
    emergencyRecords: '急诊手术：急性阑尾炎 2 例；消化道穿孔 1 例；嵌顿疝 1 例；腹部外伤 2 例。',
    complications: '术后并发症：切口感染 1 例（已换药）；术后出血 1 例（二次手术止血）；肠瘘 0 例。',
  },
];

export interface GeneralSurgeryWorkloadListResult {
  items: GeneralSurgeryWorkload[];
  demo: boolean;
}

export async function fetchGeneralSurgeryWorkload(): Promise<GeneralSurgeryWorkloadListResult> {
  try {
    const res = await get<{ items: GeneralSurgeryWorkload[] }>('/general-surgery/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
