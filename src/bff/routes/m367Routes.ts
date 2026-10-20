/**
 * 健澜科技 jlmedaios - M367 P1 业务扩展：药品物资深度打磨
 *
 * 药品看板/库存详情/供应商管理/预警管理/效期管理（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/dashboard - 药品看板 5 条 */
async function handlePharmacyDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PD-001', metricName: '药品库存总金额', value: '500 万元（当前库存总金额）', unit: '万元', trend: '稳定（较上月持平，波动 < 3%）', time: '2026-10-20（实时统计）' },
    { id: 'PD-002', metricName: '本月药品消耗金额', value: '150 万元/月（本月药品消耗）', unit: '万元/月', trend: '稳定（较上月持平，波动 < 3%）', time: '2026-10（本月）' },
    { id: 'PD-003', metricName: '药品库存周转率', value: '30%（月度周转率）', unit: '%', trend: '稳定（较上月持平，波动 < 2%）', time: '2026-10（本月）' },
    { id: 'PD-004', metricName: '近效期药品数量', value: '50 种（3 个月内到期）', unit: '种', trend: '上升（较上月增加 5 种，因采购批次集中到期）', time: '2026-10-20（实时统计）' },
    { id: 'PD-005', metricName: '缺药品种数量', value: '10 种（库存低于安全阈值）', unit: '种', trend: '下降（较上月减少 3 种，因加强了采购管理）', time: '2026-10-20（实时统计）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/inventory-detail - 库存详情 5 条 */
async function handlePharmacyInventoryDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PID-001', drugName: '阿莫西林胶囊（抗生素）', spec: '0.25g×24 粒/盒', stock: '500 盒（当前库存）', unit: '盒', expiryDate: '2027-06-30（有效期至）' },
    { id: 'PID-002', drugName: '布洛芬缓释胶囊（止痛药）', spec: '0.3g×20 粒/盒', stock: '300 盒（当前库存）', unit: '盒', expiryDate: '2027-03-31（有效期至）' },
    { id: 'PID-003', drugName: '二甲双胍片（降糖药）', spec: '0.5g×60 片/瓶', stock: '200 瓶（当前库存）', unit: '瓶', expiryDate: '2026-12-31（有效期至，近效期）' },
    { id: 'PID-004', drugName: '生理盐水（输液用）', spec: '250ml/袋', stock: '1,000 袋（当前库存）', unit: '袋', expiryDate: '2027-09-30（有效期至）' },
    { id: 'PID-005', drugName: '头孢克肟片（抗生素）', spec: '0.1g×12 片/盒', stock: '50 盒（当前库存，低于安全阈值）', unit: '盒', expiryDate: '2027-01-31（有效期至）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/suppliers - 供应商管理 5 条 */
async function handlePharmacySuppliers(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PS-001', supplierName: '国药控股股份有限公司', contact: '张***（销售经理）', phone: '021-12345678', qualification: 'GSP 认证（药品经营许可证有效期至 2027 年）', status: '合作中（本月采购金额 50 万元）' },
    { id: 'PS-002', supplierName: '上海医药集团股份有限公司', contact: '李***（销售经理）', phone: '021-87654321', qualification: 'GSP 认证（药品经营许可证有效期至 2027 年）', status: '合作中（本月采购金额 40 万元）' },
    { id: 'PS-003', supplierName: '华润医药商业集团有限公司', contact: '王***（销售经理）', phone: '010-12345678', qualification: 'GSP 认证（药品经营许可证有效期至 2026 年）', status: '合作中（本月采购金额 30 万元）' },
    { id: 'PS-004', supplierName: '广州医药股份有限公司', contact: '刘***（销售经理）', phone: '020-87654321', qualification: 'GSP 认证（药品经营许可证有效期至 2027 年）', status: '合作中（本月采购金额 20 万元）' },
    { id: 'PS-005', supplierName: '华东医药股份有限公司', contact: '陈***（销售经理）', phone: '0571-12345678', qualification: 'GSP 认证（药品经营许可证有效期至 2026 年）', status: '合作中（本月采购金额 10 万元）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/warning - 预警管理 5 条 */
async function handlePharmacyWarning(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PW-001', drugName: '头孢克肟片（抗生素）', warningType: '库存不足预警（低于安全阈值）', stock: '50 盒（当前库存）', threshold: '100 盒（安全库存阈值）', status: '已预警（需立即采购）' },
    { id: 'PW-002', drugName: '二甲双胍片（降糖药）', warningType: '近效期预警（3 个月内到期）', stock: '200 瓶（当前库存）', threshold: '有效期至 2026-12-31（3 个月内到期）', status: '已预警（需优先使用）' },
    { id: 'PW-003', drugName: '布洛芬缓释胶囊（止痛药）', warningType: '库存不足预警（低于安全阈值）', stock: '300 盒（当前库存）', threshold: '500 盒（安全库存阈值）', status: '已预警（需安排采购）' },
    { id: 'PW-004', drugName: '生理盐水（输液用）', warningType: '库存充足（无预警）', stock: '1,000 袋（当前库存）', threshold: '500 袋（安全库存阈值）', status: '正常（高于安全阈值）' },
    { id: 'PW-005', drugName: '阿莫西林胶囊（抗生素）', warningType: '库存充足（无预警）', stock: '500 盒（当前库存）', threshold: '300 盒（安全库存阈值）', status: '正常（高于安全阈值）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/expiry - 效期管理 5 条 */
async function handlePharmacyExpiry(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PE-001', drugName: '二甲双胍片（降糖药）', batchNo: '20241001A（生产批号）', expiryDate: '2026-12-31（有效期至）', stock: '200 瓶（当前库存）', status: '近效期（3 个月内到期，需优先使用）' },
    { id: 'PE-002', drugName: '布洛芬缓释胶囊（止痛药）', batchNo: '20241201B（生产批号）', expiryDate: '2027-03-31（有效期至）', stock: '300 盒（当前库存）', status: '正常（6 个月以上到期）' },
    { id: 'PE-003', drugName: '头孢克肟片（抗生素）', batchNo: '20250101C（生产批号）', expiryDate: '2027-01-31（有效期至）', stock: '50 盒（当前库存）', status: '正常（6 个月以上到期）' },
    { id: 'PE-004', drugName: '阿莫西林胶囊（抗生素）', batchNo: '20250601D（生产批号）', expiryDate: '2027-06-30（有效期至）', stock: '500 盒（当前库存）', status: '正常（12 个月以上到期）' },
    { id: 'PE-005', drugName: '生理盐水（输液用）', batchNo: '20250901E（生产批号）', expiryDate: '2027-09-30（有效期至）', stock: '1,000 袋（当前库存）', status: '正常（12 个月以上到期）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m367Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/dashboard', handle: handlePharmacyDashboard, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/inventory-detail', handle: handlePharmacyInventoryDetail, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/suppliers', handle: handlePharmacySuppliers, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/warning', handle: handlePharmacyWarning, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/expiry', handle: handlePharmacyExpiry, auth: true },
];
