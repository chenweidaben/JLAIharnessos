/**
 * 健澜科技 jlmedaios - 运行病历质控类型（M2-B）
 * 与 BFF src/bff/routes/medicalQc.ts 契约对齐。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export type QcIssueCategory = 'completeness' | 'timeliness' | 'defect';
export type QcSeverity = 'block' | 'major' | 'minor';

export interface QcIssueDto {
  ruleId: string;
  category: QcIssueCategory;
  severity: QcSeverity;
  section?: string;
  message: string;
  source: 'rule' | 'ai';
}

export interface QcEvaluationDto {
  issues: QcIssueDto[];
  score: number;
  canPass: boolean;
  blockCount: number;
  majorCount: number;
  minorCount: number;
}

export interface AiQcDto {
  issues: QcIssueDto[];
  model: string;
  error: string | null;
}

export interface QcCheckResult {
  rule: QcEvaluationDto;
  ai: AiQcDto;
  issues: QcIssueDto[];
  score: number;
  canPass: boolean;
}

export interface QcQueueItem {
  recordId: string;
  recordType: string;
  title: string;
  status: string;
  nextLevel: number | null;
  department: string;
  visitNo: string;
  mrn: string;
  patientName: string;
  updatedAt: string;
}

export interface MedicalRecordQcDto {
  id: string;
  visitId: string;
  recordType: string;
  title: string;
  content: Record<string, unknown>;
  plainText: string | null;
  authorId: string | null;
  aiGenerated: boolean;
  aiModel: string | null;
  status: string;
  qualityScore: number | null;
  qualityIssues: QcIssueDto[];
  signedAt: string | null;
  signedBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecordReviewDto {
  id: string;
  recordId: string;
  reviewLevel: number;
  decision: 'pass' | 'return';
  reviewerId: string;
  comment: string | null;
  issues: QcIssueDto[];
  ruleIssueCount: number;
  aiIssueCount: number;
  aiAssisted: boolean;
  aiModel: string | null;
  createdAt: string;
}

export interface QcRecordDetail {
  record: MedicalRecordQcDto;
  visit: {
    id: string;
    visitNo: string;
    department: string;
    admitAt: string | null;
    dischargeAt: string | null;
  };
  patient: { mrn: string; nameMasked: string } | null;
  reviews: RecordReviewDto[];
  nextLevel: number | null;
  latestRule: QcEvaluationDto;
}

export interface QcSubmitPayload {
  decision: 'pass' | 'return';
  level: number;
  comment?: string | null;
  issues?: QcIssueDto[];
  aiAssisted?: boolean;
  aiModel?: string | null;
  acknowledgeIssues?: boolean;
}