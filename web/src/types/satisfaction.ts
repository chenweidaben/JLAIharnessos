/**
 * 健澜科技 jlmedaios - 满意度评价类型（M3-O）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type SatisfactionSource = 'outpatient' | 'inpatient' | 'consultation';

export interface SatisfactionSurvey {
  id: string;
  surveyNo: string;
  patientId: string;
  visitId: string | null;
  consultId: string | null;
  sourceType: SatisfactionSource;
  overallScore: number;
  medicalScore: number;
  serviceScore: number;
  environmentScore: number;
  processScore: number;
  waitScore: number;
  comment: string | null;
  status: 'submitted';
  submittedBy: string | null;
  submittedAt: string;
}

export interface SatisfactionStats {
  total: number;
  overallAvg: number;
  medicalAvg: number;
  serviceAvg: number;
  environmentAvg: number;
  processAvg: number;
  waitAvg: number;
  positiveRate: number;
}

export interface SurveyScoresInput {
  patientId: string;
  visitId?: string | null;
  consultId?: string | null;
  sourceType?: SatisfactionSource;
  overallScore: number;
  medicalScore: number;
  serviceScore: number;
  environmentScore: number;
  processScore: number;
  waitScore: number;
  comment?: string | null;
}

export const SATISFACTION_DIMENSIONS = [
  { key: 'overallScore', label: '总体满意度' },
  { key: 'medicalScore', label: '医疗质量' },
  { key: 'serviceScore', label: '服务态度' },
  { key: 'environmentScore', label: '就医环境' },
  { key: 'processScore', label: '就诊流程' },
  { key: 'waitScore', label: '等候时间' },
] as const;
