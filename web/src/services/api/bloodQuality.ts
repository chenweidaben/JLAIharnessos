/**
 * 健澜科技 jlmedaios - 临床用血质量 API（M10-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  BloodQualityDetail,
  BloodQualityMetrics,
  EfficacyAssessment,
  QualityMetricsResponse,
  UtilizationReview,
} from '@/types/bloodQuality';

export interface AssessEfficacyBody {
  requestId: string;
  preResultId?: string;
  postResultId?: string;
  manualPre?: number;
  manualPost?: number;
  windowHours?: number;
  note?: string;
}

export interface ReviewUtilizationBody {
  requestId: string;
  conclusionNote?: string;
  manualIndication?: boolean;
}

export async function assessEfficacy(
  body: AssessEfficacyBody,
): Promise<{ assessment: EfficacyAssessment; created: boolean; reasons: string[] }> {
  return post(`/blood-quality/efficacy`, body);
}

export async function listEfficacy(grade?: string): Promise<EfficacyAssessment[]> {
  const qs = grade ? `?grade=${encodeURIComponent(grade)}` : '';
  return get(`/blood-quality/efficacy${qs}`);
}

export async function reviewUtilization(
  body: ReviewUtilizationBody,
): Promise<{ review: UtilizationReview; created: boolean }> {
  return post(`/blood-quality/utilization`, body);
}

export async function listUtilization(conclusion?: string): Promise<UtilizationReview[]> {
  const qs = conclusion ? `?conclusion=${encodeURIComponent(conclusion)}` : '';
  return get(`/blood-quality/utilization${qs}`);
}

export async function getQualityMetrics(from: string, to: string): Promise<QualityMetricsResponse> {
  const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return get(`/blood-quality/metrics${qs}`);
}

export async function getBloodQualityDetail(requestId: string): Promise<BloodQualityDetail> {
  return get(`/blood-quality/${requestId}`);
}

export type { BloodQualityMetrics };
