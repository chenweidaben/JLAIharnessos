/**
 * 健澜科技 jlmedaios - 互联网医院 API（M3-J）
 *
 * 管理端：医护线上资质列表/审核；医护本人：提交/查看资质。
 * 患者端 API 由微信小程序调用，不在 Web 管理端。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { InternetPractitionerView } from '@/types/internetHospital';

/** 管理端：列出线上资质（可按状态过滤） */
export async function listPractitioners(status?: string): Promise<InternetPractitionerView[]> {
  return get<InternetPractitionerView[]>(`/internet/practitioners`, status ? { status } : undefined);
}

/** 管理端：审核线上资质 */
export async function auditPractitioner(
  id: string,
  decision: 'approved' | 'rejected',
  reason?: string,
): Promise<InternetPractitionerView> {
  return post<InternetPractitionerView>(`/internet/practitioners/${id}/audit`, {
    decision,
    reason,
  });
}

/** 医护本人：查询本人资质 */
export async function getMyPractitioner(): Promise<InternetPractitionerView | null> {
  return get<InternetPractitionerView | null>(`/internet/practitioner/me`);
}

/** 医护本人：提交线上资质 */
export async function submitPractitioner(input: {
  practitionerNo?: string;
  practitionerType: 'doctor' | 'pharmacist' | 'nurse';
  practiceScope?: string;
  practiceYears?: number;
  validFrom?: string;
  validTo?: string;
}): Promise<{ id: string; auditStatus: string; created: boolean }> {
  return post(`/internet/practitioner/submit`, input);
}
