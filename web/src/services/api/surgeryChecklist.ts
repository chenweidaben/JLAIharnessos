/**
 * 健澜科技 jlmedaios - 手术安全核查表 API
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';

export type ChecklistPhase = 'pre_op' | 'anesthesia' | 'pre_incision' | 'post_op';

export interface ChecklistItem {
  key: string;
  label: string;
  required: boolean;
  checked: boolean;
}

export interface PhaseView {
  phase: ChecklistPhase;
  title: string;
  items: ChecklistItem[];
  signedBy: string | null;
  signedAt: string | null;
  signed: boolean;
}

export interface ChecklistView {
  surgeryId: string;
  phases: PhaseView[];
}

export async function getChecklist(surgeryId: string): Promise<ChecklistView> {
  return get<ChecklistView>('/surgery/checklist', { surgeryId });
}

export async function signChecklist(input: {
  surgeryId: string;
  phase: ChecklistPhase;
  items: ChecklistItem[];
}): Promise<PhaseView> {
  return post<PhaseView>('/surgery/checklist', input);
}
