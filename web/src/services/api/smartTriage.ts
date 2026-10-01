/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊 API（M3-P）
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  TriageSession,
  PreliminaryConsultation,
  DepartmentRecommendation,
  StartTriageInput,
  SubmitPreliminaryInput,
} from '@/types/smartTriage';

export async function startTriageApi(
  input: StartTriageInput,
): Promise<{ session: TriageSession; recommendations: DepartmentRecommendation[] }> {
  return post(`/triage/start`, input);
}

export async function chooseDepartmentApi(input: {
  sessionId: string;
  department: string;
}): Promise<TriageSession> {
  return post(`/triage/choose`, input);
}

export async function submitPreliminaryApi(
  input: SubmitPreliminaryInput,
): Promise<{ consultation: PreliminaryConsultation; reportText: string }> {
  return post(`/triage/preliminary`, input);
}

export async function listMyTriageApi(): Promise<TriageSession[]> {
  return get(`/triage/my`);
}

export async function listPreliminaryApi(
  patientId?: string,
): Promise<PreliminaryConsultation[]> {
  const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
  return get(`/triage/preliminary${qs}`);
}

export async function getPreliminaryApi(
  id: string,
): Promise<PreliminaryConsultation> {
  return get(`/triage/preliminary/${id}`);
}

export async function consumePreliminaryApi(
  id: string,
): Promise<PreliminaryConsultation> {
  return post(`/triage/preliminary/${id}/consume`, {});
}
