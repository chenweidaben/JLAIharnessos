/**
 * 健澜科技 jlmedaios - 教学管理 API（M738）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TeachingStatus = 'planned' | 'ongoing' | 'completed';

export interface TeachingPlan {
  id: string;
  course: string;
  teacher: string;
  dept: string;
  taughtAt: string;
  studentCount: number;
  status: TeachingStatus;
  outline: string;
  students: { name: string; source: string }[];
  assessments: string;
}

export const TEACHING_STATUS_META: Record<TeachingStatus, { label: string; color: string }> = {
  planned: { label: '已计划', color: 'blue' },
  ongoing: { label: '进行中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
};

const DEMO: TeachingPlan[] = [
  {
    id: 'TP-001',
    course: '《循证医学基础》',
    teacher: '陈维 高级工程师',
    dept: '信息科',
    taughtAt: '2026-10-28T14:00:00+08:00',
    studentCount: 45,
    status: 'planned',
    outline: 'PICO 模型、系统综述、临床决策、案例演练。',
    students: [
      { name: '张三', source: '浙江大学医学院（见习）' },
      { name: '李四', source: '浙江中医药大学（见习）' },
    ],
    assessments: '课后随堂测验 30% + 案例作业 70%。',
  },
];

export interface TeachingListResult {
  items: TeachingPlan[];
  demo: boolean;
}

export async function fetchTeachingPlans(): Promise<TeachingListResult> {
  try {
    const res = await get<{ items: TeachingPlan[] }>('/education/teaching-plans');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
