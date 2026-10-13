/**
 * 健澜科技 jlmedaios - 院感看板类型（M76-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface InfectionMetric {
  id: string;
  month: string;
  department: string;
  handHygieneObservations: number;
  handHygieneCompliant: number;
  cautiCases: number;
  catheterDays: number;
  vapCases: number;
  ventilatorDays: number;
  clabsiCases: number;
  centralLineDays: number;
  ssiCases: number;
  operationCount: number;
}

export interface DashboardRow extends InfectionMetric {
  handHygieneRate: number;
  cautiRate: number;
  vapRate: number;
  clabsiRate: number;
  ssiRate: number;
}

export interface SubmitInput {
  month: string;
  department: string;
  handHygieneObservations?: number;
  handHygieneCompliant?: number;
  cautiCases?: number;
  catheterDays?: number;
  vapCases?: number;
  ventilatorDays?: number;
  clabsiCases?: number;
  centralLineDays?: number;
  ssiCases?: number;
  operationCount?: number;
}
