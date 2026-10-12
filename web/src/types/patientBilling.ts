/**
 * 健澜科技 jlmedaios - 患者端住院费用视图类型（M50-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type BillingCategory = 'drug' | 'exam' | 'treatment' | 'material' | 'other';

export interface CostBreakdown {
  byCategory: Record<BillingCategory, number>;
  total: number;
}

export interface InsuranceEstimate {
  estimatedInsurancePaid: number;
  patientOutOfPocket: number;
  rate: number;
}

export interface PatientBillingView {
  patientId: string;
  visitId: string | null;
  visitStatus: string | null;
  breakdown: CostBreakdown;
  insuranceEstimate: InsuranceEstimate;
  deposit: { paid: number; balance: number };
  itemCount: number;
}
