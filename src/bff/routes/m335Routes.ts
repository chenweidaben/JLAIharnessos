/**
 * 健澜科技 jlmedaios - M335 财务 + 收费域
 *
 * 费用支出/资产管理 + 发票管理（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/finance/expenses - 费用支出 5 条 */
async function handleFinanceExpenses(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FE-001', expenseItem: '药品采购费（阿莫西林）', department: '药学部', amount: '85,000.00 元', time: '2026-10-15', approver: '财务科 陈***（科长）' },
    { id: 'FE-002', expenseItem: '设备采购费（CT 维护保养）', department: '设备科', amount: '120,000.00 元', time: '2026-10-10', approver: '财务科 陈***（科长）' },
    { id: 'FE-003', expenseItem: '人员经费（10 月工资）', department: '全院', amount: '8,500,000.00 元', time: '2026-10-05', approver: '分管副院长 王***' },
    { id: 'FE-004', expenseItem: '水电费（9 月）', department: '后勤保障部', amount: '180,000.00 元', time: '2026-10-01', approver: '财务科 陈***（科长）' },
    { id: 'FE-005', expenseItem: '培训费（电子病历五级评审）', department: '医务科', amount: '25,000.00 元', time: '2026-10-16', approver: '财务科 陈***（科长）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/assets - 资产管理 5 条 */
async function handleFinanceAssets(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FA-001', assetName: '64 排螺旋 CT（影像设备）', category: '医疗设备', originalValue: '8,500,000.00 元', netValue: '6,200,000.00 元（已折旧 27%）', status: '正常使用（2023 年采购）' },
    { id: 'FA-002', assetName: '1.5T 核磁共振（影像设备）', category: '医疗设备', originalValue: '12,000,000.00 元', netValue: '9,800,000.00 元（已折旧 18%）', status: '正常使用（2022 年采购）' },
    { id: 'FA-003', assetName: '全自动生化分析仪（检验设备）', category: '医疗设备', originalValue: '1,200,000.00 元', netValue: '780,000.00 元（已折旧 35%）', status: '正常使用（2021 年采购）' },
    { id: 'FA-004', assetName: '住院楼（房屋建筑物）', category: '房屋建筑物', originalValue: '85,000,000.00 元', netValue: '72,000,000.00 元（已折旧 15%）', status: '正常使用（2018 年建成）' },
    { id: 'FA-005', assetName: '办公电脑（IT 设备）', category: 'IT 设备', originalValue: '4,500.00 元/台（共 500 台）', netValue: '2,000.00 元/台（已折旧 56%）', status: '正常使用（2023 年采购）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/billing/invoices - 发票管理 5 条 */
async function handleBillingInvoices(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BI-001', invoiceNo: 'INV-2026-000001', patient: '张***（男，65 岁，心内科住院患者）', amount: '12,500.00 元（住院费用）', type: '电子发票（增值税普通发票）', status: '已开具（患者已下载）' },
    { id: 'BI-002', invoiceNo: 'INV-2026-000002', patient: '王***（女，58 岁，普外科住院患者）', amount: '28,000.00 元（住院费用）', type: '电子发票（增值税普通发票）', status: '已开具（患者已下载）' },
    { id: 'BI-003', invoiceNo: 'INV-2026-000003', patient: '刘***（男，72 岁，门诊检查患者）', amount: '850.00 元（门诊检查费）', type: '电子发票（增值税普通发票）', status: '已开具（患者已下载）' },
    { id: 'BI-004', invoiceNo: 'INV-2026-000004', patient: '孙***（女，45 岁，门诊药品患者）', amount: '120.00 元（门诊药品费）', type: '电子发票（增值税普通发票）', status: '待开具（患者已申请）' },
    { id: 'BI-005', invoiceNo: 'INV-2026-000005', patient: '吴***（男，60 岁，体检患者）', amount: '1,500.00 元（体检费）', type: '纸质发票（增值税普通发票）', status: '已开具（患者已领取纸质发票）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m335Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/finance/expenses', handle: handleFinanceExpenses, auth: true },
  { method: 'GET', path: '/api/v1/finance/assets', handle: handleFinanceAssets, auth: true },
  { method: 'GET', path: '/api/v1/billing/invoices', handle: handleBillingInvoices, auth: true },
];
