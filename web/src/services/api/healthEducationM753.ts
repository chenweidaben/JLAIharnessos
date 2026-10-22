/**
 * 健澜科技 jlmedaios - 健康教育管理 API（M753）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type EduStatus = 'planned' | 'ongoing' | 'completed';

export interface HealthEducation {
  id: string;
  topic: string;
  method: string;
  dept: string;
  heldAt: string;
  audienceCount: number;
  status: EduStatus;
  content: string;
  materials: string;
  signIns: { name: string; dept: string }[];
}

export const EDU_STATUS_META: Record<EduStatus, { label: string; color: string }> = {
  planned: { label: '已计划', color: 'blue' },
  ongoing: { label: '进行中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
};

const DEMO: HealthEducation[] = [
  {
    id: 'HE-001',
    topic: '糖尿病患者自我管理',
    method: '病区小讲课',
    dept: '内分泌科',
    heldAt: '2026-10-25T15:00:00+08:00',
    audienceCount: 24,
    status: 'planned',
    content: '饮食控制、运动指导、血糖监测、用药依从性。',
    materials: '《糖尿病健康教育手册》、血糖监测演示仪。',
    signIns: [
      { name: '张患者', dept: '内分泌 12 床' },
      { name: '李患者', dept: '内分泌 15 床' },
    ],
  },
];

export interface EduListResult {
  items: HealthEducation[];
  demo: boolean;
}

export async function fetchHealthEducation(): Promise<EduListResult> {
  try {
    const res = await get<{ items: HealthEducation[] }>('/patient-service/health-education');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
