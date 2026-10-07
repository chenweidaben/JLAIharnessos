/**
 * 健澜科技 jlmedaios - VTE 智能防治闭环类型（M13-A）
 *
 * 全国肺栓塞和深静脉血栓形成防治能力建设项目（VTE 防治中心）。
 * 风险评估（Caprini 外科 / Padua 内科）+ 出血风险 + 预防措施联动 + 结局不良事件 + 质控指标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type VteScale = 'caprini' | 'padua';
export type VteOccasion = 'admission' | 'postop' | 'condition_change' | 'reassessment';
export type VteLevel = 'low' | 'medium' | 'high' | 'very_high';
export type BleedingLevel = 'low' | 'high';

/** 评分明细因子：{ key, label, points } */
export interface VteFactorItem {
  key: string;
  label: string;
  points: number;
}

/** 出血明细因子：{ key, label }（出血因素本身不赋分，命中任一即高出血风险） */
export interface BleedingFactorItem {
  key: string;
  label: string;
}

/** VTE + 出血风险评估（版本化，同一 visit 允许多版本） */
export interface VteAssessment {
  id: string;
  visitId: string;
  patientId: string;
  department: string | null;
  assessmentNo: string;
  scale: VteScale;
  occasion: VteOccasion;
  vteScore: number;
  vteLevel: VteLevel;
  vteFactors: VteFactorItem[];
  bleedingLevel: BleedingLevel;
  bleedingFactors: BleedingFactorItem[];
  alertRaised: boolean;
  version: number;
  assessedBy: string | null;
  assessedAt: string | null;
  note: string | null;
  createdAt: string;
}

export type VtePreventionCategory = 'mechanical' | 'pharmacological';
/** mechanical: ipc/gcs/foot_pump；pharmacological: lmwh/ufh/fondaparinux/rivaroxaban/other */
export type VtePreventionMethod =
  | 'ipc'
  | 'gcs'
  | 'foot_pump'
  | 'lmwh'
  | 'ufh'
  | 'fondaparinux'
  | 'rivaroxaban'
  | 'other';
export type VtePreventionStatus =
  | 'suggested'
  | 'confirmed'
  | 'executed'
  | 'contraindicated'
  | 'discontinued';

/** 预防措施（一措施一行；AI 仅生成 suggested 草稿，药物须医师确认签名） */
export interface VtePrevention {
  id: string;
  visitId: string;
  patientId: string;
  assessmentId: string | null;
  preventionNo: string;
  category: VtePreventionCategory;
  method: VtePreventionMethod;
  status: VtePreventionStatus;
  dosage: string | null;
  frequency: string | null;
  orderId: string | null;
  nursingTaskId: string | null;
  suggestedBy: string | null;
  confirmedBy: string | null;
  executedBy: string | null;
  confirmedAt: string | null;
  executedAt: string | null;
  contraindicationNote: string | null;
  createdAt: string;
}

export type VteEventType = 'dvt' | 'pe' | 'bleeding' | 'anticoag_adverse';
export type VteEventSource = 'hospital_acquired' | 'present_on_admission';

/** 结局与不良事件 */
export interface VteOutcome {
  id: string;
  visitId: string;
  patientId: string;
  eventType: VteEventType;
  severity: string | null;
  source: VteEventSource;
  imagingReportId: string | null;
  labResultId: string | null;
  description: string | null;
  recordedBy: string | null;
  occurredAt: string | null;
  createdAt: string;
}

/** 高危/极高危患者看板条目：各 visit 最新评估 */
export interface VteHighRiskItem {
  visitId: string;
  patientId: string;
  patientName: string | null;
  department: string | null;
  assessmentId: string;
  vteLevel: VteLevel;
  vteScore: number;
  scale: VteScale;
  assessedAt: string | null;
  /** 高危/极高危但无任何 confirmed/executed 预防（建议性提醒，非阻断） */
  preventionMismatch: boolean;
}

export interface VteQualityFraction {
  numerator: number;
  denominator: number;
}

/** 质控指标（应用层实时聚合，分子分母可核查） */
export interface VteMetrics {
  riskAssessmentRate: number;
  highRiskPreventionRate: number;
  hospitalVteRate: number;
  fractions: {
    riskAssessmentRate: VteQualityFraction;
    highRiskPreventionRate: VteQualityFraction;
    hospitalVteRate: VteQualityFraction;
  };
}

export interface VteMetricsResponse {
  period: { from: string; to: string };
  discharges: number;
  metrics: VteMetrics;
}

/** 单就诊全详情：评估历史 + 预防 + 结局 */
export interface VteVisitDetail {
  assessments: VteAssessment[];
  preventions: VtePrevention[];
  outcomes: VteOutcome[];
}
