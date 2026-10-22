/**
 * 健澜科技 jlmedaios - 绩效考核管理 API（M735）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type PerfGrade = 'A' | 'B' | 'C' | 'D';
export type PerfStatus = 'draft' | 'confirmed' | 'paid';

export interface PerformanceRecord {
  id: string;
  employee: string;
  dept: string;
  period: string;
  score: number;
  grade: PerfGrade;
  status: PerfStatus;
  indicators: { name: string; weight: number; score: number }[];
  deductions: string;
}

export const PERF_GRADE_META: Record<PerfGrade, { label: string; color: string }> = {
  A: { label: 'A（优秀）', color: 'green' },
  B: { label: 'B（良好）', color: 'blue' },
  C: { label: 'C（合格）', color: 'orange' },
  D: { label: 'D（不合格）', color: 'red' },
};

export const PERF_STATUS_META: Record<PerfStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  confirmed: { label: '已确认', color: 'blue' },
  paid: { label: '已兑现', color: 'green' },
};

const DEMO: PerformanceRecord[] = [
  {
    id: 'PF-001',
    employee: '陈维',
    dept: '信息科',
    period: '2026-Q3',
    score: 92,
    grade: 'A',
    status: 'confirmed',
    indicators: [
      { name: '工作质量', weight: 40, score: 38 },
      { name: '任务交付', weight: 30, score: 28 },
      { name: '团队协作', weight: 20, score: 18 },
      { name: '创新改进', weight: 10, score: 8 },
    ],
    deductions: '无扣分。',
  },
];

export interface PerfListResult {
  items: PerformanceRecord[];
  demo: boolean;
}

export async function fetchPerformance(): Promise<PerfListResult> {
  try {
    const res = await get<{ items: PerformanceRecord[] }>('/hr/performance');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
