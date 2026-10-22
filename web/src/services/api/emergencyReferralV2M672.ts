/**
 * 健澜科技 jlmedaios - 急诊转诊 v2 API（M672，配套 M569）
 *
 * 对接 BFF：GET /api/v1/emergency/referrals
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReferralStatus = 'requested' | 'accepted' | 'transported' | 'arrived' | 'rejected';

export interface EmergencyReferral {
  id: string;
  patientId: string;
  fromHospital: string;
  toHospital: string;
  toDept: string;
  reason: string;
  status: ReferralStatus;
  requestedAt: string;
  ambulanceNo: string;
  physician: string;
}

export const REFERRAL_STATUS_META: Record<ReferralStatus, { label: string; color: string }> = {
  requested: { label: '已申请', color: 'orange' },
  accepted: { label: '接收院已确认', color: 'blue' },
  transported: { label: '转运中', color: 'processing' },
  arrived: { label: '已到达', color: 'green' },
  rejected: { label: '已拒收', color: 'red' },
};

const DEMO_REFERRALS: EmergencyReferral[] = [
  { id: 'ER-001', patientId: 'P10040', fromHospital: '建德市一院', toHospital: '本院', toDept: 'ICU', reason: '急性心梗需急诊 PCI，本地无导管室。', status: 'transported', requestedAt: '2026-10-22T04:00:00+08:00', ambulanceNo: '浙A·120-01', physician: '刘主任' },
  { id: 'ER-002', patientId: 'P10041', fromHospital: '本院', toHospital: '省儿童医院', toDept: 'PICU', reason: '2 岁重症肺炎合并 ARDS，本院儿科床位不足。', status: 'accepted', requestedAt: '2026-10-22T08:00:00+08:00', ambulanceNo: '浙A·120-05', physician: '陈医师' },
  { id: 'ER-003', patientId: 'P10042', fromHospital: '本院', toHospital: '市七院', toDept: '精神科', reason: '急性精神症状合并自伤风险，需精神专科。', status: 'arrived', requestedAt: '2026-10-21T22:00:00+08:00', ambulanceNo: '浙A·120-08', physician: '王医师' },
];

export interface ReferralListResult {
  items: EmergencyReferral[];
  totalCount: number;
  demo: boolean;
}

export async function fetchEmergencyReferrals(): Promise<ReferralListResult> {
  try {
    const res = await get<{ items: EmergencyReferral[]; totalCount: number }>('/emergency/referrals');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_REFERRALS, totalCount: DEMO_REFERRALS.length, demo: true };
  }
}
