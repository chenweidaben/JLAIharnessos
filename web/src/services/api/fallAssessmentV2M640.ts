/**
 * 健澜科技 jlmedaios - 跌倒评估 v2 API（M640，配套 M556）
 *
 * 对接 BFF：GET /api/v1/fall/assessments + POST /api/v1/fall/assessments
 *   （Morse 评分：0-24 低风险 / 25-44 中风险 / ≥45 高风险；未注册则 DEMO 兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type FallRisk = 'low' | 'medium' | 'high';

export interface FallAssessment {
  id: string;
  patientId: string;
  morseScore: number;
  risk: FallRisk;
  precautions: string;
  assessedAt: string;
  assessedBy: string;
}

export interface FallCreateInput {
  patientId: string;
  morseScore: number;
  precautions: string;
  assessedBy: string;
}

export const FALL_RISK_META: Record<FallRisk, { label: string; color: string }> = {
  low: { label: '低风险', color: 'green' },
  medium: { label: '中风险', color: 'orange' },
  high: { label: '高风险', color: 'red' },
};

export function morseToRisk(score: number): FallRisk {
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

const DEMO_ASSESSMENTS: FallAssessment[] = [
  { id: 'FA-001', patientId: 'P10001', morseScore: 25, risk: 'medium', precautions: '床栏拉起、起床三步曲。', assessedAt: '2026-10-22T08:00:00+08:00', assessedBy: '周敏' },
  { id: 'FA-002', patientId: 'P10005', morseScore: 55, risk: 'high', precautions: '一对一陪护、防滑垫、呼叫器在手边。', assessedAt: '2026-10-21T09:00:00+08:00', assessedBy: '李慧' },
  { id: 'FA-003', patientId: 'P10008', morseScore: 15, risk: 'low', precautions: '常规宣教。', assessedAt: '2026-10-20T10:00:00+08:00', assessedBy: '王芳' },
];

export interface FallListResult {
  items: FallAssessment[];
  totalCount: number;
  demo: boolean;
}

export async function fetchFallAssessments(patientId: string): Promise<FallListResult> {
  try {
    const res = await get<{ items: FallAssessment[]; totalCount: number }>('/fall/assessments', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_ASSESSMENTS.filter((a) => a.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createFallAssessment(input: FallCreateInput): Promise<FallAssessment> {
  return post<FallAssessment>('/fall/assessments', { ...input, risk: morseToRisk(input.morseScore) });
}
