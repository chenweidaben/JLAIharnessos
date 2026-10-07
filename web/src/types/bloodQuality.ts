/**
 * 健澜科技 jlmedaios - 临床用血质量类型（M10-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type EfficacyGrade = 'effective' | 'partial' | 'ineffective' | 'indeterminate';
export type UtilizationConclusion = 'rational' | 'largely' | 'irrational';

export interface EfficacyAssessment {
  id: string;
  transfusionId: string;
  requestId: string;
  visitId: string;
  patientId: string;
  assessedBy: string | null;
  component: string;
  preMetric: number | null;
  postMetric: number | null;
  metricUnit: string | null;
  expectedDelta: number | null;
  actualDelta: number | null;
  efficacyGrade: EfficacyGrade;
  preResultId: string | null;
  postResultId: string | null;
  note: string | null;
  assessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UtilizationReview {
  id: string;
  requestId: string;
  visitId: string;
  patientId: string;
  reviewedBy: string | null;
  indicationCompliant: boolean;
  dosageCompliant: boolean;
  preTestComplete: boolean;
  efficacyGrade: EfficacyGrade | null;
  conclusion: UtilizationConclusion;
  issues: string[];
  conclusionNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QualityFraction {
  numerator: number;
  denominator: number;
}

export interface BloodQualityMetrics {
  componentTransfusionRate: number;
  indicationPassRate: number;
  preTestRate: number;
  reactionRate: number;
  efficacyAssessmentRate: number;
  inpatientTransfusionRate: number;
  fractions: Record<string, QualityFraction>;
}

export interface QualityMetricsResponse {
  period: { from: string; to: string };
  inpatientDischarges: number;
  totalRequests: number;
  metrics: BloodQualityMetrics;
}

export interface BloodQualityDetail {
  req: Record<string, unknown>;
  transfusion: Record<string, unknown> | null;
  efficacy: EfficacyAssessment | null;
  utilization: UtilizationReview | null;
}
