/**
 * 健澜科技 jlmedaios - 实习管理 API（M742）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type InternStatus = 'enrolled' | 'ongoing' | 'completed';

export interface Intern {
  id: string;
  name: string;
  school: string;
  dept: string;
  period: string;
  status: InternStatus;
  plan: string;
  exitExam: string;
  tutorComment: string;
}

export const INTERN_STATUS_META: Record<InternStatus, { label: string; color: string }> = {
  enrolled: { label: '已录取', color: 'blue' },
  ongoing: { label: '实习中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
};

const DEMO: Intern[] = [
  {
    id: 'IN-001',
    name: '赵同学',
    school: '浙江大学医学院',
    dept: '内科',
    period: '2026-07-01 ~ 2027-06-30',
    status: 'ongoing',
    plan: '内科轮转（心内/呼吸/消化/内分泌），每科 4 周。',
    exitExam: '心内科出科考核：90 分；呼吸科出科考核：86 分。',
    tutorComment: '带教老师：临床思维清晰，病历书写规范。',
  },
];

export interface InternListResult {
  items: Intern[];
  demo: boolean;
}

export async function fetchInterns(): Promise<InternListResult> {
  try {
    const res = await get<{ items: Intern[] }>('/education/interns');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
