/**
 * 健澜科技 jlmedaios - 手术麻醉 API（M3-H 后端 / M9-C 前端闭环）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { SurgeryRequest, SurgeryDetail } from '@/types/surgery';

export interface SubmitSurgeryBody {
  requestNo: string;
  visitId: string;
  patientId: string;
  surgeryType: 'elective' | 'emergency';
  plannedProcedure: string;
  diagnosis?: string | null;
  plannedDate?: string | null;
  department?: string;
}

export async function submitSurgery(body: SubmitSurgeryBody): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/requests`, body);
}

export async function listSurgeries(): Promise<SurgeryRequest[]> {
  return get<SurgeryRequest[]>(`/surgery/requests`);
}

export async function getSurgery(id: string): Promise<SurgeryDetail> {
  return get<SurgeryDetail>(`/surgery/request/${id}`);
}

export async function scheduleSurgery(id: string, body: Record<string, unknown>): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/schedule/${id}`, body);
}

export async function precheckSurgery(id: string, precheck: Record<string, unknown>): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/precheck/${id}`, { precheck });
}

export async function inductionSurgery(id: string, notes: string): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/induction/${id}`, { notes });
}

export async function stageSurgery(
  id: string,
  to: 'maintenance' | 'recovery' | 'pacu',
  notes?: string,
): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/stage/${id}`, { to, notes });
}

export async function eventSurgery(
  id: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/event/${id}`, { eventType, payload });
}

export async function pacuAssess(id: string, aldrete: number, note?: string): Promise<{ req: SurgeryRequest; canDischarge: boolean }> {
  return post(`/surgery/pacu/${id}`, { aldrete, note });
}

export async function signSurgery(id: string, role: 'surgeon' | 'anesthetist'): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/sign/${id}`, { role });
}

export async function dischargeSurgery(id: string): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/discharge/${id}`, {});
}

export async function cancelSurgery(id: string, reason: string): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/surgery/cancel/${id}`, { reason });
}
