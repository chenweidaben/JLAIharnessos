/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引 API 服务（M5-C）
 *
 * 真实 BFF（src/bff/routes/empi.ts），全部读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { get, post } from '../request';
import type {
  EmpiLink,
  EmpiScanSummary,
  MatchCandidate,
  PatientIdentifier,
  RegisterIdentifierInput,
} from '@/types/empi';

/** 匹配候选列表（可按状态过滤）。 */
export function fetchCandidates(status?: string): Promise<MatchCandidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return get<MatchCandidate[]>(`/empi/candidates${qs}`);
}

/** 患者主索引链接列表。 */
export function fetchEmpiLinks(): Promise<EmpiLink[]> {
  return get<EmpiLink[]>('/empi/links');
}

/** 扫描患者，生成匹配候选。 */
export function runEmpiScanApi(): Promise<EmpiScanSummary> {
  return post<EmpiScanSummary>('/empi/scan', {});
}

/** 登记患者标识。 */
export function registerIdentifierApi(
  input: RegisterIdentifierInput,
): Promise<PatientIdentifier | null> {
  return post<PatientIdentifier | null>('/empi/identifiers', input);
}

/** 某患者的标识登记。 */
export function fetchPatientIdentifiers(
  patientId: string,
): Promise<PatientIdentifier[]> {
  return get<PatientIdentifier[]>(
    `/empi/patients/${patientId}/identifiers`,
  );
}

/** 确认候选，建立逻辑链接。 */
export function confirmCandidateApi(id: string): Promise<EmpiLink> {
  return post<EmpiLink>(`/empi/candidates/${id}/confirm`, {});
}

/** 拒绝候选。 */
export function rejectCandidateApi(id: string): Promise<MatchCandidate> {
  return post<MatchCandidate>(`/empi/candidates/${id}/reject`, {});
}
