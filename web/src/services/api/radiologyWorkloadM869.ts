/**
 * 健澜科技 jlmedaios - 放射科管理（M869 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RadiologyWorkloadM869 {
  id: string;
  date: string;
  dr: number;
  ct: number;
  mri: number;
  contrast: number;
  status: string;
  categoryBreakdown: { name: string; count: number; positive: number }[];
  statCtTime: string;
  positivity: string;
  utilization: string;
}

const DEMO: RadiologyWorkloadM869[] = [
  {
    id: 'RD-869',
    date: '2026-10-22',
    dr: 180,
    ct: 110,
    mri: 30,
    contrast: 12,
    status: '正常运行',
    categoryBreakdown: [
      { name: 'DR 平片', count: 180, positive: 82 },
      { name: 'CT', count: 110, positive: 72 },
      { name: 'MRI', count: 30, positive: 14 },
      { name: '造影', count: 8, positive: 6 },
      { name: '介入', count: 4, positive: 4 },
    ],
    statCtTime: '急诊 CT 报告时间：平均 25min（目标 ≤30min）；急诊 CT 及时率 100%。',
    positivity: '检查阳性率：DR 45.6%；CT 65.5%；MRI 46.7%；总体阳性率 52.5%。',
    utilization: '设备利用率：CT 开机率 92%（24 小时值班）；MRI 开机率 85%；DR 开机率 98%。',
  },
];

export interface RadiologyWorkloadM869Result {
  items: RadiologyWorkloadM869[];
  demo: boolean;
}

export async function fetchRadiologyWorkloadM869(): Promise<RadiologyWorkloadM869Result> {
  try {
    const res = await get<{ items: RadiologyWorkloadM869[] }>('/radiology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
