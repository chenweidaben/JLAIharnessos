/**
 * 健澜科技 jlmedaios - 药事看板类型（M77-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface AmMetric {
  id: string;
  month: string;
  department: string;
  dddsTotal: number;
  inpatientDays: number;
  antibioticPatients: number;
  totalInpatients: number;
  specialClassPatients: number;
  prophylaxisCases: number;
  prophylaxisReasonable: number;
}

export interface DashboardRow extends AmMetric {
  dddsPer100: number;
  antibioticRate: number;
  specialClassRate: number;
  prophylaxisRate: number;
}

export interface SubmitInput {
  month: string;
  department: string;
  dddsTotal?: number;
  inpatientDays?: number;
  antibioticPatients?: number;
  totalInpatients?: number;
  specialClassPatients?: number;
  prophylaxisCases?: number;
  prophylaxisReasonable?: number;
}
