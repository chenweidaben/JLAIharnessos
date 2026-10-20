/**
 * 健澜科技 jlmedaios - M200 医保 + 财务 + 药品库存核心域
 *
 * 医保结算/目录/汇总 + 收费/退费/日结 + 库存/效期/使用统计
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 医保域 ==================== */

/** GET /api/v1/insurance/claims - 医保结算记录 */
async function handleInsuranceClaims(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const claims = [
    { id: 'CLM-001', patient: '张演示', totalFee: 5800.50, insurancePay: 4200.00, selfPay: 1600.50, status: '已结算', insuranceType: '职工医保' },
    { id: 'CLM-002', patient: '李患者', totalFee: 3200.00, insurancePay: 2400.00, selfPay: 800.00, status: '已结算', insuranceType: '居民医保' },
    { id: 'CLM-003', patient: '王患者', totalFee: 12000.00, insurancePay: 9600.00, selfPay: 2400.00, status: '待结算', insuranceType: '职工医保' },
    { id: 'CLM-004', patient: '赵患者', totalFee: 850.00, insurancePay: 0, selfPay: 850.00, status: '已结算', insuranceType: '自费' },
    { id: 'CLM-005', patient: '刘患者', totalFee: 4500.00, insurancePay: 3600.00, selfPay: 900.00, status: '退费', insuranceType: '居民医保' },
  ];

  return json(ok({ claims, totalCount: claims.length }));
}

/** GET /api/v1/insurance/items - 医保目录对照 */
async function handleInsuranceItems(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const items = [
    { name: '阿莫西林胶囊', category: '药品', level: '甲类', code: 'YB001', selfPayRate: '0%' },
    { name: '冠脉CTA', category: '诊疗项目', level: '乙类', code: 'YLO02', selfPayRate: '10%' },
    { name: '心脏支架', category: '耗材', level: '乙类', code: 'CL003', selfPayRate: '20%' },
    { name: '维生素C片', category: '药品', level: '甲类', code: 'YB004', selfPayRate: '0%' },
    { name: '普通门诊诊查费', category: '诊疗项目', level: '甲类', code: 'YLO05', selfPayRate: '0%' },
  ];

  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/settlement-summary - 医保汇总 */
async function handleInsuranceSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    today: { claims: 156, totalFee: 856000, insurancePay: 620000, avgSelfPayRate: '27.6%' },
    month: { claims: 4200, totalFee: 23500000, insurancePay: 16800000, avgSelfPayRate: '28.5%' },
  }));
}

/* ==================== 财务收费域 ==================== */

/** GET /api/v1/billing/orders - 收费明细 */
async function handleBillingOrders(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const orders = [
    { id: 'BILL-001', patient: '张演示', item: '住院押金', amount: 5000.00, time: '2026-10-20 09:15', cashier: '收费员-小王', payMethod: '微信' },
    { id: 'BILL-002', patient: '李患者', item: '门诊挂号费', amount: 25.00, time: '2026-10-20 09:20', cashier: '收费员-小李', payMethod: '支付宝' },
    { id: 'BILL-003', patient: '王患者', item: '检查费（CT）', amount: 480.00, time: '2026-10-20 09:30', cashier: '收费员-小王', payMethod: '医保' },
    { id: 'BILL-004', patient: '赵患者', item: '药品费', amount: 156.80, time: '2026-10-20 09:45', cashier: '收费员-小张', payMethod: '现金' },
    { id: 'BILL-005', patient: '刘患者', item: '住院押金', amount: 10000.00, time: '2026-10-20 10:00', cashier: '收费员-小李', payMethod: '医保' },
  ];

  return json(ok({ orders, totalCount: orders.length }));
}

/** GET /api/v1/billing/refunds - 退费记录 */
async function handleBillingRefunds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const refunds = [
    { id: 'REF-001', originalBill: 'BILL-003', amount: 480.00, reason: '患者取消检查', status: '已退费' },
    { id: 'REF-002', originalBill: 'BILL-004', amount: 156.80, reason: '药品过敏更换', status: '审核中' },
    { id: 'REF-003', originalBill: 'BILL-005', amount: 5000.00, reason: '出院结算多收', status: '已退费' },
  ];

  return json(ok({ refunds, totalCount: refunds.length }));
}

/** GET /api/v1/billing/daily-summary - 日结报表 */
async function handleBillingDaily(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    today: {
      totalRevenue: 125600.00,
      outpatientRevenue: 35600.00,
      inpatientRevenue: 90000.00,
      refundAmount: 1200.00,
      uncollectedAmount: 8500.00,
    },
  }));
}

/* ==================== 药品库存域 ==================== */

/** GET /api/v1/pharmacy/inventory - 药品库存列表 */
async function handlePharmacyInventory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const drugs = [
    { name: '阿司匹林肠溶片', spec: '100mg*30片', stock: 1500, price: 12.50, batch: 'B20261001', expiry: '2027-10-01', status: '正常' },
    { name: '阿托伐他汀钙片', spec: '20mg*7片', stock: 800, price: 28.00, batch: 'B20260915', expiry: '2027-09-15', status: '正常' },
    { name: '阿莫西林胶囊', spec: '0.25g*24粒', stock: 50, price: 8.50, batch: 'B20260820', expiry: '2027-08-20', status: '偏低' },
    { name: '头孢克肟分散片', spec: '100mg*6片', stock: 1200, price: 35.00, batch: 'B20260901', expiry: '2027-09-01', status: '正常' },
    { name: '低分子肝素钠注射液', spec: '4000IU*0.4ml', stock: 300, price: 45.00, batch: 'B20261005', expiry: '2027-10-05', status: '正常' },
    { name: '奥美拉唑肠溶胶囊', spec: '20mg*14粒', stock: 2000, price: 18.00, batch: 'B20260910', expiry: '2027-09-10', status: '偏高' },
    { name: '氯化钾缓释片', spec: '0.5g*100片', stock: 100, price: 6.00, batch: 'B20260801', expiry: '2027-08-01', status: '偏低' },
    { name: '维生素C注射液', spec: '2ml*0.5g', stock: 5000, price: 2.00, batch: 'B20261010', expiry: '2027-10-10', status: '正常' },
  ];

  return json(ok({ drugs, totalCount: drugs.length }));
}

/** GET /api/v1/pharmacy/expiring - 近效期药品 */
async function handlePharmacyExpiring(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const expiring = [
    { name: '葡萄糖注射液', batch: 'B20260501', expiry: '2026-12-01', stock: 200, level: '中' },
    { name: '0.9%氯化钠注射液', batch: 'B20260510', expiry: '2026-12-10', stock: 350, level: '中' },
    { name: '甲硝唑片', batch: 'B20260601', expiry: '2026-11-01', stock: 80, level: '高' },
  ];

  return json(ok({ expiring, totalCount: expiring.length }));
}

/** GET /api/v1/pharmacy/usage - 药品使用统计 */
async function handlePharmacyUsage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    todayOutbound: 45600.00,
    deptTop3: [
      { dept: '心内科', amount: 12500.00 },
      { dept: '呼吸科', amount: 8600.00 },
      { dept: '急诊科', amount: 6800.00 },
    ],
    drugTop5: [
      { name: '阿司匹林肠溶片', amount: 3200.00 },
      { name: '阿托伐他汀钙片', amount: 4500.00 },
      { name: '头孢克肟分散片', amount: 5800.00 },
      { name: '低分子肝素钠注射液', amount: 6200.00 },
      { name: '奥美拉唑肠溶胶囊', amount: 2800.00 },
    ],
  }));
}

export const m200Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/insurance/claims', handle: handleInsuranceClaims, auth: true },
  { method: 'GET', path: '/api/v1/insurance/items', handle: handleInsuranceItems, auth: true },
  { method: 'GET', path: '/api/v1/insurance/settlement-summary', handle: handleInsuranceSummary, auth: true },
  { method: 'GET', path: '/api/v1/billing/orders', handle: handleBillingOrders, auth: true },
  { method: 'GET', path: '/api/v1/billing/refunds', handle: handleBillingRefunds, auth: true },
  { method: 'GET', path: '/api/v1/billing/daily-summary', handle: handleBillingDaily, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/inventory', handle: handlePharmacyInventory, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/expiring', handle: handlePharmacyExpiring, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/usage', handle: handlePharmacyUsage, auth: true },
];
