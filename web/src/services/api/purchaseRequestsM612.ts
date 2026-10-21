/**
 * 健澜科技 jlmedaios - 采购申请 API（M612，P0）
 *
 * 对接 BFF：
 *   GET  /api/v1/purchase/requests
 *   POST /api/v1/purchase/requests
 *
 * GET 类失败降级本地 DEMO 镜像并打标 demo:true；写接口不做 DEMO 成功兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type PurchaseRequestStatus = 'pending' | 'approved' | 'rejected';

export interface PurchaseRequest {
  id: string;
  requestNo: string;
  itemName: string;
  spec: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  requesterDept: string;
  requesterName: string;
  reason: string;
  status: PurchaseRequestStatus;
  createdAt: string;
}

export interface PurchaseRequestInput {
  itemName: string;
  spec: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  requesterDept: string;
  requesterName: string;
  reason: string;
}

export const PURCHASE_STATUS_META: Record<PurchaseRequestStatus, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'orange' },
  approved: { label: '已批准', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
};

const DEMO_REQUESTS: PurchaseRequest[] = [
  { id: 'PR-001', requestNo: 'PR-20261015-01', itemName: '一次性使用无菌注射器', spec: '5ml', quantity: 5000, unit: '支', estimatedUnitPrice: 0.35, requesterDept: 'DEPT-INT', requesterName: '周敏', reason: '内科库存低于安全线', status: 'approved', createdAt: '2026-10-15T09:00:00+08:00' },
  { id: 'PR-002', requestNo: 'PR-20261018-01', itemName: '乳胶检查手套', spec: 'M 号', quantity: 3000, unit: '双', estimatedUnitPrice: 0.8, requesterDept: 'DEPT-ICU', requesterName: '刘洋', reason: 'ICU 感染防控需求', status: 'pending', createdAt: '2026-10-18T11:00:00+08:00' },
  { id: 'PR-003', requestNo: 'PR-20261020-01', itemName: '电子血压计', spec: '上臂式', quantity: 20, unit: '台', estimatedUnitPrice: 320, requesterDept: 'DEPT-SURG', requesterName: '陈芳', reason: '病区老旧设备更新', status: 'rejected', createdAt: '2026-10-20T14:00:00+08:00' },
  { id: 'PR-004', requestNo: 'PR-20261021-01', itemName: '注射泵', spec: '双通道', quantity: 5, unit: '台', estimatedUnitPrice: 4800, requesterDept: 'DEPT-INT', requesterName: '王强', reason: 'CCU 扩容', status: 'pending', createdAt: '2026-10-21T15:00:00+08:00' },
];

export interface PurchaseRequestListResult {
  items: PurchaseRequest[];
  totalCount: number;
  demo: boolean;
}

export async function fetchPurchaseRequests(): Promise<PurchaseRequestListResult> {
  try {
    const res = await get<{ items: PurchaseRequest[]; totalCount: number }>('/purchase/requests');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_REQUESTS, totalCount: DEMO_REQUESTS.length, demo: true };
  }
}

export async function createPurchaseRequest(input: PurchaseRequestInput): Promise<PurchaseRequest> {
  return post<PurchaseRequest>('/purchase/requests', input);
}
