/**
 * 健澜科技 jlmedaios - 不良事件后评估前端类型（M17-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type EventType = 'pressure_injury_stage2' | 'pressure_injury_stage3' | 'pressure_injury_stage4' | 'fall';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface NursingRiskEvent {
  id: string;
  visitId: string;
  eventType: EventType;
  description: string | null;
  occurredAt: string;
}

export interface EventReview {
  id: string;
  eventId: string;
  visitId: string;
  occurredAt: string;
  location: string | null;
  circumstances: string | null;
  injuries: string | null;
  witness: boolean | null;
  firstAid: string | null;
  familyNotified: boolean | null;
  riskRescoreLevel: RiskLevel | null;
  followUpPlan: string | null;
}

export interface EventReviewMetrics {
  totalEvents: number;
  inpatientVisits: number;
  metrics: {
    pressureInjuryRate: number;
    fallRate: number;
    fractions: {
      pressureInjury: { numerator: number; denominator: number };
      fall: { numerator: number; denominator: number };
    };
  };
}

export interface CreateReviewReq {
  eventId: string;
  visitId: string;
  occurredAt: string;
  location?: string;
  circumstances?: string;
  injuries?: string;
  witness?: boolean;
  firstAid?: string;
  familyNotified?: boolean;
  riskRescoreLevel?: RiskLevel;
  followUpPlan?: string;
}
