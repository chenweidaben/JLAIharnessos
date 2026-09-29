/**
 * 健澜科技 jlmedaios - 手术麻醉类型（M3-H）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type SurgeryStatus =
  | 'requested' | 'scheduled' | 'prechecked' | 'induction'
  | 'maintenance' | 'recovery' | 'pacu' | 'discharged' | 'cancelled';

export interface SurgeryRequest {
  id: string;
  requestNo: string;
  visitId: string;
  patientId: string;
  surgeryType: string;
  plannedProcedure: string;
  diagnosis: string | null;
  plannedDate: string | null;
  department: string;
  surgeonId: string | null;
  anesthetistId: string | null;
  anesthesiaMethod: string | null;
  status: SurgeryStatus;
  precheck: Record<string, unknown>;
  surgeonSignedAt: string | null;
  anesthetistSignedAt: string | null;
  createdAt: string;
}

export interface IntraopEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface SurgeryDetail {
  req: SurgeryRequest;
  events: IntraopEvent[];
}
