/**
 * 健澜科技 jlmedaios - 医院评审管理 API（M758）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReviewStatus = 'self_assessing' | 'in_progress' | 'passed' | 'failed';

export interface HospitalReview {
  id: string;
  name: string;
  year: number;
  level: string;
  status: ReviewStatus;
  clauses: { code: string; name: string; score: number }[];
  selfResult: string;
  rectifications: string;
}

export const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; color: string }> = {
  self_assessing: { label: '自评中', color: 'blue' },
  in_progress: { label: '现场评审中', color: 'processing' },
  passed: { label: '已通过', color: 'green' },
  failed: { label: '未通过', color: 'red' },
};

const DEMO: HospitalReview[] = [
  {
    id: 'HR-001',
    name: '三级甲等医院复评',
    year: 2026,
    level: '三甲',
    status: 'self_assessing',
    clauses: [
      { code: '4.1.1', name: '依法执业', score: 18 },
      { code: '4.2.5', name: '医疗质量安全核心制度', score: 45 },
      { code: '5.3.2', name: '医院信息平台', score: 22 },
    ],
    selfResult: '自评总分 942 / 1000，达到三甲复评线。',
    rectifications: '已整改 12 项，剩余 3 项限期 11-30 前完成。',
  },
];

export interface ReviewListResult {
  items: HospitalReview[];
  demo: boolean;
}

export async function fetchHospitalReviews(): Promise<ReviewListResult> {
  try {
    const res = await get<{ items: HospitalReview[] }>('/accreditation/hospital-reviews');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
