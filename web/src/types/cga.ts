/**
 * 健澜科技 jlmedaios - 老年综合评估 CGA 类型（M56-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type CgaRiskLevel = 'low' | 'moderate' | 'high';

export interface CgaAssessment {
  id: string;
  visitId: string;
  adlScore: number;
  iadlScore: number;
  mmseScore: number;
  fallRisk: boolean;
  mnaScore: number;
  gdsScore: number;
  riskLevel: CgaRiskLevel;
  assessor: string;
  createdAt: string;
}

export interface AssessResult {
  assessment: CgaAssessment;
  flags: string[];
  interventionWorkOrderCreated: boolean;
}
