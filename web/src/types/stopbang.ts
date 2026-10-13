/**
 * 健澜科技 jlmedaios - STOP-BANG 筛查类型（M59-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type RiskLevel = 'low' | 'high';

export interface StopBangScreening {
  id: string;
  visitId: string;
  sSnoring: boolean;
  tTired: boolean;
  oObserved: boolean;
  pPressure: boolean;
  bBmi: boolean;
  aAge: boolean;
  nNeck: boolean;
  gGender: boolean;
  score: number;
  riskLevel: RiskLevel;
  assessor: string;
  createdAt: string;
}

export interface AssessResult {
  screening: StopBangScreening;
  workOrderCreated: boolean;
}
