/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警 DTO（M17-A）
 *
 * 与 BFF（/nursing-risk/*）一一对应，camelCase；真实模式全部读写 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export type RiskType = 'pressure_ulcer' | 'fall';
export type RiskLevel = 'low' | 'medium' | 'high';
export type PreventionStatus = 'suggested' | 'accepted' | 'executed' | 'cancelled';
export type RiskEventType =
  | 'pressure_injury_stage2'
  | 'pressure_injury_stage3'
  | 'pressure_injury_stage4'
  | 'fall';

export interface NursingRiskAssessment {
  id: string;
  visitId: string;
  riskType: RiskType;
  assessNo: string;
  items: Record<string, number>;
  totalScore: number;
  level: RiskLevel;
  note: string | null;
  assessedBy: string | null;
  assessedAt: string | null;
}

export interface NursingRiskPrevention {
  id: string;
  assessmentId: string;
  measureCode: string;
  measureDesc: string;
  status: PreventionStatus;
  executedBy: string | null;
  executedAt: string | null;
  signature: string | null;
}

export interface NursingRiskEvent {
  id: string;
  visitId: string;
  riskType: RiskType;
  eventType: RiskEventType;
  description: string | null;
  recordedBy: string | null;
  occurredAt: string | null;
}

export interface WarningFlag {
  warning: boolean;
  reason: string;
}

export interface AssessResultView {
  assessment: NursingRiskAssessment;
  suggestedPreventions: NursingRiskPrevention[];
  warning: WarningFlag;
}

export interface HighRiskBoardItem {
  assessment: NursingRiskAssessment;
  warning: WarningFlag;
}

export interface VisitDetailView {
  visit: { id: string; patientId: string; department: string };
  assessments: NursingRiskAssessment[];
  preventions: NursingRiskPrevention[];
  events: NursingRiskEvent[];
  warnings: Array<{
    assessmentId: string;
    visitId: string;
    riskType: RiskType;
    totalScore: number;
    reason: string;
  }>;
}

export interface RiskMetricsView {
  period: { from: string; to: string };
  totalVisits: number;
  metrics: {
    pressureHighRiskRate: number;
    fallHighRiskRate: number;
    pressureInjuryRate: number;
    fallIncidentRate: number;
    fractions: {
      pressureHighRiskRate: { numerator: number; denominator: number };
      fallHighRiskRate: { numerator: number; denominator: number };
      pressureInjuryRate: { numerator: number; denominator: number };
      fallIncidentRate: { numerator: number; denominator: number };
    };
  };
}
