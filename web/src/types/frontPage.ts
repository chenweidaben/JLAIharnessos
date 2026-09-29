/**
 * 健澜科技 jlmedaios - 病案首页类型（M3-A）
 * 与 BFF src/bff/routes/frontPage.ts 契约对齐。
 * 真实链路：全部数据来自 BFF 落 PostgreSQL，本文件不含任何 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export type FrontPageStatus = 'draft' | 'coding' | 'qc' | 'archived';
export type ReviewDecision = 'pass' | 'return';

export interface FrontPageDefect {
  field: string;
  severity: 'block' | 'major' | 'minor';
  message: string;
}

export interface FrontPageDto {
  id: string;
  visitId: string;
  patientId: string;
  department: string;
  status: FrontPageStatus;
  version: number;
  admitAt: string | null;
  dischargeAt: string | null;
  ward: string | null;
  bedNo: string | null;
  primaryDiagnosis: string | null;
  primaryDiagnosisCode: string | null;
  secondaryDiagnoses: Array<Record<string, unknown>>;
  operations: Array<Record<string, unknown>>;
  totalFee: string | null;
  codedBy: string | null;
  codedAt: string | null;
  defects: FrontPageDefect[];
  qualityScore: number | null;
  archivedBy: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FrontPageReviewDto {
  id: string;
  frontPageId: string;
  reviewerId: string;
  decision: ReviewDecision;
  defects: FrontPageDefect[];
  comment: string | null;
  signatureAt: string;
  prevHash: string | null;
  curHash: string;
  createdAt: string;
}

export interface FrontPageQueueItem {
  pageId: string;
  visitId: string;
  visitNo: string;
  patientId: string;
  mrn: string;
  patientName: string;
  department: string;
  status: FrontPageStatus;
  version: number;
  primaryDiagnosis: string | null;
  updatedAt: string;
}

export interface FrontPageDetail {
  page: FrontPageDto;
  visit: {
    id: string;
    visitNo: string;
    department: string;
    admitAt: string | null;
    dischargeAt: string | null;
  };
  patient: { mrn: string; nameMasked: string } | null;
  reviews: FrontPageReviewDto[];
}

export interface SaveCodingPayload {
  version: number;
  primaryDiagnosis?: string | null;
  primaryDiagnosisCode?: string | null;
  secondaryDiagnoses?: Array<Record<string, unknown>>;
  operations?: Array<Record<string, unknown>>;
  totalFee?: number | string | null;
}

export interface ReviewPayload {
  version: number;
  decision: ReviewDecision;
  comment?: string | null;
  defects?: FrontPageDefect[];
  acknowledgeIssues?: boolean;
}
