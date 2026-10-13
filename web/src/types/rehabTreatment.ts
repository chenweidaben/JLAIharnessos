/**
 * 健澜科技 jlmedaios - 康复治疗执行类型（M51-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type RehabModality = 'pt' | 'ot' | 'st' | 'physical' | 'cupping' | 'traction';
export type RehabStatus = 'prescribed' | 'signed' | 'completed' | 'missed' | 'cancelled';
export type RehabEfficacy = 'excellent' | 'good' | 'fair' | 'poor';

export interface RehabTreatment {
  id: string;
  visitId: string;
  modality: RehabModality;
  prescribedBy: string;
  scheduledDate: string;
  status: RehabStatus;
  executedAt: string | null;
  executedBy: string | null;
  efficacy: RehabEfficacy | null;
  note: string | null;
  createdAt: string;
}

export interface CompleteResult {
  treatment: RehabTreatment;
  reviewWorkOrderCreated: boolean;
}
