/**
 * 健澜科技 jlmedaios - 康复评估 API（M622，P12 患者侧深度）
 *
 * 对接真实 BFF（m593）：
 *   GET  /api/v1/rehab-assessments?patientId=&phase=  列表（assessedAt 倒序）
 *   POST /api/v1/rehab-assessments                     新建（score 范围校验 + assessedAt 不能未来）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type AssessmentType = 'vas' | 'barthel' | 'berg' | 'fugl-meyer' | '6-minute-walk';

export const ASSESSMENT_TYPE_META: Record<AssessmentType, { label: string; range: string }> = {
  vas: { label: '疼痛 VAS', range: '0–10' },
  barthel: { label: 'Barthel 指数', range: '0–100' },
  berg: { label: 'Berg 平衡', range: '0–56' },
  'fugl-meyer': { label: 'Fugl-Meyer', range: '0–100' },
  '6-minute-walk': { label: '6 分钟步行', range: '0–1000 m' },
};

export interface RehabAssessment {
  id: string;
  patientId: string;
  assessmentType: AssessmentType;
  score: number;
  assessedBy: string;
  assessedAt: string;
  notes: string;
}

export interface RehabCreateInput {
  patientId: string;
  assessmentType: AssessmentType;
  score: number;
  assessedBy: string;
  assessedAt: string;
  notes: string;
}

export interface RehabListResult {
  items: RehabAssessment[];
  totalCount: number;
  demo: boolean;
}

export async function fetchRehabAssessments(patientId: string): Promise<RehabListResult> {
  try {
    const res = await get<{ items: RehabAssessment[]; totalCount: number }>('/rehab-assessments', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: [], totalCount: 0, demo: true };
  }
}

/** 新建：score 越界 / assessedAt 为未来 → 400，抛后端 message */
export async function createRehabAssessment(input: RehabCreateInput): Promise<RehabAssessment> {
  return post<RehabAssessment>('/rehab-assessments', input);
}
