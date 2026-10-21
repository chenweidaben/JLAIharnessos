/**
 * 健澜科技 jlmedaios - 耗材管理 API（M611，P0）
 *
 * 对接 BFF：
 *   GET  /api/v1/materials/inventory        耗材库存列表
 *   POST /api/v1/materials/requisitions      科室申领（非 2xx 抛后端 message）
 *
 * GET 类失败降级本地 DEMO 镜像并打标 demo:true；写接口不做 DEMO 成功兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface ConsumableItem {
  id: string;
  name: string;
  spec: string;
  unit: string;
  stock: number;
  safetyStock: number;
  supplier: string;
  location: string;
}

export interface RequisitionItem {
  id: string;
  reqNo: string;
  deptCode: string;
  consumableId: string;
  consumableName: string;
  quantity: number;
  requester: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface RequisitionInput {
  consumableId: string;
  consumableName: string;
  deptCode: string;
  quantity: number;
  requester: string;
}

const DEMO_INVENTORY: ConsumableItem[] = [
  { id: 'MAT-001', name: '一次性使用无菌注射器', spec: '5ml 带针', unit: '支', stock: 12000, safetyStock: 3000, supplier: '鱼跃医疗', location: '库房A-01' },
  { id: 'MAT-002', name: '一次性输液器', spec: '带针 0.55mm', unit: '套', stock: 8000, safetyStock: 2000, supplier: '威高集团', location: '库房A-02' },
  { id: 'MAT-003', name: '医用外科口罩', spec: '17.5cm×9.5cm', unit: '只', stock: 25000, safetyStock: 8000, supplier: '振德医疗', location: '库房B-01' },
  { id: 'MAT-004', name: '乳胶检查手套', spec: 'M 号', unit: '双', stock: 500, safetyStock: 2000, supplier: '英科医疗', location: '库房B-02' },
  { id: 'MAT-005', name: '无菌纱布块', spec: '8cm×8cm×8层', unit: '块', stock: 6000, safetyStock: 1500, supplier: '奥美医疗', location: '库房A-03' },
];

const DEMO_REQUISITIONS: RequisitionItem[] = [
  { id: 'REQ-001', reqNo: 'SQ-20261020-01', deptCode: 'DEPT-INT', consumableId: 'MAT-001', consumableName: '一次性使用无菌注射器', quantity: 500, requester: '周敏', requestedAt: '2026-10-20T09:00:00+08:00', status: 'approved' },
  { id: 'REQ-002', reqNo: 'SQ-20261021-01', deptCode: 'DEPT-SURG', consumableId: 'MAT-002', consumableName: '一次性输液器', quantity: 300, requester: '陈芳', requestedAt: '2026-10-21T10:30:00+08:00', status: 'pending' },
  { id: 'REQ-003', reqNo: 'SQ-20261021-02', deptCode: 'DEPT-ICU', consumableId: 'MAT-004', consumableName: '乳胶检查手套', quantity: 2000, requester: '刘洋', requestedAt: '2026-10-21T14:00:00+08:00', status: 'rejected' },
];

export interface InventoryListResult {
  items: ConsumableItem[];
  totalCount: number;
  demo: boolean;
}

export interface RequisitionListResult {
  items: RequisitionItem[];
  totalCount: number;
  demo: boolean;
}

export async function fetchMaterialsInventory(): Promise<InventoryListResult> {
  try {
    const res = await get<{ items: ConsumableItem[]; totalCount: number }>('/materials/inventory');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_INVENTORY, totalCount: DEMO_INVENTORY.length, demo: true };
  }
}

export async function fetchRequisitions(): Promise<RequisitionListResult> {
  try {
    const res = await get<{ items: RequisitionItem[]; totalCount: number }>('/materials/requisitions');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_REQUISITIONS, totalCount: DEMO_REQUISITIONS.length, demo: true };
  }
}

/** 申领：非 2xx 抛后端 message，不做 DEMO 成功兜底 */
export async function createRequisition(input: RequisitionInput): Promise<RequisitionItem> {
  return post<RequisitionItem>('/materials/requisitions', input);
}
