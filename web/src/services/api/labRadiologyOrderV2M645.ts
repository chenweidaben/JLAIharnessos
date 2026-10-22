/**
 * 健澜科技 jlmedaios - 检验检查申请 v2 API（M645，配套 M572）
 *
 * 对接 BFF：GET /api/v1/orders/lab-radiology
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type LrCategory = 'lab' | 'radiology' | 'pathology' | 'endoscopy';
export type LrStatus = 'pending' | 'sampled' | 'processing' | 'reported' | 'cancelled';

export interface LabRadiologyOrder {
  id: string;
  patientId: string;
  category: LrCategory;
  itemName: string;
  clinic: string;
  status: LrStatus;
  orderedAt: string;
  requestedBy: string;
}

export const LR_CATEGORY_META: Record<LrCategory, { label: string; color: string }> = {
  lab: { label: '检验', color: 'cyan' },
  radiology: { label: '放射', color: 'geekblue' },
  pathology: { label: '病理', color: 'purple' },
  endoscopy: { label: '内镜', color: 'orange' },
};

export const LR_STATUS_META: Record<LrStatus, { label: string; color: string }> = {
  pending: { label: '待采样/预约', color: 'orange' },
  sampled: { label: '已采样', color: 'blue' },
  processing: { label: '检验中', color: 'processing' },
  reported: { label: '已报告', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
};

const DEMO_ORDERS: LabRadiologyOrder[] = [
  { id: 'LR-001', patientId: 'P10001', category: 'lab', itemName: '血常规 + CRP', clinic: '发热待查，WBC 升高待复查', status: 'reported', orderedAt: '2026-10-22T08:00:00+08:00', requestedBy: '王医师' },
  { id: 'LR-002', patientId: 'P10001', category: 'radiology', itemName: '胸部 CT 平扫', clinic: '肺部阴影鉴别', status: 'processing', orderedAt: '2026-10-22T09:00:00+08:00', requestedBy: '王医师' },
  { id: 'LR-003', patientId: 'P10001', category: 'endoscopy', itemName: '无痛胃镜', clinic: '反复上腹不适 2 周', status: 'pending', orderedAt: '2026-10-22T10:00:00+08:00', requestedBy: '李医师' },
];

export interface LrListResult {
  items: LabRadiologyOrder[];
  totalCount: number;
  demo: boolean;
}

export async function fetchLabRadiologyOrders(patientId: string): Promise<LrListResult> {
  try {
    const res = await get<{ items: LabRadiologyOrder[]; totalCount: number }>('/orders/lab-radiology', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_ORDERS.filter((o) => o.patientId === patientId), totalCount: 0, demo: true };
  }
}
