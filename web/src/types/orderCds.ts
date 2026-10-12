/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS 前端类型（M18-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type CdsRuleCode = 'allergy' | 'duplicate_active_order' | 'dose_range' | 'frequent_dose';
export type CdsSeverity = 'info' | 'warn' | 'hard';

export interface OrderCdsAlert {
  id: string;
  orderId: string;
  visitId: string;
  patientId: string;
  ruleCode: CdsRuleCode;
  severity: CdsSeverity;
  message: string;
  overrideBy: string | null;
  overrideReason: string | null;
  createdAt: string;
}

export interface EvaluateReq {
  orderId: string;
  visitId: string;
  order: { drugName: string; doseMg: number; frequencyPerDay: number };
  allergies?: string[];
  activeOrders?: { drugName: string; status?: string }[];
  overrideReason?: string;
}
