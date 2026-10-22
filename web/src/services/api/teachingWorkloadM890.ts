/**
 * 健澜科技 jlmedaios - 教学管理 API（M890）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface TeachingWorkload {
  id: string;
  date: string;
  medInterns: number;
  nursingInterns: number;
  residents: number;
  fellows: number;
  teachingRounds: number;
  status: string;
  traineeBreakdown: { name: string; count: number }[];
  activityBreakdown: { name: string; count: number }[];
  examResults: string;
  qualityEvaluation: string;
}

const DEMO: TeachingWorkload[] = [
  {
    id: 'TH-890',
    date: '2026-10-22',
    medInterns: 48,
    nursingInterns: 60,
    residents: 24,
    fellows: 8,
    teachingRounds: 12,
    status: '正常运行',
    traineeBreakdown: [
      { name: '临床实习医生', count: 48 },
      { name: '护理实习护士', count: 60 },
      { name: '规培医生', count: 24 },
      { name: '进修医生', count: 8 },
    ],
    activityBreakdown: [
      { name: '教学查房', count: 12 },
      { name: '小讲课', count: 8 },
      { name: '病例讨论', count: 6 },
      { name: '操作培训（OSCE）', count: 4 },
    ],
    examResults: '考核成绩：出科考核通过率 96%；年度考核优良率 78%；OSCE 平均 82 分。',
    qualityEvaluation: '教学质量评价：学员评教平均分 4.6/5.0；带教老师评教 4.5/5.0；教学督导覆盖率 100%。',
  },
];

export interface TeachingWorkloadListResult {
  items: TeachingWorkload[];
  demo: boolean;
}

export async function fetchTeachingWorkload(): Promise<TeachingWorkloadListResult> {
  try {
    const res = await get<{ items: TeachingWorkload[] }>('/teaching/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
