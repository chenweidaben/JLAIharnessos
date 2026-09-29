/**
 * 健澜科技 jlmedaios - 手术麻醉 API（M3-H）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { SurgeryRequest, SurgeryDetail } from '@/types/surgery';

export async function listSurgeries(): Promise<SurgeryRequest[]> {
  return get<SurgeryRequest[]>(`/api/v1/surgery/requests`);
}

export async function getSurgery(id: string): Promise<SurgeryDetail> {
  return get<SurgeryDetail>(`/api/v1/surgery/request/${id}`);
}

export async function scheduleSurgery(id: string, body: Record<string, unknown>): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/api/v1/surgery/schedule/${id}`, body);
}

export async function precheckSurgery(id: string, precheck: Record<string, unknown>): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/api/v1/surgery/precheck/${id}`, { precheck });
}

export async function inductionSurgery(id: string, notes: string): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/api/v1/surgery/induction/${id}`, { notes });
}

export async function pacuAssess(id: string, aldrete: number, note?: string): Promise<{ req: SurgeryRequest; canDischarge: boolean }> {
  return post(`/api/v1/surgery/pacu/${id}`, { aldrete, note });
}

export async function signSurgery(id: string, role: 'surgeon' | 'anesthetist'): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/api/v1/surgery/sign/${id}`, { role });
}

export async function dischargeSurgery(id: string): Promise<SurgeryRequest> {
  return post<SurgeryRequest>(`/api/v1/surgery/discharge/${id}`, {});
}
