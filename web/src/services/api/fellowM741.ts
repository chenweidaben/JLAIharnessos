/**
 * 健澜科技 jlmedaios - 进修医生管理 API（M741）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type FellowStatus = 'enrolled' | 'ongoing' | 'completed';

export interface Fellow {
  id: string;
  name: string;
  origin: string;
  dept: string;
  period: string;
  status: FellowStatus;
  plan: string;
  assessments: string;
  evaluation: string;
}

export const FELLOW_STATUS_META: Record<FellowStatus, { label: string; color: string }> = {
  enrolled: { label: '已录取', color: 'blue' },
  ongoing: { label: '在进修', color: 'processing' },
  completed: { label: '已结业', color: 'green' },
};

const DEMO: Fellow[] = [
  {
    id: 'FW-001',
    name: '王医师',
    origin: '浙江省某市级三甲医院',
    dept: '普外科',
    period: '2026-09-01 ~ 2027-02-28',
    status: 'ongoing',
    plan: '普外科常见疾病诊治、腔镜手术训练、病案规范书写。',
    assessments: '入科考核：82 分；中期考核：88 分。',
    evaluation: '带教老师评价：动手能力强、学习主动性高。',
  },
];

export interface FellowListResult {
  items: Fellow[];
  demo: boolean;
}

export async function fetchFellows(): Promise<FellowListResult> {
  try {
    const res = await get<{ items: Fellow[] }>('/education/fellows');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
