/**
 * 健澜科技 jlmedaios - 抗菌药物管理（AMS）闭环类型（M14-A）
 *
 * 对标国家《抗菌药物临床应用管理办法》《抗菌药物临床应用指导原则》、三甲评审合理用药监测、
 * WHO ATC/DDD 方法。三级分级管理 + 医师处方权限 + 特殊使用级会诊审批 + 围术期/专项点评 +
 * DDD/AUD 质控指标。
 *
 * 医疗安全：AI 不自主开抗菌药；特殊使用级须会诊审批；点评为规则建议，最终判定由药师/医师签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 抗菌药物分级（三级管理） */
export type AtcLevel = 'unrestricted' | 'restricted' | 'special';

/** 药理分类（WHO ATC 口径） */
export type PharmClass =
  | 'penicillins'
  | 'cephalosporin_1'
  | 'cephalosporin_2'
  | 'cephalosporin_3'
  | 'cephalosporin_4'
  | 'quinolones'
  | 'carbapenems'
  | 'macrolides'
  | 'glycopeptides'
  | 'nitroimidazole'
  | 'other';

/** 问题类型 code（与后端 CHECK 约束一致） */
export type AmxIssueCode =
  | 'no_indication'
  | 'wrong_choice'
  | 'wrong_timing'
  | 'wrong_duration'
  | 'overdose'
  | 'overduration'
  | 'duplicate'
  | 'interaction'
  | 'contraindication'
  | 'no_culture';

export type AmxReviewType = 'perioperative' | 'prescription' | 'order';
export type AmxReviewResult = 'rational' | 'irrational';
export type AmxReviewStatus = 'pending_review' | 'signed' | 'returned';
export type SpecialApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AmxPurpose = 'prophylactic' | 'therapeutic';

/** 抗菌药目录扩展条目（与 drug_catalog 1:1） */
export interface AntibioticCatalogItem {
  id: string;
  drugId: string;
  genericName: string;
  atcLevel: AtcLevel;
  pharmClass: PharmClass;
  ddd: number;
  dddUnit: string;
  defaultRoute: string | null;
}

/** 医师抗菌药处方授权 */
export interface PrescriberGrant {
  id: string;
  prescriberId: string;
  prescriberName: string | null;
  title: string | null;
  maxLevel: AtcLevel;
  status: 'active' | 'revoked';
  grantedBy: string | null;
  grantedAt: string | null;
  expiresAt: string | null;
}

/** 特殊使用级会诊审批 */
export interface SpecialApproval {
  id: string;
  approvalNo: string;
  visitId: string;
  patientId: string;
  patientName: string | null;
  prescriberId: string;
  drugId: string;
  drugName: string | null;
  indication: string;
  consultationOpinion: string | null;
  consultantId: string | null;
  approverId: string | null;
  status: SpecialApprovalStatus;
  orderId: string | null;
  rejectReason: string | null;
  createdAt: string;
  approvedAt: string | null;
}

/** 专项点评（围术期 / 门诊处方 / 住院医嘱） */
export interface AmxReview {
  id: string;
  reviewNo: string;
  reviewType: AmxReviewType;
  targetId: string | null;
  visitId: string;
  patientId: string;
  patientName: string | null;
  result: AmxReviewResult;
  issueTypes: AmxIssueCode[];
  detail: Record<string, unknown>;
  status: AmxReviewStatus;
  reviewerId: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** 抗菌药使用记录（DDD/AUD 数据源） */
export interface AmxUsageRecord {
  id: string;
  visitId: string;
  patientId: string;
  drugId: string;
  drugName: string | null;
  orderId: string | null;
  purpose: AmxPurpose;
  dose: number;
  doseUnit: string;
  frequency: string | null;
  route: string | null;
  usageDays: number;
  totalAmount: number | null;
  ddds: number | null;
  cultureSent: boolean;
  administeredAt: string;
}

/** 质控指标分数（分子/分母可核查） */
export interface AmxFraction {
  numerator: number;
  denominator: number;
}

/** 八项抗菌药质控指标（应用层聚合，百分比口径） */
export interface AmxMetrics {
  outpatientAbxRate: number;
  inpatientAbxRate: number;
  aud: number;
  classIProphylaxisRate: number;
  timingAppropriateRate: number;
  durationComplianceRate: number;
  specialShare: number;
  cultureRate: number;
  fractions: {
    outpatientAbxRate: AmxFraction;
    inpatientAbxRate: AmxFraction;
    aud: AmxFraction;
    classIProphylaxisRate: AmxFraction;
    timingAppropriateRate: AmxFraction;
    durationComplianceRate: AmxFraction;
    specialShare: AmxFraction;
    cultureRate: AmxFraction;
  };
}

export interface AmxMetricsResponse {
  period: { from: string; to: string };
  metrics: AmxMetrics;
}

/** 规则预检结果（CDS，不入库） */
export interface AmxCheckResult {
  rational: boolean;
  issues: AmxIssueCode[];
  detail: Record<string, unknown>;
}
