/**
 * 健澜科技 jlmedaios - 输血管理 API（M10-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { TransfusionRequest, TransfusionDetail } from '@/types/transfusion';

export interface ApplyTransfusionBody {
  requestNo: string;
  visitId: string;
  patientId: string;
  department: string;
  indication: string;
  indicationMeta: Record<string, unknown>;
  bloodType: string;
  component: string;
  unitCount: number;
  urgency: string;
}

export async function applyTransfusion(body: ApplyTransfusionBody): Promise<{ req: TransfusionRequest; created: boolean }> {
  return post(`/transfusions`, body);
}

export async function listTransfusions(): Promise<TransfusionRequest[]> {
  return get(`/transfusions`);
}

export async function getTransfusion(id: string): Promise<TransfusionDetail> {
  return get(`/transfusions/${id}`);
}

export async function crossmatchTransfusion(id: string, result: string, note?: string): Promise<TransfusionRequest> {
  return post(`/transfusions/${id}/crossmatch`, { result, note });
}

export async function dispenseTransfusion(id: string, batchNo?: string): Promise<TransfusionRequest> {
  return post(`/transfusions/${id}/dispense`, { batchNo });
}

export async function startTransfusion(id: string, coSignBy: string, dripRate?: string): Promise<TransfusionRequest> {
  return post(`/transfusions/${id}/start`, { coSignBy, dripRate });
}

export async function completeTransfusion(id: string, vitalSigns?: Record<string, unknown>): Promise<TransfusionRequest> {
  return post(`/transfusions/${id}/complete`, { vitalSigns });
}

export async function stopTransfusion(id: string, reason: string): Promise<TransfusionRequest> {
  return post(`/transfusions/${id}/stop`, { reason });
}

export async function cancelTransfusion(id: string, reason: string): Promise<TransfusionRequest> {
  return post(`/transfusions/${id}/cancel`, { reason });
}

export async function reportReaction(
  id: string,
  body: { severity: string; symptom: string; action: string; outcome?: string },
): Promise<{ reaction: Record<string, unknown>; req: TransfusionRequest }> {
  return post(`/transfusions/${id}/reaction`, body);
}
