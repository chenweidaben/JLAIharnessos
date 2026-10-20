/**
 * 健澜科技 jlmedaios - M304 药品物资设备域
 *
 * 药房库存/药品采购/药品盘点/物资采购/物资盘点/设备维修
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/pharmacy/inventory - 药房库存 5 条 */
async function handlePharmacyInventory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { drug: '阿莫西林胶囊', spec: '0.25g×24粒', stock: '1,250 盒', warning: '500 盒', location: '西药房 A-01' },
    { drug: '布洛芬缓释胶囊', spec: '0.3g×20粒', stock: '860 盒', warning: '300 盒', location: '西药房 A-02' },
    { drug: '头孢克肟分散片', spec: '0.1g×12片', stock: '420 盒', warning: '200 盒', location: '西药房 A-03' },
    { drug: '丹参滴丸', spec: '27mg×180丸', stock: '680 瓶', warning: '200 瓶', location: '中药房 B-05' },
    { drug: '胰岛素注射液', spec: '400IU/10ml', stock: '150 支', warning: '100 支', location: '冷链药房 C-01' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/purchase - 药品采购 5 条 */
async function handlePharmacyPurchase(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PP-001', orderNo: 'PO-20261020-001', drug: '阿莫西林胶囊', qty: '2,000 盒', amount: '36,000.00 元', status: '已到货' },
    { id: 'PP-002', orderNo: 'PO-20261020-002', drug: '布洛芬缓释胶囊', qty: '1,000 盒', amount: '28,500.00 元', status: '配送中' },
    { id: 'PP-003', orderNo: 'PO-20261019-003', drug: '头孢克肟分散片', qty: '800 盒', amount: '52,000.00 元', status: '已到货' },
    { id: 'PP-004', orderNo: 'PO-20261019-004', drug: '胰岛素注射液', qty: '500 支', amount: '45,000.00 元', status: '待审批' },
    { id: 'PP-005', orderNo: 'PO-20261018-005', drug: '丹参滴丸', qty: '1,000 瓶', amount: '68,000.00 元', status: '已入库' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pharmacy/check - 药品盘点 5 条 */
async function handlePharmacyCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PC-001', checkDate: '2026-10-15', drug: '阿莫西林胶囊', bookValue: '1,250 盒', actualValue: '1,248 盒', diff: '-2 盒' },
    { id: 'PC-002', checkDate: '2026-10-15', drug: '布洛芬缓释胶囊', bookValue: '860 盒', actualValue: '860 盒', diff: '0' },
    { id: 'PC-003', checkDate: '2026-10-15', drug: '头孢克肟分散片', bookValue: '420 盒', actualValue: '415 盒', diff: '-5 盒' },
    { id: 'PC-004', checkDate: '2026-10-15', drug: '丹参滴丸', bookValue: '680 瓶', actualValue: '682 瓶', diff: '+2 瓶' },
    { id: 'PC-005', checkDate: '2026-10-15', drug: '胰岛素注射液', bookValue: '150 支', actualValue: '150 支', diff: '0' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/supplies/purchase - 物资采购 5 条 */
async function handleSuppliesPurchase(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SP-001', orderNo: 'SU-20261020-001', supply: '一次性注射器', qty: '50,000 支', amount: '25,000.00 元', status: '已到货' },
    { id: 'SP-002', orderNo: 'SU-20261020-002', supply: '医用外科口罩', qty: '100,000 只', amount: '15,000.00 元', status: '配送中' },
    { id: 'SP-003', orderNo: 'SU-20261019-003', supply: '输液器', qty: '20,000 套', amount: '18,000.00 元', status: '已到货' },
    { id: 'SP-004', orderNo: 'SU-20261019-004', supply: '手术手套（无菌）', qty: '10,000 双', amount: '35,000.00 元', status: '待审批' },
    { id: 'SP-005', orderNo: 'SU-20261018-005', supply: '医用棉签', qty: '5,000 包', amount: '5,000.00 元', status: '已入库' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/supplies/check - 物资盘点 5 条 */
async function handleSuppliesCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SC-001', checkDate: '2026-10-16', supply: '一次性注射器', bookValue: '50,000 支', actualValue: '49,980 支', diff: '-20 支' },
    { id: 'SC-002', checkDate: '2026-10-16', supply: '医用外科口罩', bookValue: '100,000 只', actualValue: '100,000 只', diff: '0' },
    { id: 'SC-003', checkDate: '2026-10-16', supply: '输液器', bookValue: '20,000 套', actualValue: '19,950 套', diff: '-50 套' },
    { id: 'SC-004', checkDate: '2026-10-16', supply: '手术手套（无菌）', bookValue: '10,000 双', actualValue: '10,010 双', diff: '+10 双' },
    { id: 'SC-005', checkDate: '2026-10-16', supply: '医用棉签', bookValue: '5,000 包', actualValue: '5,000 包', diff: '0' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/equipment/repair - 设备维修 5 条 */
async function handleEquipmentRepair(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ER-001', device: 'CT 扫描仪（GE 64排）', fault: '图像伪影', repairer: '设备科 张工', time: '2026-10-18 14:00', status: '已修复' },
    { id: 'ER-002', device: '核磁共振（西门子 1.5T）', fault: '梯度噪音异常', repairer: '厂家工程师（远程）', time: '2026-10-19 09:30', status: '维修中' },
    { id: 'ER-003', device: '心电监护仪（飞利浦）', fault: '血氧探头无信号', repairer: '设备科 李工', time: '2026-10-20 08:15', status: '已修复' },
    { id: 'ER-004', device: '血液透析机（费森尤斯）', fault: '透析液温度偏差', repairer: '厂家工程师（现场）', time: '2026-10-19 16:00', status: '待件维修' },
    { id: 'ER-005', device: '麻醉机（德尔格）', fault: '流量传感器报警', repairer: '设备科 王工', time: '2026-10-18 11:00', status: '已修复' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m304Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/pharmacy/inventory', handle: handlePharmacyInventory, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/purchase', handle: handlePharmacyPurchase, auth: true },
  { method: 'GET', path: '/api/v1/pharmacy/check', handle: handlePharmacyCheck, auth: true },
  { method: 'GET', path: '/api/v1/supplies/purchase', handle: handleSuppliesPurchase, auth: true },
  { method: 'GET', path: '/api/v1/supplies/check', handle: handleSuppliesCheck, auth: true },
  { method: 'GET', path: '/api/v1/equipment/repair', handle: handleEquipmentRepair, auth: true },
];
