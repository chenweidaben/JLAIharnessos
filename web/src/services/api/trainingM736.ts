/**
 * 健澜科技 jlmedaios - 培训管理 API（M736）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TrainingType = 'orientation' | 'continuation' | 'skill' | 'compliance';
export type TrainingStatus = 'planned' | 'ongoing' | 'completed';

export interface Training {
  id: string;
  name: string;
  type: TrainingType;
  trainedAt: string;
  participantCount: number;
  status: TrainingStatus;
  content: string;
  participants: { name: string; dept: string }[];
  results: string;
}

export const TRAINING_TYPE_META: Record<TrainingType, { label: string; color: string }> = {
  orientation: { label: '新员工入职', color: 'blue' },
  continuation: { label: '继续医学教育', color: 'green' },
  skill: { label: '岗位技能', color: 'orange' },
  compliance: { label: '合规/院感', color: 'volcano' },
};

export const TRAINING_STATUS_META: Record<TrainingStatus, { label: string; color: string }> = {
  planned: { label: '已计划', color: 'blue' },
  ongoing: { label: '进行中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
};

const DEMO: Training[] = [
  {
    id: 'TR-001',
    name: '2026 年度医疗质量安全核心制度培训',
    type: 'compliance',
    trainedAt: '2026-10-20T14:00:00+08:00',
    participantCount: 180,
    status: 'completed',
    content: '十八项核心制度解读、典型案例复盘、考核。',
    participants: [
      { name: '陈医师', dept: '普外科' },
      { name: '李护士', dept: '护理部' },
    ],
    results: '考核合格率 98.6%；2 人补考通过。',
  },
];

export interface TrainingListResult {
  items: Training[];
  demo: boolean;
}

export async function fetchTrainings(): Promise<TrainingListResult> {
  try {
    const res = await get<{ items: Training[] }>('/hr/trainings');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
