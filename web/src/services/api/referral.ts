/**
 * 健澜科技 jlmedaios - 双向转诊 API（M3-R）
 * 相对路径（业务 API 禁 /api/v1 全路径，避免双前缀）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  AcceptReferralInput,
  AddDocumentInput,
  CreateReferralInput,
  ReferralDetail,
  ReferralDirection,
  ReferralOrder,
  ReferralStatus,
} from '@/types/referral';

/** 发起转诊。 */
export async function createReferralApi(
  input: CreateReferralInput,
): Promise<ReferralOrder> {
  return post(`/referrals`, input);
}

/** 转诊列表。 */
export async function listReferralsApi(filter: {
  direction?: ReferralDirection;
  status?: ReferralStatus;
} = {}): Promise<ReferralOrder[]> {
  const params = new URLSearchParams();
  if (filter.direction) params.set('direction', filter.direction);
  if (filter.status) params.set('status', filter.status);
  const qs = params.toString();
  return get(`/referrals${qs ? `?${qs}` : ''}`);
}

/** 转诊详情（含随附资料）。 */
export async function getReferralApi(id: string): Promise<ReferralDetail> {
  return get(`/referrals/${id}`);
}

/** 补充随附资料。 */
export async function addDocumentApi(
  id: string,
  input: AddDocumentInput,
): Promise<ReferralDetail> {
  return post(`/referrals/${id}/documents`, input);
}

/** 接收转诊。 */
export async function acceptReferralApi(
  id: string,
  input: AcceptReferralInput,
): Promise<ReferralDetail> {
  return post(`/referrals/${id}/accept`, input);
}

/** 拒绝转诊。 */
export async function rejectReferralApi(
  id: string,
  reason: string,
): Promise<ReferralOrder> {
  return post(`/referrals/${id}/reject`, { reason });
}

/** 完成转诊。 */
export async function completeReferralApi(id: string): Promise<ReferralOrder> {
  return post(`/referrals/${id}/complete`, {});
}

/** 取消转诊。 */
export async function cancelReferralApi(id: string): Promise<ReferralOrder> {
  return post(`/referrals/${id}/cancel`, {});
}
