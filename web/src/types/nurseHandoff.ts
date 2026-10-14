/**
 * 健澜科技 jlmedaios - 护士交接班记录前端类型（214）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type HandoffShift = 'day' | 'evening' | 'night';

export interface NurseHandoff {
  id: string;
  wardId: string | null;
  shift: HandoffShift;
  patientId: string | null;
  summary: string;
  createdBy: string | null;
  createdAt: string;
}

export interface HandoffVitalSigns {
  temperature?: number;
  pulse?: number;
  respiration?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  oxygenSaturation?: number;
}

export interface HandoffPlan {
  patientName?: string;
  bedNo?: string;
  diagnosis?: string;
  nursingLevel?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  planItems?: { item: string; category?: string }[];
  pendingTasks?: string[];
}

export interface RecordHandoffReq {
  wardId?: string;
  shift?: HandoffShift;
  patientId?: string;
  summary?: string;
  plan?: HandoffPlan;
  vitalSigns?: HandoffVitalSigns;
}

export const SHIFT_OPTIONS: { value: HandoffShift; label: string }[] = [
  { value: 'day', label: '白班' },
  { value: 'evening', label: '中班' },
  { value: 'night', label: '夜班' },
];
