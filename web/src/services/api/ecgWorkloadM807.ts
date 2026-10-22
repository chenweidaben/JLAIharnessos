/**
 * 健澜科技 jlmedaios - 心电图科管理 API（M807）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EcgWorkload {
  id: string;
  date: string;
  examType: string;
  studies: number;
  abnormal: number;
  reportSla: string;
  status: string;
  typeBreakdown: { name: string; count: number; abnormal: number }[];
  abnormalRate: string;
  reportTimeliness: string;
  criticalEcgs: { time: string; patient: string; finding: string; action: string }[];
}

const DEMO: EcgWorkload[] = [
  {
    id: 'EC-001',
    date: '2026-10-22',
    examType: '综合',
    studies: 180,
    abnormal: 72,
    reportSla: '常规 30min / 急诊 10min',
    status: '正常运行',
    typeBreakdown: [
      { name: '常规心电图', count: 120, abnormal: 42 },
      { name: '动态心电图（Holter）', count: 40, abnormal: 22 },
      { name: '运动平板', count: 20, abnormal: 8 },
    ],
    abnormalRate: '总体异常率 40.0%；动态心电图异常率 55.0% 最高。',
    reportTimeliness: '当日已报告 179/180，及时率 99.4%。',
    criticalEcgs: [
      { time: '09:40', patient: '王患者', finding: '急性前壁 ST 段抬高型心肌梗死', action: '立即电话通知心内科并启动 STEMI 绿色通道' },
    ],
  },
];

export interface EcgWorkloadListResult {
  items: EcgWorkload[];
  demo: boolean;
}

export async function fetchEcgWorkload(): Promise<EcgWorkloadListResult> {
  try {
    const res = await get<{ items: EcgWorkload[] }>('/cardiology/ecg-workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
