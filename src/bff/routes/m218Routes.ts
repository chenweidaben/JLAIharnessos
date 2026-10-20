/**
 * 健澜科技 jlmedaios - M218 财务管理 + 采购管理 + 固定资产
 *
 * 收入/支出/预算 + 采购订单/供应商 + 资产列表/维护 + 科室成本核算
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、财务管理 ==================== */

/** GET /api/v1/finance/revenue - 收入统计 */
async function handleFinanceRevenue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    outpatient: { today: 125.5, month: 3250.8, yoyGrowth: 8.2 },
    inpatient: { today: 89.3, month: 2680.5, yoyGrowth: 6.5 },
    drug: { today: 45.8, month: 1250.2, yoyGrowth: 3.8 },
    examination: { today: 28.5, month: 850.6, yoyGrowth: 10.2 },
    surgery: { today: 35.2, month: 980.3, yoyGrowth: 7.8 },
  }));
}

/** GET /api/v1/finance/expense - 支出统计 */
async function handleFinanceExpense(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    personnel: { month: 1850.5, yoyGrowth: 5.2 },
    drug: { month: 980.3, yoyGrowth: 3.5 },
    consumables: { month: 450.8, yoyGrowth: 8.6 },
    equipment: { month: 320.5, yoyGrowth: 12.3 },
    logistics: { month: 180.2, yoyGrowth: 4.1 },
  }));
}

/** GET /api/v1/finance/budget - 预算执行 */
async function handleFinanceBudget(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const budgets = [
    { id: 'BUD-001', subject: '人员经费', annual: 22000.0, executed: 18500.5, rate: 84.1, remaining: 3499.5 },
    { id: 'BUD-002', subject: '药品采购', annual: 12000.0, executed: 9800.3, rate: 81.7, remaining: 2199.7 },
    { id: 'BUD-003', subject: '设备购置', annual: 5000.0, executed: 3200.5, rate: 64.0, remaining: 1799.5 },
    { id: 'BUD-004', subject: '基建维修', annual: 3000.0, executed: 1800.2, rate: 60.0, remaining: 1199.8 },
    { id: 'BUD-005', subject: '信息化建设', annual: 2000.0, executed: 1500.8, rate: 75.0, remaining: 499.2 },
  ];

  return json(ok({ budgets, totalCount: budgets.length }));
}

/* ==================== 二、采购管理 ==================== */

/** GET /api/v1/procurement/orders - 采购订单 */
async function handleProcurementOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const orders = [
    { id: 'PO-001', orderNo: 'PO-20261020-001', supplier: '国药控股浙江公司', item: '药品采购（抗生素）', amount: 256800.00, status: '已审批', expectedDate: '2026-10-25' },
    { id: 'PO-002', orderNo: 'PO-20261020-002', supplier: '迈瑞医疗', item: '设备采购（监护仪）', amount: 185000.00, status: '待审批', expectedDate: '2026-10-28' },
    { id: 'PO-003', orderNo: 'PO-20261019-003', supplier: '强生医疗器材', item: '耗材采购（支架）', amount: 320000.00, status: '已到货', expectedDate: '2026-10-22' },
    { id: 'PO-004', orderNo: 'PO-20261019-004', supplier: '得力办公', item: '办公用品', amount: 15600.00, status: '已验收', expectedDate: '2026-10-21' },
    { id: 'PO-005', orderNo: 'PO-20261018-005', supplier: '华润医药', item: '药品采购（中成药）', amount: 128500.00, status: '已审批', expectedDate: '2026-10-24' },
  ];

  return json(ok({ orders, totalCount: orders.length }));
}

/** GET /api/v1/procurement/suppliers - 供应商列表 */
async function handleProcurementSuppliers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const suppliers = [
    { id: 'SUP-001', name: '国药控股浙江公司', contact: '王经理', category: '药品', rating: 'A', years: 15 },
    { id: 'SUP-002', name: '迈瑞医疗', contact: '李经理', category: '设备', rating: 'A', years: 10 },
    { id: 'SUP-003', name: '强生医疗器材', contact: '张经理', category: '耗材', rating: 'A', years: 8 },
    { id: 'SUP-004', name: '华润医药', contact: '刘经理', category: '药品', rating: 'B', years: 12 },
    { id: 'SUP-005', name: '得力办公', contact: '陈经理', category: '后勤', rating: 'B', years: 5 },
  ];

  return json(ok({ suppliers, totalCount: suppliers.length }));
}

/* ==================== 三、固定资产 ==================== */

/** GET /api/v1/assets/list - 固定资产列表 */
async function handleAssetsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const assets = [
    { id: 'AST-001', name: 'CT（64排）', assetNo: 'AST-CT-001', originalValue: 1250.0, netValue: 850.5, dept: '放射科', status: '在用' },
    { id: 'AST-002', name: 'MRI（1.5T）', assetNo: 'AST-MRI-001', originalValue: 1800.0, netValue: 1250.8, dept: '放射科', status: '在用' },
    { id: 'AST-003', name: '彩超（高端）', assetNo: 'AST-US-001', originalValue: 350.0, netValue: 220.5, dept: '超声科', status: '在用' },
    { id: 'AST-004', name: '生化分析仪', assetNo: 'AST-LAB-001', originalValue: 180.0, netValue: 120.3, dept: '检验科', status: '维修' },
    { id: 'AST-005', name: '监护仪（多参数）', assetNo: 'AST-MON-001', originalValue: 15.0, netValue: 8.5, dept: 'ICU', status: '在用' },
  ];

  return json(ok({ assets, totalCount: assets.length }));
}

/** GET /api/v1/assets/maintenance - 设备维护记录 */
async function handleAssetsMaintenance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'MNT-001', asset: 'CT（64排）', type: '定期校准', maintenancePerson: '迈瑞工程师', cost: 8500.00, date: '2026-10-15' },
    { id: 'MNT-002', asset: '生化分析仪', type: '故障维修', maintenancePerson: '原厂工程师', cost: 12500.00, date: '2026-10-18' },
    { id: 'MNT-003', asset: '彩超（高端）', type: '日常保养', maintenancePerson: '设备科-赵工', cost: 1500.00, date: '2026-10-10' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/* ==================== 四、成本核算 ==================== */

/** GET /api/v1/cost/department - 科室成本核算 */
async function handleCostDepartment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const costs = [
    { id: 'COST-001', dept: '心内科', revenue: 1250.5, cost: 850.2, balance: 400.3, costRate: 67.9, profitRate: 32.1 },
    { id: 'COST-002', dept: '呼吸科', revenue: 980.3, cost: 720.5, balance: 259.8, costRate: 73.5, profitRate: 26.5 },
    { id: 'COST-003', dept: '消化科', revenue: 860.5, cost: 620.8, balance: 239.7, costRate: 72.2, profitRate: 27.8 },
    { id: 'COST-004', dept: '普外科', revenue: 1560.8, cost: 1120.5, balance: 440.3, costRate: 71.8, profitRate: 28.2 },
    { id: 'COST-005', dept: '骨科', revenue: 1380.5, cost: 1050.2, balance: 330.3, costRate: 76.1, profitRate: 23.9 },
  ];

  return json(ok({ costs, totalCount: costs.length }));
}

export const m218Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/finance/revenue', handle: handleFinanceRevenue, auth: true },
  { method: 'GET', path: '/api/v1/finance/expense', handle: handleFinanceExpense, auth: true },
  { method: 'GET', path: '/api/v1/finance/budget', handle: handleFinanceBudget, auth: true },
  { method: 'GET', path: '/api/v1/procurement/orders', handle: handleProcurementOrders, auth: true },
  { method: 'GET', path: '/api/v1/procurement/suppliers', handle: handleProcurementSuppliers, auth: true },
  { method: 'GET', path: '/api/v1/assets/list', handle: handleAssetsList, auth: true },
  { method: 'GET', path: '/api/v1/assets/maintenance', handle: handleAssetsMaintenance, auth: true },
  { method: 'GET', path: '/api/v1/cost/department', handle: handleCostDepartment, auth: true },
];
