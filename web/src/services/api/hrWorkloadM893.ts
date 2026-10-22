/**
 * 健澜科技 jlmedaios - 人力资源管理 API（M893）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface HrWorkload {
  id: string;
  date: string;
  onDuty: number;
  openPositions: number;
  trainingVisits: number;
  performanceReviews: number;
  resignations: number;
  status: string;
  staffBreakdown: { name: string; count: number }[];
  titleBreakdown: { name: string; count: number }[];
  recruitment: string;
  trainingRecord: string;
  performance: string;
  turnoverAnalysis: string;
}

const DEMO: HrWorkload[] = [
  {
    id: 'HR-893',
    date: '2026-10-22',
    onDuty: 1280,
    openPositions: 18,
    trainingVisits: 120,
    performanceReviews: 240,
    resignations: 2,
    status: '正常运行',
    staffBreakdown: [
      { name: '医师', count: 380 },
      { name: '护士', count: 560 },
      { name: '技师', count: 180 },
      { name: '行政后勤', count: 160 },
    ],
    titleBreakdown: [
      { name: '正高级', count: 28 },
      { name: '副高级', count: 96 },
      { name: '中级', count: 380 },
      { name: '初级', count: 520 },
    ],
    recruitment: '招聘进度：在招岗位 18 个；本月新入职 12 人（医师 6/护士 4/技师 2）；到岗率 75%。',
    trainingRecord: '培训记录：新员工入职培训 1 期 24 人；在职继续教育 120 人次；外出进修 6 人。',
    performance: '绩效考核结果：A 档 15%（36 人）；B 档 70%（168 人）；C 档 15%（36 人）；末位淘汰 0 人。',
    turnoverAnalysis: '离职分析：本月离职 2 人（护士 1/行政 1）；主动离职率 0.16%；近 12 月平均离职率 3.2%。',
  },
];

export interface HrWorkloadListResult {
  items: HrWorkload[];
  demo: boolean;
}

export async function fetchHrWorkload(): Promise<HrWorkloadListResult> {
  try {
    const res = await get<{ items: HrWorkload[] }>('/hr/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
