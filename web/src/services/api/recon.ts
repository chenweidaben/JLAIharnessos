/**
 * 健澜科技 jlmedaios - 医保对账 API（M3-G）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { ReconRun, ReconRunDetail } from '@/types/recon';

export async function listReconRuns(): Promise<ReconRun[]> {
  return get<ReconRun[]>(`/api/v1/recon/runs`);
}

export async function triggerReconRun(): Promise<ReconRun> {
  return post<ReconRun>(`/api/v1/recon/run`, {});
}

export async function getReconRun(id: string): Promise<ReconRunDetail> {
  return get<ReconRunDetail>(`/api/v1/recon/run/${id}`);
}

export async function confirmReconRun(id: string): Promise<ReconRun> {
  return post<ReconRun>(`/api/v1/recon/confirm/${id}`, {});
}

export async function disputeReconRun(id: string, note: string): Promise<ReconRun> {
  return post<ReconRun>(`/api/v1/recon/dispute/${id}`, { note });
}
