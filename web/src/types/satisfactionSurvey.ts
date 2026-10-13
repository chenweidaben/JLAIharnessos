/**
 * 健澜科技 jlmedaios - 满意度类型（M63-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface SurveyRow {
  id: string;
  visitId: string;
  patientId: string;
  medicalScore: number;
  nursingScore: number | null;
  logisticsScore: number | null;
  environmentScore: number;
  comment: string | null;
  department: string;
  submittedBy: string;
  createdAt: string;
}

export interface DepartmentRank {
  department: string;
  avg: number;
  count: number;
}

export interface RankingResult {
  ranks: DepartmentRank[];
  overallAvg: number;
}

export interface SubmitInput {
  visitId: string;
  patientId: string;
  medicalScore: number;
  nursingScore: number;
  logisticsScore: number;
  environmentScore: number;
  comment?: string | null;
  department: string;
}
