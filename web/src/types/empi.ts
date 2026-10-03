/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引类型（M5-C）
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

export type IdentifierDomain =
  | 'mrn' | 'id_card' | 'insurance' | 'phone' | 'wechat' | 'outer';

export interface PatientIdentifier {
  id: string;
  patientId: string;
  domain: IdentifierDomain;
  identifierHash: string;
  identifierLast4: string | null;
  source: string;
  createdAt: string;
}

export interface MatchCandidate {
  id: string;
  patientAId: string;
  patientBId: string;
  matchScore: number;
  matchReasons: string[];
  status: 'pending' | 'confirmed' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface EmpiLink {
  id: string;
  masterPatientId: string;
  linkedPatientId: string;
  candidateId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface EmpiScanSummary {
  scanned: number;
  newCandidates: number;
  pending: number;
}

export interface RegisterIdentifierInput {
  patientId: string;
  domain: IdentifierDomain;
  rawValue: string;
  source?: string;
}
