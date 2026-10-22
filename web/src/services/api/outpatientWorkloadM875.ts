/**
 * 健澜科技 jlmedaios - 门诊管理 API（M875）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OutpatientWorkload {
  id: string;
  date: string;
  visits: number;
  emergencyVisits: number;
  expertClinic: number;
  generalClinic: number;
  appointmentRate: number;
  status: string;
  deptBreakdown: { name: string; count: number }[];
  appointment: string;
  waitTime: string;
  revisitRate: string;
  minorSurgery: string;
}

const DEMO: OutpatientWorkload[] = [
  {
    id: 'OP-875',
    date: '2026-10-22',
    visits: 4200,
    emergencyVisits: 280,
    expertClinic: 1200,
    generalClinic: 3000,
    appointmentRate: 86.5,
    status: '正常运行',
    deptBreakdown: [
      { name: '内科', count: 1500 },
      { name: '外科', count: 800 },
      { name: '妇产科', count: 600 },
      { name: '儿科', count: 500 },
      { name: '五官科', count: 400 },
      { name: '其他', count: 400 },
    ],
    appointment: '预约率：专家门诊 95%；普通门诊 83%；分时段预约覆盖率 90%。',
    waitTime: '平均候诊时间：专家门诊 18min；普通门诊 25min；目标 ≤30min 达标。',
    revisitRate: '复诊率：内科 42%；儿科 38%；皮肤科 35%；总体复诊率 32%。',
    minorSurgery: '门诊手术量：今日 45 例（换药/切除/活检/小操作）；门诊手术室周转 12 间。',
  },
];

export interface OutpatientWorkloadListResult {
  items: OutpatientWorkload[];
  demo: boolean;
}

export async function fetchOutpatientWorkload(): Promise<OutpatientWorkloadListResult> {
  try {
    const res = await get<{ items: OutpatientWorkload[] }>('/outpatient/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
