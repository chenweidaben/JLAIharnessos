/**
 * 健澜科技 jlmedaios - 急诊留观类型（M74-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type TriageLevel = 'I' | 'II' | 'III' | 'IV' | 'V';
export type ObsStatus = 'observing' | 'closed';
export type Disposition = 'admitted' | 'discharged' | 'transferred' | 'left_ama';

export interface EdObservation {
  id: string;
  patientId: string;
  triageLevel: TriageLevel;
  enteredAt: string;
  dischargedAt: string | null;
  disposition: Disposition | null;
  status: ObsStatus;
  registeredBy: string;
  createdAt: string;
}

export interface RegisterInput {
  patientId: string;
  triageLevel: string;
}
