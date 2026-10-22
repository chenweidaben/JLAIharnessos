/**
 * 健澜科技 jlmedaios - 耗材采购申请管理 API（M732）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type PurchaseStatus = 'draft' | 'pending' | 'approved' | 'purchasing' | 'received' | 'rejected';

export interface PurchaseRequest {
  id: string;
  requestNo: string;
  dept: string;
  materialName: string;
  qty: number;
  budget: number;
  status: PurchaseStatus;
  items: { name: string; spec: string; qty: number }[];
  approvals: { step: string; by: string; result: string }[];
  progress: string;
}

export const PURCHASE_STATUS_META: Record<PurchaseStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  pending: { label: '待审批', color: 'orange' },
  approved: { label: '已批准', color: 'blue' },
  purchasing: { label: '采购中', color: 'processing' },
  received: { label: '已入库', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
};

const DEMO: PurchaseRequest[] = [
  {
    id: 'PR-001',
    requestNo: 'PR-261001',
    dept: 'ICU',
    materialName: '中心静脉导管套件',
    qty: 50,
    budget: 12500,
    status: 'purchasing',
    items: [
      { name: '中心静脉导管套件（双腔）', spec: '7Fr', qty: 30 },
      { name: '中心静脉导管套件（三腔）', spec: '8Fr', qty: 20 },
    ],
    approvals: [
      { step: '科室主任', by: '陈主任', result: '同意' },
      { step: '设备科', by: '王科长', result: '同意' },
      { step: '分管院长', by: '刘副院长', result: '待审批' },
    ],
    progress: '已向 3 家供应商询价，预计 10-25 前到货。',
  },
];

export interface PurchaseListResult {
  items: PurchaseRequest[];
  demo: boolean;
}

export async function fetchPurchaseRequests(): Promise<PurchaseListResult> {
  try {
    const res = await get<{ items: PurchaseRequest[] }>('/materials/purchase-requests');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
