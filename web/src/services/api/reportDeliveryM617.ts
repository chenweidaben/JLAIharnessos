/**
 * 健澜科技 jlmedaios - 报告推送 API（M617，P11 智慧服务）
 *
 * 对接 BFF：GET /api/v1/reports/deliveries（未注册则 DEMO 兜底，打标 demo:true）。
 * 状态：delivered 已推送 / read 已读 / acknowledged 已确认。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DeliveryStatus = 'delivered' | 'read' | 'acknowledged';

export interface ReportDelivery {
  id: string;
  reportNo: string;
  reportType: string;
  patientId: string;
  deptCode: string;
  deliveredAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  status: DeliveryStatus;
  summary: string;
}

export const DELIVERY_STATUS_META: Record<DeliveryStatus, { label: string; color: string }> = {
  delivered: { label: '已推送', color: 'blue' },
  read: { label: '已读', color: 'orange' },
  acknowledged: { label: '已确认', color: 'green' },
};

const DEMO_DELIVERIES: ReportDelivery[] = [
  { id: 'RD-001', reportNo: 'RPT-20261020-01', reportType: '检验报告', patientId: 'P10001', deptCode: '检验科', deliveredAt: '2026-10-20T10:00:00+08:00', readAt: '2026-10-20T11:30:00+08:00', acknowledgedAt: null, status: 'read', summary: '血常规：WBC 6.5、Hb 135、PLT 220，均在参考区间。' },
  { id: 'RD-002', reportNo: 'RPT-20261021-01', reportType: '影像报告', patientId: 'P10001', deptCode: '影像科', deliveredAt: '2026-10-21T15:00:00+08:00', readAt: null, acknowledgedAt: null, status: 'delivered', summary: '头颅 CT 平扫：未见明显异常。' },
  { id: 'RD-003', reportNo: 'RPT-20261018-01', reportType: '病理报告', patientId: 'P10002', deptCode: '病理科', deliveredAt: '2026-10-18T09:00:00+08:00', readAt: '2026-10-18T10:00:00+08:00', acknowledgedAt: '2026-10-19T09:00:00+08:00', status: 'acknowledged', summary: '结肠息肉活检：管状腺瘤，低级别上皮内瘤变。' },
];

export interface DeliveryListResult {
  items: ReportDelivery[];
  totalCount: number;
  demo: boolean;
}

export async function fetchReportDeliveries(patientId: string): Promise<DeliveryListResult> {
  try {
    const res = await get<{ items: ReportDelivery[]; totalCount: number }>('/reports/deliveries', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_DELIVERIES, totalCount: DEMO_DELIVERIES.length, demo: true };
  }
}
