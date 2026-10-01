/**
 * 健澜科技 jlmedaios - 家属代办授权 API（M3-Q）
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  DelegationRecord,
  GrantDelegationInput,
  RevokeDelegationInput,
} from '@/types/delegation';

export async function grantDelegationApi(
  input: GrantDelegationInput,
): Promise<{ profileId: string; scopes: string[] }> {
  return post(`/delegation/grant`, input);
}

export async function revokeDelegationApi(
  input: RevokeDelegationInput,
): Promise<{ profileId: string }> {
  return post(`/delegation/revoke`, input);
}

export async function listDelegationHistoryApi(
  profileId: string,
): Promise<DelegationRecord[]> {
  return get(`/delegation/${profileId}/history`);
}
