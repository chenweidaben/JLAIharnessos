/**
 * 健澜科技 jlmedaios - 双向转诊 类型（M3-R）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type ReferralDirection = 'incoming' | 'outgoing';
export type ReferralStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'cancelled';
export type ReferralDocType =
  | 'dicom'
  | 'front_page'
  | 'diagnosis'
  | 'lab'
  | 'exam'
  | 'other';

export interface ReferralOrder {
  id: string;
  referralNo: string;
  direction: ReferralDirection;
  patientId: string | null;
  profileId: string | null;
  patientName: string | null;
  gender: string | null;
  birthDate: string | null;
  sourceOrg: string;
  sourceDept: string | null;
  sourceDoctor: string | null;
  targetOrg: string;
  targetDept: string | null;
  reason: string;
  urgency: 'normal' | 'urgent';
  status: ReferralStatus;
  encounterId: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  rejectedReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralDocument {
  id: string;
  referralId: string;
  docType: ReferralDocType;
  title: string;
  contentRef: string | null;
  contentText: string | null;
  sourceOrg: string | null;
  receivedAt: string;
  createdAt: string;
}

export interface ReferralDetail {
  referral: ReferralOrder;
  documents: ReferralDocument[];
}

export interface CreateReferralInput {
  direction: ReferralDirection;
  patientId?: string | null;
  profileId?: string | null;
  patientName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  sourceOrg: string;
  sourceDept?: string | null;
  sourceDoctor?: string | null;
  targetOrg: string;
  targetDept?: string | null;
  reason: string;
  urgency?: 'normal' | 'urgent';
  status?: 'draft' | 'submitted';
}

export interface AddDocumentInput {
  docType: ReferralDocType;
  title: string;
  contentRef?: string | null;
  contentText?: string | null;
  sourceOrg?: string | null;
}

export interface AcceptReferralInput {
  visitType?: 'outpatient' | 'inpatient';
  department: string;
  note?: string;
}
