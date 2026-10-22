/**
 * 健澜科技 jlmedaios - 入院护理评估 API（M695）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface AdmissionAssessment {
  id: string;
  inpatientNo: string;
  patientId: string;
  assessedAt: string;
  nurse: string;
  barthelScore: number;
  nortonScore: number;
  morseScore: number;
}

const DEMO: AdmissionAssessment[] = [
  {
    id: 'AA-001',
    inpatientNo: 'ZY-2601',
    patientId: 'P10001',
    assessedAt: '2026-10-15T10:00:00+08:00',
    nurse: '周敏',
    barthelScore: 90,
    nortonScore: 18,
    morseScore: 25,
  },
  {
    id: 'AA-002',
    inpatientNo: 'ZY-2605',
    patientId: 'P10005',
    assessedAt: '2026-10-18T09:30:00+08:00',
    nurse: '李慧',
    barthelScore: 60,
    nortonScore: 14,
    morseScore: 45,
  },
  {
    id: 'AA-003',
    inpatientNo: 'ZY-2610',
    patientId: 'P10011',
    assessedAt: '2026-10-10T14:00:00+08:00',
    nurse: '王芳',
    barthelScore: 20,
    nortonScore: 10,
    morseScore: 80,
  },
];

export const barthelLevel = (v: number): { label: string; color: string } =>
  v >= 95 ? { label: '完全自理', color: 'green' }
  : v >= 60 ? { label: '轻度依赖', color: 'blue' }
  : v >= 40 ? { label: '中度依赖', color: 'orange' }
  : { label: '重度依赖', color: 'red' };

export const nortonLevel = (v: number): { label: string; color: string } =>
  v >= 18 ? { label: '低风险', color: 'green' }
  : v >= 14 ? { label: '中风险', color: 'orange' }
  : { label: '高风险', color: 'red' };

export const morseLevel = (v: number): { label: string; color: string } =>
  v < 25 ? { label: '低危', color: 'green' }
  : v < 45 ? { label: '中危', color: 'orange' }
  : { label: '高危', color: 'red' };

export interface AssessmentListResult {
  items: AdmissionAssessment[];
  demo: boolean;
}

export async function fetchAdmissionAssessments(): Promise<AssessmentListResult> {
  try {
    const res = await get<{ items: AdmissionAssessment[] }>('/nurse/admission-assessments');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
