/**
 * 健澜科技 jlmedaios - CDI 用药审查类型（M70-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type CdiReviewType = 'interaction' | 'contraindication' | 'allergy' | 'dose';
export type CdiSeverity = 'info' | 'warning' | 'block';

export interface CdiReview {
  id: string;
  patientId: string;
  visitId: string | null;
  drugName: string;
  reviewType: CdiReviewType;
  severity: CdiSeverity;
  message: string;
  resolved: boolean;
  reviewedBy: string;
  createdAt: string;
}

export interface ReviewInput {
  patientId: string;
  visitId?: string | null;
  drugName: string;
  currentDrugs?: string[];
  allergies?: string[];
  doseMg?: number;
  weightKg?: number;
}
