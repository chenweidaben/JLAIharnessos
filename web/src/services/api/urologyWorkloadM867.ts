/**
 * 健澜科技 jlmedaios - 泌尿外科管理 API（M867）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface UrologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  surgeries: number;
  turp: number;
  laparoscopic: number;
  status: string;
  surgeryBreakdown: { name: string; count: number }[];
  transurethralRecords: string;
  laparoscopicRecords: string;
  eswl: string;
}

const DEMO: UrologyWorkload[] = [
  {
    id: 'UR-867',
    date: '2026-10-22',
    outpatient: 180,
    inpatient: 28,
    surgeries: 14,
    turp: 4,
    laparoscopic: 4,
    status: '正常运行',
    surgeryBreakdown: [
      { name: '前列腺手术（TURP/前列腺癌）', count: 4 },
      { name: '泌尿系结石（URL/PCNL/ESWL）', count: 4 },
      { name: '泌尿系肿瘤（肾/膀胱/前列腺）', count: 4 },
      { name: '肾上腺手术', count: 2 },
    ],
    transurethralRecords: '经尿道手术：TURP 4 例；膀胱肿瘤电切（TURBT）2 例；输尿管镜（URL）2 例。',
    laparoscopicRecords: '腹腔镜手术：肾癌根治 2 例；肾上腺切除 2 例（嗜铬细胞瘤 1/腺瘤 1）。',
    eswl: '体外冲击波碎石（ESWL）：8 例（肾结石 5/输尿管结石 3）；单次碎石成功率 75%。',
  },
];

export interface UrologyWorkloadListResult {
  items: UrologyWorkload[];
  demo: boolean;
}

export async function fetchUrologyWorkload(): Promise<UrologyWorkloadListResult> {
  try {
    const res = await get<{ items: UrologyWorkload[] }>('/urology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
