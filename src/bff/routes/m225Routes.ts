/**
 * 健澜科技 jlmedaios - M225 设备物资财务深度
 *
 * 设备详情/高值耗材追溯/低库存预警 + 医保结算详情/收费明细详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、设备物资深度 ==================== */

/** GET /api/v1/equipment/detail - 设备详情 */
async function handleEquipmentDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    name: 'CT（64排）',
    assetNo: 'AST-CT-001',
    model: 'Revolution ACT',
    manufacturer: 'GE 医疗',
    purchaseDate: '2022-06-01',
    originalValue: 1250.0,
    netValue: 850.5,
    status: '在用',
    location: '放射科 CT 室（1 楼）',
  }));
}

/** GET /api/v1/supplies/consumables - 高值耗材追溯 */
async function handleSuppliesConsumables(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const consumables = [
    { id: 'CON-001', name: '药物洗脱支架', udi: 'UDI-69012345678901', patient: '张演示', useTime: '2026-10-15', surgeon: '心内科-李主任', batchNo: 'BAT-2026-0888' },
    { id: 'CON-002', name: '人工髋关节', udi: 'UDI-69012345678902', patient: '李患者', useTime: '2026-10-16', surgeon: '骨科-张主任', batchNo: 'BAT-2026-0889' },
    { id: 'CON-003', name: '骨科钢板（胫骨）', udi: 'UDI-69012345678903', patient: '王先生', useTime: '2026-10-17', surgeon: '骨科-刘主任', batchNo: 'BAT-2026-0890' },
    { id: 'CON-004', name: '房间隔缺损封堵器', udi: 'UDI-69012345678904', patient: '赵女士', useTime: '2026-10-18', surgeon: '心内科-陈主任', batchNo: 'BAT-2026-0891' },
    { id: 'CON-005', name: '永久起搏器（双腔）', udi: 'UDI-69012345678905', patient: '刘大爷', useTime: '2026-10-19', surgeon: '心内科-李主任', batchNo: 'BAT-2026-0892' },
  ];

  return json(ok({ consumables, totalCount: consumables.length }));
}

/** GET /api/v1/supplies/low-stock - 低库存预警 */
async function handleSuppliesLowStock(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const lowStock = [
    { id: 'LOW-001', name: '一次性注射器（5ml）', current: 200, min: 500, diff: -300, dept: '急诊科' },
    { id: 'LOW-002', name: '无菌纱布块', current: 150, min: 300, diff: -150, dept: '普外科' },
    { id: 'LOW-003', name: '留置针', current: 80, min: 200, diff: -120, dept: 'ICU' },
    { id: 'LOW-004', name: '输液器', current: 250, min: 400, diff: -150, dept: '输液室' },
    { id: 'LOW-005', name: '医用胶带', current: 50, min: 100, diff: -50, dept: '心内科' },
  ];

  return json(ok({ lowStock, totalCount: lowStock.length }));
}

/* ==================== 二、财务深度 ==================== */

/** GET /api/v1/insurance/detail - 医保结算详情 */
async function handleInsuranceDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    patient: '张演示',
    totalCost: 12580.50,
    insuranceReimbursed: 9850.20,
    selfPay: 2730.30,
    reimbursementRate: 78.3,
    settleTime: '2026-10-20 11:00',
  }));
}

/** GET /api/v1/billing/detail - 收费明细详情 */
async function handleBillingDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const items = [
    { id: 'BIL-001', item: '床位费（普通病房）', quantity: 7, unitPrice: 50.00, amount: 350.00, category: '甲类', time: '2026-10-15' },
    { id: 'BIL-002', item: '血常规检查', quantity: 3, unitPrice: 25.00, amount: 75.00, category: '甲类', time: '2026-10-15' },
    { id: 'BIL-003', item: 'CT 检查（胸部）', quantity: 1, unitPrice: 350.00, amount: 350.00, category: '乙类', time: '2026-10-16' },
    { id: 'BIL-004', item: '阿司匹林肠溶片', quantity: 14, unitPrice: 0.50, amount: 7.00, category: '甲类', time: '2026-10-15' },
    { id: 'BIL-005', item: '一次性输液器', quantity: 5, unitPrice: 3.50, amount: 17.50, category: '丙类', time: '2026-10-17' },
  ];

  return json(ok({ items, totalCount: items.length }));
}

export const m225Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/equipment/detail', handle: handleEquipmentDetail, auth: true },
  { method: 'GET', path: '/api/v1/supplies/consumables', handle: handleSuppliesConsumables, auth: true },
  { method: 'GET', path: '/api/v1/supplies/low-stock', handle: handleSuppliesLowStock, auth: true },
  { method: 'GET', path: '/api/v1/insurance/detail', handle: handleInsuranceDetail, auth: true },
  { method: 'GET', path: '/api/v1/billing/detail', handle: handleBillingDetail, auth: true },
];
