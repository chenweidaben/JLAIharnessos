/**
 * 健澜科技 jlmedaios - 疼痛门诊类型（M52-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface PainClinicRecord {
  id: string;
  patientId: string;
  visitId: string | null;
  baselineNrs: number;
  currentNrs: number;
  breakthroughCount: number;
  analgesic: string;
  doseNote: string | null;
  titrationRound: number;
  adjustmentSuggestion: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface RecordResult {
  record: PainClinicRecord;
  titrationResponse: 'good' | 'partial' | 'none';
  escalationWorkOrderCreated: boolean;
}
