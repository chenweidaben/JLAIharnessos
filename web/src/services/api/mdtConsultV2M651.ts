/**
 * 健澜科技 jlmedaios - MDT 多学科会诊 v2 API（M651，配套 M578）
 *
 * 对接 BFF：GET /api/v1/mdt/consults + POST /api/v1/mdt/consults
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type MdtStatus = 'scheduled' | 'ongoing' | 'concluded' | 'cancelled';

export interface MdtConsult {
  id: string;
  patientId: string;
  requestingDept: string;
  participantDepts: string[];
  topic: string;
  conclusion: string;
  status: MdtStatus;
  scheduledAt: string;
  chair: string;
}

export interface MdtCreateInput {
  patientId: string;
  requestingDept: string;
  participantDepts: string[];
  topic: string;
  chair: string;
}

export const MDT_STATUS_META: Record<MdtStatus, { label: string; color: string }> = {
  scheduled: { label: '已排期', color: 'blue' },
  ongoing: { label: '进行中', color: 'processing' },
  concluded: { label: '已结束', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
};

const DEMO_MDTS: MdtConsult[] = [
  { id: 'MDT-001', patientId: 'P10020', requestingDept: '肿瘤科', participantDepts: ['放疗科', '胸外科', '影像科'], topic: '局部晚期非小细胞肺癌新辅助治疗方案选择。', conclusion: '建议行 2 周期免疫 + 化疗新辅助治疗后再评估手术。', status: 'concluded', scheduledAt: '2026-10-18T14:00:00+08:00', chair: '陈主任' },
  { id: 'MDT-002', patientId: 'P10021', requestingDept: '消化科', participantDepts: ['肝胆外科', '介入科', '影像科'], topic: '晚期肝癌转化治疗策略。', conclusion: '', status: 'ongoing', scheduledAt: '2026-10-22T15:00:00+08:00', chair: '刘主任' },
];

export interface MdtListResult {
  items: MdtConsult[];
  totalCount: number;
  demo: boolean;
}

export async function fetchMdtConsults(patientId: string): Promise<MdtListResult> {
  try {
    const res = await get<{ items: MdtConsult[]; totalCount: number }>('/mdt/consults', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_MDTS.filter((m) => m.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createMdtConsult(input: MdtCreateInput): Promise<MdtConsult> {
  return post<MdtConsult>('/mdt/consults', input);
}
