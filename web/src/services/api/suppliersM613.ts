/**
 * 健澜科技 jlmedaios - 供应商管理 API（M613，P0）
 *
 * 对接真实 BFF（m601Routes）：
 *   GET  /api/v1/suppliers?category=&certStatus=
 *   POST /api/v1/suppliers（businessLicenseNo 唯一，重复 → 409）
 *
 * GET 失败降级本地 DEMO 镜像并打标 demo:true；写接口不做 DEMO 成功兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type SupplierCategory = 'drug' | 'supply' | 'equipment';

export const SUPPLIER_CATEGORY_META: Record<SupplierCategory, { label: string; color: string }> = {
  drug: { label: '药品', color: 'blue' },
  supply: { label: '耗材物资', color: 'green' },
  equipment: { label: '设备', color: 'purple' },
};

export interface SupplierRecord {
  id: string;
  supplierName: string;
  unifiedSocialCreditCode: string;
  contactPerson: string;
  contactPhone: string;
  address: string;
  category: SupplierCategory;
  businessLicenseNo: string;
  expiryDate: string;
  registeredCapital: number;
  isExpired: boolean;
  auditResult: 'passed' | 'pending' | 'rejected' | null;
  isBlacklisted: boolean;
  createdAt: string;
}

export interface SupplierCreateInput {
  supplierName: string;
  unifiedSocialCreditCode: string;
  contactPerson: string;
  contactPhone: string;
  address: string;
  category: SupplierCategory;
  businessLicenseNo: string;
  expiryDate: string;
  registeredCapital: number;
}

const DEMO_SUPPLIERS: SupplierRecord[] = [
  {
    id: 'SUP-001',
    supplierName: '国药控股-1',
    unifiedSocialCreditCode: 'USCC-000001',
    contactPerson: '联系人1',
    contactPhone: '13800000001',
    address: '地址1',
    category: 'drug',
    businessLicenseNo: 'LIC-000001',
    expiryDate: '2025-01-01T00:00:00Z',
    registeredCapital: 1000000,
    isExpired: true,
    auditResult: null,
    isBlacklisted: true,
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'SUP-004',
    supplierName: '迈瑞医疗-4',
    unifiedSocialCreditCode: 'USCC-000004',
    contactPerson: '联系人4',
    contactPhone: '13800000004',
    address: '地址4',
    category: 'equipment',
    businessLicenseNo: 'LIC-000004',
    expiryDate: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    registeredCapital: 4000000,
    isExpired: false,
    auditResult: 'passed',
    isBlacklisted: false,
    createdAt: '2026-10-10T00:00:00Z',
  },
];

export interface SupplierListResult {
  items: SupplierRecord[];
  totalCount: number;
  demo: boolean;
}

export async function fetchSuppliers(params?: { category?: string; certStatus?: string }): Promise<SupplierListResult> {
  try {
    const res = await get<{ items: SupplierRecord[]; totalCount: number }>('/suppliers', params);
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_SUPPLIERS, totalCount: DEMO_SUPPLIERS.length, demo: true };
  }
}

/** 新建：非 2xx 抛后端 message（含 409 license_no_duplicate） */
export async function createSupplier(input: SupplierCreateInput): Promise<SupplierRecord> {
  return post<SupplierRecord>('/suppliers', input);
}
