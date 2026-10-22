/**
 * 健澜科技 jlmedaios - 会诊管理 v2 API（M642，配套 M558）
 *
 * 对接 BFF：GET /api/v1/consultations + POST /api/v1/consultations
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type ConsultStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

export interface Consultation {
  id: string;
  patientId: string;
  requestingDept: string;
  consultingDept: string;
  reason: string;
  status: ConsultStatus;
  requestedAt: string;
  consultant: string | null;
}

export interface ConsultCreateInput {
  patientId: string;
  requestingDept: string;
  consultingDept: string;
  reason: string;
}

export const CONSULT_STATUS_META: Record<ConsultStatus, { label: string; color: string }> = {
  pending: { label: '待响应', color: 'orange' },
  accepted: { label: '已接收', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已作废', color: 'default' },
};

const DEMO_CONSULTS: Consultation[] = [
  { id: 'CO-001', patientId: 'P10001', requestingDept: '心内科', consultingDept: '肾内科', reason: 'eGFR 下降请评估。', status: 'completed', requestedAt: '2026-10-20T09:00:00+08:00', consultant: '刘医师' },
  { id: 'CO-002', patientId: 'P10004', requestingDept: '普外科', consultingDept: '麻醉科', reason: '术前麻醉评估。', status: 'accepted', requestedAt: '2026-10-21T14:00:00+08:00', consultant: '陈麻醉' },
  { id: 'CO-003', patientId: 'P10008', requestingDept: '神经内科', consultingDept: '影像科', reason: '疑难影像读片。', status: 'pending', requestedAt: '2026-10-22T08:00:00+08:00', consultant: null },
];

export interface ConsultListResult {
  items: Consultation[];
  totalCount: number;
  demo: boolean;
}

export async function fetchConsultations(): Promise<ConsultListResult> {
  try {
    const res = await get<{ items: Consultation[]; totalCount: number }>('/consultations');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_CONSULTS, totalCount: DEMO_CONSULTS.length, demo: true };
  }
}

export async function createConsultation(input: ConsultCreateInput): Promise<Consultation> {
  return post<Consultation>('/consultations', input);
}
