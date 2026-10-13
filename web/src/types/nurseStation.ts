/**
 * 健澜科技 jlmedaios - 护士站四合一屏前端类型（M18-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface WardRow {
  visitId: string;
  patientName: string;
  bedNo: string | null;
  department: string | null;
  latestVitals: { temperature: number | null; sbp: number | null; pulse: number | null; recordedAt: string | null };
  ioBalance24h: number | null;
  pendingMeds: number;
  activeTubes: number;
  riskLevel: string;
  unresolvedHardCds: number;
  outstanding: number;
}

export interface EvalSummary {
  rehabTreatment: {
    modality: string | null;
    status: string | null;
    efficacy: string | null;
    poorEfficacy: boolean;
  };
  painClinic: {
    baselineNrs: number | null;
    currentNrs: number | null;
    breakthroughCount: number;
    adjustmentSuggestion: string | null;
    severeNrs: boolean;
  };
  cga: {
    adlScore: number | null;
    iadlScore: number | null;
    mmseScore: number | null;
    fallRisk: boolean;
    mnaScore: number | null;
    gdsScore: number | null;
    riskLevel: string;
    highRisk: boolean;
  };
  nutritionConsult: {
    nutritionDiagnosis: string | null;
    planTier: string;
    caloriesPerDay: number | null;
    followupDays: number;
    status: string;
    highPlan: boolean;
    followupOverdue: boolean;
  };
  stopbang: {
    score: number | null;
    riskLevel: string;
    highRisk: boolean;
  };
  picc: {
    deviceType: string | null;
    insertedAt: string | null;
    lastMaintainedAt: string | null;
    complication: string | null;
    due: boolean;
    complicationAlert: boolean;
  };
  surgical: {
    signinComplete: boolean;
    timeoutComplete: boolean;
    signoutComplete: boolean;
    status: string;
    failed: boolean;
  };
  flags: string[];
}

export interface VisitEvaluations {
  visitId: string;
  patientId: string;
  department: string;
  summary: EvalSummary;
}
