/**
 * 健澜科技 jlmedaios - 输血质控深度看板 API（M519）
 * 对接 BFF /api/v1/transfusion/* ：
 *   /transfusion/applications  申请全流程
 *   /transfusion/adverse-reactions  不良反应
 *   /transfusion/stats  KPI
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export type BloodType = 'A' | 'B' | 'O' | 'AB';
export type RhFactor = 'positive' | 'negative';
export type Component = 'RBC' | 'plasma' | 'platelet' | 'cryoprecipitate';
export type Indication = 'anemia' | 'thrombocytopenia' | 'coagulopathy' | 'perioperative';
export type CrossmatchStatus = 'pending' | 'matched' | 'mismatch';
export type TxStatus = 'draft' | 'approved' | 'issued' | 'transfusing' | 'completed' | 'returned';
export type ReactionType = 'fever' | 'allergy' | 'hemolysis' | 'bacterial' | 'circulatoryOverload' | 'hypocalcemia';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface ApplicationRow {
  id: string;
  patient: string;
  mrn: string;
  bloodType: BloodType;
  rh: RhFactor;
  component: Component;
  amountMl: number;
  dept: string;
  diagnosis: string;
  preHb: number | null;
  prePlt: number | null;
  preINR: number | null;
  indication: Indication;
  crossmatchStatus: CrossmatchStatus;
  status: TxStatus;
  issuedAt: string | null;
  transfusedAt: string | null;
  completedAt: string | null;
  nurseDoubleCheck: boolean;
  demo?: boolean;
}

export interface ReactionRow {
  id: string;
  patient: string;
  mrn: string;
  reactionType: ReactionType;
  occurredAt: string;
  severity: Severity;
  bloodProduct: string;
  lotNumber: string;
  treatment: string;
  resolved: boolean;
  resolvedAt: string | null;
  reportRequired: boolean;
  demo?: boolean;
}

export interface TransfusionStats {
  todayApplications: number;
  todayTransfused: number;
  monthReactions: number;
  severeReactionRate: number;
  matchRate: number;
  onTimeRate: number;
  doubleCheckCompliance: number;
  demo?: boolean;
}

async function safeGetList<T>(url: string): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: [], demo: true };
  } catch {
    return { data: [], demo: true };
  }
}

async function safeGetSingle<T>(url: string): Promise<{ data: T | null; demo: boolean }> {
  try {
    const res = await get<T>(url);
    if (res && typeof res === 'object') return { data: res, demo: false };
    return { data: null, demo: true };
  } catch {
    return { data: null, demo: true };
  }
}

export const fetchApplications = () => safeGetList<ApplicationRow>('/transfusion/applications');
export const fetchReactions = () => safeGetList<ReactionRow>('/transfusion/adverse-reactions');
export const fetchTransfusionStats = () => safeGetSingle<TransfusionStats>('/transfusion/stats');
